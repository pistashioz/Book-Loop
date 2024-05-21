module.exports = (sequelize, DataTypes) => {
    const UserFavoriteAuthor = sequelize.define('userFavoriteAuthor', {
        userId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            references: {
                model: 'user',
                key: 'userId'
            },
            allowNull: false
        },
        personId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            references: {
                model: 'person',
                key: 'personId'
            },
            allowNull: false
        }
    }, {
        tableName: 'userFavoriteAuthor',
        timestamps: false,
        freezeTableName: true
    });
    return UserFavoriteAuthor;
};
