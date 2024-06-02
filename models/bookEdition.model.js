const { v4: uuidv4 } = require('uuid');
const { getEnumValues } = require('../utils/sequelizeHelpers');

module.exports = (sequelize, DataTypes) => {
  const BookEdition = sequelize.define('BookEdition', {
    UUID: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    ISBN: {
      type: DataTypes.STRING(20),
      validate: {
        isValidISBN(value) {
          if (value && !/^(97(8|9))?\d{9}(\d|X)$/.test(value)) {
            throw new Error('Invalid ISBN format.');
          }
        },
        canBeNullIfAudiobook(value) {
          if (!value && this.editionType !== 'Audiobook') {
            throw new Error('ISBN is required for non-audiobook editions.');
          }
        }
      }
    },
    workId: {
      type: DataTypes.INTEGER,
      allowNull: true,
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
      type: DataTypes.ENUM('Paperback', 'Hardcover', 'Audiobook', 'Ebook'),
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
    languageId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'languages',
        key: 'languageId'
      }
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
    indexes: [
      { unique: true, fields: ['ISBN'] },
    ]
  });

  return BookEdition;
};
