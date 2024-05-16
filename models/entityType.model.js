module.exports = (sequelize, DataTypes) => {
    const EntityType = sequelize.define('EntityType', {
        entityTypeId: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        entityTypeName: {
            type: DataTypes.STRING,
            allowNull: false,
        },
    }, {
        tableName: 'entityType',
        timestamps: false,
        freezeTableName: true,
        indexes: [{ unique: true, fields: ['entityTypeName'] }]
    });

    return EntityType;
};
