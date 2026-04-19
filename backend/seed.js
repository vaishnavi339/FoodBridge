/**
 * Seed script — creates demo data for the Smart Food Distribution System
 * Run: node seed.js
 */

require('dotenv').config();
const { sequelize, User, FoodListing, Claim, Notification } = require('./models');

const seedData = async () => {
  try {
    await sequelize.sync({ force: true });
    console.log('🗑️  Database cleared and re-synced');

    // ========== Create Users ==========

    // Admin
    const admin = await User.create({
      name: 'Admin',
      email: 'admin@foodbridge.org',
      password: 'admin123',
      role: 'admin',
      orgName: 'FoodBridge HQ',
      phone: '+91-9876543210',
      address: 'Central Hub, New Delhi',
      latitude: 28.6139,
      longitude: 77.2090,
      isVerified: true,
    });

    // Donors
    const donors = await Promise.all([
      User.create({
        name: 'Rajesh Sharma',
        email: 'rajesh@tajhotel.com',
        password: 'password123',
        role: 'donor',
        orgName: 'Taj Palace Hotel',
        orgType: 'hotel',
        phone: '+91-9876543001',
        address: 'Sardar Patel Marg, New Delhi',
        latitude: 28.5973,
        longitude: 77.1713,
        isVerified: true,
        totalDonations: 45,
        rating: 4.8,
      }),
      User.create({
        name: 'Priya Patel',
        email: 'priya@freshmart.com',
        password: 'password123',
        role: 'donor',
        orgName: 'FreshMart Grocery',
        orgType: 'grocery',
        phone: '+91-9876543002',
        address: 'Connaught Place, New Delhi',
        latitude: 28.6315,
        longitude: 77.2167,
        isVerified: true,
        totalDonations: 30,
        rating: 4.5,
      }),
      User.create({
        name: 'Amit Kumar',
        email: 'amit@spicerestaurant.com',
        password: 'password123',
        role: 'donor',
        orgName: 'Spice Route Restaurant',
        orgType: 'restaurant',
        phone: '+91-9876543003',
        address: 'Hauz Khas Village, New Delhi',
        latitude: 28.5494,
        longitude: 77.2001,
        isVerified: true,
        totalDonations: 60,
        rating: 4.9,
      }),
      User.create({
        name: 'Sunita Verma',
        email: 'sunita@bakershop.com',
        password: 'password123',
        role: 'donor',
        orgName: 'Baker\'s Delight',
        orgType: 'restaurant',
        phone: '+91-9876543004',
        address: 'Lajpat Nagar, New Delhi',
        latitude: 28.5700,
        longitude: 77.2400,
        isVerified: true,
        totalDonations: 25,
        rating: 4.6,
      }),
    ]);

    // Receivers (NGOs)
    const receivers = await Promise.all([
      User.create({
        name: 'Meera Foundation',
        email: 'meera@meerafoundation.org',
        password: 'password123',
        role: 'receiver',
        orgName: 'Meera Foundation',
        orgType: 'ngo',
        phone: '+91-9876543101',
        address: 'Dwarka Sector 12, New Delhi',
        latitude: 28.5921,
        longitude: 77.0460,
        isVerified: true,
        totalReceived: 20,
        rating: 4.7,
      }),
      User.create({
        name: 'Annapurna Kitchen',
        email: 'info@annapurna.org',
        password: 'password123',
        role: 'receiver',
        orgName: 'Annapurna Community Kitchen',
        orgType: 'community_kitchen',
        phone: '+91-9876543102',
        address: 'Chandni Chowk, Old Delhi',
        latitude: 28.6507,
        longitude: 77.2334,
        isVerified: true,
        totalReceived: 35,
        rating: 4.9,
      }),
      User.create({
        name: 'Hope India Trust',
        email: 'contact@hopeindia.org',
        password: 'password123',
        role: 'receiver',
        orgName: 'Hope India Trust',
        orgType: 'ngo',
        phone: '+91-9876543103',
        address: 'Saket, New Delhi',
        latitude: 28.5244,
        longitude: 77.2167,
        isVerified: true,
        totalReceived: 15,
        rating: 4.5,
      }),
      User.create({
        name: 'Feeding Delhi',
        email: 'hello@feedingdelhi.org',
        password: 'password123',
        role: 'receiver',
        orgName: 'Feeding Delhi Network',
        orgType: 'ngo',
        phone: '+91-9876543104',
        address: 'Janakpuri, New Delhi',
        latitude: 28.6280,
        longitude: 77.0830,
        isVerified: true,
        totalReceived: 8,
        rating: 4.3,
      }),
    ]);

    // Volunteers
    const volunteers = await Promise.all([
      User.create({
        name: 'Vikram Singh',
        email: 'vikram@volunteer.com',
        password: 'password123',
        role: 'volunteer',
        phone: '+91-9876543201',
        address: 'Vasant Kunj, New Delhi',
        latitude: 28.5200,
        longitude: 77.1600,
        isVerified: true,
      }),
      User.create({
        name: 'Neha Gupta',
        email: 'neha@volunteer.com',
        password: 'password123',
        role: 'volunteer',
        phone: '+91-9876543202',
        address: 'Rohini, New Delhi',
        latitude: 28.7400,
        longitude: 77.1100,
        isVerified: true,
      }),
    ]);

    console.log('👥 Users created');

    // ========== Create Food Listings ==========
    const now = new Date();

    const listings = await Promise.all([
      FoodListing.create({
        donorId: donors[0].id,
        title: 'Buffet Surplus - Mixed Indian Cuisine',
        foodType: 'cooked',
        category: 'mixed',
        quantity: 25,
        unit: 'kg',
        description: 'Leftover buffet from a corporate event. Includes paneer tikka, dal makhani, naan bread, rice, mixed vegetables. Freshly prepared today.',
        photos: ['/uploads/food1.jpg'],
        expiryTime: new Date(now.getTime() + 4 * 60 * 60 * 1000),
        pickupAddress: 'Taj Palace Hotel, Sardar Patel Marg, New Delhi',
        latitude: 28.5973,
        longitude: 77.1713,
        status: 'available',
        servesCount: 50,
        specialInstructions: 'Please bring insulated containers. Available at back entrance.',
      }),
      FoodListing.create({
        donorId: donors[1].id,
        title: 'Fresh Fruits & Vegetables - Near Expiry',
        foodType: 'fruits_vegetables',
        category: 'vegan',
        quantity: 40,
        unit: 'kg',
        description: 'Assorted fruits and vegetables approaching sell-by date. Includes apples, bananas, tomatoes, potatoes, onions, and spinach. Still perfectly edible.',
        photos: ['/uploads/food2.jpg'],
        expiryTime: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        pickupAddress: 'FreshMart, Connaught Place, New Delhi',
        latitude: 28.6315,
        longitude: 77.2167,
        status: 'available',
        servesCount: 80,
      }),
      FoodListing.create({
        donorId: donors[2].id,
        title: 'Biryani & Curries - Wedding Surplus',
        foodType: 'cooked',
        category: 'non_veg',
        quantity: 50,
        unit: 'kg',
        description: 'Hyderabadi chicken biryani, raita, and gulab jamun from a wedding reception. Cooked 3 hours ago.',
        photos: ['/uploads/food3.jpg'],
        expiryTime: new Date(now.getTime() + 6 * 60 * 60 * 1000),
        pickupAddress: 'Spice Route Restaurant, Hauz Khas Village, New Delhi',
        latitude: 28.5494,
        longitude: 77.2001,
        status: 'available',
        servesCount: 100,
        specialInstructions: 'Contains nuts. Non-vegetarian.',
        allergens: 'Nuts, Dairy',
      }),
      FoodListing.create({
        donorId: donors[3].id,
        title: 'Bread & Pastries - Day End',
        foodType: 'bakery',
        category: 'veg',
        quantity: 15,
        unit: 'kg',
        description: 'Unsold bread loaves, croissants, muffins, and cookies from today. All baked fresh this morning.',
        photos: ['/uploads/food4.jpg'],
        expiryTime: new Date(now.getTime() + 12 * 60 * 60 * 1000),
        pickupAddress: 'Baker\'s Delight, Lajpat Nagar, New Delhi',
        latitude: 28.5700,
        longitude: 77.2400,
        status: 'available',
        servesCount: 30,
      }),
      FoodListing.create({
        donorId: donors[0].id,
        title: 'Packaged Snacks & Beverages',
        foodType: 'packaged',
        category: 'veg',
        quantity: 100,
        unit: 'packets',
        description: 'Leftover packaged snacks and juice boxes from conference. All sealed and within expiry date.',
        photos: ['/uploads/food5.jpg'],
        expiryTime: new Date(now.getTime() + 72 * 60 * 60 * 1000),
        pickupAddress: 'Taj Palace Hotel, Sardar Patel Marg, New Delhi',
        latitude: 28.5973,
        longitude: 77.1713,
        status: 'available',
        servesCount: 100,
      }),
      FoodListing.create({
        donorId: donors[1].id,
        title: 'Dairy Products - Milk & Yogurt',
        foodType: 'dairy',
        category: 'veg',
        quantity: 20,
        unit: 'liters',
        description: 'Fresh milk packets and yogurt containers approaching sell-by date. Properly refrigerated.',
        photos: ['/uploads/food6.jpg'],
        expiryTime: new Date(now.getTime() + 8 * 60 * 60 * 1000),
        pickupAddress: 'FreshMart, Connaught Place, New Delhi',
        latitude: 28.6315,
        longitude: 77.2167,
        status: 'available',
        servesCount: 40,
      }),
    ]);

    console.log('🍽️  Food listings created');

    // ========== Create Sample Claims ==========
    const claim1 = await Claim.create({
      listingId: listings[0].id,
      receiverId: receivers[1].id,
      status: 'delivered',
      matchScore: 87.5,
      distanceKm: 3.2,
      assignedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      pickedUpAt: new Date(now.getTime() - 1.5 * 60 * 60 * 1000),
      deliveredAt: new Date(now.getTime() - 1 * 60 * 60 * 1000),
      rating: 5,
      feedback: 'Excellent quality food. Very well packaged!',
    });

    // Update listing status for claimed one
    // (this one is already delivered, just for history)

    console.log('📋 Claims created');

    // ========== Create Notifications ==========
    await Notification.create({
      userId: donors[0].id,
      type: 'delivery_confirmed',
      title: 'Delivery Complete! 🎊',
      message: 'Your food listing "Buffet Surplus" has been delivered to Annapurna Community Kitchen.',
      data: { listingId: listings[0].id },
      read: true,
    });

    await Notification.create({
      userId: receivers[0].id,
      type: 'new_match',
      title: 'New Food Match! 🔔',
      message: 'Fresh Fruits & Vegetables available near you. Match score: 92%.',
      data: { listingId: listings[1].id, matchScore: 92 },
      read: false,
    });

    console.log('🔔 Notifications created');

    console.log(`
╔═══════════════════════════════════════════════╗
║     ✅ Database seeded successfully!           ║
║                                               ║
║     Admin:  admin@foodbridge.org / admin123    ║
║     Donor:  rajesh@tajhotel.com / password123  ║
║     NGO:    meera@meerafoundation.org / password123 ║
║     Vol:    vikram@volunteer.com / password123  ║
╚═══════════════════════════════════════════════╝
    `);

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
};

seedData();
