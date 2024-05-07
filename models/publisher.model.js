module.exports = (sequelize, DataTypes) => {
    const Publisher = sequelize.define("publisher", {
        publisherId: {
            type: DataTypes.INTEGER(11),
            primaryKey: true,
            autoIncrement: true,
            collate: 'utf8mb4_general_ci', 
            allowNull: false,
            validate: { notNull: { msg: "Publisher ID can not be empty!" } }
        },
        publisherName: {
            type: DataTypes.STRING,
            allowNull: false,
            collate: 'utf8mb4_general_ci',
            validate: { notNull: { msg: "Publisher Name can not be empty!" } }
        }
    }, {
        timestamps: false,
        freezeTableName: true,
        tableName: 'publisher'
    });
    return Publisher;
}