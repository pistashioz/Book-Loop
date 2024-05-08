module.exports = (sequelize, DataTypes) => {
    const BookEdition = sequelize.define("bookEdition", {
        ISBN: {
            type: DataTypes.STRING(20),
            primaryKey: true,
            collate: 'utf8mb4_general_ci', 
            allowNull: false,
            unique: true,
            validate: { notNull: { msg: "ISBN can not be empty!" } }
        },
        workId: {
            type: DataTypes.INTEGER(11),
            allowNull: false,
            primaryKey: true,
            validate: { notNull: { msg: "workId can not be empty!" } },
            references: {
                model: 'work',
                key: 'workId' 
              }
        },
        publisherId: {
            type: DataTypes.INTEGER(11),
            allowNull: false,
            validate: { notNull: { msg: "PublisherId can not be empty!" } },
            references: {
                model: 'publisher',
                key: 'publisherId' 
              }
        },
        title: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: { notNull: { msg: "PublisherId can not be empty!" } }
        },
        synopsis: {
            type: DataTypes.TEXT,
            allowNull: true,
            collate: 'utf8mb4_general_ci'
        },
        editionType: {
            type: DataTypes.ENUM('Paperback', 'Hardcover', 'audiobook', 'Ebook'),
            allowNull: false, 
            validate: { notNull: { msg: "Edition type can not be empty!" } }
        },
        publicationDate: {
            type: DataTypes.DATEONLY,
            allowNull: true, 
        },
        language: {
            type: DataTypes.STRING(100),
            allowNull: false, 
            validate: { notNull: { msg: "Language type can not be empty!" } },
            collate: 'utf8mb4_general_ci'
        },
        pageNumber: {
            type: DataTypes.INTEGER(11),
            allowNull: true
        },
        coverImage: {
            type: DataTypes.STRING,
            allowNull: true,
            collate: 'utf8mb4_general_ci'
        }
    }, {
        timestamps: false,
        freezeTableName: true,
        tableName: 'bookEdition'
    });
    return BookEdition;
}