/* // tests/setup.js
const { sequelize } = require('../models');

let transaction;

beforeAll(async () => {
  await sequelize.authenticate();
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

module.exports = {
  getTransaction: () => transaction,
};
 */