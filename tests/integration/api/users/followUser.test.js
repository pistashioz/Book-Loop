const request = require('supertest');
const app = require('../../../../app');
const { User, FollowRelationship, sequelize } = require('../../../../models');
const { verifyToken } = require('../../../../middleware/authJwt');

jest.mock('../../../../models');
jest.mock('../../../../middleware/authJwt');

describe('Follow User API', () => {
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

    test('Deve seguir um utilizador com sucesso', async () => {
        console.log('Running test: Deve seguir um utilizador com sucesso');

        const targetUserId = 2;

        User.findByPk.mockResolvedValueOnce({ userId: targetUserId });
        FollowRelationship.findOrCreate.mockResolvedValueOnce([{ mainUserId: 1, followedUserId: targetUserId }, true]);
        User.increment = jest.fn();

        const response = await request(server)
            .post('/users/me/follow')
            .set('Authorization', 'Bearer token')
            .send({ targetUserId })
            .expect(200);

        expect(response.body).toEqual({ message: 'User followed successfully.' });
        expect(User.increment).toHaveBeenCalledWith('totalFollowers', { by: 1, where: { userId: targetUserId }, transaction: expect.anything() });
        expect(User.increment).toHaveBeenCalledWith('totalFollowing', { by: 1, where: { userId: 1 }, transaction: expect.anything() });
    });

    test('Deve devolver erro 400 ao tentar seguir a si mesmo', async () => {
        console.log('Running test: Deve devolver erro 400 ao tentar seguir a si mesmo');

        const response = await request(server)
            .post('/users/me/follow')
            .set('Authorization', 'Bearer token')
            .send({ targetUserId: 1 })
            .expect(400);

        expect(response.body).toEqual({ message: "Cannot follow yourself." });
    });

    test('Deve devolver erro 404 se o utilizador alvo não existir', async () => {
        console.log('Running test: Deve devolver erro 404 se o utilizador alvo não existir');

        User.findByPk.mockResolvedValueOnce(null);

        const response = await request(server)
            .post('/users/me/follow')
            .set('Authorization', 'Bearer token')
            .send({ targetUserId: 999 })
            .expect(404);

        expect(response.body).toEqual({ message: "User not found!" });
    });

    test('Deve devolver erro 400 se já estiver a seguir o utilizador', async () => {
        console.log('Running test: Deve devolver erro 400 se já estiver a seguir o utilizador');

        const targetUserId = 2;

        User.findByPk.mockResolvedValueOnce({ userId: targetUserId });
        FollowRelationship.findOrCreate.mockResolvedValueOnce([{ mainUserId: 1, followedUserId: targetUserId }, false]);

        const response = await request(server)
            .post('/users/me/follow')
            .set('Authorization', 'Bearer token')
            .send({ targetUserId })
            .expect(400);

        expect(response.body).toEqual({ message: "Already following this user." });
    });

    test('Deve devolver erro 500 se ocorrer um erro inesperado', async () => {
        console.log('Running test: Deve devolver erro 500 se ocorrer um erro inesperado');

        const targetUserId = 2;

        User.findByPk.mockResolvedValueOnce({ userId: targetUserId });
        FollowRelationship.findOrCreate.mockImplementation(() => { throw new Error('Erro inesperado'); });

        const response = await request(server)
            .post('/users/me/follow')
            .set('Authorization', 'Bearer token')
            .send({ targetUserId })
            .expect(500);

        expect(response.body).toEqual({ message: 'Error following user', error: 'Erro inesperado' });
    });
});
