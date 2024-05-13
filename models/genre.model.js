module.exports = (sequelize, DataTypes) => {
    const Genre = sequelize.define("genre", {
        genreId: {
            type: DataTypes.INTEGER(11),
            primaryKey: true,
            references: {
                model: "genre",
                key: "genreId"
            },
            allowNull: false,
            autoIncrement: true
        },
        genreName: {
            type: DataTypes.STRING(100),
            allowNull: false,
            collate: 'utf8mb4_general_ci', 
            validate: { notNull: { msg: "Genre name can not be empty!" } }
        },
        isApproved: {
            type: DataTypes.TINYINT(1),
            defaultValue: 0,
            allowNull: false
        },
        createdBy: {
            type: DataTypes.INTEGER(11),
            allowNull: true ,
            references: {
                model: 'userFavoriteGenre',
                key: 'userId' 
              } 
        },
        approvedBy: {
            type: DataTypes.INTEGER(11),
            allowNull: true  ,
            references: {
                model: 'userFavoriteGenre',
                key: 'userId' 
              } 
        }
    }, {
        timestamps: false,
        freezeTableName: true,
        tableName: 'genre'
    });
    return Genre;
}