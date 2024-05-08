module.exports = (sequelize, DataTypes) => {
    const LiteraryReview = sequelize.define("literaryReview", {
        literaryReviewId: {
            type: DataTypes.INTEGER(11),
            primaryKey: true,
            references: {
                model: "literaryReview",
                key: "literaryReviewId"
            },
            autoIncrement: true,
        },
        workId: {
            type: DataTypes.INTEGER(11),
            allowNull: false,
            validate: { notNull: { msg: "Work ID can not be empty!" } },
            references: {
                model: 'work',
                key: 'workId' 
              }
        },
        userId: {
            type: DataTypes.INTEGER(11),
            allowNull: false,
            validate: { notNull: { msg: "User ID can not be empty!" } },
            references: {
                model: 'user',
                key: 'userId' 
              }
        },
        LiteraryReview: {
            type: DataTypes.TEXT,
            allowNull: true,
            collate: 'utf8mb4_general_ci'
        },
        literaryRating: {
            type: DataTypes.DECIMAL(2, 1),
            allowNull: true
        },
        creationDate: {
            type: DataTypes.DATE, //CURRENT_TIMESTAMP
            defaultValue:  sequelize.literal('CURRENT_TIMESTAMP'),
            allowNull: false,
            validate: { notNull: { msg: "Creation Date can not be empty!" } },
        }
    }, {
        timestamps: false, 
        freezeTableName: true,
        tableName: 'literaryReview'
    });
    return LiteraryReview;
}