module.exports = (sequelize, DataTypes) => {
    const Genre = sequelize.define("genre", {
        genreId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        genreName: {
            type: DataTypes.STRING(100),
            allowNull: false,
            validate: { 
                notNull: { msg: "Genre name cannot be empty!" }
            }
        },
        isApproved: { 
            type: DataTypes.BOOLEAN, 
            defaultValue: false 
        },
        createdBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'user',
                key: 'userId'
            }
        },
        approvedBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'user',
                key: 'userId'
            }
        }
    }, {
        timestamps: false,
        freezeTableName: true,
        tableName: 'genre'
    });
    
    return Genre;
};
