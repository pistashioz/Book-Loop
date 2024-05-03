// Import necessary packages
const { Sequelize, Op } = require('sequelize'); // Make sure Op is imported
require('dotenv').config(); // This loads the environment variables from the .env file

// Read database configuration from environment variables
const sequelize = new Sequelize(
  process.env.DB_NAME,     // Database name
  process.env.DB_USER,     // Database username
  process.env.DB_PASSWORD, // Database password
  {
    host: process.env.DB_HOST, // Database host
    port: process.env.DB_PORT, // Database port
    dialect: 'mysql',         // Using MySQL
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    }
  }
);

// Authenticate and sync the database
sequelize.authenticate()
  .then(() => {
    console.log('Connection has been established successfully.');
    // Sync models with the database
    return sequelize.sync({ alter: true }); // Use 'alter: true' to adjust tables to match models
  })
  .then(() => {
    console.log('Database models were synchronized successfully.');
  })
  .catch(err => {
    console.log('Unable to connect to the database or sync models:', err);
  });

module.exports = sequelize;
