module.exports = (sequelize, DataTypes) => {
    const Author = sequelize.define("author", {
        workId: {
            type: DataTypes.INTEGER(11),
            primaryKey: true,
            references: {
                model: "work",
                key: "workId"
            }
        },
        personId: {
            type: DataTypes.INTEGER(11),
            primaryKey: true,
            references: {
                model: "person",
                key: "personId"
            }
        },
    }, {
        timestamps: false,
        freezeTableName: true,
        tableName: 'author'
    });
    return Author;
}