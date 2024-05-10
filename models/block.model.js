module.exports = (sequelize, DataTypes) => {
    const Block = sequelize.define('Block', {
        blockerUserId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'user', key: 'userId' }
        },
        blockedUserId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'user', key: 'userId' }
        }
    }, {
        tableName: 'block',
        timestamps: false, // No automatic timestamps
        freezeTableName: true // Ensures table name is not pluralized
    });

    return Block;
};
