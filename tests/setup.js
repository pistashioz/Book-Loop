// tests/setup.js
const { sequelize } = require('../models');

let transaction;

beforeAll(async () => {
  await sequelize.authenticate();
  // await sequelize.sync({ force: true }); // Usar apenas se precisar sincronizar a estrutura do banco de dados
});

beforeEach(async () => {
  transaction = await sequelize.transaction();
});

afterEach(async () => {
  if (transaction) {
    await transaction.rollback();
  }
});

afterAll(async () => {
  await sequelize.close();
});
