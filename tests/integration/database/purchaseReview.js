const { Sequelize, DataTypes } = require('sequelize');
const { sequelize } = require('../../../models');
const PurchaseReviewModel = require('../../../models/purchaseReview.model');

describe('PurchaseReview Model', () => {
  let PurchaseReview;

  beforeAll(async () => {
    PurchaseReview = PurchaseReviewModel(sequelize, DataTypes);
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    console.log('Starting a new test...');
    await PurchaseReview.destroy({ where: { purchaseReviewId: { [Sequelize.Op.gt]: 0 } } });
  });

  afterEach(async () => {
    console.log('Test completed.');
  });

  test('Deve criar um novo purchase review', async () => {
    console.log('Running test: Deve criar um novo purchase review');

    try {
      const review = await PurchaseReview.create({
        buyerUserId: 1,
        sellerUserId: 2,
        sellerReview: 'Great seller!',
        sellerRating: 4.5
      });

      expect(review.buyerUserId).toBe(1);
      expect(review.sellerUserId).toBe(2);
      expect(review.sellerReview).toBe('Great seller!');
      expect(review.sellerRating).toBe(4.5);
    } catch (error) {
      console.error('Error creating purchase review:', error);
      throw error;
    }
  });

  test('Deve falhar se sellerRating for fora do intervalo', async () => {
    console.log('Running test: Deve falhar se sellerRating for fora do intervalo');

    try {
      await PurchaseReview.create({
        buyerUserId: 1,
        sellerUserId: 2,
        sellerReview: 'Great seller!',
        sellerRating: 6.0
      });
    } catch (error) {
      expect(error.errors[0].message).toBe('Validation max on sellerRating failed');
    }
  });

  test('Deve atualizar um purchase review', async () => {
    console.log('Running test: Deve atualizar um purchase review');

    try {
      const review = await PurchaseReview.create({
        buyerUserId: 1,
        sellerUserId: 2,
        sellerReview: 'Good seller',
        sellerRating: 4.0
      });

      const updatedReview = await review.update({
        sellerReview: 'Excellent seller',
        sellerRating: 5.0
      });

      expect(updatedReview.sellerReview).toBe('Excellent seller');
      expect(updatedReview.sellerRating).toBe(5.0);
    } catch (error) {
      console.error('Error updating purchase review:', error);
      throw error;
    }
  });

  test('Deve apagar um purchase review', async () => {
    console.log('Running test: Deve apagar um purchase review');

    try {
      const review = await PurchaseReview.create({
        buyerUserId: 1,
        sellerUserId: 2,
        sellerReview: 'Okay seller',
        sellerRating: 3.5
      });

      await review.destroy();

      const foundReview = await PurchaseReview.findByPk(review.purchaseReviewId);
      expect(foundReview).toBeNull();
    } catch (error) {
      console.error('Error deleting purchase review:', error);
      throw error;
    }
  });
});

