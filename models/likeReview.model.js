module.exports = (sequelize, DataTypes) => {
    const LikeReview = sequelize.define("likeReview", {
        literaryReviewId: {
            type: DataTypes.INTEGER(11),
            primaryKey: true,
            references: {
                model: "literaryReview",
                key: "literaryReviewId"
            },
        },
        userId: {
            type: DataTypes.INTEGER(11),
            primaryKey: true,
            references: {
                model: 'user',
                key: 'userId' 
              }
        },
        likeDate: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        }
    }, {
        timestamps: false, 
        freezeTableName: true,
        tableName: 'likeReview'
    });
    return LikeReview;
}