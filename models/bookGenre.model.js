module.exports = (sequelize, DataTypes) => {
    const BookGenre = sequelize.define("bookGenre", {
        workId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            allowNull: false,
            references: {
                model: "work",
                key: "workId"
            }
        },
        genreId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            allowNull: false,
            references: {
                model: "genre",
                key: "genreId"
            }
        }
    }, {
        timestamps: false,
        freezeTableName: true,
        tableName: 'bookGenre'
    });

    return BookGenre;
};
