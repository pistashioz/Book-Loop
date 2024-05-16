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
        freezeTableName: true
    });

    return PurchaseReview;
};
