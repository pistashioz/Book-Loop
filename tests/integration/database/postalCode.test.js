const { Sequelize, DataTypes } = require('sequelize');
const { sequelize } = require('../../../models');
const PostalCodeModel = require('../../../models/postalCode.model');

describe('PostalCode Model', () => {
  let PostalCode;

  beforeAll(async () => {
    PostalCode = PostalCodeModel(sequelize, DataTypes);
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    console.log('Starting a new test...');
    await PostalCode.destroy({ where: { postalCode: { [Sequelize.Op.notIn]: ['3100-495', '4480-876'] } } });
  });

  afterEach(async () => {
    console.log('Test completed.');
  });

  test('Deve criar um novo postalCode', async () => {
    console.log('Running test: Deve criar um novo postalCode');

    try {
      const postalCode = await PostalCode.create({
        postalCode: '1234-567',
        locality: 'New Locality',
        country: 'New Country'
      });

      expect(postalCode.postalCode).toBe('1234-567');
      expect(postalCode.locality).toBe('New Locality');
      expect(postalCode.country).toBe('New Country');
    } catch (error) {
      console.error('Error creating postalCode:', error);
      throw error;
    }
  });

  test('Deve falhar se postalCode for null', async () => {
    console.log('Running test: Deve falhar se postalCode for null');

    try {
      await PostalCode.create({
        postalCode: null,
        locality: 'New Locality',
        country: 'New Country'
      });
    } catch (error) {
      expect(error.errors[0].message).toBe('PostalCode.postalCode cannot be null');
    }
  });

  test('Deve atualizar um postalCode', async () => {
    console.log('Running test: Deve atualizar um postalCode');

    try {
      const postalCode = await PostalCode.create({
        postalCode: '1234-567',
        locality: 'Old Locality',
        country: 'Old Country'
      });

      const updatedPostalCode = await postalCode.update({
        locality: 'Updated Locality',
        country: 'Updated Country'
      });

      expect(updatedPostalCode.locality).toBe('Updated Locality');
      expect(updatedPostalCode.country).toBe('Updated Country');
    } catch (error) {
      console.error('Error updating postalCode:', error);
      throw error;
    }
  });

  test('Deve apagar um postalCode', async () => {
    console.log('Running test: Deve apagar um postalCode');

    try {
      const postalCode = await PostalCode.create({
        postalCode: '1234-567',
        locality: 'Locality to Delete',
        country: 'Country to Delete'
      });

      await postalCode.destroy();

      const foundPostalCode = await PostalCode.findByPk(postalCode.postalCode);
      expect(foundPostalCode).toBeNull();
    } catch (error) {
      console.error('Error deleting postalCode:', error);
      throw error;
    }
  });

  test('Deve encontrar um postalCode existente', async () => {
    console.log('Running test: Deve encontrar um postalCode existente');

    const existingPostalCode = await PostalCode.findByPk('3100-495');

    expect(existingPostalCode).not.toBeNull();
    expect(existingPostalCode.locality).toBe('Pombal');
    expect(existingPostalCode.country).toBe('Portugal');
  });
});
