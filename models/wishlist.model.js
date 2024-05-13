module.exports = (sequelize, DataTypes) => {
    const Wishlist = sequelize.define('Wishlist', {
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'user',
          key: 'userId'
        },
        primaryKey: true 
      },
      listingId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'listing',
          key: 'listingId'
        },
        primaryKey: true 
      },
      addedDate: {
        type: DataTypes.DATE,
        allowNull: false
      }
    }, {
      tableName: 'wishlist',
      timestamps: false,
      freezeTableName: true,
    });
  
    return Wishlist;
};
