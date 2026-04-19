const sequelize = require('../config/database');
const User = require('./User');
const FoodListing = require('./FoodListing');
const Claim = require('./Claim');
const Notification = require('./Notification');

// Associations
User.hasMany(FoodListing, { foreignKey: 'donorId', as: 'listings' });
FoodListing.belongsTo(User, { foreignKey: 'donorId', as: 'donor' });

User.hasMany(Claim, { foreignKey: 'receiverId', as: 'claims' });
Claim.belongsTo(User, { foreignKey: 'receiverId', as: 'receiver' });

FoodListing.hasMany(Claim, { foreignKey: 'listingId', as: 'claims' });
Claim.belongsTo(FoodListing, { foreignKey: 'listingId', as: 'listing' });

Claim.belongsTo(User, { foreignKey: 'volunteerId', as: 'volunteer' });

User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = {
  sequelize,
  User,
  FoodListing,
  Claim,
  Notification,
};
