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
db.work  = require("./works.model.js")(sequelize, DataTypes);
db.bookInSeries = require("./bookInSeries.model.js")(sequelize, DataTypes);
db.bookEdition = require("./bookEdition.model.js")(sequelize, DataTypes);
db.publisher =  require("./publisher.model.js")(sequelize,DataTypes);
db.person = require("./person.model.js")(sequelize,DataTypes);
db.literaryReview = require("./literaryReview.model.js")(sequelize, DataTypes)
db.commentReview = require("./commentReview.model.js")(sequelize, DataTypes)
db.bookAuthor = require("./bookAuthor.model.js")(sequelize,DataTypes);
db.bookTranslator = require("./bookTranslator.model.js")(sequelize,DataTypes);
db.bookGenre = require("./bookGenre.model.js")(sequelize,DataTypes);
db.genre = require('./genre.model.js')(sequelize,DataTypes)
//defining associations

db.work.hasMany(db.bookEdition, { 
    foreignKey: 'workId' 
}) 

db.bookEdition.belongsTo(db.work, { 
    foreignKey: 'workId'
}) 

db.work.belongsTo(db.bookInSeries, {
    foreignKey: 'seriesId'
})
db.bookInSeries.hasMany(db.work, {
    foreignKey: "seriesId"
})
db.bookEdition.belongsTo(db.publisher, {
    foreignKey: "publisherId"
})
db.publisher.hasMany(db.bookEdition, {
    foreignKey: "publisherId"
})

db.work.hasMany(db.bookAuthor, { 
    foreignKey: 'workId' 
}) 

db.bookAuthor.belongsTo(db.work, { 
    foreignKey: 'workId'
}) 

db.person.hasMany(db.bookAuthor, { 
    foreignKey: 'personId' 
}) 

db.bookAuthor.belongsTo(db.person, { 
    foreignKey: 'personId'
}) 

db.work.hasMany(db.bookGenre, { 
    foreignKey: 'workId' 
}) 

db.bookGenre.belongsTo(db.work, { 
    foreignKey: 'workId'
}) 

db.person.hasMany(db.bookTranslator, { 
    foreignKey: 'personId' 
}) 

db.bookTranslator.belongsTo(db.person, { 
    foreignKey: 'personId'
}) 
db.bookEdition.hasMany(db.bookTranslator, { 
    foreignKey: 'ISBN' 
}) 

db.bookTranslator.belongsTo(db.bookEdition, { 
    foreignKey: 'ISBN'
}) 

db.genre.hasMany(db.bookGenre, { 
    foreignKey: 'genreId' 
}) 

db.bookGenre.belongsTo(db.genre, { 
    foreignKey: 'genreId'
}) 
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