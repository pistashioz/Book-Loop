module.exports = (sequelize, DataTypes) => {
    return sequelize.define('Token', {
      tokenKey: {
        type: DataTypes.STRING(255),
        primaryKey: true
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'user',
          key: 'userId'
        }
      },
      tokenType: {
        type: DataTypes.ENUM('access', 'refresh', 'emailConfirmation', 'passwordReset'),
        allowNull: false
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      lastUsedAt: {
        type: DataTypes.DATE
      },
      invalidated: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      sessionId: {
        type: DataTypes.INTEGER,
        references: {
          model: 'sessionLog', 
          key: 'sessionId'
        }
      }
    }, {
      tableName: 'token',
      timestamps: false
    });
  };
  