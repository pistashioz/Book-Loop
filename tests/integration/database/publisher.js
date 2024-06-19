const { Sequelize, DataTypes } = require('sequelize');
const { sequelize } = require('../../../models');
const PublisherModel = require('../../../models/publisher.model');

describe('Publisher Model', () => {
  let Publisher;

  beforeAll(async () => {
    Publisher = PublisherModel(sequelize, DataTypes);
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    console.log('Starting a new test...');
    await Publisher.destroy({ where: { publisherId: { [Sequelize.Op.gt]: 33 } } });
  });

  afterEach(async () => {
    console.log('Test completed.');
  });

  test('Deve criar um novo publisher', async () => {
    console.log('Running test: Deve criar um novo publisher');

    try {
      const publisher = await Publisher.create({
        publisherName: 'New Publisher'
      });

      expect(publisher.publisherName).toBe('New Publisher');
    } catch (error) {
      console.error('Error creating publisher:', error);
      throw error;
    }
  });

  test('Deve falhar se publisherName for null', async () => {
    console.log('Running test: Deve falhar se publisherName for null');

    try {
      await Publisher.create({
        publisherName: null
      });
    } catch (error) {
      expect(error.errors[0].message).toBe('Publisher name cannot be null or empty!');
    }
  });

  test('Deve atualizar um publisher', async () => {
    console.log('Running test: Deve atualizar um publisher');

    try {
      const publisher = await Publisher.create({
        publisherName: 'Old Publisher'
      });

      const updatedPublisher = await publisher.update({
        publisherName: 'Updated Publisher'
      });

      expect(updatedPublisher.publisherName).toBe('Updated Publisher');
    } catch (error) {
      console.error('Error updating publisher:', error);
      throw error;
    }
  });

  test('Deve apagar um publisher', async () => {
    console.log('Running test: Deve apagar um publisher');

    try {
      const publisher = await Publisher.create({
        publisherName: 'Publisher to Delete'
      });

      await publisher.destroy();

      const foundPublisher = await Publisher.findByPk(publisher.publisherId);
      expect(foundPublisher).toBeNull();
    } catch (error) {
      console.error('Error deleting publisher:', error);
      throw error;
    }
  });

  test('Deve encontrar um publisher existente', async () => {
    console.log('Running test: Deve encontrar um publisher existente');

    const existingPublisher = await Publisher.findByPk(1);

    expect(existingPublisher).not.toBeNull();
    expect(existingPublisher.publisherName).toBe('Scarlet');
  });
});
