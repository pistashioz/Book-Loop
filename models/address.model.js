module.exports = (sequelize, DataTypes) => {
    const Address = sequelize.define('Address', {
        addressId: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        streetName: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: { msg: "Street name cannot be empty." },
                is: {
                    args: [/^[a-zA-Z0-9\s,'-]*$/],
                    msg: "Street name can only contain letters, numbers, spaces, and the symbols ',', ''', and '-'"
                }
            }
        },
        streetNumber: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                isAlphanumeric: { msg: 'Street number must be alphanumeric' }
            }
        },
        postalCode: {
            type: DataTypes.STRING,
            allowNull: false,
            references: {
                model: 'postalCode',
                key: 'postalCode'
            }
        }
    }, {
        tableName: 'address',
        timestamps: false,
        freezeTableName: true, // Ensures table name is not pluralized
    });

    return Address;
};