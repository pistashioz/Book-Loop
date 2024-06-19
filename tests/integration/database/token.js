const { Sequelize, DataTypes } = require('sequelize');
const { sequelize } = require('../../../models');
const TokenModel = require('../../../models/token.model');

describe('Token Model', () => {
  let Token;

  beforeAll(async () => {
    Token = TokenModel(sequelize, DataTypes);
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    console.log('Starting a new test...');
    await Token.destroy({ where: {} });
  });

  afterEach(async () => {
    console.log('Test completed.');
  });

  test('Deve criar um novo token', async () => {
    console.log('Running test: Deve criar um novo token');

    try {
      const token = await Token.create({
        tokenKey: 'testtoken123',
        userId: 1,
        tokenType: 'access',
        expiresAt: new Date(Date.now() + 10000),
        sessionId: 1
      });

      expect(token.tokenKey).toBe('testtoken123');
      expect(token.userId).toBe(1);
    } catch (error) {
      console.error('Error creating token:', error);
      throw error;
    }
  });

  test('Deve validar o tipo do token', async () => {
    console.log('Running test: Deve validar o tipo do token');

    try {
      await Token.create({
        tokenKey: 'testtoken123',
        userId: 1,
        tokenType: 'invalidType',
        expiresAt: new Date(Date.now() + 10000),
        sessionId: 1
      });
    } catch (error) {
      console.log(error);
      expect(error).toBeDefined();
      expect(error.message).toContain('Data truncated for column \'tokenType\'');
    }
  });

  test('Deve falhar se o token já existir', async () => {
    console.log('Running test: Deve falhar se o token já existir');

    try {
      await Token.create({
        tokenKey: 'duplicateToken',
        userId: 1,
        tokenType: 'access',
        expiresAt: new Date(Date.now() + 10000),
        sessionId: 1
      });

      await Token.create({
        tokenKey: 'duplicateToken',
        userId: 2,
        tokenType: 'refresh',
        expiresAt: new Date(Date.now() + 20000),
        sessionId: 2
      });
    } catch (error) {
      expect(error.name).toBe('SequelizeUniqueConstraintError');
    }
  });

});
