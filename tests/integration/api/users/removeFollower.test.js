const request = require('supertest');
const app = require('../../../../app');
const { User, FollowRelationship, sequelize } = require('../../../../models');
const { verifyToken } = require('../../../../middleware/authJwt');

jest.mock('../../../../models');
jest.mock('../../../../middleware/authJwt');

describe('Remove Follower API', () => {
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

    test('Deve remover um seguidor com sucesso', async () => {
        console.log('Running test: Deve remover um seguidor com sucesso');

        const followerUserId = 2;
        const relationship = {
            mainUserId: followerUserId,
            followedUserId: 1,
            destroy: jest.fn().mockResolvedValue()
        };

        FollowRelationship.findOne.mockResolvedValueOnce(relationship);
        User.decrement = jest.fn();

        const response = await request(server)
            .delete(`/users/me/followers/${followerUserId}`)
            .set('Authorization', 'Bearer token')
            .expect(200);

        expect(response.body).toEqual({ message: 'Follower removed successfully.' });
        expect(relationship.destroy).toHaveBeenCalled();
        expect(User.decrement).toHaveBeenCalledWith('totalFollowers', {
            where: { userId: 1 }, // Decrementing the totalFollowers for the user being followed
            transaction: expect.any(Object)
        });
        expect(User.decrement).toHaveBeenCalledWith('totalFollowing', {
            where: { userId: followerUserId.toString() }, // Convert to string
            transaction: expect.any(Object)
        });
    });

    test('Deve devolver erro 400 se tentar remover a si mesmo como seguidor', async () => {
        console.log('Running test: Deve devolver erro 400 se tentar remover a si mesmo como seguidor');

        const response = await request(server)
            .delete(`/users/me/followers/1`)
            .set('Authorization', 'Bearer token')
            .expect(400);

        expect(response.body).toEqual({ message: "Cannot remove yourself as a follower." });
    });

    test('Deve devolver erro 404 se o seguidor não existir', async () => {
        console.log('Running test: Deve devolver erro 404 se o seguidor não existir');

        const followerUserId = 2;

        FollowRelationship.findOne.mockResolvedValueOnce(null);

        const response = await request(server)
            .delete(`/users/me/followers/${followerUserId}`)
            .set('Authorization', 'Bearer token')
            .expect(404);

        expect(response.body).toEqual({ message: "This user is not following you." });
    });

    test('Deve devolver erro 500 se ocorrer um erro inesperado', async () => {
        console.log('Running test: Deve devolver erro 500 se ocorrer um erro inesperado');

        const followerUserId = 2;

        FollowRelationship.findOne.mockImplementation(() => { throw new Error('Erro inesperado'); });

        const response = await request(server)
            .delete(`/users/me/followers/${followerUserId}`)
            .set('Authorization', 'Bearer token')
            .expect(500);

        expect(response.body).toEqual({ message: 'Error removing follower', error: 'Erro inesperado' });
    });
});
