module.exports = (sequelize, DataTypes) => {
    const postalCode = sequelize.define('PostalCode', {
        postalCode: {
            type: DataTypes.STRING,
            allowNull: false,
            primaryKey: true
        },
        locality: {
            type: DataTypes.STRING,
            allowNull: false
        },
        country: {
            type: DataTypes.STRING,
            allowNull: false
        }
    }, {
        tableName: 'postalCode',
        timestamps: false,
        freezeTableName: true, // Ensures table name is not pluralized
    });
    return postalCode;
}