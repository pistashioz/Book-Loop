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
//  return sequelize.sync({ alter: true }); // Adjust the database tables to match the models if necessary.
    })    
/*     .then(() => {
        console.log('Database models were synchronized successfully.');
    })  */
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
db.Work = require('./work.model.js')(sequelize, DataTypes);
db.BookEdition = require('./bookEdition.model.js')(sequelize, DataTypes);
db.BookInSeries = require('./bookInSeries.model.js')(sequelize, DataTypes);
db.Publisher = require('./publisher.model.js')(sequelize, DataTypes);
db.Listing = require('./listing.model.js')(sequelize, DataTypes);
db.ListingImage = require('./listingImage.model.js')(sequelize, DataTypes);
db.Wishlist = require('./wishlist.model.js')(sequelize, DataTypes);
db.LiteraryReview = require('./literaryReview.model.js')(sequelize, DataTypes);
db.LikeReview = require('./likeReview.model.js')(sequelize, DataTypes);
db.CommentReview = require('./commentReview.model.js')(sequelize, DataTypes);
db.LikeComment = require('./likeComment.model.js')(sequelize, DataTypes);
db.EntityType = require('./entityType.model.js')(sequelize, DataTypes);
db.NavigationHistory = require('./navigationHistory.model.js')(sequelize, DataTypes);
db.UserFavoriteGenre = require('./userFavoriteGenre.model.js')(sequelize, DataTypes);
db.UserFavoriteAuthor = require('./userFavoriteAuthor.model.js')(sequelize, DataTypes);
db.Genre = require('./genre.model.js')(sequelize, DataTypes);
db.Person = require('./person.model.js')(sequelize, DataTypes);
db.BookAuthor = require('./bookAuthor.model.js')(sequelize, DataTypes);
db.BookGenre = require('./bookGenre.model.js')(sequelize, DataTypes);
db.BookContributor = require('./bookContributor.model.js')(sequelize, DataTypes);

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

db.BookInSeries.hasMany(db.Work, { foreignKey: 'seriesId', onDelete: 'CASCADE' });
db.Work.belongsTo(db.BookInSeries, { foreignKey: 'seriesId', as: ''});

db.Publisher.hasMany(db.BookEdition, { foreignKey: 'publisherId', onDelete: 'RESTRICT' });
db.BookEdition.belongsTo(db.Publisher, { foreignKey: 'publisherId' });

db.Work.hasMany(db.BookEdition, { foreignKey: 'workId', onDelete: 'CASCADE' });
db.BookEdition.belongsTo(db.Work, { foreignKey: 'workId' });

db.BookEdition.hasMany(db.BookContributor, { foreignKey: 'editionISBN', onDelete: 'CASCADE' });
db.BookContributor.belongsTo(db.BookEdition, { foreignKey: 'editionISBN' });

db.Work.hasMany(db.BookAuthor, { foreignKey: 'workId', onDelete: 'CASCADE' });
db.BookAuthor.belongsTo(db.Work, { foreignKey: 'workId' });

db.Person.hasMany(db.BookAuthor, { foreignKey: 'personId', onDelete: 'RESTRICT' });
db.BookAuthor.belongsTo(db.Person, { foreignKey: 'personId' });

db.Person.hasMany(db.BookContributor, { foreignKey: 'personId', onDelete: 'RESTRICT' });
db.BookContributor.belongsTo(db.Person, { foreignKey: 'personId' });

db.Work.hasMany(db.BookGenre, { foreignKey: 'workId', onDelete: 'CASCADE' });
db.BookGenre.belongsTo(db.Work, { foreignKey: 'workId' });

db.Genre.hasMany(db.BookGenre, { foreignKey: 'genreId', onDelete: 'RESTRICT' });
db.BookGenre.belongsTo(db.Genre, { foreignKey: 'genreId' });

db.User.hasMany(db.Listing, { foreignKey: 'sellerUserId', onDelete: 'RESTRICT' });
db.Listing.belongsTo(db.User, { foreignKey: 'sellerUserId' });

