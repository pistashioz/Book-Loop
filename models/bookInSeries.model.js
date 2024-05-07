module.exports = (sequelize, DataTypes) => {
    const BookInSeries = sequelize.define("bookInSeries", {
        seriesId: {
            type: DataTypes.INTEGER(11),
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
            validate: { notNull: { msg: "seriesId can not be empty!" } }
        },
        seriesName: {
            type: DataTypes.STRING,
            allowNull: false,
            collate: 'utf8mb4_general_ci', 
            validate: { notNull: { msg: "Title can not be empty!" } }
        },
        seriesDescription: {
            type: DataTypes.TEXT,
            allowNull: true,
            collate: 'utf8mb4_general_ci', 
        }
    }, {
        timestamps: false,
        freezeTableName: true,
        tableName: 'bookInSeries'
    });
    return BookInSeries;
}