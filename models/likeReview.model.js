module.exports = (sequelize, DataTypes) => {
    const LikeReview = sequelize.define('LikeReview', {
        literaryReviewId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            references: {
                model: 'literaryReview',
                key: 'literaryReviewId'
            }
        },
        userId: {
            type: DataTypes.INTEGER,
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
        tableName: 'likeReview',
        timestamps: false,
        freezeTableName: true
    });

    return LikeReview;
};
