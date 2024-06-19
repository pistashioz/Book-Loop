const { Sequelize, DataTypes } = require('sequelize');
const { sequelize } = require('../../../models');
const UserFavoriteAuthorModel = require('../../../models/userFavoriteAuthor.model');

describe('UserFavoriteAuthor Model', () => {
  let UserFavoriteAuthor;

  beforeAll(async () => {
    UserFavoriteAuthor = UserFavoriteAuthorModel(sequelize, DataTypes);

  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    console.log('Starting a new test...');
    await UserFavoriteAuthor.destroy({ where: { userId: { [Sequelize.Op.ne]: 24 }, personId: { [Sequelize.Op.ne]: 4 } } });
    await UserFavoriteAuthor.destroy({ where: { userId: { [Sequelize.Op.ne]: 24 }, personId: { [Sequelize.Op.ne]: 6 } } });
    await UserFavoriteAuthor.destroy({ where: { userId: { [Sequelize.Op.ne]: 24 }, personId: { [Sequelize.Op.ne]: 32 } } });
  });

  afterEach(async () => {
    console.log('Test completed.');
  });

  test('Deve adicionar um autor favorito para o utilizador', async () => {
    console.log('Running test: Deve adicionar um autor favorito para o utilizador');

    try {
      const favoriteAuthor = await UserFavoriteAuthor.create({
        userId: 1,
        personId: 1,
      });

      expect(favoriteAuthor.userId).toBe(1);
      expect(favoriteAuthor.personId).toBe(1);
    } catch (error) {
      console.error('Error adding favorite author:', error);
      throw error;
    }
  });

  test('Deve ler um autor favorito existente do utilizador', async () => {
    console.log('Running test: Deve ler um autor favorito existente do utilizador');

    try {
      const favoriteAuthor = await UserFavoriteAuthor.create({
        userId: 1,
        personId: 1,
      });

      const foundAuthor = await UserFavoriteAuthor.findOne({ where: { userId: 1, personId: 1 } });

      expect(foundAuthor).not.toBeNull();
      expect(foundAuthor.userId).toBe(1);
      expect(foundAuthor.personId).toBe(1);
    } catch (error) {
      console.error('Error reading favorite author:', error);
      throw error;
    }
  });

  test('Deve apagar um autor favorito do utilizador', async () => {
    console.log('Running test: Deve apagar um autor favorito do utilizador');

    try {
      const favoriteAuthor = await UserFavoriteAuthor.create({
        userId: 1,
        personId: 1,
      });

      await favoriteAuthor.destroy();

      const deletedAuthor = await UserFavoriteAuthor.findOne({ where: { userId: 1, personId: 1 } });

      expect(deletedAuthor).toBeNull();
    } catch (error) {
      console.error('Error deleting favorite author:', error);
      throw error;
    }
  });
});
