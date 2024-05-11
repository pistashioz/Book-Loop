const { getEnumValues } = require('../utils/sequelizeHelpers');

module.exports = (sequelize, DataTypes) => {
    const BookEdition = sequelize.define('BookEdition', {
      ISBN: {
        type: DataTypes.STRING(20),
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
      publisherId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'publisher', 
          key: 'publisherId' 
        }
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { notNull: { msg: 'Title cannot be null or empty!' } }
      },
      synopsis: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: { notNull: { msg: 'Synopsis cannot be null or empty!' } }
    },
    editionType: {
        type: DataTypes.ENUM('paperback', 'hardcover', 'audiobook', 'ebook'),
        allowNull: false,
        validate: {
            isValidEditionType(value) {
                const allowedValues = getEnumValues(sequelize, 'BookEdition', 'editionType');
                if (!allowedValues.includes(value)) {
                    throw new Error('Invalid edition type selection');
                }
            }
        }
    },
      publicationDate: {
        type: DataTypes.DATEONLY,
    },
      language: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { notNull: { msg: 'Language cannot be null or empty!' } }
      },
      pageNumber: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    coverImage: {
        type: DataTypes.STRING,
        allowNull: false,
    }
    }, {
      tableName: 'bookEdition',
      timestamps: false,
      freezeTableName: true,
    });
  
    return BookEdition;
  };
  