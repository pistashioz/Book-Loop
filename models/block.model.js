module.exports = (sequelize, DataTypes) => {
    const Block = sequelize.define('Block', {
        blockerUserId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'user', key: 'userId' },
            primaryKey: true // Part of the primary key
        },
        blockedUserId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'user', key: 'userId' },
            primaryKey: true, // Part of the primary key
            validate: {
                // blockedUserId cannot be the same as the blockerUserId
                isDifferent(value) {
                    if (value === this.blockerUserId) {
                        throw new Error('blockedUserId cannot be the same as the blockerUserId');
                    }
                }
            }
        }
    }, {
        tableName: 'block',
        timestamps: false,
        freezeTableName: true
    });

    return Block;
};
