// This configuration file holds all the database connection parameters.
const config = {
    HOST: process.env.DB_HOST,
    USER: process.env.DB_USER,
    PASSWORD: process.env.DB_PASSWORD,
    DB: process.env.DB_NAME,
    dialect: 'mysql', // Specify the SQL dialect
    pool: {
        max: 5, // Maximum number of connections in pool
        min: 0, // Minimum number of connections in pool
        acquire: 30000, // Maximum time (in milliseconds) that pool will try to get connection before throwing error
        idle: 10000 // Maximum time (in milliseconds) that a connection can be idle before being released
    }
};

module.exports = config;
