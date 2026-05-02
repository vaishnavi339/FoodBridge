const express = require('express');
const { Claim, FoodListing, User } = require('../models');
const { auth, roleCheck } = require('../middleware/auth');
const MatchingEngine = require('../services/matchingEngine');
const NotificationService = require('../services/notificationService');

const router = express.Router();

// POST /api/claims - Claim a food listing
router.post('/', auth, roleCheck('receiver', 'volunteer', 'admin'), async (req, res) => {
  try {
    const { listingId, notes } = req.body;

    const listing = await FoodListing.findByPk(listingId, {
      include: [{ model: User, as: 'donor' }],
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    if (listing.status !== 'available') {
      return res.status(400).json({ error: 'This listing is no longer available' });
    }

    // Check for existing claim
    const existingClaim = await Claim.findOne({
      where: { listingId, receiverId: req.user.id, status: 'pending' },
    });

    if (existingClaim) {
      return res.status(400).json({ error: 'You already have a pending claim for this listing' });
    }

    // Calculate match score
    const scores = MatchingEngine.calculateMatchScore(listing, req.user);

    // Create claim
    const claim = await Claim.create({
      listingId,
      receiverId: req.user.id,
      matchScore: scores.compositeScore,
      distanceKm: scores.distanceKm,
      notes,
      status: 'approved', // Auto-approve for now
      assignedAt: new Date(),
    });

    // Update listing status
    await listing.update({ status: 'claimed' });

    // Update receiver's count
    await req.user.increment('totalReceived');

    // Send notifications
    const io = req.app.get('io');
    const notifService = new NotificationService(io);
    await notifService.onListingClaimed(listing, listing.donor, req.user);

    // Emit socket events
    if (io) {
      io.emit('listing:statusChange', {
        listingId: listing.id,
        status: 'claimed',
        claimId: claim.id,
      });

      io.to(`user_${listing.donorId}`).emit('listing:claimed', {
        listing: listing.toJSON(),
        claim: claim.toJSON(),
        receiver: req.user.toJSON(),
      });
    }

    res.status(201).json({
      message: 'Food claimed successfully!',
      claim,
      matchScore: scores,
    });
  } catch (error) {
    console.error('Claim error:', error);
    res.status(500).json({ error: 'Failed to claim listing', details: error.message });
  }
});

// GET /api/claims - Get user's claims
router.get('/', auth, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const where = {};

    if (req.user.role === 'receiver' || req.user.role === 'volunteer') {
      where.receiverId = req.user.id;
    }

    if (status) where.status = status;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: claims } = await Claim.findAndCountAll({
      where,
      include: [
        {
          model: FoodListing,
          as: 'listing',
          include: [{ model: User, as: 'donor', attributes: ['id', 'name', 'orgName', 'phone'] }],
        },
        { model: User, as: 'receiver', attributes: ['id', 'name', 'orgName', 'phone'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    res.json({
      claims,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / parseInt(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch claims' });
  }
});

// PUT /api/claims/:id/status - Update claim status (tracking flow)
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const claim = await Claim.findByPk(req.params.id, {
      include: [
        { model: FoodListing, as: 'listing', include: [{ model: User, as: 'donor' }] },
        { model: User, as: 'receiver' },
      ],
    });

    if (!claim) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    const validTransitions = {
      pending: ['approved', 'rejected', 'cancelled'],
      approved: ['picked_up', 'in_transit', 'cancelled'],
      picked_up: ['in_transit', 'delivered', 'cancelled'],
      in_transit: ['delivered', 'cancelled'],
    };

    if (!validTransitions[claim.status]?.includes(status)) {
      return res.status(400).json({
        error: `Cannot transition from ${claim.status} to ${status}`,
      });
    }

    const updates = { status };

    if (status === 'picked_up') updates.pickedUpAt = new Date();
    if (status === 'delivered') updates.deliveredAt = new Date();

    await claim.update(updates);

    // Update listing status accordingly
    const listingStatusMap = {
      picked_up: 'in_transit',
      in_transit: 'in_transit',
      delivered: 'delivered',
      cancelled: 'available',
    };

    if (listingStatusMap[status]) {
      await claim.listing.update({ status: listingStatusMap[status] });
    }

    // Emit socket events
    const io = req.app.get('io');
    if (io) {
      io.to(`tracking_${claim.id}`).emit('tracking:statusChange', {
        claimId: claim.id,
        status,
        timestamp: new Date(),
      });

      io.emit('listing:statusChange', {
        listingId: claim.listingId,
        status: listingStatusMap[status] || status,
      });
    }

    // Send notifications on delivery
    if (status === 'delivered') {
      const notifService = new NotificationService(io);
      await notifService.onDeliveryComplete(claim.listing, claim.listing.donor, claim.receiver);
    }

    res.json({ message: `Status updated to ${status}`, claim });
  } catch (error) {
    console.error('Status update error:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// PUT /api/claims/:id/rate - Rate a completed delivery
router.put('/:id/rate', auth, async (req, res) => {
  try {
    const { rating, feedback } = req.body;
    const claim = await Claim.findByPk(req.params.id);

    if (!claim || claim.status !== 'delivered') {
      return res.status(400).json({ error: 'Can only rate completed deliveries' });
    }

    await claim.update({ rating, feedback });
    res.json({ message: 'Rating submitted', claim });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit rating' });
  }
});

module.exports = router;
