const dbConfig = require('../config/db.config');
const { Sequelize, DataTypes } = require('sequelize');

// Initialize Sequelize with parameters from the config file.
const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
    host: dbConfig.HOST,
    dialect: dbConfig.dialect,
    pool: {
        max: dbConfig.pool.max,
        min: dbConfig.pool.min,
        acquire: dbConfig.pool.acquire,
        idle: dbConfig.pool.idle
    }
});

// Authenticate the connection to the database and sync models.
sequelize.authenticate()
    .then(() => {
        console.log('Connection has been established successfully.');
        return sequelize.sync({ alter: true }); // Adjust the database tables to match the models if necessary.
    })
    .then(() => {
        console.log('Database models were synchronized successfully.');
    })
    .catch(err => {
        console.error('Unable to connect to the database:', err);
    });

const db = {};
db.sequelize = sequelize;

// Load models
db.User = require('./user.model.js')(sequelize, DataTypes);
db.UserConfiguration = require('./userConfiguration.model.js')(sequelize, DataTypes);
db.Configuration = require('./configuration.model.js')(sequelize, DataTypes);
db.SessionLog = require('./sessionLog.model.js')(sequelize, DataTypes);
db.Token = require('./token.model.js')(sequelize, DataTypes);


// Define relationships
db.User.hasMany(db.UserConfiguration, { foreignKey: 'userId', onDelete: 'CASCADE' });
db.UserConfiguration.belongsTo(db.User, { foreignKey: 'userId' });

db.Configuration.hasMany(db.UserConfiguration, { foreignKey: 'configId', onDelete: 'CASCADE' });
db.UserConfiguration.belongsTo(db.Configuration, { foreignKey: 'configId' });

db.User.hasMany(db.SessionLog, { foreignKey: 'userId', onDelete: 'CASCADE' });
db.SessionLog.belongsTo(db.User, { foreignKey: 'userId' });

db.User.hasMany(db.Token, { foreignKey: 'userId', onDelete: 'CASCADE' });
db.Token.belongsTo(db.User, { foreignKey: 'userId' });

db.SessionLog.hasMany(db.Token, { foreignKey: 'sessionId', onDelete: 'CASCADE' });
db.Token.belongsTo(db.SessionLog, { foreignKey: 'sessionId' });

module.exports = db;
