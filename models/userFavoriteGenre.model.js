module.exports = (sequelize, DataTypes) => {
    const UserFavoriteGenre = sequelize.define('userFavoriteGenre', {
        userId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            references: {
                model: 'user',
                key: 'userId'
            },
            allowNull: false
        },
        genreId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            references: {
                model: 'genre',
                key: 'genreId'
            },
            allowNull: false
        }
    }, {
        tableName: 'userFavoriteGenre',
        timestamps: false,
        freezeTableName: true
    });
    return UserFavoriteGenre;
};
