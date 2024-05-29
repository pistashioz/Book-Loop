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
        freezeTableName: true,
        hooks: {
            afterCreate: async (like, options) => {
                await like.incrementReviewLikeCount();
            },
            afterDestroy: async (like, options) => {
                await like.decrementReviewLikeCount();
            }
        }
    });

    LikeReview.prototype.incrementReviewLikeCount = async function() {
        const LiteraryReview = this.sequelize.models.LiteraryReview;
        await LiteraryReview.increment('totalLikes', { where: { literaryReviewId: this.literaryReviewId } });
    };

    LikeReview.prototype.decrementReviewLikeCount = async function() {
        const LiteraryReview = this.sequelize.models.LiteraryReview;
        await LiteraryReview.decrement('totalLikes', { where: { literaryReviewId: this.literaryReviewId } });
    };

    return LikeReview;
};
