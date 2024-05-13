module.exports = (sequelize, DataTypes) => {
    const LikeComment = sequelize.define("likeComment", {
        commentId: {
            type: DataTypes.INTEGER(11),
            primaryKey: true,
            references: {
                model: "commentReview",
                key: "commentId"
            },
            allowNull: false,
            validate: { notNull: { msg: "Comment ID can not be empty!" } }
        },
        userId: {
            type: DataTypes.INTEGER(11),
            allowNull: false,
            primaryKey: true,
            validate: { notNull: { msg: "User ID can not be empty!" } },
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
        timestamps: false, 
        freezeTableName: true,
        tableName: 'likeComment'
    });
    return LikeComment;
}