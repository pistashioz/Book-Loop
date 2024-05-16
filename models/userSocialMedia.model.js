module.exports = (sequelize, DataTypes) => {
    const UserSocialMedia = sequelize.define('UserSocialMedia', {
        userSocialMediaId: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'user',
                key: 'userId'
            }
        },
        socialMediaName: {
            type: DataTypes.ENUM('Facebook', 'Twitter', 'Instagram', 'Pinterest', 'LinkedIn'),
            allowNull: false
        },
        profileUrl: {
            type: DataTypes.STRING(1000),
            allowNull: false,
            validate: {
                isUrl: {
                    msg: 'Must be a valid URL',
                    args: [
                        /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/
                    ]
                }
            }
        }
    }, {
        tableName: 'userSocialMedia',
        timestamps: false,
        freezeTableName: true
    });

    return UserSocialMedia;
};
