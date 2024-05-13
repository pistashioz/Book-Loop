module.exports = (sequelize, DataTypes) => {
    const bookAuthor = sequelize.define("bookAuthor", {
        workId: {
            type: DataTypes.INTEGER(11),
            primaryKey: true,
            references: {
                model: "work",
                key: "workId"
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
        tableName: 'bookAuthor'
    });
    return bookAuthor;
}