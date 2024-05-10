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
/*       .then(() => {
        console.log('Connection has been established successfully.');
        return sequelize.sync({ alter: true }); // Adjust the database tables to match the models if necessary.
    })   */  
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
// db.Address = require('./address.model.js')(sequelize, DataTypes);
db.PostalCode = require('./postalCode.model.js')(sequelize, DataTypes);
db.UserSocialMedia = require('./userSocialMedia.model.js')(sequelize, DataTypes);
db.FollowRelationship = require('./followRelationship.model.js')(sequelize, DataTypes);
db.Block = require('./block.model.js')(sequelize, DataTypes);
db.PurchaseReview = require('./purchaseReview.model.js')(sequelize, DataTypes);

// Define relationships
db.User.hasMany(db.UserConfiguration, { foreignKey: 'userId', onDelete: 'CASCADE' });
db.UserConfiguration.belongsTo(db.User, { foreignKey: 'userId' });

db.Configuration.hasMany(db.UserConfiguration, { foreignKey: 'configId', onDelete: 'CASCADE', as: 'userConfiguration' });
db.UserConfiguration.belongsTo(db.Configuration, { foreignKey: 'configId' });

db.User.hasMany(db.SessionLog, { foreignKey: 'userId', onDelete: 'CASCADE' });
db.SessionLog.belongsTo(db.User, { foreignKey: 'userId' });

db.User.hasMany(db.Token, { foreignKey: 'userId', onDelete: 'CASCADE' });
db.Token.belongsTo(db.User, { foreignKey: 'userId' });

db.SessionLog.hasMany(db.Token, { foreignKey: 'sessionId', onDelete: 'CASCADE' });
db.Token.belongsTo(db.SessionLog, { foreignKey: 'sessionId' });

db.User.belongsTo(db.PostalCode, { foreignKey: 'postalCode', as: 'postalCodeDetails' });
db.PostalCode.hasMany(db.User, { foreignKey: 'postalCode', as: 'users', onDelete: 'RESTRICT' });

db.User.hasMany(db.UserSocialMedia, { foreignKey: 'userId', as: 'userSocialMedias', onDelete: 'CASCADE' });
db.UserSocialMedia.belongsTo(db.User, { foreignKey: 'userId' });

db.User.hasMany(db.FollowRelationship, { as: 'Followings', foreignKey: 'mainUserId' });
db.FollowRelationship.belongsTo(db.User, { as: 'MainUser', foreignKey:'mainUserId' });
db.User.hasMany(db.FollowRelationship, { as: 'Followers', foreignKey: 'followedUserId' });
db.FollowRelationship.belongsTo(db.User, { as: 'FollowedUser', foreignKey: 'followedUserId' });

db.User.hasMany(db.Block, { as: 'Blockers', foreignKey: 'blockerUserId' });
db.Block.belongsTo(db.User, { as: 'Blocker', foreignKey: 'blockerUserId' });
db.User.hasMany(db.Block, { as: 'BlockedUsers', foreignKey: 'blockedUserId' });
db.Block.belongsTo(db.User, { as: 'BlockedUser', foreignKey: 'blockedUserId' });

db.User.hasMany(db.PurchaseReview, { as: 'BuyerReviews', foreignKey: 'buyerUserId', onDelete: 'CASCADE' });
db.PurchaseReview.belongsTo(db.User, { as: 'Buyer', foreignKey: 'buyerUserId' });

db.User.hasMany(db.PurchaseReview, { as: 'SellerReviews', foreignKey: 'sellerUserId', onDelete: 'CASCADE' });
db.PurchaseReview.belongsTo(db.User, { as: 'Seller', foreignKey: 'sellerUserId' });

module.exports = db;
