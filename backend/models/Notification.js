const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM(
      'listing_created', 'listing_claimed', 'listing_expired',
      'claim_approved', 'claim_rejected', 'pickup_confirmed',
      'delivery_confirmed', 'new_match', 'system_alert',
      'volunteer_assigned', 'rating_received'
    ),
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  data: {
    type: DataTypes.TEXT, // JSON data
    allowNull: true,
    get() {
      const raw = this.getDataValue('data');
      return raw ? JSON.parse(raw) : null;
    },
    set(val) {
      this.setDataValue('data', val ? JSON.stringify(val) : null);
    },
  },
  read: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  channel: {
    type: DataTypes.ENUM('in_app', 'email', 'sms', 'push'),
    defaultValue: 'in_app',
  },
});

module.exports = Notification;
