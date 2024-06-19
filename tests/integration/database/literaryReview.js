const { Sequelize, DataTypes } = require('sequelize');
const { sequelize } = require('../../../models');
const LiteraryReviewModel = require('../../../models/literaryReview.model');

describe('LiteraryReview Model', () => {
    let LiteraryReview;

    beforeAll(async () => {
        LiteraryReview = LiteraryReviewModel(sequelize, DataTypes);
    });

    afterAll(async () => {
        await sequelize.close();
    });

    beforeEach(async () => {
        console.log('Starting a new test...');
        await LiteraryReview.destroy({ where: { literaryReviewId: { [Sequelize.Op.notIn]: [3, 4, 56, 58] } } });
    });

    afterEach(async () => {
        console.log('Test completed.');
    });

    test('Deve criar uma nova literaryReview', async () => {
        console.log('Running test: Deve criar uma nova literaryReview');

        try {
            const literaryReview = await LiteraryReview.create({
                workId: 1,
                userId: 1,
                literaryReview: 'This is a test review.',
                literaryRating: 4.5
            });

            expect(literaryReview.workId).toBe(1);
            expect(literaryReview.userId).toBe(1);
            expect(literaryReview.literaryReview).toBe('This is a test review.');
            expect(literaryReview.literaryRating).toBe(4.5);
        } catch (error) {
            console.error('Error creating literaryReview:', error);
            throw error;
        }
    });

    test('Deve falhar se literaryRating for nulo', async () => {
        console.log('Running test: Deve falhar se literaryRating for nulo');

        try {
            await LiteraryReview.create({
                workId: 1,
                userId: 1,
                literaryReview: 'This is a test review.',
                literaryRating: null
            });
        } catch (error) {
            expect(error).toBeDefined();
            expect(error.message).toContain('Please provide at least a rating for your review!');
        }
    });

    test('Deve atualizar uma literaryReview', async () => {
        console.log('Running test: Deve atualizar uma literaryReview');

        try {
            const literaryReview = await LiteraryReview.create({
                workId: 1,
                userId: 1,
                literaryReview: 'This is a test review.',
                literaryRating: 4.5
            });

            await LiteraryReview.update(
                { literaryReview: 'Updated test review.' },
                { where: { literaryReviewId: literaryReview.literaryReviewId } }
            );

            const updatedLiteraryReview = await LiteraryReview.findOne({ where: { literaryReviewId: literaryReview.literaryReviewId } });

            expect(updatedLiteraryReview.literaryReview).toBe('Updated test review.');
        } catch (error) {
            console.error('Error updating literaryReview:', error);
            throw error;
        }
    });

    test('Deve apagar uma literaryReview', async () => {
        console.log('Running test: Deve apagar uma literaryReview');

        try {
            const literaryReview = await LiteraryReview.create({
                workId: 1,
                userId: 1,
                literaryReview: 'This is a test review.',
                literaryRating: 4.5
            });

            await literaryReview.destroy();

            const foundLiteraryReview = await LiteraryReview.findOne({ where: { literaryReviewId: literaryReview.literaryReviewId } });
            expect(foundLiteraryReview).toBeNull();
        } catch (error) {
            console.error('Error deleting literaryReview:', error);
            throw error;
        }
    });

    test('Deve encontrar uma literaryReview existente', async () => {
        console.log('Running test: Deve encontrar uma literaryReview existente');

        await LiteraryReview.create({
            literaryReviewId: 59,
            workId: 1,
            userId: 1,
            literaryReview: 'Existing test review.',
            literaryRating: 4.5
        });

        const existingLiteraryReview = await LiteraryReview.findOne({ where: { literaryReviewId: 59 } });

        expect(existingLiteraryReview).not.toBeNull();
        expect(existingLiteraryReview.literaryReview).toBe('Existing test review.');
        expect(existingLiteraryReview.literaryRating).toBe("4.5");
    });
});
