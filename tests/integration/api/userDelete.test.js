const request = require('supertest');
const app = require('../../../app');
const { User, SessionLog, Token, sequelize } = require('../../../models');
const { verifyToken } = require('../../../middleware/authJwt');
const { logoutUserSessions } = require('../../../controllers/users.controller');

jest.mock('../../../models');
jest.mock('../../../middleware/authJwt');
jest.mock('../../../controllers/users.controller');

describe('PATCH /users/me/delete', () => {
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
    });

    test('Deve iniciar a exclusão da conta com sucesso', async () => {
        console.log('Running test: Deve iniciar a exclusão da conta com sucesso');

        const userId = 1;
        const user = { userId: userId, update: jest.fn().mockResolvedValue([1]) };

        User.update.mockResolvedValue([1]);
        verifyToken.mockImplementation((req, res, next) => {
            req.userId = userId;
            next();
        });

        logoutUserSessions.mockResolvedValue();

        const response = await request(server)
            .patch('/users/me/delete')
            .set('Authorization', 'Bearer token')
            .expect(200);

        expect(response.body).toEqual({
            message: "Account deletion initiated. Account will be deleted after 30 days unless cancelled."
        });
    });

    test('Deve devolver erro 404 se o utilizador não for encontrado', async () => {
        console.log('Running test: Deve devolver erro 404 se o utilizador não for encontrado');

        const userId = 1;

        User.update.mockResolvedValue([0]);
        verifyToken.mockImplementation((req, res, next) => {
            req.userId = userId;
            next();
        });

        const response = await request(server)
            .patch('/users/me/delete')
            .set('Authorization', 'Bearer token')
            .expect(404);

        expect(response.body).toEqual({
            message: "User not found."
        });
    });

    test('Deve devolver erro 500 se ocorrer um erro inesperado', async () => {
        console.log('Running test: Deve devolver erro 500 se ocorrer um erro inesperado');

        const userId = 1;
        const errorMessage = "Erro inesperado";

        User.update.mockImplementation(() => {
            throw new Error(errorMessage);
        });
        verifyToken.mockImplementation((req, res, next) => {
            req.userId = userId;
            next();
        });

        const response = await request(server)
            .patch('/users/me/delete')
            .set('Authorization', 'Bearer token')
            .expect(500);

        expect(response.body).toEqual({
            message: "Error initiating account deletion",
            error: errorMessage
        });
    });
});
