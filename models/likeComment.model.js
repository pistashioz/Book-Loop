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
        freezeTableName: true
    });

    return LikeComment;
};
