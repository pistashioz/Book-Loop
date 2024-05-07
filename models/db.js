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
const WorkModel = require("./works.model.js");
db.work = WorkModel(sequelize, DataTypes);

const BookInSeriesModel = require("./bookInSeries.model.js");
db.bookInSeries = BookInSeriesModel(sequelize, DataTypes);

const BookEditionModel = require("./bookEdition.model.js");
db.bookEdition = BookEditionModel(sequelize, DataTypes);

const PublisherModel =  require("./publisher.model.js")
db.publisher = PublisherModel(sequelize,DataTypes);

const PersonModel = require("./person.model.js")
db.person=PersonModel(sequelize,DataTypes);

/*
const LiteraryReviewModel = require("./literaryReview.model.js")
db.literaryReview = LiteraryReviewModel(sequelize, DataTypes)
*/
(async () => {
    try {
        await db.sequelize.sync();
        console.log('DB is successfully synchronized')
    } catch (error) {
        console.log(error)
    }
})();
module.exports = db;