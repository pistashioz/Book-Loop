const bcrypt = require('bcrypt');

// Helper Functions
const validateAddressComplete = function(value, next) {
    if ((value !== undefined || this.street !== undefined || this.streetNumber !== undefined || this.postalCode !== undefined) && 
        !(this.street && this.streetNumber && this.postalCode)) {
        throw new Error('All address fields must be provided together.');
    }
    next();
};

function getEnumValues(sequelize, modelName, attribute) {
    const model = sequelize.models[modelName];
    const attrDetails = model.rawAttributes[attribute];
    return attrDetails.values ? attrDetails.values.slice() : [];
}

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
            validate: { notNull: { msg: 'Username cannot be null or empty!' } }
        },
        profileImage: DataTypes.STRING(1000),
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                isEmail: { msg: 'Must be a valid email address' },
                notNull: { msg: 'Email cannot be null or empty!' }
            }
        },
        isVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
        password: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notNull: { msg: 'Password cannot be null or empty!' },
                len: { args: [8, 42], msg: 'Password should be between 8 and 42 characters' }
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
            type: DataTypes.ENUM('active', 'suspended', 'banned', 'to be deleted'),
            defaultValue: 'active'
        },
        deletionScheduleDate: DataTypes.DATE,
        street: { type: DataTypes.STRING, validate: { isComplete: validateAddressComplete } },
        streetNumber: {
            type: DataTypes.STRING,
            validate: {
                isAlphanumeric: { msg: 'Street number must be alphanumeric' },
                isComplete: validateAddressComplete
            }
        },
        postalCode: {
            type: DataTypes.STRING,
            references: { model: 'postalCode', key: 'postalCode' },
            validate: { isComplete: validateAddressComplete }
        },
        showCity: { type: DataTypes.BOOLEAN, defaultValue: false },
        deliverByHand: { type: DataTypes.BOOLEAN, defaultValue: false },
        about: DataTypes.TEXT,
        averageRating: { type: DataTypes.DECIMAL(3, 2), validate: { min: 0, max: 5 } },
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
        isAdmin: { type: DataTypes.BOOLEAN, defaultValue: false }
    }, {
        tableName: 'user',
        timestamps: false,
        freezeTableName: true,
        hooks: {
            beforeCreate: hashPassword,
            beforeUpdate: hashPasswordOnChange
        },
        indexes: [{ unique: true, fields: ['username'] }, { unique: true, fields: ['email'] }]
    });

    function hashPassword(user) {
        const salt = bcrypt.genSaltSync(10);
        user.password = bcrypt.hashSync(user.password, salt);
    }

    function hashPasswordOnChange(user) {
        if (user.changed('password')) {
            const salt = bcrypt.genSaltSync(10);
            user.password = bcrypt.hashSync(user.password, salt);
        }
    }

    function isOldEnough(value) {
        const today = new Date();
        const birthDate = new Date(value);
        const age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            throw new Error('User must be at least 16 years of age to register.');
        } else if (age < 16) {
            throw new Error('User must be at least 16 years of age to register.');
        }
    }

    // Validate the password for authentication
    User.prototype.validPassword = async function(password) {
        return await bcrypt.compare(password, this.password);
    };

    return User;
};
