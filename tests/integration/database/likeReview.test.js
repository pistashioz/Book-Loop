const { Sequelize, DataTypes } = require('sequelize');
const { sequelize } = require('../../../models');
const LikeReviewModel = require('../../../models/likeReview.model');

describe('LikeReview Model', () => {
    let LikeReview;

    beforeAll(async () => {
        LikeReview = LikeReviewModel(sequelize, DataTypes);
    });

    afterAll(async () => {
        await sequelize.close();
    });

    beforeEach(async () => {
        console.log('Starting a new test...');
        await LikeReview.destroy({ where: { literaryReviewId: { [Sequelize.Op.notIn]: [3, 4, 56] } } });
    });

    afterEach(async () => {
        console.log('Test completed.');
    });

    test('Deve criar um novo likeReview', async () => {
        console.log('Running test: Deve criar um novo likeReview');

        try {
            const likeReview = await LikeReview.create({
                literaryReviewId: 1,
                userId: 1
            });

            expect(likeReview.literaryReviewId).toBe(1);
            expect(likeReview.userId).toBe(1);
        } catch (error) {
            console.error('Error creating likeReview:', error);
            throw error;
        }
    });

    test('Deve falhar se literaryReviewId for nulo', async () => {
        console.log('Running test: Deve falhar se literaryReviewId for nulo');

        try {
            await LikeReview.create({
                literaryReviewId: null,
                userId: 1
            });
        } catch (error) {
            expect(error).toBeDefined();
            expect(error.message).toContain("Column 'literaryReviewId' cannot be null");
        }
    });

    test('Deve atualizar um likeReview', async () => {
        console.log('Running test: Deve atualizar um likeReview');

        try {
            const likeReview = await LikeReview.create({
                literaryReviewId: 1,
                userId: 1
            });

            await LikeReview.update(
                { literaryReviewId: 2 },
                { where: { literaryReviewId: 1, userId: 1 } }
            );

            const updatedLikeReview = await LikeReview.findOne({ where: { literaryReviewId: 2, userId: 1 } });

            expect(updatedLikeReview.literaryReviewId).toBe(2);
        } catch (error) {
            console.error('Error updating likeReview:', error);
            throw error;
        }
    });

    test('Deve apagar um likeReview', async () => {
        console.log('Running test: Deve apagar um likeReview');

        try {
            const likeReview = await LikeReview.create({
                literaryReviewId: 1,
                userId: 1
            });

            await likeReview.destroy();

            const foundLikeReview = await LikeReview.findOne({ where: { literaryReviewId: 1, userId: 1 } });
            expect(foundLikeReview).toBeNull();
        } catch (error) {
            console.error('Error deleting likeReview:', error);
            throw error;
        }
    });

    test('Deve encontrar um likeReview existente', async () => {
        console.log('Running test: Deve encontrar um likeReview existente');

        await LikeReview.create({
            literaryReviewId: 33,
            userId: 116,
            likeDate: '2024-06-17T22:23:37.000Z'
        });

        const existingLikeReview = await LikeReview.findOne({ where: { literaryReviewId: 33, userId: 116 } });

        expect(existingLikeReview).not.toBeNull();
        expect(existingLikeReview.literaryReviewId).toBe(33);
        expect(existingLikeReview.userId).toBe(116);
        expect(existingLikeReview.likeDate.toISOString()).toBe('2024-06-17T22:23:37.000Z');
    });
});
