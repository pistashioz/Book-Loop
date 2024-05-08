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