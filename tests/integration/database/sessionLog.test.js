const { Sequelize, DataTypes } = require('sequelize');
const { sequelize } = require('../../../models');
const SessionLogModel = require('../../../models/sessionLog.model');

describe('SessionLog Model', () => {
  let SessionLog;

  beforeAll(async () => {
    SessionLog = SessionLogModel(sequelize, DataTypes);
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    console.log('Starting a new test...');
    await SessionLog.destroy({ where: {} });
  });

  afterEach(async () => {
    console.log('Test completed.');
  });

  test('Deve criar um novo log de sessão', async () => {
    console.log('Running test: Deve criar um novo log de sessão');

    try {
      const sessionLog = await SessionLog.create({
        userId: 1,
        startTime: new Date(),
        ipAddress: '127.0.0.1',
        deviceInfo: 'Test device'
      });

      expect(sessionLog.userId).toBe(1);
      expect(sessionLog.ipAddress).toBe('127.0.0.1');
      expect(sessionLog.deviceInfo).toBe('Test device');
    } catch (error) {
      console.error('Error creating session log:', error);
      throw error;
    }
  });

  test('Deve falhar se userId não for fornecido', async () => {
    console.log('Running test: Deve falhar se userId não for fornecido');

    try {
      await SessionLog.create({
        startTime: new Date(),
        ipAddress: '127.0.0.1',
        deviceInfo: 'Test device'
      });
    } catch (error) {
      console.log(error);
      expect(error).toBeDefined();
      expect(error.message).toContain('SessionLog.userId cannot be null');
    }
  });

  test('Deve atualizar um log de sessão', async () => {
    console.log('Running test: Deve atualizar um log de sessão');

    try {
      const sessionLog = await SessionLog.create({
        userId: 1,
        startTime: new Date(),
        ipAddress: '127.0.0.1',
        deviceInfo: 'Test device'
      });

      const updatedSessionLog = await sessionLog.update({
        endTime: new Date()
      });

      expect(updatedSessionLog.endTime).not.toBeNull();
    } catch (error) {
      console.error('Error updating session log:', error);
      throw error;
    }
  });

  test('Deve apagar um log de sessão', async () => {
    console.log('Running test: Deve apagar um log de sessão');

    try {
      const sessionLog = await SessionLog.create({
        userId: 1,
        startTime: new Date(),
        ipAddress: '127.0.0.1',
        deviceInfo: 'Test device'
      });

      await sessionLog.destroy();

      const foundLog = await SessionLog.findByPk(sessionLog.sessionId);
      expect(foundLog).toBeNull();
    } catch (error) {
      console.error('Error deleting session log:', error);
      throw error;
    }
  });
});

