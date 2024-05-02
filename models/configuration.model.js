const { DataTypes } = require('sequelize');
const sequelize = require('../db.js');

const Configuration = sequelize.define('Configuration', {
    configId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    configType: {
        type: DataTypes.ENUM('privacy', 'notifications', 'display', 'interface', 'shipping', 'marketing'),
        allowNull: false
    },
    configKey: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT
    }
}, {
    tableName: 'configuration',
    timestamps: false // No need for createdAt/updatedAt
});

module.exports = Configuration;
