const { Sequelize, DataTypes } = require('sequelize');
const { sequelize } = require('../../../models');
const UserConfigurationModel = require('../../../models/userConfiguration.model');

describe('UserConfiguration Model', () => {
  let UserConfiguration;

  beforeAll(async () => {
    UserConfiguration = UserConfigurationModel(sequelize, DataTypes);
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    console.log('Starting a new test...');
    await UserConfiguration.destroy({ where: {} });
  });

  afterEach(async () => {
    console.log('Test completed.');
  });

  test('Deve adicionar uma configuração para o utilizador', async () => {
    console.log('Running test: Deve adicionar uma configuração para o utilizador');

    try {
      const userConfig = await UserConfiguration.create({
        userId: 1,
        configId: 1,
        configValue: 'true',
      });

      expect(userConfig.userId).toBe(1);
      expect(userConfig.configId).toBe(1);
      expect(userConfig.configValue).toBe('true');
    } catch (error) {
      console.error('Error adding user configuration:', error);
      throw error;
    }
  });

  test('Deve ler uma configuração existente do utilizador', async () => {
    console.log('Running test: Deve ler uma configuração existente do utilizador');

    try {
      const userConfig = await UserConfiguration.create({
        userId: 1,
        configId: 1,
        configValue: 'true',
      });

      const foundConfig = await UserConfiguration.findOne({ where: { userId: 1, configId: 1 } });

      expect(foundConfig).not.toBeNull();
      expect(foundConfig.userId).toBe(1);
      expect(foundConfig.configId).toBe(1);
      expect(foundConfig.configValue).toBe('true');
    } catch (error) {
      console.error('Error reading user configuration:', error);
      throw error;
    }
  });

  test('Deve atualizar uma configuração existente do utilizador', async () => {
    console.log('Running test: Deve atualizar uma configuração existente do utilizador');

    try {
      const userConfig = await UserConfiguration.create({
        userId: 1,
        configId: 1,
        configValue: 'true',
      });

      userConfig.configValue = 'false';
      await userConfig.save();

      const updatedConfig = await UserConfiguration.findOne({ where: { userId: 1, configId: 1 } });

      expect(updatedConfig.configValue).toBe('false');
    } catch (error) {
      console.error('Error updating user configuration:', error);
      throw error;
    }
  });

  test('Deve apagar uma configuração do utilizador', async () => {
    console.log('Running test: Deve apagar uma configuração do utilizador');

    try {
      const userConfig = await UserConfiguration.create({
        userId: 1,
        configId: 1,
        configValue: 'true',
      });

      await userConfig.destroy();

      const deletedConfig = await UserConfiguration.findOne({ where: { userId: 1, configId: 1 } });

      expect(deletedConfig).toBeNull();
    } catch (error) {
      console.error('Error deleting user configuration:', error);
      throw error;
    }
  });
});
