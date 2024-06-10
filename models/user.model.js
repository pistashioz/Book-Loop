const bcrypt = require('bcrypt');
const { getEnumValues } = require('../utils/sequelizeHelpers');

// Helper Functions
const validateAddressComplete = function(value, next) {
    if ((value !== undefined || this.street !== undefined || this.streetNumber !== undefined || this.postalCode !== undefined) && 
    !(this.street && this.streetNumber && this.postalCode)) {
        throw new Error('All address fields must be provided together.');
    }
    next();
};

// User Model Definition
module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define('User', {
        userId: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        name: DataTypes.STRING,
        username: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        profileImage: DataTypes.STRING(1000),
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                isEmail: { msg: 'Must be a valid email address' }
            }
        },
        isVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
        password: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notNull: { msg: 'Password cannot be null or empty!' },
                len: { args: [5, 60], msg: 'Password should be between 8 and 60 characters' } // Adjusted maximum length
            }
        },
        birthDate: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            validate: {
                isDate: { msg: 'Must be a valid date' },
                isOldEnough
            }
        },
        registrationDate: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        isActiveStatus: {
            type: DataTypes.ENUM('active', 'suspended', 'deactivated', 'to be deleted'),
            defaultValue: 'active'
        },
        deletionScheduleDate: DataTypes.DATE,
        street: { type: DataTypes.STRING },
        streetNumber: {
            type: DataTypes.STRING,
            validate: {
                isAlphanumeric: { msg: 'Street number must be alphanumeric' },
            }
        },
        postalCode: {
            type: DataTypes.STRING,
            references: { model: 'postalCode', key: 'postalCode' },
        },
        showCity: { type: DataTypes.BOOLEAN, defaultValue: false },
        deliverByHand: { type: DataTypes.BOOLEAN, defaultValue: false },
        about: DataTypes.TEXT,
        defaultLanguage: {
            type: DataTypes.ENUM('EN', 'PT-EU'),
            defaultValue: 'EN',
            validate: {
                isValidLanguage(value) {
                    const allowedValues = getEnumValues(sequelize, 'User', 'defaultLanguage');
                    if (!allowedValues.includes(value)) {
                        throw new Error('Invalid default language selection');
                    }
                }
            }
        },
        holidayMode: { type: DataTypes.BOOLEAN, defaultValue: false },
        isAdmin: { type: DataTypes.BOOLEAN, defaultValue: false },
        totalReviews: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        totalFollowers: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        totalFollowing: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        sellerAverageRating: {
            type: DataTypes.DECIMAL(3, 2),
            defaultValue: 0,
            validate: { min: 0, max: 5 }
        },
        sellerReviewCount: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        }
    }, {
        tableName: 'user',
        timestamps: false,
        freezeTableName: true,
        hooks: {
            // Hash password before user creation and updates
            beforeCreate: async (user) => {
                const salt = await bcrypt.genSaltSync(10);
                user.password = await bcrypt.hashSync(user.password, salt);
            },
            beforeUpdate: async (user) => {
                if (user.changed('password')) {
                    const salt = await bcrypt.genSaltSync(10);
                    user.password = await bcrypt.hashSync(user.password, salt);
                }
            }
        },
        indexes: [{ unique: true, fields: ['username'] }, { unique: true, fields: ['email'] }]
    });
    
    function isOldEnough(value) {
        const today = new Date();
        const birthDate = new Date(value);
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        if (age < 16) {
            throw new Error('User must be at least 16 years of age to register.');
        }
    }
    
    // Validate the password for authentication
    User.prototype.validPassword = async function(password) {
        return await bcrypt.compare(password, this.password);
    };
    
    return User;
};
