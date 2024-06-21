require('dotenv').config();

module.exports = {
  testEnvironment: 'node',
  verbose: true,
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testTimeout: 30000, // Aumentar timeout padrão para 30 segundos
};
