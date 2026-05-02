const express = require('express');
const { Op } = require('sequelize');
const { User } = require('../models');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Haversine distance in km
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// GET /api/partners - Get all verified and active partners
router.get('/', auth, async (req, res) => {
  try {
    const { orgType, role } = req.query;
    const where = {
      isVerified: true,
      isActive: true,
      role: { [Op.in]: ['donor', 'receiver'] }
    };

    if (orgType) where.orgType = orgType;
    if (role) where.role = role;

    const partners = await User.findAll({
      where,
      attributes: [
        'id', 'name', 'orgName', 'orgType', 'role',
        'phone', 'address', 'latitude', 'longitude',
        'avatar', 'rating', 'totalDonations', 'totalReceived'
      ],
      order: [['orgName', 'ASC']]
    });

    res.json({ partners });
  } catch (error) {
    console.error('Get partners error:', error);
    res.status(500).json({ error: 'Failed to fetch partners' });
  }
});

// GET /api/partners/nearby?lat=...&lng=...&radius=...
// Returns all donor-type partners within radius km of a given coordinate
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = 100 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng are required' });
    }

    const centerLat = parseFloat(lat);
    const centerLng = parseFloat(lng);
    const radiusKm = parseFloat(radius);

    // Fetch all active donors (restaurants, hotels, etc.)
    const all = await User.findAll({
      where: {
        isVerified: true,
        isActive: true,
        role: 'donor',
        latitude: { [Op.not]: null },
        longitude: { [Op.not]: null },
      },
      attributes: [
        'id', 'name', 'orgName', 'orgType', 'role',
        'phone', 'address', 'latitude', 'longitude',
        'avatar', 'rating', 'totalDonations'
      ],
    });

    // Filter and annotate with distance
    const nearby = all
      .map(p => {
        const dist = haversineKm(centerLat, centerLng, p.latitude, p.longitude);
        return { ...p.toJSON(), _distanceKm: Math.round(dist * 10) / 10 };
      })
      .filter(p => p._distanceKm <= radiusKm)
      .sort((a, b) => a._distanceKm - b._distanceKm);

    res.json({ partners: nearby, center: { lat: centerLat, lng: centerLng }, radiusKm });
  } catch (error) {
    console.error('Nearby partners error:', error);
    res.status(500).json({ error: 'Failed to fetch nearby partners' });
  }
});

module.exports = router;

