module.exports = (sequelize, DataTypes) => {
    return sequelize.define('Configuration', {
       configId: {
           type: DataTypes.INTEGER,
           autoIncrement: true,
           primaryKey: true
       },
       configType: {
           type: DataTypes.ENUM('privacy', 'notifications', 'display', 'interface', 'shipping', 'marketing'),
           allowNull: false
       },
       configKey: {
           type: DataTypes.STRING,
           allowNull: false
       },
       description: {
           type: DataTypes.TEXT
       }
   }, {
       tableName: 'configuration',
       timestamps: false, // No automatic timestamps
       freezeTableName: true, // Ensures table name is not pluralized
   });
   }
   