module.exports = (sequelize, DataTypes) => {
    const FollowRelationship = sequelize.define('FollowRelationship', {
        mainUserId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'user', key: 'userId' },
            primaryKey: true // Part of the primary key
        },
        followedUserId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'user', key: 'userId' },
            primaryKey: true // Part of the primary key
        }
    }, {
        tableName: 'followRelationship',
        timestamps: false,
        freezeTableName: true
    });

    return FollowRelationship;
};
