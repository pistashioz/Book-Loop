// Import DataTypes and sequelize instance from db.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db.js');

const UserConfiguration = sequelize.define('UserConfiguration', {
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'user', // This references the table name as defined in Sequelize for the User model
            key: 'userId'
        },
        primaryKey: true // Part of composite primary key
    },
    configId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'configuration', // This references the new configuration table
            key: 'configId'
        },
        primaryKey: true // Part of composite primary key
    },
    configValue: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    tableName: 'userConfiguration',
    timestamps: false, // No need for createdAt/updatedAt
    freezeTableName: true, // Prevents Sequelize from renaming the table
});


module.exports = UserConfiguration;