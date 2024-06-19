module.exports = (sequelize, DataTypes) => {
    const PurchaseReview = sequelize.define('PurchaseReview', {
        purchaseReviewId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        buyerUserId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'user',
                key: 'userId'
            }
        },
        sellerUserId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'user',
                key: 'userId'
            }
        },
        sellerReview: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        sellerRating: {
            type: DataTypes.DECIMAL(2,1),
            allowNull: false,
            validate: {
                min: 0,
                max: 5
            }
        },
        sellerResponse: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        reviewDate: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        }
    }, {
        tableName: 'purchaseReview',
        timestamps: false,
        freezeTableName: true,
        hooks: {
            afterCreate: async (review, options) => {
                await updateSellerRatingAndCount(review.sellerUserId);
            },
            afterUpdate: async (review, options) => {
                await updateSellerRatingAndCount(review.sellerUserId);
            },
            afterDestroy: async (review, options) => {
                await updateSellerRatingAndCount(review.sellerUserId);
            }
        }
    });

    async function updateSellerRatingAndCount(userId) {
        const reviews = await PurchaseReview.findAll({
            where: { sellerUserId: userId },
            attributes: ['sellerRating']
        });

        const reviewCount = reviews.length;
        const averageRating = reviewCount > 0 
            ? reviews.reduce((sum, review) => sum + parseFloat(review.sellerRating), 0) / reviewCount 
            : 0;

        await sequelize.models.User.update(
            {
                sellerReviewCount: reviewCount,
                sellerAverageRating: averageRating.toFixed(2)
            },
            { where: { userId } }
        );
    }

    return PurchaseReview;
};
