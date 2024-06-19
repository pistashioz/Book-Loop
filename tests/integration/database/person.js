const { Sequelize, DataTypes } = require('sequelize');
const { sequelize } = require('../../../models');
const PersonModel = require('../../../models/person.model');

describe('Person Model', () => {
  let Person;

  beforeAll(async () => {
    Person = PersonModel(sequelize, DataTypes);
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    console.log('Starting a new test...');
    await Person.destroy({ where: { personId: { [Sequelize.Op.notIn]: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 28, 31, 32, 36] } } });
  });

  afterEach(async () => {
    console.log('Test completed.');
  });

  test('Deve criar uma nova person', async () => {
    console.log('Running test: Deve criar uma nova person');

    try {
      const person = await Person.create({
        personName: 'Test Person'
      });

      expect(person.personName).toBe('Test Person');
    } catch (error) {
      console.error('Error creating person:', error);
      throw error;
    }
  });

  test('Deve falhar se personName for null', async () => {
    console.log('Running test: Deve falhar se personName for null');

    try {
      await Person.create({
        personName: null
      });
    } catch (error) {
      expect(error.errors[0].message).toBe('Person Name cannot be empty!');
    }
  });

  test('Deve atualizar uma person', async () => {
    console.log('Running test: Deve atualizar uma person');

    try {
      const person = await Person.create({
        personName: 'Old Name'
      });

      const updatedPerson = await person.update({
        personName: 'New Name'
      });

      expect(updatedPerson.personName).toBe('New Name');
    } catch (error) {
      console.error('Error updating person:', error);
      throw error;
    }
  });

  test('Deve apagar uma person', async () => {
    console.log('Running test: Deve apagar uma person');

    try {
      const person = await Person.create({
        personName: 'Delete Name'
      });

      await person.destroy();

      const foundPerson = await Person.findByPk(person.personId);
      expect(foundPerson).toBeNull();
    } catch (error) {
      console.error('Error deleting person:', error);
      throw error;
    }
  });

  test('Deve encontrar uma person existente', async () => {
    console.log('Running test: Deve encontrar uma person existente');

    const existingPerson = await Person.findByPk(1);

    expect(existingPerson).not.toBeNull();
    expect(existingPerson.personName).toBe('Alice Slater');
  });
});
