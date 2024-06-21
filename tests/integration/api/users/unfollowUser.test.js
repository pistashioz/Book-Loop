const request = require('supertest');
const app = require('../../../../app');
const { User, FollowRelationship, sequelize } = require('../../../../models');
const { verifyToken } = require('../../../../middleware/authJwt');

jest.mock('../../../../models');
jest.mock('../../../../middleware/authJwt');

describe('Unfollow User API', () => {
    let server;

    beforeAll((done) => {
        server = app.listen(done);
    });

    afterAll((done) => {
        server.close(done);
    });

    beforeEach(() => {
        jest.clearAllMocks();
        sequelize.transaction = jest.fn().mockImplementation(() => ({
            commit: jest.fn().mockResolvedValue(),
            rollback: jest.fn().mockResolvedValue(),
        }));

        verifyToken.mockImplementation((req, res, next) => {
            req.userId = 1;
            next();
        });
    });

    test('Deve desfazer o follow de um utilizador com sucesso', async () => {
        console.log('Running test: Deve desfazer o follow de um utilizador com sucesso');

        const followedUserId = 2;
        const relationship = {
            mainUserId: 1,
            followedUserId,
            destroy: jest.fn().mockResolvedValue()
        };

        FollowRelationship.findOne.mockResolvedValueOnce(relationship);
        User.decrement = jest.fn();

        const response = await request(server)
            .delete(`/users/me/following/${followedUserId}`)
            .set('Authorization', 'Bearer token')
            .expect(200);

        expect(response.body).toEqual({ message: 'Unfollowed successfully.' });
        expect(relationship.destroy).toHaveBeenCalled();
        expect(User.decrement).toHaveBeenCalledWith('totalFollowers', {
            by: 1,
            where: { userId: followedUserId.toString() }, // Convert to string
            transaction: expect.any(Object)
        });
        expect(User.decrement).toHaveBeenCalledWith('totalFollowing', {
            by: 1,
            where: { userId: 1 }, // No need to convert, already a string
            transaction: expect.any(Object)
        });
    });

    test('Deve devolver erro 400 se não estiver a seguir o utilizador', async () => {
        console.log('Running test: Deve devolver erro 400 se não estiver a seguir o utilizador');

        const followedUserId = 2;

        FollowRelationship.findOne.mockResolvedValueOnce(null);

        const response = await request(server)
            .delete(`/users/me/following/${followedUserId}`)
            .set('Authorization', 'Bearer token')
            .expect(400);

        expect(response.body).toEqual({ message: "Not currently following this user." });
    });

    test('Deve devolver erro 500 se ocorrer um erro inesperado', async () => {
        console.log('Running test: Deve devolver erro 500 se ocorrer um erro inesperado');

        const followedUserId = 2;

        FollowRelationship.findOne.mockImplementation(() => { throw new Error('Erro inesperado'); });

        const response = await request(server)
            .delete(`/users/me/following/${followedUserId}`)
            .set('Authorization', 'Bearer token')
            .expect(500);

        expect(response.body).toEqual({ message: 'Error unfollowing user', error: 'Erro inesperado' });
    });
});
