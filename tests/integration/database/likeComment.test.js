const { Sequelize, DataTypes } = require('sequelize');
const { sequelize } = require('../../../models');
const LikeCommentModel = require('../../../models/likeComment.model');

describe('LikeComment Model', () => {
    let LikeComment;

    beforeAll(async () => {
        LikeComment = LikeCommentModel(sequelize, DataTypes);
    });

    afterAll(async () => {
        await sequelize.close();
    });

    beforeEach(async () => {
        console.log('Starting a new test...');
        await LikeComment.destroy({ where: { commentId: { [Sequelize.Op.notIn]: [5, 6, 7, 8] } } });
    });

    afterEach(async () => {
        console.log('Test completed.');
    });

    test('Deve criar um novo likeComment', async () => {
        console.log('Running test: Deve criar um novo likeComment');

        try {
            const likeComment = await LikeComment.create({
                commentId: 1,
                userId: 1
            });

            expect(likeComment.commentId).toBe(1);
            expect(likeComment.userId).toBe(1);
        } catch (error) {
            console.error('Error creating likeComment:', error);
            throw error;
        }
    });

    test('Deve falhar se commentId for nulo', async () => {
        console.log('Running test: Deve falhar se commentId for nulo');

        try {
            await LikeComment.create({
                commentId: null,
                userId: 1
            });
        } catch (error) {
            expect(error).toBeDefined();
            expect(error.message).toContain("Column 'commentId' cannot be null");

        }
    });

    test('Deve atualizar um likeComment', async () => {
        console.log('Running test: Deve atualizar um likeComment');

        try {
            const likeComment = await LikeComment.create({
                commentId: 1,
                userId: 1
            });

            await LikeComment.update(
                { commentId: 2 },
                { where: { commentId: 1, userId: 1 } }
            );

            const updatedLikeComment = await LikeComment.findOne({ where: { commentId: 2, userId: 1 } });

            expect(updatedLikeComment.commentId).toBe(2);
        } catch (error) {
            console.error('Error updating likeComment:', error);
            throw error;
        }
    });

    test('Deve apagar um likeComment', async () => {
        console.log('Running test: Deve apagar um likeComment');

        try {
            const likeComment = await LikeComment.create({
                commentId: 1,
                userId: 1
            });

            await likeComment.destroy();

            const foundLikeComment = await LikeComment.findOne({ where: { commentId: 1, userId: 1 } });
            expect(foundLikeComment).toBeNull();
        } catch (error) {
            console.error('Error deleting likeComment:', error);
            throw error;
        }
    });

    test('Deve encontrar um likeComment existente', async () => {
        console.log('Running test: Deve encontrar um likeComment existente');

        await LikeComment.create({
            commentId: 55,
            userId: 11
        });

        const existingLikeComment = await LikeComment.findOne({ where: { commentId: 55, userId: 11 } });

        expect(existingLikeComment).not.toBeNull();
        expect(existingLikeComment.commentId).toBe(55);
        expect(existingLikeComment.userId).toBe(11);
    });
});
