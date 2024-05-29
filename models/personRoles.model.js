// models/personRole.model.js
module.exports = (sequelize, DataTypes) => {
    const PersonRole = sequelize.define("PersonRole", {
        personId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            allowNull: false,
            references: {
                model: "person",
                key: "personId"
            }
        },
        roleId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            allowNull: false,
            references: {
                model: "roles",
                key: "roleId"
            }
        }
    }, {
        tableName: "personRoles",
        timestamps: false,
        freezeTableName: true
    });
    return PersonRole;
};
