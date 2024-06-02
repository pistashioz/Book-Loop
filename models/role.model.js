module.exports = (sequelize, DataTypes) => {
    const Role = sequelize.define("Role", {
        roleId: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        roleName: {
            type: DataTypes.STRING,
            allowNull: false
        }
    }, {
        tableName: "roles",
        timestamps: false,
        freezeTableName: true
    });
    return Role;
};