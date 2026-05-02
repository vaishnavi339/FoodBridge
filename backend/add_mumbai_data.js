/**
 * Script to add Mumbai demo data
 */
require('dotenv').config();
const { User, FoodListing, sequelize } = require('./models');

const addMumbaiData = async () => {
  try {
    // Ensure connection
    await sequelize.authenticate();
    console.log('Connected to database');

    // 1. Create a Mumbai NGO
    const mumbaiNGO = await User.create({
      name: 'Mumbai Food Bank',
      email: 'mumbai@foodbank.org',
      password: 'password123',
      role: 'receiver',
      orgName: 'Mumbai Food Bank',
      orgType: 'ngo',
      phone: '+91-9876543501',
      address: 'Andheri West, Mumbai, Maharashtra',
      latitude: 19.1136,
      longitude: 72.8697,
      isVerified: true,
      totalReceived: 5,
      rating: 4.9,
    });
    console.log('✅ Mumbai NGO created: Mumbai Food Bank');

    // 2. Create a Mumbai Donor
    const mumbaiDonor = await User.create({
      name: 'Sahil Kapoor',
      email: 'sahil@mumbaibistro.com',
      password: 'password123',
      role: 'donor',
      orgName: 'The Mumbai Bistro',
      orgType: 'restaurant',
      phone: '+91-9876543502',
      address: 'Juhu Tara Road, Mumbai, Maharashtra',
      latitude: 19.1025,
      longitude: 72.8271,
      isVerified: true,
      totalDonations: 12,
      rating: 4.7,
    });
    console.log('✅ Mumbai Donor created: The Mumbai Bistro');

    // 3. Create a Mumbai Food Listing
    const now = new Date();
    await FoodListing.create({
      donorId: mumbaiDonor.id,
      title: 'Lunch Thalis - Surplus',
      foodType: 'cooked',
      category: 'veg',
      quantity: 15,
      unit: 'kg',
      description: 'Freshly prepared vegetarian lunch thalis. Includes roti, sabzi, dal, and rice.',
      expiryTime: new Date(now.getTime() + 5 * 60 * 60 * 1000),
      pickupAddress: 'The Mumbai Bistro, Juhu, Mumbai',
      latitude: 19.1025,
      longitude: 72.8271,
      status: 'available',
      servesCount: 30,
    });
    console.log('✅ Mumbai Food Listing created');

    console.log('\nAll Mumbai data added successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to add Mumbai data:', error);
    process.exit(1);
  }
};

addMumbaiData();
