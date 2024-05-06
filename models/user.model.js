const bcrypt = require('bcrypt');

// Define the User model
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
  userId: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notNull: {
        msg: 'Username cannot be null or empty!'
      }
    }
  },
  profileImage: {
    type: DataTypes.STRING(1000)  // Flexible size
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isEmail: {
        msg: 'Must be a valid email address'
      },
      notNull: {
        msg: 'Email cannot be null or empty!'
      }   
    }
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notNull: {
        msg: 'Password cannot be null or empty!'
      },
      len: {
        args: [8, 42],
        msg: 'Password should be between 8 and 42 characters'
      }
    }
  },
  birthDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    validate: {
      isDate: {
        msg: 'Must be a valid date'
      },
      isOldEnough(value) {
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
    }
  },
  registrationDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW // Auto-set to current date
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
      model: 'address', // Foreign key to 'address' table
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
  tableName: 'user',  // Explicit table name
  timestamps: false,  // No automatic timestamps
  freezeTableName: true, // Ensures table name is not pluralized
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
  indexes: [
    { unique: true, fields: ['username'] },
    { unique: true, fields: ['email'] }
  ],
});

    // Validate the password for authentication
    User.prototype.validPassword = async function (password) {
      return await bcrypt.compare(password, this.password);
    };

    return User;
};



