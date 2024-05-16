module.exports = (sequelize, DataTypes) => {
    const BookAuthor = sequelize.define("bookAuthor", {
        workId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            allowNull: false,
            references: {
                model: "work",
                key: "workId"
            }
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
        tableName: 'bookAuthor'
    });

    return BookAuthor;
};
