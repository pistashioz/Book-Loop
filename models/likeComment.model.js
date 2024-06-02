module.exports = (sequelize, DataTypes) => {
    const LikeComment = sequelize.define('LikeComment', {
        commentId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            references: {
                model: 'commentReview',
                key: 'commentId'
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
        tableName: 'likeComment',
        timestamps: false,
        freezeTableName: true,
        hooks: {
            afterCreate: async (like, options) => {
                await like.incrementCommentLikeCount();
            },
            afterDestroy: async (like, options) => {
                await like.decrementCommentLikeCount();
            }
        }
    });

    LikeComment.prototype.incrementCommentLikeCount = async function() {
        const CommentReview = this.sequelize.models.CommentReview;
        await CommentReview.increment('totalLikes', { where: { commentId: this.commentId } });
    };

    LikeComment.prototype.decrementCommentLikeCount = async function() {
        const CommentReview = this.sequelize.models.CommentReview;
        await CommentReview.decrement('totalLikes', { where: { commentId: this.commentId } });
    };

    return LikeComment;
};
