module.exports = (sequelize, DataTypes) => {
    const BookGenre = sequelize.define("bookGenre", {
        workId: {
            type: DataTypes.INTEGER(11),
            primaryKey: true,
            references: {
                model: "work",
                key: "workId"
            },
            allowNull: false
        },
        genreId: {
            type: DataTypes.INTEGER(11),
            primaryKey: true,
            references: {
                model: "genre",
                key: "genreId"
            },
            allowNull: false
        },
    }, {
        timestamps: false,
        freezeTableName: true,
        tableName: 'bookGenre'
    });
    return BookGenre;
}