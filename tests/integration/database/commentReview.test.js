const { Sequelize, DataTypes } = require('sequelize');
const { sequelize } = require('../../../models');
const CommentReviewModel = require('../../../models/commentReview.model');

describe('CommentReview Model', () => {
    let CommentReview;

    beforeAll(async () => {
        CommentReview = CommentReviewModel(sequelize, DataTypes);
    });

    afterAll(async () => {
        await sequelize.close();
    });

    beforeEach(async () => {
        console.log('Starting a new test...');
        await CommentReview.destroy({ where: { commentId: { [Sequelize.Op.notIn]: [5, 6, 7, 8] } } });
    });

    afterEach(async () => {
        console.log('Test completed.');
    });

    test('Deve criar um novo comentário', async () => {
        console.log('Running test: Deve criar um novo comentário');

        try {
            const comment = await CommentReview.create({
                literaryReviewId: 3,
                userId: 9,
                comment: 'This is a test comment.'
            });

            expect(comment.literaryReviewId).toBe(3);
            expect(comment.userId).toBe(9);
            expect(comment.comment).toBe('This is a test comment.');
        } catch (error) {
            console.error('Error creating comment:', error);
            throw error;
        }
    });

    test('Deve falhar se literaryReviewId for nulo', async () => {
        console.log('Running test: Deve falhar se literaryReviewId for nulo');

        try {
            await CommentReview.create({
                literaryReviewId: null,
                userId: 9,
                comment: 'This is a test comment.'
            });
        } catch (error) {
            expect(error).toBeDefined();
            expect(error.message).toContain("notNull Violation: CommentReview.literaryReviewId cannot be null");
        }
    });

    test('Deve atualizar um comentário', async () => {
        console.log('Running test: Deve atualizar um comentário');

        try {
            const comment = await CommentReview.create({
                literaryReviewId: 3,
                userId: 9,
                comment: 'Old comment'
            });

            await CommentReview.update(
                { comment: 'Updated comment' },
                { where: { commentId: comment.commentId } }
            );

            const updatedComment = await CommentReview.findOne({ where: { commentId: comment.commentId } });

            expect(updatedComment.comment).toBe('Updated comment');
        } catch (error) {
            console.error('Error updating comment:', error);
            throw error;
        }
    });

    test('Deve apagar um comentário', async () => {
        console.log('Running test: Deve apagar um comentário');

        try {
            const comment = await CommentReview.create({
                literaryReviewId: 3,
                userId: 9,
                comment: 'Comment to be deleted'
            });

            await comment.destroy();

            const foundComment = await CommentReview.findOne({ where: { commentId: comment.commentId } });
            expect(foundComment).toBeNull();
        } catch (error) {
            console.error('Error deleting comment:', error);
            throw error;
        }
    });

    test('Deve encontrar um comentário existente', async () => {
        console.log('Running test: Deve encontrar um comentário existente');

        await CommentReview.create({
            commentId: 9,
            literaryReviewId: 4,
            userId: 12,
            comment: 'Existing comment',
            creationDate: '2023-06-01 10:00:00',
            totalLikes: 5
        });

        const existingComment = await CommentReview.findOne({ where: { commentId: 9 } });

        expect(existingComment).not.toBeNull();
        expect(existingComment.literaryReviewId).toBe(4);
        expect(existingComment.userId).toBe(12);
        expect(existingComment.comment).toBe('Existing comment');
        expect(existingComment.totalLikes).toBe(5);
    });
});
