const { validate } = require("node-cron");

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
            type: DataTypes.TEXT,
            allowNull: false,
            validate: { notNull: { msg: 'Comment cannot be empty!' } }
        },
        creationDate: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        }
    }, {
        tableName: 'commentReview',
        timestamps: false,
        freezeTableName: true
    });

    return CommentReview;
};
