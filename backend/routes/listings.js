const express = require('express');
const { Op } = require('sequelize');
const { FoodListing, User, Claim } = require('../models');
const { auth, roleCheck } = require('../middleware/auth');
const MatchingEngine = require('../services/matchingEngine');

const router = express.Router();

// GET /api/listings - Get all available listings with filters
router.get('/', async (req, res) => {
  try {
    const {
      status = 'available',
      foodType,
      category,
      lat,
      lng,
      radius = 50,
      sortBy = 'urgencyScore',
      order = 'DESC',
      page = 1,
      limit = 20,
    } = req.query;

    const where = {};

    if (status && status.length > 0) where.status = status;
    if (foodType && foodType.length > 0) where.foodType = foodType;
    if (category && category.length > 0) where.category = category;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: listings } = await FoodListing.findAndCountAll({
      where,
      include: [{ model: User, as: 'donor', attributes: ['id', 'name', 'orgName', 'orgType', 'avatar', 'rating'] }],
      order: [[sortBy, order]],
      limit: parseInt(limit),
      offset,
    });

    // If lat/lng provided, filter by distance and add distance info
    let results = listings;
    if (lat && lng) {
      results = listings
        .map(listing => {
          const distance = MatchingEngine.haversineDistance(
            parseFloat(lat), parseFloat(lng),
            listing.latitude, listing.longitude
          );
          return {
            ...listing.toJSON(),
            distance: Math.round(distance * 100) / 100,
          };
        })
        .filter(listing => listing.distance <= parseFloat(radius))
        .sort((a, b) => a.distance - b.distance);
    }

    res.json({
      listings: results,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get listings error:', error);
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
});

// GET /api/listings/:id - Get single listing
router.get('/:id', async (req, res) => {
  try {
    const listing = await FoodListing.findByPk(req.params.id, {
      include: [
        { model: User, as: 'donor', attributes: ['id', 'name', 'orgName', 'orgType', 'phone', 'avatar', 'rating'] },
        {
          model: Claim,
          as: 'claims',
          include: [{ model: User, as: 'receiver', attributes: ['id', 'name', 'orgName', 'orgType'] }],
        },
      ],
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    res.json({ listing });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch listing' });
  }
});

// POST /api/listings - Create new listing (donors only)
router.post('/', auth, roleCheck('donor', 'admin'), async (req, res) => {
  try {
    const {
      title, foodType, category, quantity, unit, description,
      photos, expiryTime, pickupAddress, latitude, longitude,
      servesCount, allergens, pickupWindowStart, pickupWindowEnd,
      specialInstructions,
    } = req.body;

    if (!title || !foodType || !quantity || !expiryTime || !pickupAddress || !latitude || !longitude) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const listing = await FoodListing.create({
      donorId: req.user.id,
      title,
      foodType,
      category: category || 'mixed',
      quantity,
      unit: unit || 'kg',
      description,
      photos: photos || [],
      expiryTime,
      pickupAddress,
      latitude,
      longitude,
      servesCount,
      allergens,
      pickupWindowStart,
      pickupWindowEnd,
      specialInstructions,
    });

    // Update donor's total donations
    await req.user.increment('totalDonations');

    // Emit socket event for new listing
    const io = req.app.get('io');
    if (io) {
      io.to('role_receiver').to('role_volunteer').emit('listing:new', {
        listing: listing.toJSON(),
        donor: req.user.toJSON(),
      });
    }

    // Find and notify best matches
    const receivers = await User.findAll({
      where: { role: { [Op.in]: ['receiver', 'volunteer'] }, isActive: true },
    });

    const matches = await MatchingEngine.findBestMatches(listing, receivers, 5);

    // Notify top matches
    const NotificationService = require('../services/notificationService');
    const notifService = new NotificationService(io);
    
    await notifService.onListingCreated(listing, req.user);

    for (const match of matches) {
      await notifService.onNewMatch(match.receiver, listing, match.compositeScore);
    }

    res.status(201).json({
      message: 'Listing created successfully',
      listing,
      topMatches: matches.map(m => ({
        receiverId: m.receiver.id,
        receiverName: m.receiver.orgName || m.receiver.name,
        compositeScore: m.compositeScore,
        distanceKm: m.distanceKm,
      })),
    });
  } catch (error) {
    console.error('Create listing error:', error);
    res.status(500).json({ error: 'Failed to create listing', details: error.message });
  }
});

// PUT /api/listings/:id - Update listing
router.put('/:id', auth, async (req, res) => {
  try {
    const listing = await FoodListing.findByPk(req.params.id);

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    if (listing.donorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const allowedUpdates = [
      'title', 'foodType', 'category', 'quantity', 'unit',
      'description', 'photos', 'expiryTime', 'pickupAddress',
      'latitude', 'longitude', 'status', 'servesCount', 'allergens',
      'pickupWindowStart', 'pickupWindowEnd', 'specialInstructions',
    ];

    const updates = {};
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    await listing.update(updates);

    // Emit update event
    const io = req.app.get('io');
    if (io) {
      io.emit('listing:update', { listing: listing.toJSON() });
    }

    res.json({ message: 'Listing updated', listing });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update listing' });
  }
});

// DELETE /api/listings/:id - Delete listing
router.delete('/:id', auth, async (req, res) => {
  try {
    const listing = await FoodListing.findByPk(req.params.id);

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    if (listing.donorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await listing.update({ status: 'cancelled' });
    res.json({ message: 'Listing cancelled' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete listing' });
  }
});

// GET /api/listings/:id/matches - Get matches for a listing
router.get('/:id/matches', auth, async (req, res) => {
  try {
    const listing = await FoodListing.findByPk(req.params.id);

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    const receivers = await User.findAll({
      where: { role: { [Op.in]: ['receiver', 'volunteer'] }, isActive: true },
    });

    const matches = await MatchingEngine.findBestMatches(listing, receivers);

    res.json({
      matches: matches.map(m => ({
        receiver: m.receiver.toJSON(),
        compositeScore: m.compositeScore,
        distanceScore: m.distanceScore,
        urgencyScore: m.urgencyScore,
        demandScore: m.demandScore,
        distanceKm: m.distanceKm,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get matches' });
  }
});

module.exports = router;
