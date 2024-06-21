const request = require('supertest');
const app = require('../../../../app');
const { User, Block, sequelize } = require('../../../../models');
const { verifyToken } = require('../../../../middleware/authJwt');

jest.mock('../../../../models');
jest.mock('../../../../middleware/authJwt');

describe('Unblock User API', () => {
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

    test('Deve desbloquear um utilizador com sucesso', async () => {
        console.log('Running test: Deve desbloquear um utilizador com sucesso');

        const blockedUserId = 2;
        const block = {
            blockerUserId: 1,
            blockedUserId,
            destroy: jest.fn().mockResolvedValue()
        };

        User.findByPk.mockResolvedValueOnce({ userId: blockedUserId });
        Block.findOne.mockResolvedValueOnce(block);

        const response = await request(server)
            .delete(`/users/me/blocked/${blockedUserId}`)
            .set('Authorization', 'Bearer token')
            .expect(200);

        expect(response.body).toEqual({ message: 'User unblocked successfully.' });
        expect(block.destroy).toHaveBeenCalled();
    });

    test('Deve devolver erro 404 se o utilizador não existir', async () => {
        console.log('Running test: Deve devolver erro 404 se o utilizador não existir');

        const blockedUserId = 999;

        User.findByPk.mockResolvedValueOnce(null);

        const response = await request(server)
            .delete(`/users/me/blocked/${blockedUserId}`)
            .set('Authorization', 'Bearer token')
            .expect(404);

        expect(response.body).toEqual({ message: "User not found." });
    });

    test('Deve devolver erro 400 se o utilizador não estiver bloqueado', async () => {
        console.log('Running test: Deve devolver erro 400 se o utilizador não estiver bloqueado');

        const blockedUserId = 2;

        User.findByPk.mockResolvedValueOnce({ userId: blockedUserId });
        Block.findOne.mockResolvedValueOnce(null);

        const response = await request(server)
            .delete(`/users/me/blocked/${blockedUserId}`)
            .set('Authorization', 'Bearer token')
            .expect(400);

        expect(response.body).toEqual({ message: "User not currently blocked." });
    });

    test('Deve devolver erro 500 se ocorrer um erro inesperado', async () => {
        console.log('Running test: Deve devolver erro 500 se ocorrer um erro inesperado');

        const blockedUserId = 2;

        User.findByPk.mockResolvedValueOnce({ userId: blockedUserId });
        Block.findOne.mockImplementation(() => { throw new Error('Erro inesperado'); });

        const response = await request(server)
            .delete(`/users/me/blocked/${blockedUserId}`)
            .set('Authorization', 'Bearer token')
            .expect(500);

        expect(response.body).toEqual({ message: 'Error unblocking user', error: 'Erro inesperado' });
    });
});
