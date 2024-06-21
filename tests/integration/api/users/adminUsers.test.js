const request = require('supertest');
const dayjs = require('dayjs'); 
const app = require('../../../../app');
const { User, sequelize } = require('../../../../models');
const { verifyToken } = require('../../../../middleware/authJwt');
const { isAdmin } = require('../../../../middleware/admin');

jest.mock('../../../../models');
jest.mock('../../../../middleware/authJwt');
jest.mock('../../../../middleware/admin');

describe('Admin Users API', () => {
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

    describe('PATCH /users/:userId', () => {
        test('Deve suspender uma conta de utilizador com sucesso', async () => {
            console.log('Running test: Deve suspender uma conta de utilizador com sucesso');

            const user = {
                userId: 2,
                username: 'user2',
                profileImage: 'image2.png',
                isActiveStatus: 'active',
                update: jest.fn().mockResolvedValue()
            };

            User.findByPk.mockResolvedValue(user);

            const response = await request(server)
                .patch('/users/2')
                .set('Authorization', 'Bearer token')
                .send({ suspensionDate: '2024-06-25' })
                .expect(200);

            expect(response.body).toEqual({ message: 'User account suspended' });
        });

        test('Deve devolver erro 404 se o utilizador não for encontrado', async () => {
            console.log('Running test: Deve devolver erro 404 se o utilizador não for encontrado');

            User.findByPk.mockResolvedValue(null);

            const response = await request(server)
                .patch('/users/2')
                .set('Authorization', 'Bearer token')
                .send({ suspensionDate: '2024-06-25' })
                .expect(404);

            expect(response.body).toEqual({ message: 'User not found' });
        });

        test('Deve devolver erro 403 se tentar suspender outro admin', async () => {
            console.log('Running test: Deve devolver erro 403 se tentar suspender outro admin');

            const adminUser = {
                userId: 3,
                isAdmin: true
            };

            User.findByPk.mockResolvedValue(adminUser);

            const response = await request(server)
                .patch('/users/3')
                .set('Authorization', 'Bearer token')
                .send({ suspensionDate: '2024-06-25' })
                .expect(403);

            expect(response.body).toEqual({ message: 'Cannot suspend or unsuspend an admin user' });
        });

        test('Deve devolver erro 500 se ocorrer um erro inesperado', async () => {
            console.log('Running test: Deve devolver erro 500 se ocorrer um erro inesperado');


            User.findByPk.mockImplementation(() => { throw new Error('Erro inesperado'); });

            const response = await request(server)
                .patch('/users/2')
                .set('Authorization', 'Bearer token')
                .send({ suspensionDate: '2024-06-25' })
                .expect(500);

            expect(response.body).toEqual({ message: 'Error suspending or unsuspending user', error: 'Erro inesperado' });
        });
    });

    describe('DELETE /users/:userId', () => {
        test('Deve remover uma conta de utilizador com sucesso', async () => {
            console.log('Running test: Deve remover uma conta de utilizador com sucesso');

            const user = {
                userId: 4,
                username: 'user4',
                isActiveStatus: 'to be deleted',
                deletionScheduleDate: dayjs().subtract(1, 'day').toDate(),
                isAdmin: false,
                destroy: jest.fn().mockResolvedValue()
            };

            User.findByPk.mockResolvedValue(user);

            const response = await request(server)
                .delete('/users/4')
                .set('Authorization', 'Bearer token')
                .expect(200);

            expect(response.body).toEqual({ message: 'User account deleted' });
        });

        test('Deve devolver erro 400 se o utilizador não estiver agendado para exclusão', async () => {
            console.log('Running test: Deve devolver erro 400 se o utilizador não estiver agendado para exclusão');

            const user = {
                userId: 5,
                isActiveStatus: 'active'
            };

            User.findByPk.mockResolvedValue(user);

            const response = await request(server)
                .delete('/users/5')
                .set('Authorization', 'Bearer token')
                .expect(400);

            expect(response.body).toEqual({ message: 'User not eligible for deletion' });
        });

        test('Deve devolver erro 403 se tentar remover outro admin', async () => {
            console.log('Running test: Deve devolver erro 403 se tentar remover outro admin');

            const adminUser = {
                userId: 6,
                isAdmin: true,
                isActiveStatus: 'to be deleted',
                deletionScheduleDate: dayjs().subtract(1, 'day').toDate()
            };

            User.findByPk.mockResolvedValue(adminUser);

            const response = await request(server)
                .delete('/users/6')
                .set('Authorization', 'Bearer token')
                .expect(403);

            expect(response.body).toEqual({ message: 'Cannot delete an admin user' });
        });

        test('Deve devolver erro 500 se ocorrer um erro inesperado', async () => {
            console.log('Running test: Deve devolver erro 500 se ocorrer um erro inesperado');


            User.findByPk.mockImplementation(() => { throw new Error('Erro inesperado'); });

            const response = await request(server)
                .delete('/users/7')
                .set('Authorization', 'Bearer token')
                .expect(500);

            expect(response.body).toEqual({ message: 'Error deleting user', error: 'Erro inesperado' });
        });
    });
});
