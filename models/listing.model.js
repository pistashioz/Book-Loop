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
        editionUUID: {
            type: DataTypes.CHAR(36),
            allowNull: false,
            references: {
                model: 'bookEdition', 
                key: 'UUID'
            }    
        },
        listingTitle: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notNull: { msg: 'Listing title cannot be null or empty!' },
                len: {
                    args: [1, 100], // Adjust the max length as needed
                    msg: 'Listing title must be between 1 and 100 characters long.'
                }
            }
        },
        listingDate: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
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
            type: DataTypes.ENUM('Active', 'Sold', 'Hidden', 'Reserved', 'Pending Approval'),
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
            allowNull: false,
            validate: {
                notNull: { msg: 'Listing description cannot be null or empty!' },
                len: {
                    args: [20, 2000], // Adjust the min and max length as needed
                    msg: 'Listing description must be between 20 and 2000 characters long.'
                }
            }
        }
    }, {
        tableName: 'listing',
        timestamps: false,
        freezeTableName: true
    });

    return Listing;
};
