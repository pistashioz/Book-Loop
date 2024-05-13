module.exports = (sequelize, DataTypes) => {
    const BookTranslator = sequelize.define("bookTranslator", {
        editionISBN: {
            type: DataTypes.STRING(20),
            collate: 'utf8mb4_general_ci', 
            primaryKey: true,
            references: {
                model: "bookEdition",
                key: "ISBN"
            },
            allowNull: false
        },
        personId: {
            type: DataTypes.INTEGER(11),
            primaryKey: true,
            references: {
                model: "person",
                key: "personId"
            },
            allowNull: false
        },
    }, {
        timestamps: false,
        freezeTableName: true,
        tableName: 'bookTranslator'
    });
    return BookTranslator;
}