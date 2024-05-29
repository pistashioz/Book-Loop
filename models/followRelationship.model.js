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
        freezeTableName: true,
        hooks: {
            afterCreate: async (follow, options) => {
                await sequelize.models.User.increment('totalFollowers', { where: { userId: follow.followedUserId } });
                await sequelize.models.User.increment('totalFollowing', { where: { userId: follow.mainUserId } });
            },
            afterDestroy: async (follow, options) => {
                await sequelize.models.User.decrement('totalFollowers', { where: { userId: follow.followedUserId } });
                await sequelize.models.User.decrement('totalFollowing', { where: { userId: follow.mainUserId } });
            }
        }
    });

    return FollowRelationship;
};
