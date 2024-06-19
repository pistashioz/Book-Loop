const { Sequelize, DataTypes } = require('sequelize');
const { sequelize } = require('../../../models');
const WishlistModel = require('../../../models/wishlist.model');

describe('Wishlist Model', () => {
  let Wishlist;

  beforeAll(async () => {
    Wishlist = WishlistModel(sequelize, DataTypes);

  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    console.log('Starting a new test...');
    await Wishlist.destroy({ where: { userId: { [Sequelize.Op.ne]: 15 }, listingId: { [Sequelize.Op.ne]: 6 } } });
    await Wishlist.destroy({ where: { userId: { [Sequelize.Op.ne]: 15 }, listingId: { [Sequelize.Op.ne]: 7 } } });
  });

  afterEach(async () => {
    console.log('Test completed.');
  });

  test('Deve criar um novo item na wishlist', async () => {
    console.log('Running test: Deve criar um novo item na wishlist');

    try {
      const wishlistItem = await Wishlist.create({
        userId: 1,
        listingId: 1,
      });

      expect(wishlistItem.userId).toBe(1);
      expect(wishlistItem.listingId).toBe(1);
    } catch (error) {
      console.error('Error creating wishlist item:', error);
      throw error;
    }
  });

  test('Deve ler um item existente na wishlist', async () => {
    console.log('Running test: Deve ler um item existente na wishlist');

    try {
      const wishlistItem = await Wishlist.create({
        userId: 1,
        listingId: 1,
      });

      const foundItem = await Wishlist.findOne({ where: { userId: 1, listingId: 1 } });

      expect(foundItem).not.toBeNull();
      expect(foundItem.userId).toBe(1);
      expect(foundItem.listingId).toBe(1);
    } catch (error) {
      console.error('Error reading wishlist item:', error);
      throw error;
    }
  });

  test('Deve atualizar a data de adição de um item existente na wishlist', async () => {
    console.log('Running test: Deve atualizar a data de adição de um item existente na wishlist');

    try {
      const wishlistItem = await Wishlist.create({
        userId: 1,
        listingId: 1,
      });

      wishlistItem.addedDate = new Date();
      await wishlistItem.save();

      const updatedItem = await Wishlist.findOne({ where: { userId: 1, listingId: 1 } });

      expect(updatedItem.addedDate).not.toBeNull();
    } catch (error) {
      console.error('Error updating wishlist item:', error);
      throw error;
    }
  });

  test('Deve apagar um item da wishlist', async () => {
    console.log('Running test: Deve apagar um item da wishlist');

    try {
      const wishlistItem = await Wishlist.create({
        userId: 1,
        listingId: 1,
      });

      await wishlistItem.destroy();

      const deletedItem = await Wishlist.findOne({ where: { userId: 1, listingId: 1 } });

      expect(deletedItem).toBeNull();
    } catch (error) {
      console.error('Error deleting wishlist item:', error);
      throw error;
    }
  });
});
