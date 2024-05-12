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
        }
    }, {
        tableName: 'literaryReview',
        timestamps: false,
        freezeTableName: true
    });

    return LiteraryReview;
};
