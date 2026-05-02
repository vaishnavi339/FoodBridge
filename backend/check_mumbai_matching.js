/**
 * Script to check if Mumbai listing matches Mumbai NGO
 */
require('dotenv').config();
const { User, FoodListing, sequelize } = require('./models');
const MatchingEngine = require('./services/matchingEngine');

const checkMatching = async () => {
  try {
    await sequelize.authenticate();
    
    // 1. Get the Mumbai listing
    const listing = await FoodListing.findOne({
      where: { title: 'Lunch Thalis - Surplus' }
    });

    if (!listing) {
      console.error('Mumbai listing not found!');
      process.exit(1);
    }

    // 2. Get all active receivers
    const receivers = await User.findAll({
      where: { role: 'receiver', isActive: true }
    });

    console.log(`Checking matches for: "${listing.title}" in ${listing.pickupAddress}`);
    console.log(`Total NGOs in database: ${receivers.length}`);

    // 3. Find matches
    const matches = await MatchingEngine.findBestMatches(listing, receivers);

    console.log('\nTop Matches found:');
    matches.forEach((m, i) => {
      console.log(`${i+1}. ${m.receiver.orgName}`);
      console.log(`   Distance: ${m.distanceKm} km`);
      console.log(`   Score: ${m.compositeScore}`);
      console.log(`   Address: ${m.receiver.address}`);
    });

    if (matches.length > 0 && matches[0].receiver.orgName === 'Mumbai Food Bank') {
      console.log('\n✅ SUCCESS: The system correctly matched the Mumbai donor with the nearest Mumbai NGO!');
    } else {
      console.log('\n❌ FAILED: Mumbai Food Bank was not the top match.');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkMatching();
