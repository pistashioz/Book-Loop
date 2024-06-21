const request = require('supertest');
const app = require('../../../../app');
const { User, sequelize } = require('../../../../models');

jest.mock('../../../../models');

describe('Find All Users API', () => {
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

    test('Deve devolver todos os utilizadores com sucesso', async () => {
        console.log('Running test: Deve devolver todos os utilizadores com sucesso');

        const users = [
            {
                userId: 1,
                profileImage: 'image1.png',
                username: 'user1',
                sellerAverageRating: 4.5,
                sellerReviewCount: 10,
                isActiveStatus: true,
                registrationDate: '2021-01-01',
                isAdmin: false,
                deletionScheduleDate: null
            },
            {
                userId: 2,
                profileImage: 'image2.png',
                username: 'user2',
                sellerAverageRating: 3.8,
                sellerReviewCount: 5,
                isActiveStatus: true,
                registrationDate: '2021-02-01',
                isAdmin: false,
                deletionScheduleDate: null
            }
        ];

        User.findAndCountAll.mockResolvedValue({ count: users.length, rows: users });

        const response = await request(server)
            .get('/users')
            .expect(200);

        expect(response.body).toEqual({
            data: users,
            currentPage: 1,
            totalPages: 1,
            totalUsers: users.length
        });
    });

    test('Deve aplicar filtro por nome de utilizador', async () => {
        console.log('Running test: Deve aplicar filtro por nome de utilizador');

        const users = [
            {
                userId: 1,
                profileImage: 'image1.png',
                username: 'user1',
                sellerAverageRating: 4.5,
                sellerReviewCount: 10,
                isActiveStatus: true,
                registrationDate: '2021-01-01',
                isAdmin: false,
                deletionScheduleDate: null
            }
        ];

        User.findAndCountAll.mockResolvedValue({ count: users.length, rows: users });

        const response = await request(server)
            .get('/users')
            .query({ username: 'user1' })
            .expect(200);

        expect(response.body).toEqual({
            data: users,
            currentPage: 1,
            totalPages: 1,
            totalUsers: users.length
        });
    });

    test('Deve aplicar filtro por status do utilizador', async () => {
        console.log('Running test: Deve aplicar filtro por status do utilizador');

        const users = [
            {
                userId: 2,
                profileImage: 'image2.png',
                username: 'user2',
                sellerAverageRating: 3.8,
                sellerReviewCount: 5,
                isActiveStatus: false,
                registrationDate: '2021-02-01',
                isAdmin: false,
                deletionScheduleDate: null
            }
        ];

        User.findAndCountAll.mockResolvedValue({ count: users.length, rows: users });

        const response = await request(server)
            .get('/users')
            .query({ status: 'inactive' })
            .expect(200);

        expect(response.body).toEqual({
            data: users,
            currentPage: 1,
            totalPages: 1,
            totalUsers: users.length
        });
    });

    test('Deve devolver erro 500 se ocorrer um erro inesperado', async () => {
        console.log('Running test: Deve devolver erro 500 se ocorrer um erro inesperado');
        jest.setTimeout(30000); // Aumentar o tempo limite para este teste

        User.findAndCountAll.mockImplementation(() => { throw new Error('Erro inesperado'); });

        const response = await request(server)
            .get('/users')
            .expect(500);

        expect(response.body).toEqual({ message: 'Error retrieving users', error: 'Erro inesperado' });
    });
});
