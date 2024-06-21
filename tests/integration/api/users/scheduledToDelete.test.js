const request = require('supertest');
const app = require('../../../../app');
const { User, sequelize } = require('../../../../models');
const { verifyToken } = require('../../../../middleware/authJwt');
const { isAdmin } = require('../../../../middleware/admin');

jest.mock('../../../../models');
jest.mock('../../../../middleware/authJwt');
jest.mock('../../../../middleware/admin');

describe('Get Users Scheduled to Delete API', () => {
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

    test('Deve devolver os utilizadores agendados para exclusão com sucesso', async () => {
        console.log('Running test: Deve devolver os utilizadores agendados para exclusão com sucesso');

        const users = [
            {
                userId: 1,
                username: 'user1',
                profileImage: 'image1.png',
                deletionScheduleDate: new Date().toISOString(),
                registrationDate: new Date().toISOString()
            },
            {
                userId: 2,
                username: 'user2',
                profileImage: 'image2.png',
                deletionScheduleDate: new Date().toISOString(),
                registrationDate: new Date().toISOString()
            }
        ];

        User.findAll.mockResolvedValue(users);

        const response = await request(server)
            .get('/users/scheduled-to-delete')
            .set('Authorization', 'Bearer token')
            .expect(200);

        const receivedUsers = response.body.map(user => ({
            ...user,
            deletionScheduleDate: new Date(user.deletionScheduleDate).toISOString(),
            registrationDate: new Date(user.registrationDate).toISOString()
        }));

        expect(receivedUsers).toEqual(users);
    });

    test('Deve devolver erro 500 se ocorrer um erro inesperado', async () => {
        console.log('Running test: Deve devolver erro 500 se ocorrer um erro inesperado');

        User.findAll.mockImplementation(() => { throw new Error('Erro inesperado'); });

        const response = await request(server)
            .get('/users/scheduled-to-delete')
            .set('Authorization', 'Bearer token')
            .expect(500);

        expect(response.body).toEqual({ message: 'Error fetching users for deletion', error: 'Erro inesperado' });
    });
});

