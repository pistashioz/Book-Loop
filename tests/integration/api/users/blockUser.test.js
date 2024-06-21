const request = require('supertest');
const app = require('../../../../app');
const { User, Block, sequelize } = require('../../../../models');
const { verifyToken } = require('../../../../middleware/authJwt');

jest.mock('../../../../models');
jest.mock('../../../../middleware/authJwt');

describe('Block User API', () => {
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

    test('Deve bloquear um utilizador com sucesso', async () => {
        console.log('Running test: Deve bloquear um utilizador com sucesso');

        const targetUserId = 2;

        User.findByPk.mockResolvedValueOnce({ userId: targetUserId });
        Block.findOrCreate.mockResolvedValueOnce([{ blockerUserId: 1, blockedUserId: targetUserId }, true]);

        const response = await request(server)
            .post('/users/me/block')
            .set('Authorization', 'Bearer token')
            .send({ targetUserId })
            .expect(200);

        expect(response.body).toEqual({ message: 'User blocked successfully.' });
    });

    test('Deve devolver erro 400 ao tentar bloquear a si mesmo', async () => {
        console.log('Running test: Deve devolver erro 400 ao tentar bloquear a si mesmo');

        const response = await request(server)
            .post('/users/me/block')
            .set('Authorization', 'Bearer token')
            .send({ targetUserId: 1 })
            .expect(400);

        expect(response.body).toEqual({ message: "Cannot block yourself." });
    });

    test('Deve devolver erro 404 se o utilizador alvo não existir', async () => {
        console.log('Running test: Deve devolver erro 404 se o utilizador alvo não existir');

        User.findByPk.mockResolvedValueOnce(null);

        const response = await request(server)
            .post('/users/me/block')
            .set('Authorization', 'Bearer token')
            .send({ targetUserId: 999 })
            .expect(404);

        expect(response.body).toEqual({ message: "User not found." });
    });

    test('Deve devolver erro 400 se já estiver a bloquear o utilizador', async () => {
        console.log('Running test: Deve devolver erro 400 se já estiver a bloquear o utilizador');

        const targetUserId = 2;

        User.findByPk.mockResolvedValueOnce({ userId: targetUserId });
        Block.findOrCreate.mockResolvedValueOnce([{ blockerUserId: 1, blockedUserId: targetUserId }, false]);

        const response = await request(server)
            .post('/users/me/block')
            .set('Authorization', 'Bearer token')
            .send({ targetUserId })
            .expect(400);

        expect(response.body).toEqual({ message: "User already blocked." });
    });

    test('Deve devolver erro 500 se ocorrer um erro inesperado', async () => {
        console.log('Running test: Deve devolver erro 500 se ocorrer um erro inesperado');

        const targetUserId = 2;

        User.findByPk.mockResolvedValueOnce({ userId: targetUserId });
        Block.findOrCreate.mockImplementation(() => { throw new Error('Erro inesperado'); });

        const response = await request(server)
            .post('/users/me/block')
            .set('Authorization', 'Bearer token')
            .send({ targetUserId })
            .expect(500);

        expect(response.body).toEqual({ message: 'Error blocking user', error: 'Erro inesperado' });
    });
});
