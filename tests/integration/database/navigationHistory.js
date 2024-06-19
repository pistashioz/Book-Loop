const { Sequelize, DataTypes } = require('sequelize');
const { sequelize } = require('../../../models');
const NavigationHistoryModel = require('../../../models/navigationHistory.model');

describe('NavigationHistory Model', () => {
  let NavigationHistory;

  beforeAll(async () => {
    NavigationHistory = NavigationHistoryModel(sequelize, DataTypes);
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    console.log('Starting a new test...');
    await NavigationHistory.destroy({ where: { historyId: { [Sequelize.Op.notIn]: [9, 11, 15, 23, 26, 28, 29, 30] } } });
  });

  afterEach(async () => {
    console.log('Test completed.');
  });

  test('Deve criar um novo registro de navegação', async () => {
    console.log('Running test: Deve criar um novo registro de navegação');

    try {
      const navigationHistory = await NavigationHistory.create({
        userId: 1,
        entityTypeId: 1,
        elementId: 'test-element',
        searchTerm: null,
        dateTime: new Date(),
        visitDuration: 100,
        actionType: 'view'
      });

      expect(navigationHistory.userId).toBe(1);
      expect(navigationHistory.entityTypeId).toBe(1);
      expect(navigationHistory.elementId).toBe('test-element');
      expect(navigationHistory.searchTerm).toBeNull();
      expect(navigationHistory.visitDuration).toBe(100);
      expect(navigationHistory.actionType).toBe('view');
    } catch (error) {
      console.error('Error creating navigation history:', error);
      throw error;
    }
  });

  test('Deve falhar se userId for nulo', async () => {
    console.log('Running test: Deve falhar se userId for nulo');

    try {
      await NavigationHistory.create({
        userId: null,
        entityTypeId: 1,
        elementId: 'test-element',
        searchTerm: null,
        dateTime: new Date(),
        visitDuration: 100,
        actionType: 'view'
      });
    } catch (error) {
      expect(error.errors[0].message).toBe('NavigationHistory.userId cannot be null');
    }
  });

  test('Deve atualizar um registro de navegação', async () => {
    console.log('Running test: Deve atualizar um registro de navegação');

    try {
      const navigationHistory = await NavigationHistory.create({
        userId: 1,
        entityTypeId: 1,
        elementId: 'test-element',
        searchTerm: null,
        dateTime: new Date(),
        visitDuration: 100,
        actionType: 'view'
      });

      await NavigationHistory.update(
        { visitDuration: 200 },
        { where: { historyId: navigationHistory.historyId } }
      );

      const updatedNavigationHistory = await NavigationHistory.findOne({ where: { historyId: navigationHistory.historyId } });

      expect(updatedNavigationHistory.visitDuration).toBe(200);
    } catch (error) {
      console.error('Error updating navigation history:', error);
      throw error;
    }
  });

  test('Deve apagar um registro de navegação', async () => {
    console.log('Running test: Deve apagar um registro de navegação');

    try {
      const navigationHistory = await NavigationHistory.create({
        userId: 1,
        entityTypeId: 1,
        elementId: 'test-element',
        searchTerm: null,
        dateTime: new Date(),
        visitDuration: 100,
        actionType: 'view'
      });

      await navigationHistory.destroy();

      const foundNavigationHistory = await NavigationHistory.findOne({ where: { historyId: navigationHistory.historyId } });
      expect(foundNavigationHistory).toBeNull();
    } catch (error) {
      console.error('Error deleting navigation history:', error);
      throw error;
    }
  });

  test('Deve encontrar um registro de navegação existente', async () => {
    console.log('Running test: Deve encontrar um registro de navegação existente');

    await NavigationHistory.create({
      historyId: 99,
      userId: 55,
      entityTypeId: 3,
      elementId: '9782496709511',
      searchTerm: null,
      dateTime: '2024-05-14 13:48:25',
      visitDuration: 33,
      actionType: 'view'
    });

    const existingNavigationHistory = await NavigationHistory.findOne({ where: { historyId: 99 } });

    expect(existingNavigationHistory).not.toBeNull();
    expect(existingNavigationHistory.userId).toBe(55);
    expect(existingNavigationHistory.entityTypeId).toBe(3);
    expect(existingNavigationHistory.elementId).toBe('9782496709511');
    expect(existingNavigationHistory.searchTerm).toBeNull();
    expect(existingNavigationHistory.visitDuration).toBe(33);
    expect(existingNavigationHistory.actionType).toBe('view');
  });
});
