const request = require('supertest');
const app = require('../../../../app');
const { Work, sequelize } = require('../../../../models');

jest.mock('../../../../models');

describe('Find All Works API', () => {
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

});
