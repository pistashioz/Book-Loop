module.exports = (sequelize, DataTypes) => {
  const Work = sequelize.define('Work', {
      workId: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true
      },
      averageLiteraryRating: {
          type: DataTypes.DECIMAL(3, 2),
          validate: {
              min: 0,
              max: 5
          }
      },
      totalReviews: {
          type: DataTypes.INTEGER,
          defaultValue: 0
      },
      seriesId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
              model: 'bookInSeries',
              key: 'seriesId'
          }
      },
      seriesOrder: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Order of the work within its series'
      },
      primaryEditionISBN: {
          type: DataTypes.STRING(20),
          allowNull: false,
          validate: {
              notEmpty: { msg: 'ISBN cannot be empty.' },
              isValidISBN(value) {
                  if (!/^(97(8|9))?\d{9}(\d|X)$/.test(value)) {
                      throw new Error('Invalid ISBN format.');
                  }
              }
          },
          references: {
              model: 'bookEdition',
              key: 'ISBN'
          }
      }
  }, {
      tableName: 'work',
      timestamps: false,
      freezeTableName: true
  });

  return Work;
};
