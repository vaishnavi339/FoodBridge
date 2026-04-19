const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const FoodListing = sequelize.define('FoodListing', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  donorId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  foodType: {
    type: DataTypes.ENUM('cooked', 'raw', 'packaged', 'beverages', 'bakery', 'dairy', 'fruits_vegetables', 'mixed'),
    allowNull: false,
  },
  category: {
    type: DataTypes.ENUM('veg', 'non_veg', 'vegan', 'mixed'),
    allowNull: false,
    defaultValue: 'mixed',
  },
  quantity: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  unit: {
    type: DataTypes.ENUM('kg', 'liters', 'servings', 'packets', 'boxes', 'pieces'),
    allowNull: false,
    defaultValue: 'kg',
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  photos: {
    type: DataTypes.TEXT, // JSON array of URLs
    allowNull: true,
    get() {
      const raw = this.getDataValue('photos');
      return raw ? JSON.parse(raw) : [];
    },
    set(val) {
      this.setDataValue('photos', JSON.stringify(val || []));
    },
  },
  expiryTime: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  pickupAddress: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  latitude: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  longitude: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('available', 'claimed', 'in_transit', 'delivered', 'expired', 'cancelled'),
    defaultValue: 'available',
  },
  urgencyScore: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  spoilageRisk: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    defaultValue: 'low',
  },
  servesCount: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  allergens: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  pickupWindowStart: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  pickupWindowEnd: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  specialInstructions: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
});

// Calculate urgency score before save
FoodListing.beforeSave(async (listing) => {
  if (listing.expiryTime) {
    const now = new Date();
    const expiry = new Date(listing.expiryTime);
    const hoursRemaining = (expiry - now) / (1000 * 60 * 60);

    if (hoursRemaining <= 0) {
      listing.urgencyScore = 100;
      listing.spoilageRisk = 'critical';
    } else if (hoursRemaining <= 2) {
      listing.urgencyScore = 90;
      listing.spoilageRisk = 'critical';
    } else if (hoursRemaining <= 6) {
      listing.urgencyScore = 70;
      listing.spoilageRisk = 'high';
    } else if (hoursRemaining <= 12) {
      listing.urgencyScore = 50;
      listing.spoilageRisk = 'medium';
    } else if (hoursRemaining <= 24) {
      listing.urgencyScore = 30;
      listing.spoilageRisk = 'low';
    } else {
      listing.urgencyScore = 10;
      listing.spoilageRisk = 'low';
    }
  }
});

module.exports = FoodListing;
