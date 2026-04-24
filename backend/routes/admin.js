const express = require('express');
const { Op, fn, col, literal } = require('sequelize');
const { User, FoodListing, Claim, Notification } = require('../models');
const { auth, roleCheck } = require('../middleware/auth');

const router = express.Router();

// GET /api/admin/stats - Dashboard statistics
router.get('/stats', auth, roleCheck('admin'), async (req, res) => {
  try {
    const { range = 'week' } = req.query;
    
    // Calculate start date based on range
    let startDate = new Date(0); // Default to all time
    const now = new Date();
    
    if (range === 'today') {
      startDate = new Date(now.setHours(0, 0, 0, 0));
    } else if (range === 'week') {
      startDate = new Date(now.setDate(now.getDate() - 7));
    } else if (range === 'month') {
      startDate = new Date(now.setMonth(now.getMonth() - 1));
    }

    const totalUsers = await User.count();
    const totalDonors = await User.count({ where: { role: 'donor' } });
    const totalReceivers = await User.count({ where: { role: 'receiver' } });
    const totalVolunteers = await User.count({ where: { role: 'volunteer' } });

    // Filtered counts
    const totalListings = await FoodListing.count({
      where: { createdAt: { [Op.gte]: startDate } }
    });
    const activeListings = await FoodListing.count({ 
      where: { 
        status: 'available',
        createdAt: { [Op.gte]: startDate }
      } 
    });
    const deliveredListings = await FoodListing.count({ 
      where: { 
        status: 'delivered',
        updatedAt: { [Op.gte]: startDate }
      } 
    });
    const expiredListings = await FoodListing.count({ 
      where: { 
        status: 'expired',
        updatedAt: { [Op.gte]: startDate }
      } 
    });

    const totalClaims = await Claim.count({
      where: { createdAt: { [Op.gte]: startDate } }
    });
    
    const completedDeliveries = await Claim.count({ 
      where: { 
        status: 'delivered',
        deliveredAt: { [Op.gte]: startDate }
      } 
    });

    // Calculate total kg saved for the period
    const deliveredFood = await FoodListing.findAll({
      where: { 
        status: 'delivered',
        updatedAt: { [Op.gte]: startDate }
      },
      attributes: [[fn('SUM', col('quantity')), 'totalQuantity']],
      raw: true,
    });

    const kgSaved = deliveredFood[0]?.totalQuantity || 0;

    // Deliveries Today specifically for the "Deliveries Today" KPI
    const startOfToday = new Date(new Date().setHours(0, 0, 0, 0));
    const deliveriesToday = await Claim.count({
      where: { 
        deliveredAt: { [Op.gte]: startOfToday },
        status: 'delivered'
      }
    });

    // Deliveries Yesterday
    const startOfYesterday = new Date(new Date(startOfToday).setDate(startOfToday.getDate() - 1));
    const deliveriesYesterday = await Claim.count({
      where: { 
        deliveredAt: { 
          [Op.gte]: startOfYesterday,
          [Op.lt]: startOfToday
        },
        status: 'delivered'
      }
    });

    // Listings by food type for the period
    const listingsByType = await FoodListing.findAll({
      where: { createdAt: { [Op.gte]: startDate } },
      attributes: ['foodType', [fn('COUNT', col('id')), 'count']],
      group: ['foodType'],
      raw: true,
    });

    // Listings by status for the period
    const listingsByStatus = await FoodListing.findAll({
      where: { createdAt: { [Op.gte]: startDate } },
      attributes: ['status', [fn('COUNT', col('id')), 'count']],
      group: ['status'],
      raw: true,
    });

    // Top donors (lifetime)
    const topDonors = await User.findAll({
      where: { role: 'donor' },
      attributes: ['id', 'name', 'orgName', 'totalDonations', 'rating'],
      order: [['totalDonations', 'DESC']],
      limit: 10,
    });

    // Top receivers (lifetime)
    const topReceivers = await User.findAll({
      where: { role: 'receiver' },
      attributes: ['id', 'name', 'orgName', 'totalReceived', 'rating'],
      order: [['totalReceived', 'DESC']],
      limit: 10,
    });

    // Fetch real activity feed (last 10 events)
    const recentListingsList = await FoodListing.findAll({
      limit: 10,
      order: [['createdAt', 'DESC']],
      include: [{ model: User, as: 'donor', attributes: ['orgName'] }],
    });

    const recentClaimsList = await Claim.findAll({
      limit: 10,
      order: [['updatedAt', 'DESC']],
      include: [
        { model: User, as: 'receiver', attributes: ['orgName'] },
        { model: FoodListing, as: 'listing', attributes: ['title'] }
      ],
    });

    // Merge and format activity
    const activity = [
      ...recentListingsList.map(l => ({
        time: l.createdAt,
        type: 'Listing created',
        actor: l.donor?.orgName || 'Donor',
        detail: `${l.title} — ${l.quantity} ${l.unit}`,
        status: 'active'
      })),
      ...recentClaimsList.map(c => ({
        time: c.updatedAt,
        type: c.status === 'delivered' ? 'Delivered' : 'Claimed',
        actor: c.receiver?.orgName || 'NGO',
        detail: `${c.status === 'delivered' ? 'Delivered' : 'Claimed'} "${c.listing?.title}"`,
        status: c.status
      }))
    ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 10);

    res.json({
      range,
      overview: {
        totalUsers,
        totalDonors,
        totalReceivers,
        totalVolunteers,
        totalListings,
        activeListings,
        deliveredListings,
        expiredListings,
        totalClaims,
        completedDeliveries,
        kgSaved: Math.round(kgSaved * 100) / 100,
        communitiesServed: totalReceivers,
        deliveriesToday,
        deliveriesYesterday,
      },
      activity,
      charts: {
        listingsByType,
        listingsByStatus,
      },
      leaderboard: {
        topDonors,
        topReceivers,
      },
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /api/admin/users - List all users
router.get('/users', auth, roleCheck('admin'), async (req, res) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;
    const where = {};

    if (role) where.role = role;
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { orgName: { [Op.like]: `%${search}%` } },
      ];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: users } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    res.json({
      users,
      pagination: { total: count, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(count / parseInt(limit)) },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// PUT /api/admin/users/:id - Update user (verify, deactivate, etc)
router.put('/users/:id', auth, roleCheck('admin'), async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { isVerified, isActive, role } = req.body;
    const updates = {};
    if (isVerified !== undefined) updates.isVerified = isVerified;
    if (isActive !== undefined) updates.isActive = isActive;
    if (role) updates.role = role;

    await user.update(updates);
    res.json({ message: 'User updated', user: user.toJSON() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// GET /api/admin/listings - All listings with full details
router.get('/listings', auth, roleCheck('admin'), async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const where = {};
    if (status) where.status = status;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: listings } = await FoodListing.findAndCountAll({
      where,
      include: [
        { model: User, as: 'donor', attributes: ['id', 'name', 'orgName'] },
        {
          model: Claim, as: 'claims',
          include: [{ model: User, as: 'receiver', attributes: ['id', 'name', 'orgName'] }],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    res.json({
      listings,
      pagination: { total: count, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(count / parseInt(limit)) },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
});

const MatchingEngine = require('../services/matchingEngine');

// GET /api/admin/listings/:id/matches - Get smart match suggestions for a listing
router.get('/listings/:id/matches', auth, roleCheck('admin'), async (req, res) => {
  try {
    const listing = await FoodListing.findByPk(req.params.id);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });

    const receivers = await User.findAll({ where: { role: 'receiver', isActive: true, isVerified: true } });
    const matches = receivers.map(receiver => {
      const scores = MatchingEngine.calculateMatchScore(listing, receiver);
      return { 
        id: receiver.id, 
        name: receiver.orgName || receiver.name, 
        ...scores 
      };
    }).sort((a, b) => b.compositeScore - a.compositeScore).slice(0, 5);

    res.json({ matches });
  } catch (error) {
    res.status(500).json({ error: 'Failed to find matches' });
  }
});

module.exports = router;
