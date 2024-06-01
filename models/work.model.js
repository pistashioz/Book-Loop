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
        primaryEditionUUID: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'bookEdition',
                key: 'UUID'
            }
        }
    }, {
        tableName: 'work',
        timestamps: false,
        freezeTableName: true
    });
  
    return Work;
  };
  