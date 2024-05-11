module.exports = (sequelize, DataTypes) => {
    const ListingImage = sequelize.define('ListingImage', {
      imageId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      listingId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'listing',
          key: 'listingId'
        }
      },
      imageUrl: {
        type: DataTypes.STRING,
        allowNull: false
      }
    }, {
      tableName: 'listingImage',
      timestamps: false,
      freezeTableName: true
    });
  
    return ListingImage;
  };
  