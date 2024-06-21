module.exports = (sequelize, DataTypes) => {
  const Publisher = sequelize.define('Publisher', {
    publisherId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    publisherName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { notNull: { msg: 'Publisher name cannot be null or empty!' } }
    }
  }, {
    tableName: 'publisher',
    timestamps: false,
    freezeTableName: true,
  });

  return Publisher;
};
