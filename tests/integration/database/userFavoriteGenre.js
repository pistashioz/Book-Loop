const { Sequelize, DataTypes } = require('sequelize');
const { sequelize } = require('../../../models');
const UserFavoriteGenreModel = require('../../../models/userFavoriteGenre.model');

describe('UserFavoriteGenre Model', () => {
  let UserFavoriteGenre;

  beforeAll(async () => {
    UserFavoriteGenre = UserFavoriteGenreModel(sequelize, DataTypes);

  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    console.log('Starting a new test...');
    await UserFavoriteGenre.destroy({ where: { userId: { [Sequelize.Op.ne]: 24 }, genreId: { [Sequelize.Op.ne]: 13 } } });
    await UserFavoriteGenre.destroy({ where: { userId: { [Sequelize.Op.ne]: 24 }, genreId: { [Sequelize.Op.ne]: 18 } } });
    await UserFavoriteGenre.destroy({ where: { userId: { [Sequelize.Op.ne]: 24 }, genreId: { [Sequelize.Op.ne]: 20 } } });
  });

  afterEach(async () => {
    console.log('Test completed.');
  });

  test('Deve adicionar um género favorito para o utilizador', async () => {
    console.log('Running test: Deve adicionar um género favorito para o utilizador');

    try {
      const favoriteGenre = await UserFavoriteGenre.create({
        userId: 1,
        genreId: 1,
      });

      expect(favoriteGenre.userId).toBe(1);
      expect(favoriteGenre.genreId).toBe(1);
    } catch (error) {
      console.error('Error adding favorite genre:', error);
      throw error;
    }
  });

  test('Deve ler um género favorito existente do utilizador', async () => {
    console.log('Running test: Deve ler um género favorito existente do utilizador');

    try {
      const favoriteGenre = await UserFavoriteGenre.create({
        userId: 1,
        genreId: 1,
      });

      const foundGenre = await UserFavoriteGenre.findOne({ where: { userId: 1, genreId: 1 } });

      expect(foundGenre).not.toBeNull();
      expect(foundGenre.userId).toBe(1);
      expect(foundGenre.genreId).toBe(1);
    } catch (error) {
      console.error('Error reading favorite genre:', error);
      throw error;
    }
  });

  test('Deve apagar um género favorito do utilizador', async () => {
    console.log('Running test: Deve apagar um género favorito do utilizador');

    try {
      const favoriteGenre = await UserFavoriteGenre.create({
        userId: 1,
        genreId: 1,
      });

      await favoriteGenre.destroy();

      const deletedGenre = await UserFavoriteGenre.findOne({ where: { userId: 1, genreId: 1 } });

      expect(deletedGenre).toBeNull();
    } catch (error) {
      console.error('Error deleting favorite genre:', error);
      throw error;
    }
  });
});
