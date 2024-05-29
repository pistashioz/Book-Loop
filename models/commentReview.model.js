module.exports = (sequelize, DataTypes) => {
    const CommentReview = sequelize.define('CommentReview', {
        commentId: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        literaryReviewId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'literaryReview',
                key: 'literaryReviewId'
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
        comment: {
            type: DataTypes.STRING(255),
            allowNull: false,
            validate: {
                notEmpty: { msg: 'Comment cannot be empty.' },
                len: {
                    args: [1, 255],
                    msg: 'Comment must be less than 255 characters.'
                }
            }
        },
        creationDate: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
        totalLikes: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        }
    }, {
        tableName: 'commentReview',
        timestamps: false,
        freezeTableName: true,
        hooks: {
            afterCreate: async (comment, options) => {
                await sequelize.models.LiteraryReview.increment('totalComments', { where: { literaryReviewId: comment.literaryReviewId } });
            },
            afterDestroy: async (comment, options) => {
                await sequelize.models.LiteraryReview.decrement('totalComments', { where: { literaryReviewId: comment.literaryReviewId } });
            }
        }
    });

    return CommentReview;
};
