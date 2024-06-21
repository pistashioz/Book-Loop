const request = require('supertest');
const app = require('../../../../app');
const { User, sequelize } = require('../../../../models');
const { verifyToken } = require('../../../../middleware/authJwt');
const { isAdmin } = require('../../../../middleware/admin');

jest.mock('../../../../models');
jest.mock('../../../../middleware/authJwt');
jest.mock('../../../../middleware/admin');

describe('Get Suspended Users API', () => {
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

        isAdmin.mockImplementation((req, res, next) => {
            next();
        });
    });

    test('Deve devolver os utilizadores suspensos com sucesso', async () => {
        console.log('Running test: Deve devolver os utilizadores suspensos com sucesso');

        const users = [
            {
                userId: 1,
                username: 'suspendedUser1',
                profileImage: 'image1.png',
                isActiveStatus: 'suspended',
                registrationDate: new Date().toISOString()
            },
            {
                userId: 2,
                username: 'suspendedUser2',
                profileImage: 'image2.png',
                isActiveStatus: 'suspended',
                registrationDate: new Date().toISOString()
            }
        ];

        User.findAndCountAll.mockResolvedValue({
            count: users.length,
            rows: users
        });

        const response = await request(server)
            .get('/users/suspended-users')
            .set('Authorization', 'Bearer token')
            .expect(200);

        const receivedUsers = response.body.data.map(user => ({
            ...user,
            registrationDate: new Date(user.registrationDate).toISOString()
        }));

        const expectedResponse = users.map(user => ({
            ...user,
            registrationDate: new Date(user.registrationDate).toISOString()
        }));

        expect(receivedUsers).toEqual(expectedResponse);
        expect(response.body.currentPage).toEqual(1);
        expect(response.body.totalPages).toEqual(1);
    });

    test('Deve devolver erro 500 se ocorrer um erro inesperado', async () => {
        console.log('Running test: Deve devolver erro 500 se ocorrer um erro inesperado');

        User.findAndCountAll.mockImplementation(() => { throw new Error('Erro inesperado'); });

        const response = await request(server)
            .get('/users/suspended-users')
            .set('Authorization', 'Bearer token')
            .expect(500);

        expect(response.body).toEqual({ message: 'Error fetching suspended users', error: 'Erro inesperado' });
    });
});
