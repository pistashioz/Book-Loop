module.exports = (sequelize, DataTypes) => {
    const Work = sequelize.define("work", {
        workId: {
            type: DataTypes.INTEGER(11),
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
            validate: { notNull: { msg: "workId can not be empty!" } }
        },
        originalTitle: {
            type: DataTypes.STRING,
            allowNull: false,
            collate: 'utf8_general_ci', 
            validate: { notNull: { msg: "Title can not be empty!" } }
        },
        firstPublishedDate: {
            type: DataTypes.DATE,
            allowNull: true,

        },
        averageLiteraryRating: {
            type: DataTypes.DECIMAL(3, 2),
            allowNull: true
        },
        seriesId: {
            type: DataTypes.INTEGER(11),
            allowNull: true,
            references: {
                model: 'Series',
                key: 'seriesId' 
              }
        },
        seriesOrder: {
            type: DataTypes.INTEGER(11),
            allowNull: true
        }
    }, {
        timestamps: false,
        freezeTableName: true,
        tableName: 'work'
    });
    return Work;
}