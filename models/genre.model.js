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
        }
    }, {
        timestamps: false,
        freezeTableName: true,
        tableName: 'genre',
        indexes: [ { unique: true, fields: ['genreName']}]
    });
    
    return Genre;
};
