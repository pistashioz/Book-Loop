module.exports = (sequelize, DataTypes) => {
    const BookContributor = sequelize.define("bookContributor", {
        editionISBN: {
            type: DataTypes.STRING(20),
            primaryKey: true,
            references: {
                model: 'bookEdition',
                key: 'ISBN' 
              },
            collate: 'utf8mb4_general_ci', 
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
        tableName: 'bookContributor'
    });
    return BookContributor;
}