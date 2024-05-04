module.exports = (sequelize, DataTypes) => {
    return sequelize.define('SessionLog', {
        sessionId: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
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
        startTime: {
            type: DataTypes.DATE,
            allowNull: false
        },
        endTime: {
            type: DataTypes.DATE
        },
        ipAddress: {
            type: DataTypes.STRING(45)
        },
        deviceInfo: {
            type: DataTypes.TEXT
        }
    }, {
        tableName: 'sessionLog',
        timestamps: false
    });
};
