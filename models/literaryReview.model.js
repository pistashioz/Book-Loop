module.exports = (sequelize, DataTypes) => {
    const LiteraryReview = sequelize.define('LiteraryReview', {
        literaryReviewId: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        workId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'work',
                key: 'workId'
            }
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'user',
                key: 'userId'
            }
        },
        literaryReview: DataTypes.TEXT,
        literaryRating: {
            type: DataTypes.DECIMAL(2,1),
            allowNull: false,
            validate: {
                min: 0,
                max: 5,
                notNull: { msg: 'Please provide at least a rating for your review!' }
            }
        },
        creationDate: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
        totalLikes: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        totalComments: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        }
    },  {
        tableName: 'literaryReview',
        timestamps: false,
        freezeTableName: true,
        hooks: {
            afterCreate: async (review, options) => {
                await review.updateWorkAverageRating();
                await sequelize.models.Work.increment('totalReviews', { by: 1, where: { workId: review.workId } });
                await sequelize.models.User.increment('totalReviews', { by: 1, where: { userId: review.userId } });
            },
            afterDestroy: async (review, options) => {
                await review.updateWorkAverageRating();
                const reviewCount = await LiteraryReview.count({ where: { workId: review.workId } });
                if (reviewCount === 0) {
                    await sequelize.models.Work.update({ totalReviews: 0, averageLiteraryRating: null }, { where: { workId: review.workId } });
                } else {
                    await sequelize.models.Work.decrement('totalReviews', { by: 1, where: { workId: review.workId } });
                }
                await sequelize.models.User.decrement('totalReviews', { by: 1, where: { userId: review.userId } });
            },
            afterUpdate: async (review, options) => {
                await review.updateWorkAverageRating();
            }
        }
    });

    LiteraryReview.prototype.updateWorkAverageRating = async function() {
        const Work = this.sequelize.models.Work;
        const reviews = await LiteraryReview.findAll({
            where: { workId: this.workId },
            attributes: ['literaryRating']
        });

        const averageRating = reviews.reduce((sum, review) => sum + parseFloat(review.literaryRating), 0) / reviews.length;

        await Work.update(
            { averageLiteraryRating: averageRating.toFixed(2) },
            { where: { workId: this.workId } }
        );
    };

    return LiteraryReview;
};
