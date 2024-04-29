const Sequelize = require('sequelize');

const sequelize = new Sequelize('teresaterroso_pw2_g9',
'teresaterroso__pw2_user_g9',
'HPVV0cvIS^*d', {
    host: 'pw2.joaoferreira.eu',
    port: 3306,
    dialect:'mysql',
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    }
});

sequelize.authenticate().then(() => {
    console.log('Connection has been established successfully.');
}).catch(err => {
    console.log('Unable to connect to the database: ', err);
});