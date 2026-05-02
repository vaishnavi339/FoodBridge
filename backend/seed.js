/**
 * FoodBridge Demo Seed Script
 * Creates realistic, presentation-ready data
 * Run: node seed.js
 */

require('dotenv').config();
const { sequelize, User, FoodListing, Claim, Notification } = require('./models');

const seedData = async () => {
  try {
    await sequelize.sync({ force: true });
    console.log('🗑️  Database cleared and re-synced\n');

    const now = new Date();

    // ══════════════════════════════════════════
    //  USERS
    // ══════════════════════════════════════════

    // Admin
    const admin = await User.create({
      name: 'Admin',
      email: 'admin@foodbridge.org',
      password: 'admin123',
      role: 'admin',
      orgName: 'FoodBridge HQ',
      orgType: 'ngo',
      phone: '+91-9876540000',
      address: 'Connaught Place, New Delhi',
      latitude: 28.6315,
      longitude: 77.2167,
      isVerified: true,
      isActive: true,
    });

    // ── Donors ─────────────────────────────────
    const [tajHotel, freshMart, spiceRoute] = await Promise.all([
      User.create({
        name: 'Rajesh Sharma',
        email: 'rajesh@tajhotel.com',
        password: 'password123',
        role: 'donor',
        orgName: 'Taj Palace Hotel',
        orgType: 'hotel',
        phone: '+91-9876543001',
        address: 'Sardar Patel Marg, Diplomatic Enclave, New Delhi',
        latitude: 28.5973,
        longitude: 77.1713,
        isVerified: true,
        isActive: true,
        totalDonations: 47,
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
        isActive: true,
        totalDonations: 32,
        rating: 4.6,
      }),
      User.create({
        name: 'Amit Kumar',
        email: 'amit@spiceroute.com',
        password: 'password123',
        role: 'donor',
        orgName: 'Spice Route Restaurant',
        orgType: 'restaurant',
        phone: '+91-9876543003',
        address: 'Hauz Khas Village, South Delhi',
        latitude: 28.5494,
        longitude: 77.2001,
        isVerified: true,
        isActive: true,
        totalDonations: 63,
        rating: 4.9,
      }),
    ]);

    // ── NGOs / Receivers ───────────────────────
    const [meera, asha, annapurna, hope, feedingDelhi] = await Promise.all([
      User.create({
        name: 'Meera Sharma',
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
        isActive: true,
        totalReceived: 28,
        rating: 4.7,
      }),
      User.create({
        name: 'Sunita Verma',
        email: 'sunita@ashafoundation.org',
        password: 'password123',
        role: 'receiver',
        orgName: 'Asha Foundation',
        orgType: 'ngo',
        phone: '+91-9876543102',
        address: 'Rohini Sector 15, North Delhi',
        latitude: 28.7195,
        longitude: 77.1159,
        isVerified: true,
        isActive: true,
        totalReceived: 41,
        rating: 4.8,
      }),
      User.create({
        name: 'Ravi Anand',
        email: 'info@annapurna.org',
        password: 'password123',
        role: 'receiver',
        orgName: 'Annapurna Community Kitchen',
        orgType: 'community_kitchen',
        phone: '+91-9876543103',
        address: 'Chandni Chowk, Old Delhi',
        latitude: 28.6507,
        longitude: 77.2334,
        isVerified: true,
        isActive: true,
        totalReceived: 52,
        rating: 4.9,
      }),
      User.create({
        name: 'Kapil Arora',
        email: 'contact@hopeindia.org',
        password: 'password123',
        role: 'receiver',
        orgName: 'Hope India Trust',
        orgType: 'ngo',
        phone: '+91-9876543104',
        address: 'Saket, South Delhi',
        latitude: 28.5244,
        longitude: 77.2167,
        isVerified: true,
        isActive: true,
        totalReceived: 19,
        rating: 4.5,
      }),
      User.create({
        name: 'Divya Singh',
        email: 'hello@feedingdelhi.org',
        password: 'password123',
        role: 'receiver',
        orgName: 'Feeding Delhi Network',
        orgType: 'ngo',
        phone: '+91-9876543105',
        address: 'Janakpuri, West Delhi',
        latitude: 28.6280,
        longitude: 77.0830,
        isVerified: true,
        isActive: true,
        totalReceived: 11,
        rating: 4.3,
      }),
    ]);

    // ── Volunteers ─────────────────────────────
    const [vikram, neha] = await Promise.all([
      User.create({
        name: 'Vikram Singh',
        email: 'vikram@volunteer.com',
        password: 'password123',
        role: 'volunteer',
        orgName: null,
        phone: '+91-9876543201',
        address: 'Vasant Kunj, South Delhi',
        latitude: 28.5200,
        longitude: 77.1600,
        isVerified: true,
        isActive: true,
        totalDonations: 18,
        rating: 4.9,
      }),
      User.create({
        name: 'Neha Gupta',
        email: 'neha@volunteer.com',
        password: 'password123',
        role: 'volunteer',
        orgName: null,
        phone: '+91-9876543202',
        address: 'Rohini, North Delhi',
        latitude: 28.7400,
        longitude: 77.1100,
        isVerified: true,
        isActive: true,
        totalDonations: 12,
        rating: 4.7,
      }),
    ]);

    console.log('👥 11 users created (1 admin, 3 donors, 5 NGOs, 2 volunteers)');

    // ══════════════════════════════════════════
    //  FOOD LISTINGS  (6 live + 4 for history)
    // ══════════════════════════════════════════

    // ── 6 LIVE listings with different urgency ─
    //   RED   = expiring in ~45 min
    //   AMBER = expiring in 3-4 h
    //   GREEN = expiring in 12-48 h

    const [
      listing_red,
      listing_amber1,
      listing_amber2,
      listing_green1,
      listing_green2,
      listing_green3,
    ] = await Promise.all([

      // 🔴 RED — 45 minutes left
      FoodListing.create({
        donorId: spiceRoute.id,
        title: 'Chicken Biryani — Wedding Leftover (URGENT)',
        foodType: 'cooked',
        category: 'non_veg',
        quantity: 35,
        unit: 'kg',
        description: 'Hyderabadi Dum Biryani with raita and salan. Wedding function just ended. Must be picked up immediately. Freshly cooked 4 hours ago.',
        expiryTime: new Date(now.getTime() + 45 * 60 * 1000),
        pickupAddress: 'Spice Route Restaurant, Hauz Khas Village, New Delhi',
        latitude: 28.5494,
        longitude: 77.2001,
        status: 'available',
        servesCount: 70,
        allergens: 'Nuts, Dairy',
        specialInstructions: 'Bring large containers. Side gate is open.',
      }),

      // 🟠 AMBER — 3 hours left
      FoodListing.create({
        donorId: tajHotel.id,
        title: 'Corporate Lunch Buffet — Dal, Sabzi & Rice',
        foodType: 'cooked',
        category: 'veg',
        quantity: 28,
        unit: 'kg',
        description: 'Vegetarian buffet surplus from a 200-pax corporate event. Includes Dal Makhani, Paneer Butter Masala, Jeera Rice, Naan, Mixed Veg Curry. All freshly prepared.',
        expiryTime: new Date(now.getTime() + 3 * 60 * 60 * 1000),
        pickupAddress: 'Taj Palace Hotel, Sardar Patel Marg, New Delhi',
        latitude: 28.5973,
        longitude: 77.1713,
        status: 'available',
        servesCount: 55,
        specialInstructions: 'Ask for Chef Ramesh at the back entrance.',
      }),

      // 🟠 AMBER — 4 hours left
      FoodListing.create({
        donorId: freshMart.id,
        title: 'Dairy Bundle — Milk, Paneer & Yogurt',
        foodType: 'dairy',
        category: 'veg',
        quantity: 22,
        unit: 'liters',
        description: 'Approaching sell-by date. Includes full cream milk packets (5L), paneer blocks (4kg), and natural yogurt cups (3kg). Properly cold-stored.',
        expiryTime: new Date(now.getTime() + 4 * 60 * 60 * 1000),
        pickupAddress: 'FreshMart Grocery, Connaught Place, New Delhi',
        latitude: 28.6315,
        longitude: 77.2167,
        status: 'available',
        servesCount: 44,
        specialInstructions: 'Must have refrigeration van for transport.',
      }),

      // 🟢 GREEN — 12 hours left
      FoodListing.create({
        donorId: tajHotel.id,
        title: 'Breakfast Pastries & Breads',
        foodType: 'bakery',
        category: 'veg',
        quantity: 18,
        unit: 'kg',
        description: 'Unsold baked goods from the morning breakfast service: croissants, whole wheat bread loaves, muffins, cookies, and dinner rolls. Baked fresh today.',
        expiryTime: new Date(now.getTime() + 12 * 60 * 60 * 1000),
        pickupAddress: 'Taj Palace Hotel, Sardar Patel Marg, New Delhi',
        latitude: 28.5973,
        longitude: 77.1713,
        status: 'available',
        servesCount: 36,
      }),

      // 🟢 GREEN — 24 hours left
      FoodListing.create({
        donorId: freshMart.id,
        title: 'Fresh Fruits & Vegetables — Seasonal Mix',
        foodType: 'fruits_vegetables',
        category: 'vegan',
        quantity: 45,
        unit: 'kg',
        description: 'Near sell-by date but perfectly edible. Seasonal mix: Apples, Bananas, Oranges, Tomatoes, Onions, Potatoes, Spinach, and Carrots. Great nutritional value.',
        expiryTime: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        pickupAddress: 'FreshMart Grocery, Connaught Place, New Delhi',
        latitude: 28.6315,
        longitude: 77.2167,
        status: 'available',
        servesCount: 90,
      }),

      // 🟢 GREEN — 48 hours left
      FoodListing.create({
        donorId: spiceRoute.id,
        title: 'Packaged Snacks & Juice Boxes (Event)',
        foodType: 'packaged',
        category: 'veg',
        quantity: 120,
        unit: 'packets',
        description: 'Sealed and unopened packaged snacks and juice boxes from a corporate conference. All within expiry date (MFD this month). Includes biscuits, chips, and mixed juices.',
        expiryTime: new Date(now.getTime() + 48 * 60 * 60 * 1000),
        pickupAddress: 'Spice Route Restaurant, Hauz Khas Village, New Delhi',
        latitude: 28.5494,
        longitude: 77.2001,
        status: 'available',
        servesCount: 120,
      }),
    ]);

    // ── 4 HISTORICAL listings (delivered) ─────
    const [hist1, hist2, hist3, hist4] = await Promise.all([
      FoodListing.create({
        donorId: tajHotel.id,
        title: 'Sunday Brunch Surplus — Mixed Continental',
        foodType: 'cooked', category: 'mixed', quantity: 40, unit: 'kg',
        description: 'Delivered successfully.',
        expiryTime: new Date(now.getTime() - 20 * 60 * 60 * 1000),
        pickupAddress: 'Taj Palace Hotel, New Delhi',
        latitude: 28.5973, longitude: 77.1713,
        status: 'delivered', servesCount: 80,
      }),
      FoodListing.create({
        donorId: spiceRoute.id,
        title: 'Rajma Chawal & Sabzi — Lunch Surplus',
        foodType: 'cooked', category: 'veg', quantity: 22, unit: 'kg',
        description: 'Delivered successfully.',
        expiryTime: new Date(now.getTime() - 30 * 60 * 60 * 1000),
        pickupAddress: 'Spice Route Restaurant, Hauz Khas, New Delhi',
        latitude: 28.5494, longitude: 77.2001,
        status: 'delivered', servesCount: 44,
      }),
      FoodListing.create({
        donorId: freshMart.id,
        title: 'Bread Loaves & Eggs — Morning Clear',
        foodType: 'bakery', category: 'veg', quantity: 14, unit: 'kg',
        description: 'Delivered successfully.',
        expiryTime: new Date(now.getTime() - 42 * 60 * 60 * 1000),
        pickupAddress: 'FreshMart Grocery, Connaught Place, New Delhi',
        latitude: 28.6315, longitude: 77.2167,
        status: 'delivered', servesCount: 28,
      }),
      FoodListing.create({
        donorId: tajHotel.id,
        title: 'Gala Dinner Surplus — 3-Course Meal',
        foodType: 'cooked', category: 'non_veg', quantity: 60, unit: 'kg',
        description: 'Delivered successfully.',
        expiryTime: new Date(now.getTime() - 50 * 60 * 60 * 1000),
        pickupAddress: 'Taj Palace Hotel, New Delhi',
        latitude: 28.5973, longitude: 77.1713,
        status: 'delivered', servesCount: 120,
      }),
    ]);

    console.log('🍽️  10 listings created (6 live, 4 delivered)');

    // ══════════════════════════════════════════
    //  CLAIMS — 4 completed deliveries
    // ══════════════════════════════════════════

    await Promise.all([
      Claim.create({
        listingId: hist1.id,
        receiverId: annapurna.id,
        volunteerId: vikram.id,
        status: 'delivered',
        matchScore: 91.4,
        distanceKm: 2.3,
        claimType: 'volunteer_delivery',
        assignedAt: new Date(now.getTime() - 23 * 60 * 60 * 1000),
        pickedUpAt:  new Date(now.getTime() - 22 * 60 * 60 * 1000),
        deliveredAt: new Date(now.getTime() - 21 * 60 * 60 * 1000),
        rating: 5,
        feedback: 'Excellent! 80 people fed today. Food was perfectly fresh.',
      }),
      Claim.create({
        listingId: hist2.id,
        receiverId: meera.id,
        volunteerId: neha.id,
        status: 'delivered',
        matchScore: 84.7,
        distanceKm: 6.1,
        claimType: 'volunteer_delivery',
        assignedAt: new Date(now.getTime() - 33 * 60 * 60 * 1000),
        pickedUpAt:  new Date(now.getTime() - 32 * 60 * 60 * 1000),
        deliveredAt: new Date(now.getTime() - 31 * 60 * 60 * 1000),
        rating: 5,
        feedback: 'Great quality, well packaged. Our families loved the food.',
      }),
      Claim.create({
        listingId: hist3.id,
        receiverId: asha.id,
        volunteerId: vikram.id,
        status: 'delivered',
        matchScore: 78.9,
        distanceKm: 9.4,
        claimType: 'volunteer_delivery',
        assignedAt: new Date(now.getTime() - 45 * 60 * 60 * 1000),
        pickedUpAt:  new Date(now.getTime() - 44 * 60 * 60 * 1000),
        deliveredAt: new Date(now.getTime() - 43 * 60 * 60 * 1000),
        rating: 4,
        feedback: 'Good fresh bread. Very helpful volunteer.',
      }),
      Claim.create({
        listingId: hist4.id,
        receiverId: hope.id,
        volunteerId: neha.id,
        status: 'delivered',
        matchScore: 88.2,
        distanceKm: 4.5,
        claimType: 'volunteer_delivery',
        assignedAt: new Date(now.getTime() - 53 * 60 * 60 * 1000),
        pickedUpAt:  new Date(now.getTime() - 52 * 60 * 60 * 1000),
        deliveredAt: new Date(now.getTime() - 51 * 60 * 60 * 1000),
        rating: 5,
        feedback: '120 people benefited from this gala dinner surplus. Thank you!',
      }),
    ]);

    console.log('📦 4 completed deliveries created');

    // ══════════════════════════════════════════
    //  UPDATE totalDonations on donors after history
    // ══════════════════════════════════════════
    await tajHotel.update({ totalDonations: 47 });
    await freshMart.update({ totalDonations: 32 });
    await spiceRoute.update({ totalDonations: 63 });
    await vikram.update({ totalDonations: 18 });
    await neha.update({ totalDonations: 12 });
    await annapurna.update({ totalReceived: 52 });
    await meera.update({ totalReceived: 28 });
    await asha.update({ totalReceived: 41 });
    await hope.update({ totalReceived: 19 });

    // ══════════════════════════════════════════
    //  NOTIFICATIONS — fresh and unread for demo
    // ══════════════════════════════════════════
    await Promise.all([
      // Donor notifications
      Notification.create({ userId: tajHotel.id, type: 'delivery_complete', title: '🎊 Delivery Complete!', message: 'Your "Sunday Brunch Surplus" was delivered to Annapurna Kitchen. 80 people fed!', isRead: false }),
      Notification.create({ userId: tajHotel.id, type: 'listing_claimed', title: '✅ Listing Claimed', message: 'Meera Foundation has claimed your "Corporate Lunch Buffet". Volunteer assigned.', isRead: false }),
      Notification.create({ userId: tajHotel.id, type: 'delivery_complete', title: '🎊 Delivery Complete!', message: '"Gala Dinner Surplus" reached Hope India Trust. 120 people benefited!', isRead: true }),
      Notification.create({ userId: freshMart.id, type: 'delivery_complete', title: '🎊 Delivery Complete!', message: '"Bread Loaves & Eggs" delivered to Asha Foundation. Rating: ⭐⭐⭐⭐', isRead: false }),
      Notification.create({ userId: freshMart.id, type: 'listing_claimed', title: '✅ Listing Claimed', message: 'Annapurna Kitchen has claimed your "Fresh Fruits & Vegetables". Great match score: 88%!', isRead: false }),
      Notification.create({ userId: spiceRoute.id, type: 'delivery_complete', title: '🎊 Delivery Complete!', message: '"Rajma Chawal Surplus" delivered to Meera Foundation. Rating: ⭐⭐⭐⭐⭐', isRead: false }),
      Notification.create({ userId: spiceRoute.id, type: 'alert', title: '⚠️ Urgent: Food Expiring Soon', message: 'Your listing "Chicken Biryani" expires in 45 minutes! An NGO has been auto-notified.', isRead: false }),

      // NGO notifications
      Notification.create({ userId: meera.id, type: 'new_match', title: '🔔 New Match Available!', message: 'Corporate Lunch Buffet (28kg) at Taj Hotel — 3h left. Match score: 84%. Claim now!', isRead: false }),
      Notification.create({ userId: meera.id, type: 'delivery_complete', title: '📦 Food Received!', message: 'Rajma Chawal (22kg) has been delivered. Please confirm receipt and rate the volunteer.', isRead: false }),
      Notification.create({ userId: asha.id, type: 'new_match', title: '🔔 Urgent Match!', message: 'Chicken Biryani (35kg) expiring in 45 min near you. Claim immediately!', isRead: false }),
      Notification.create({ userId: asha.id, type: 'delivery_complete', title: '📦 Food Received!', message: 'Bread Loaves (14kg) delivered by Vikram Singh. 28 people can be served.', isRead: false }),
      Notification.create({ userId: annapurna.id, type: 'new_match', title: '🔔 New Match Available!', message: 'Fresh Fruits & Vegetables (45kg) at FreshMart — 24h window. Match score: 91%.', isRead: false }),
      Notification.create({ userId: hope.id, type: 'delivery_complete', title: '📦 Food Received!', message: 'Gala Dinner Surplus (60kg) received. 120 people will benefit tonight!', isRead: false }),

      // Volunteer notifications
      Notification.create({ userId: vikram.id, type: 'new_task', title: '🚴 New Delivery Task!', message: 'Pickup from Taj Palace Hotel → Delivery to Meera Foundation. Est. payout: ₹85.', isRead: false }),
      Notification.create({ userId: vikram.id, type: 'task_complete', title: '✅ Task Complete', message: 'You delivered "Sunday Brunch Surplus" successfully! Rating: ⭐⭐⭐⭐⭐. Payout: ₹90 credited.', isRead: false }),
      Notification.create({ userId: neha.id, type: 'new_task', title: '🚴 New Delivery Task!', message: 'Pickup from FreshMart CP → Delivery to Asha Foundation, Rohini. Est. payout: ₹110.', isRead: false }),
      Notification.create({ userId: neha.id, type: 'task_complete', title: '✅ Task Complete', message: 'You delivered "Rajma Chawal Surplus" to Meera Foundation. Payout: ₹95 credited.', isRead: false }),
    ]);

    console.log('🔔 18 notifications created\n');

    console.log(`
╔═══════════════════════════════════════════════════════╗
║          ✅  FoodBridge Demo Data Ready!               ║
╠═══════════════════════════════════════════════════════╣
║  ACCOUNTS                                             ║
║  ─────────────────────────────────────────────────── ║
║  Admin:     admin@foodbridge.org    / admin123        ║
║  Donor 1:   rajesh@tajhotel.com     / password123     ║
║  Donor 2:   priya@freshmart.com     / password123     ║
║  Donor 3:   amit@spiceroute.com     / password123     ║
║  NGO 1:     meera@meerafoundation.org / password123   ║
║  NGO 2:     sunita@ashafoundation.org / password123   ║
║  NGO 3:     info@annapurna.org      / password123     ║
║  Volunteer: vikram@volunteer.com    / password123     ║
║  Volunteer: neha@volunteer.com      / password123     ║
╠═══════════════════════════════════════════════════════╣
║  LISTINGS   6 live  +  4 delivered in history         ║
║    🔴 URGENT  — Biryani (45 min left)                 ║
║    🟠 AMBER   — Buffet (3h), Dairy (4h)               ║
║    🟢 GREEN   — Bakery (12h), Fruits (24h), Snacks    ║
╠═══════════════════════════════════════════════════════╣
║  IMPACT                                               ║
║    4 completed deliveries                             ║
║    136 kg food saved (40+22+14+60)                    ║
║    272 people fed                                     ║
║    3 donors   |   5 NGOs   |   2 volunteers           ║
╚═══════════════════════════════════════════════════════╝
`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
};

seedData();
