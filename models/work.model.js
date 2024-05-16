module.exports = (sequelize, DataTypes) => {
    const Work = sequelize.define('Work', {
      workId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      originalTitle: {
        type: DataTypes.STRING,
        allowNull: false
      },
      firstPublishedDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        validate: { notNull: { msg: 'First published date cannot be null or empty!' } },
        comment: 'Date of the first edition of the work'
    },
      averageLiteraryRating: {
        type: DataTypes.DECIMAL(3, 2),
        validate: {
          min: 0,
          max: 5
        }
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
      }
    }, {
      tableName: 'work',
      timestamps: false,
      freezeTableName: true
    });
  
    return Work;
  };
  