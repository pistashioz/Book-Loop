const { getEnumValues } = require('../utils/sequelizeHelpers');

module.exports = (sequelize, DataTypes) => {
    const NavigationHistory = sequelize.define('NavigationHistory', {
        historyId: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'user',
                key: 'userId',
            },
        },
        entityTypeId: {
            type: DataTypes.INTEGER,
            allowNull: true, // Nullable to allow for actions without a specific entity type
            references: {
                model: 'entityType',
                key: 'entityTypeId',
            },
        },
        elementId: {
            type: DataTypes.STRING,
            allowNull: true, // Nullable to allow for actions without a specific element
        },
        searchTerm: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        dateTime: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
            validate: {
                isDate: { msg: 'Must be a valid date' },
            }
        },
        visitDuration: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: {
                isInt: { msg: 'Visit duration must be an integer' },
                min: { args: [1], msg: 'Visit duration must be at least 1 second' }
            }
        },
        actionType: {
            type: DataTypes.ENUM('view', 'search'),
            allowNull: false,
            validate: {
                isValidActionType(value) {
                    const allowedValues = getEnumValues(sequelize, 'NavigationHistory', 'actionType');
                    if (!allowedValues.includes(value)) {
                        throw new Error('Invalid action type selection');
                    }
                }
            }
        },
    }, {
        tableName: 'navigationHistory',
        timestamps: false,
        freezeTableName: true,
    });

    return NavigationHistory;
};
