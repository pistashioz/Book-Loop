module.exports = (sequelize, DataTypes) => {
    const postalCode = sequelize.define('PostalCode', {
        postalCode: {
            type: DataTypes.STRING,
            primaryKey: true
        },
        locality: {
            type: DataTypes.STRING,
        },
        country: {
            type: DataTypes.STRING,
        }
    }, {
        tableName: 'postalCode',
        timestamps: false,
        freezeTableName: true, // Ensures table name is not pluralized
    });
    return postalCode;
}