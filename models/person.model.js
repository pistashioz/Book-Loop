module.exports = (sequelize, DataTypes) => {
    const Person = sequelize.define("person", {
        personId: {
            type: DataTypes.INTEGER(11),
            primaryKey: true,
            references: {
                model: "person",
                key: "personId"
            },
            autoIncrement: true,
        },
        personName: {
            type: DataTypes.STRING,
            allowNull: false,
            collate: 'utf8mb4_general_ci',
            validate: { notNull: { msg: "Person Name can not be empty!" } }
        },
        roles: {
            type: DataTypes.ENUM('author', 'translator'),
            allowNull: false,
            collate: 'utf8mb4_general_ci',
            validate: {notNull: { msg: "Role can not be empty!" }}
        }
    }, {
        timestamps: false,
        freezeTableName: true,
        tableName: 'person'
    });
    return Person;
}