db.BookEdition.hasMany(db.Listing, { foreignKey: 'ISBN', onDelete: 'RESTRICT' });
db.Listing.belongsTo(db.BookEdition, { foreignKey: 'ISBN' });

db.Listing.hasMany(db.ListingImage, { foreignKey: 'listingId', onDelete: 'CASCADE' });
db.ListingImage.belongsTo(db.Listing, { foreignKey: 'listingId' });

db.User.hasMany(db.Wishlist, { as: 'Wishlists', foreignKey: 'userId', onDelete: 'CASCADE' });
db.Wishlist.belongsTo(db.User, { as: 'User', foreignKey: 'userId' });

db.Listing.hasMany(db.Wishlist, { as: 'Wishlists', foreignKey: 'listingId', onDelete: 'CASCADE' });
db.Wishlist.belongsTo(db.Listing, { as: 'Listing', foreignKey: 'listingId' });

db.User.hasMany(db.LiteraryReview, { foreignKey: 'userId', onDelete: 'CASCADE' });
db.LiteraryReview.belongsTo(db.User, { foreignKey: 'userId' });

db.Work.hasMany(db.LiteraryReview, { foreignKey: 'workId', onDelete: 'CASCADE' });
db.LiteraryReview.belongsTo(db.Work, { foreignKey: 'workId' });

db.LiteraryReview.hasMany(db.LikeReview, { foreignKey: 'literaryReviewId', as: 'Likes', onDelete: 'CASCADE'});
db.LikeReview.belongsTo(db.LiteraryReview, { foreignKey: 'literaryReviewId' });

db.User.hasMany(db.LikeReview, { foreignKey: 'userId', onDelete: 'CASCADE' });
db.LikeReview.belongsTo(db.User, { foreignKey: 'userId' });

db.LiteraryReview.hasMany(db.CommentReview, { foreignKey: 'literaryReviewId', onDelete: 'CASCADE', as: 'Comments' });
db.CommentReview.belongsTo(db.LiteraryReview, { foreignKey: 'literaryReviewId', as: 'LiteraryReview' });

db.User.hasMany(db.CommentReview, { foreignKey: 'userId', onDelete: 'CASCADE' });
db.CommentReview.belongsTo(db.User, { foreignKey: 'userId', as: 'Commenter' });

db.CommentReview.hasMany(db.LikeComment, { foreignKey: 'commentId', onDelete: 'CASCADE', as: 'CommentLikes' });
db.LikeComment.belongsTo(db.CommentReview, { foreignKey: 'commentId', as: 'CommentReview' });

db.User.hasMany(db.LikeComment, { foreignKey: 'userId', onDelete: 'CASCADE' });
db.LikeComment.belongsTo(db.User, { foreignKey: 'userId' });

db.User.hasMany(db.NavigationHistory, { foreignKey: 'userId', onDelete: 'CASCADE' });
db.NavigationHistory.belongsTo(db.User, { foreignKey: 'userId' });

db.EntityType.hasMany(db.NavigationHistory, { foreignKey: 'entityTypeId', onDelete: 'CASCADE' });
db.NavigationHistory.belongsTo(db.EntityType, { foreignKey: 'entityTypeId' });

db.User.hasMany(db.UserFavoriteGenre, { foreignKey: 'userId', onDelete: 'CASCADE' });
db.UserFavoriteGenre.belongsTo(db.User, { foreignKey: 'userId' });

db.Genre.hasMany(db.UserFavoriteGenre, { foreignKey: 'genreId', onDelete: 'CASCADE' });
db.UserFavoriteGenre.belongsTo(db.Genre, { foreignKey: 'genreId' });

db.User.hasMany(db.UserFavoriteAuthor, { foreignKey: 'userId', onDelete: 'CASCADE' });
db.UserFavoriteAuthor.belongsTo(db.User, { foreignKey: 'userId' });

db.Person.hasMany(db.UserFavoriteAuthor, { foreignKey: 'personId', onDelete: 'CASCADE' });
db.UserFavoriteAuthor.belongsTo(db.Person, { foreignKey: 'personId' });

module.exports = db;
