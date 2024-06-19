const env = 'test';

const config = {
    development: {
        HOST: process.env.DB_HOST,
        USER: process.env.DB_USER,
        PASSWORD: process.env.DB_PASSWORD,
        DB: process.env.DB_NAME,
        dialect: 'mysql',
        dialectOptions: {
            charset: 'utf8mb4'
        },
        pool: {
            max: 5,
            min: 0,
            acquire: 50000,
            idle: 30000
        }
    },
    test: {
        HOST: process.env.TEST_DB_HOST,
        USER: process.env.TEST_DB_USER,
        PASSWORD: process.env.TEST_DB_PASSWORD,
        DB: process.env.TEST_DB_NAME,
        dialect: 'mysql',
        dialectOptions: {
            charset: 'utf8mb4',
            ssl: {
                "require": true
            },
        },
        pool: {
            max: 5,
            min: 0,
            acquire: 50000,
            idle: 30000
        }
    },
    production: {
        // Configurações para produção, semelhantes ao desenvolvimento
        HOST: process.env.DB_HOST,
        USER: process.env.DB_USER,
        PASSWORD: process.env.DB_PASSWORD,
        DB: process.env.DB_NAME,
        dialect: 'mysql',
        dialectOptions: {
            charset: 'utf8mb4'
        },
        pool: {
            max: 5,
            min: 0,
            acquire: 50000,
            idle: 30000
        }
    }
};

module.exports = config[env];