module.exports = (sequelize, DataTypes) => {
    const BookContributor = sequelize.define("bookContributor", {
        editionUUID: {
            type: DataTypes.CHAR(36),
            primaryKey: true,
            allowNull: false,
            references: {
                model: 'bookEdition',
                key: 'UUID'
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
        },
        roleId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: "roles",
                key: "roleId"
            }
        }
    }, {
        timestamps: false,
        freezeTableName: true,
        tableName: 'bookContributor'
    });

    return BookContributor;
};
