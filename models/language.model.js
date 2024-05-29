module.exports = (sequelize, DataTypes) => {
    const Language = sequelize.define('Language', {
      languageId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      languageName: {
        type: DataTypes.STRING(50),
        allowNull: false
      }
    }, {
      tableName: 'languages',
      timestamps: false,
      freezeTableName: true,
      indexes: [{ unique: true, fields: ['languageName'] }]
    });
  
    return Language;
  };
  