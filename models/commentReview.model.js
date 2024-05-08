
module.exports = (sequelize, DataTypes) => {
    const CommentReview = sequelize.define("commentReview", {
        commentId: {
            type: DataTypes.INTEGER(11),
            primaryKey: true,
            references: {
                model: "commentReview",
                key: "commentId"
            }
        },
        literaryReviewId: {
            type: DataTypes.INTEGER(11),
            allowNull: false,
            validate: { notNull: { msg: "Literary review ID can not be empty!" } },
            references: {
                model: 'literaryReview',
                key: 'literaryReviewId' 
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
        comment: {
            type: DataTypes.TEXT,
            allowNull: true,
            collate: 'utf8mb4_general_ci'
        },
        creationDate: {
            type: DataTypes.DATE, //CURRENT_TIMESTAMP
            defaultValue:  sequelize.literal('CURRENT_TIMESTAMP'),
            allowNull: false,
            validate: { notNull: { msg: "Creation Date can not be empty!" } },
        }
    },        {
    timestamps: false,
    freezeTableName: true,
    tableName: 'commentReview'
});
return CommentReview;
}