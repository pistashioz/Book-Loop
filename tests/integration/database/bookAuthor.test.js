const { Sequelize, DataTypes } = require('sequelize');
const { sequelize } = require('../../../models');
const BookAuthorModel = require('../../../models/bookAuthor.model');

describe('BookAuthor Model', () => {
  let BookAuthor;

  beforeAll(async () => {
    BookAuthor = BookAuthorModel(sequelize, DataTypes);
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    console.log('Starting a new test...');
    await BookAuthor.destroy({ where: {} });
  });

  afterEach(async () => {
    console.log('Test completed.');
  });

  test('Deve criar uma nova bookAuthor', async () => {
    console.log('Running test: Deve criar uma nova bookAuthor');

    try {
      const bookAuthor = await BookAuthor.create({
        workId: 1,
        personId: 1
      });

      expect(bookAuthor.workId).toBe(1);
      expect(bookAuthor.personId).toBe(1);
    } catch (error) {
      console.error('Error creating bookAuthor:', error);
      throw error;
    }
  });

  test('Deve falhar se workId for null', async () => {
    console.log('Running test: Deve falhar se workId for null');

    try {
      await BookAuthor.create({
        workId: null,
        personId: 1
      });
    } catch (error) {
      expect(error.errors[0].message).toBe('bookAuthor.workId cannot be null');
    }
  });

  test('Deve atualizar uma bookAuthor', async () => {
    console.log('Running test: Deve atualizar uma bookAuthor');

    try {
      const bookAuthor = await BookAuthor.create({
        workId: 1,
        personId: 1
      });

      await BookAuthor.update(
        { personId: 2 },
        { where: { workId: 1, personId: 1 } }
      );

      const updatedBookAuthor = await BookAuthor.findOne({ where: { workId: 1, personId: 2 } });

      expect(updatedBookAuthor.personId).toBe(2);
    } catch (error) {
      console.error('Error updating bookAuthor:', error);
      throw error;
    }
  });

  test('Deve apagar uma bookAuthor', async () => {
    console.log('Running test: Deve apagar uma bookAuthor');

    try {
      const bookAuthor = await BookAuthor.create({
        workId: 1,
        personId: 1
      });

      await bookAuthor.destroy();

      const foundBookAuthor = await BookAuthor.findOne({ where: { workId: 1, personId: 1 } });
      expect(foundBookAuthor).toBeNull();
    } catch (error) {
      console.error('Error deleting bookAuthor:', error);
      throw error;
    }
  });

  test('Deve encontrar uma bookAuthor existente', async () => {
    console.log('Running test: Deve encontrar uma bookAuthor existente');

    const existingBookAuthor = await BookAuthor.create({
      workId: 1,
      personId: 1
    });

    const foundBookAuthor = await BookAuthor.findOne({ where: { workId: 1, personId: 1 } });

    expect(foundBookAuthor).not.toBeNull();
    expect(foundBookAuthor.workId).toBe(1);
    expect(foundBookAuthor.personId).toBe(1);
  });
});
