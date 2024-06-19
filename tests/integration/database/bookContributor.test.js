const { Sequelize, DataTypes } = require('sequelize');
const { sequelize } = require('../../../models');
const BookContributorModel = require('../../../models/bookContributor.model');

describe('BookContributor Model', () => {
  let BookContributor;

  beforeAll(async () => {
    BookContributor = BookContributorModel(sequelize, DataTypes);
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    console.log('Starting a new test...');
    await BookContributor.destroy({
      where: { editionUUID: { [Sequelize.Op.notIn]: ['83d5075d-2023-11ef-a329-ac1f6bad9968', '83d5079c-2023-11ef-a329-ac1f6bad9968', '83d5087e-2023-11ef-a329-ac1f6bad9968', '83d50971-2023-11ef-a329-ac1f6bad9968', '83d509bf-2023-11ef-a329-ac1f6bad9968', '83d509fb-2023-11ef-a329-ac1f6bad9968', '83d50a3d-2023-11ef-a329-ac1f6bad9968', '83d50aba-2023-11ef-a329-ac1f6bad9968', '83d50af8-2023-11ef-a329-ac1f6bad9968', '83d50b35-2023-11ef-a329-ac1f6bad9968', '83d50b75-2023-11ef-a329-ac1f6bad9968', '83d50c2f-2023-11ef-a329-ac1f6bad9968', '83d50ce0-2023-11ef-a329-ac1f6bad9968', '83d50dd6-2023-11ef-a329-ac1f6bad9968', '83d50e16-2023-11ef-a329-ac1f6bad9968', 'c490b29e-60fd-49ad-92a6-f231933833f2', 'cfd3b0ee-b314-40a2-b30a-a4125ed451dc', '06cd9b07-f8e7-4b43-bcb6-ea275c352988', '83d505be-2023-11ef-a329-ac1f6bad9968'] } }
    });
  });

  afterEach(async () => {
    console.log('Test completed.');
  });

  test('Deve criar uma nova bookContributor', async () => {
    console.log('Running test: Deve criar uma nova bookContributor');

    try {
      const bookContributor = await BookContributor.create({
        editionUUID: 'test-uuid',
        personId: 1,
        roleId: 1
      });

      expect(bookContributor.editionUUID).toBe('test-uuid');
      expect(bookContributor.personId).toBe(1);
      expect(bookContributor.roleId).toBe(1);
    } catch (error) {
      console.error('Error creating bookContributor:', error);
      throw error;
    }
  });

  test('Deve falhar se editionUUID for null', async () => {
    console.log('Running test: Deve falhar se editionUUID for null');

    try {
      await BookContributor.create({
        editionUUID: null,
        personId: 1,
        roleId: 1
      });
    } catch (error) {
      expect(error.errors[0].message).toBe('bookContributor.editionUUID cannot be null');
    }
  });

  test('Deve atualizar uma bookContributor', async () => {
    console.log('Running test: Deve atualizar uma bookContributor');

    try {
      const bookContributor = await BookContributor.create({
        editionUUID: 'test-uuid',
        personId: 1,
        roleId: 1
      });

      await BookContributor.update(
        { roleId: 2 },
        { where: { editionUUID: 'test-uuid', personId: 1, roleId: 1 } }
      );

      const updatedBookContributor = await BookContributor.findOne({ where: { editionUUID: 'test-uuid', personId: 1, roleId: 2 } });

      expect(updatedBookContributor.roleId).toBe(2);
    } catch (error) {
      console.error('Error updating bookContributor:', error);
      throw error;
    }
  });

  test('Deve apagar uma bookContributor', async () => {
    console.log('Running test: Deve apagar uma bookContributor');

    try {
      const bookContributor = await BookContributor.create({
        editionUUID: 'test-uuid',
        personId: 1,
        roleId: 1
      });

      await bookContributor.destroy();

      const foundBookContributor = await BookContributor.findOne({ where: { editionUUID: 'test-uuid', personId: 1, roleId: 1 } });
      expect(foundBookContributor).toBeNull();
    } catch (error) {
      console.error('Error deleting bookContributor:', error);
      throw error;
    }
  });

  test('Deve encontrar uma bookContributor existente', async () => {
    console.log('Running test: Deve encontrar uma bookContributor existente');

    // Pre-create the bookContributor entry to test finding it
    await BookContributor.create({
      editionUUID: '83d5075d-2023-11ef-a329-ac1f6bad9969',
      personId: 18,
      roleId: 2
    });

    const existingBookContributor = await BookContributor.findOne({ where: { editionUUID: '83d5075d-2023-11ef-a329-ac1f6bad9968', personId: 18, roleId: 2 } });

    expect(existingBookContributor).not.toBeNull();
    expect(existingBookContributor.editionUUID).toBe('83d5075d-2023-11ef-a329-ac1f6bad9968');
    expect(existingBookContributor.personId).toBe(18);
    expect(existingBookContributor.roleId).toBe(2);
  });
});
