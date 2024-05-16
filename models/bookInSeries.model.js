module.exports = (sequelize, DataTypes) => {
    const BookInSeries = sequelize.define('BookInSeries', {
      seriesId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      seriesName: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { notNull: { msg: 'Series name cannot be null or empty!'} }
      },
      seriesDescription: DataTypes.TEXT
    }, {
      tableName: 'bookInSeries',
      timestamps: false
    });
  
    return BookInSeries;
  };
  
