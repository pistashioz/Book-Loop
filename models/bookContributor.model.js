module.exports = (sequelize, DataTypes) => {
    const BookContributor = sequelize.define("bookContributor", {
        editionISBN: {
            type: DataTypes.STRING(20),
            primaryKey: true,
            allowNull: false,
            references: {
                model: 'bookEdition',
                key: 'ISBN'
            },
        },
        personId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            allowNull: false,
            references: {
                model: "person",
                key: "personId"
            }
        }
    }, {
        timestamps: false,
        freezeTableName: true,
        tableName: 'bookContributor'
    });

    return BookContributor;
};
