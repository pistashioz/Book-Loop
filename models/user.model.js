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
                len: { args: [8, 60], msg: 'Password should be between 8 and 60 characters' } // Adjusted maximum length
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
            // Hash password before user creation and updates
            beforeCreate: async (user) => {
              const salt = await bcrypt.genSaltSync(10);
              user.password = await bcrypt.hashSync(user.password, salt);
            },
            beforeUpdate: async (user) => {
                console.log(user.password);
              if (user.changed('password')) {
                console.log('password changed');
                const salt = await bcrypt.genSaltSync(10);
                user.password = await bcrypt.hashSync(user.password, salt);
                console.log(user.password);
              }
            }
          },
        indexes: [{ unique: true, fields: ['username'] }, { unique: true, fields: ['email'] }]
    });

    function isOldEnough(value) {
        const today = new Date();
        const birthDate = new Date(value);
        const age = today.getFullYear() - birthDate.getFullYear();
      
        // Check if birthday has already passed in the current year
        if (today.getMonth() < birthDate.getMonth() || 
            (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())) {
          return; // User is younger than 16 by a full year, so no need for further checks
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
