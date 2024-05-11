const { getEnumValues } = require('../utils/sequelizeHelpers');

module.exports = (sequelize, DataTypes) => {
    const Listing = sequelize.define('Listing', {
        listingId: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        sellerUserId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'user', 
                key: 'userId'
            }
        },
        ISBN: {
            type: DataTypes.STRING(20),
            allowNull: false,
            references: {
                model: 'bookEdition', 
                key: 'ISBN'
            }    
        },
        listingTitle: {
            type: DataTypes.STRING,
            allowNull: false
        },
        listingDate: {
            type: DataTypes.DATE,
            allowNull: false
        },
        price: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        },
        listingCondition: {
            type: DataTypes.ENUM('New', 'Very Good', 'Good', 'Acceptable'),
            allowNull: false,
            validate: {
                isValidListingCondition(value) {
                    const allowedValues = getEnumValues(sequelize, 'Listing', 'listingCondition');
                    if (!allowedValues.includes(value)) {
                        throw new Error('Invalid listing condition selection');
                    }
                }
            }
        },
        availability: {
            type: DataTypes.ENUM('Active', 'Sold', 'Hidden', 'Reserved'),
            allowNull: false,
            defaultValue: 'Active',
            validate: {
                isValidAvailability(value) {
                    const allowedValues = getEnumValues(sequelize, 'Listing', 'availability');
                    if (!allowedValues.includes(value)) {
                        throw new Error('Invalid availability selection');
                    }
                }
            }
        },
        listingDescription: {
            type: DataTypes.TEXT,
            allowNull: false
        }
    }, {
        tableName: 'listing',
        timestamps: false,
        freezeTableName: true
    });

    return Listing;
};
