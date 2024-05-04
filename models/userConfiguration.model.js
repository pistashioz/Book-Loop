// Define the UserConfiguration model
module.exports = (sequelize, DataTypes) => {
    return sequelize.define('UserConfiguration', {
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'user',
                key: 'userId'
            },
            primaryKey: true // Composite primary key
        },
        configId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'configuration',
                key: 'configId'
            },
            primaryKey: true // Composite primary key
        },
        configValue: {
            type: DataTypes.STRING,
            allowNull: false
        }
    }, {
        tableName: 'userConfiguration',
        timestamps: false, // No automatic timestamps
        freezeTableName: true // Ensures table name is not pluralized
    });
    }
    