// Import DataTypes and sequelize instance from db.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db.js');


const User = sequelize.define('User', {
  userId: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  username: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  profileImage: {
    type: DataTypes.STRING(1000)  // If not enough, adjust this value
  },
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  birthDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  registrationDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW // Automatically sets the current timestamp on record creation
  },
  isActiveStatus: {
    type: DataTypes.ENUM('active', 'suspended', 'banned', 'to be deleted'),
    defaultValue: 'active'
  },
  deletionScheduleDate: {
    type: DataTypes.DATE
  },
  addressId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'address', // The name of the table to refer as a FK
      key: 'addressId'
    }
  },
  showCity: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  deliverByHand: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  about: {
    type: DataTypes.TEXT
  },
  averageRating: {
    type: DataTypes.DECIMAL(3, 2),
    validate: {
      min: 0,
      max: 5
    }
  },
  defaultLanguage: {
    type: DataTypes.ENUM('EN', 'PT-EU'),
    defaultValue: 'EN'
  },
  holidayMode: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isAdmin: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'user',  // Specify the table name in the database
  timestamps: false   // Not using Sequelize's automatic timestamp fields
});

module.exports = User;
