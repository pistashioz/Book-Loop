const dbConfig = require('../config/db.config.js');

//export classes Sequelize and Datatypes
const { Sequelize, DataTypes } = require('sequelize');
const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
    host: dbConfig.HOST, dialect: dbConfig.dialect,
    pool: {
        max: dbConfig.pool.max, min: dbConfig.pool.min,
        acquire: dbConfig.pool.acquire, idle: dbConfig.pool.idle
    }
});
(async () => {
    try {
        await sequelize.authenticate;
        console.log('Connection has been established successfully.');
    } catch (err) {
        console.error('Unable to connect to the database:', err);
    }
})();

const db = {}; //object to be exported
db.sequelize = sequelize

// load models
db.work  = require("./works.model.js")(sequelize, DataTypes);
db.bookInSeries = require("./bookInSeries.model.js")(sequelize, DataTypes);
db.bookEdition = require("./bookEdition.model.js")(sequelize, DataTypes);
db.publisher =  require("./publisher.model.js")(sequelize,DataTypes);
db.person = require("./person.model.js")(sequelize,DataTypes);
db.literaryReview = require("./literaryReview.model.js")(sequelize, DataTypes)
db.commentReview = require("./commentReview.model.js")(sequelize, DataTypes)
db.bookAuthor = require("./bookAuthor.model.js")(sequelize,DataTypes);
db.bookContributor = require("./bookContributor.model.js")(sequelize,DataTypes);
db.bookGenre = require("./bookGenre.model.js")(sequelize,DataTypes);
db.genre = require('./genre.model.js')(sequelize,DataTypes)
db.likeReview = require('./likeReview.model.js')(sequelize,DataTypes)
db.likeComment = require('./likeComment.model.js')(sequelize,DataTypes)
db.User = require('./user.model.js')(sequelize,DataTypes)

//defining associations
db.bookInSeries.hasMany(db.work, { foreignKey: 'seriesId'});
db.work.belongsTo(db.bookInSeries, { foreignKey: 'seriesId' });

db.publisher.hasMany(db.bookEdition, { foreignKey: 'publisherId'});
db.bookEdition.belongsTo(db.publisher, { foreignKey: 'publisherId' });

db.work.hasMany(db.bookEdition, { foreignKey: 'workId'});
db.bookEdition.belongsTo(db.work, { foreignKey: 'workId' });

db.User.hasMany(db.literaryReview, { foreignKey: 'userId', onDelete: 'CASCADE' });
db.literaryReview.belongsTo(db.User, { foreignKey: 'userId' });

db.work.hasMany(db.literaryReview, { foreignKey: 'workId', onDelete: 'CASCADE' });
db.literaryReview.belongsTo(db.work, { foreignKey: 'workId' });

db.literaryReview.hasMany(db.likeReview, { foreignKey: 'literaryReviewId', as: 'Likes' });
db.likeReview.belongsTo(db.literaryReview, { foreignKey: 'literaryReviewId' });

db.User.hasMany(db.likeReview, { foreignKey: 'userId', onDelete: 'CASCADE' });
db.likeReview.belongsTo(db.User, { foreignKey: 'userId' });

db.literaryReview.hasMany(db.commentReview, { foreignKey: 'literaryReviewId', onDelete: 'CASCADE', as: 'Comments' });
db.commentReview.belongsTo(db.literaryReview, { foreignKey: 'literaryReviewId', as: 'LiteraryReview' });

db.User.hasMany(db.commentReview, { foreignKey: 'userId', onDelete: 'CASCADE' });
db.commentReview.belongsTo(db.User, { foreignKey: 'userId', as: 'Commenter' });

db.commentReview.hasMany(db.likeComment, { foreignKey: 'commentId', onDelete: 'CASCADE', as: 'CommentLikes' });
db.likeComment.belongsTo(db.commentReview, { foreignKey: 'commentId', as: 'CommentReview' });

db.User.hasMany(db.likeComment, { foreignKey: 'userId', onDelete: 'CASCADE' });
db.likeComment.belongsTo(db.User, { foreignKey: 'userId' });

db.work.hasMany(db.bookAuthor, { foreignKey: 'workId'}) 
db.bookAuthor.belongsTo(db.work, { foreignKey: 'workId'}) 

db.person.hasMany(db.bookAuthor, {  foreignKey: 'personId', onDelete: 'CASCADE' }) 
db.bookAuthor.belongsTo(db.person, { foreignKey: 'personId', onDelete: 'CASCADE' }) 

db.work.hasMany(db.bookGenre, { foreignKey: 'workId' }) 
db.bookGenre.belongsTo(db.work, { foreignKey: 'workId'}) 

db.person.hasMany(db.bookContributor, { foreignKey: 'personId', onDelete: 'CASCADE' }) 
db.bookContributor.belongsTo(db.person, { foreignKey: 'personId', onDelete: 'CASCADE' }) 

db.bookEdition.hasMany(db.bookContributor, { foreignKey: 'editionISBN' }) 
db.bookContributor.belongsTo(db.bookEdition, { foreignKey: 'editionISBN'}) 

db.genre.hasMany(db.bookGenre, {  foreignKey: 'genreId' }) 
db.bookGenre.belongsTo(db.genre, { foreignKey: 'genreId'}) 



/*
(async () => {
    try {
        await db.sequelize.sync();
        console.log('DB is successfully synchronized')
    } catch (error) {
        console.log(error)
    }
})();*/




module.exports = db;