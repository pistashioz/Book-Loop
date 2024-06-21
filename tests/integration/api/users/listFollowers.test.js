const request = require('supertest');
const app = require('../../../../app');
const { User, FollowRelationship, UserConfiguration, sequelize } = require('../../../../models');
const { verifyTokenHelper } = require('../../../../utils/jwtHelpers');
const extractUserId = require('../../../../middleware/extractUserId');

jest.mock('../../../../models');
jest.mock('../../../../utils/jwtHelpers');
jest.mock('../../../../middleware/extractUserId');

describe('List Followers API', () => {
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

        extractUserId.mockImplementation((req, res, next) => {
            req.userId = 1; // Mock userId
            next();
        });
    });

    test('Deve listar os utilizadores que estão a seguir o utilizador', async () => {
        console.log('Running test: Deve listar os utilizadores que estão a seguir o utilizador');

        const targetUserId = 2;
        const followers = [
            {
                MainUser: {
                    userId: 3,
                    username: 'user3',
                    profileImage: 'image3.png'
                },
                dataValues: {}
            },
            {
                MainUser: {
                    userId: 4,
                    username: 'user4',
                    profileImage: 'image4.png'
                },
                dataValues: {}
            }
        ];

        User.findByPk.mockResolvedValueOnce({ userId: targetUserId });
        UserConfiguration.findOne.mockResolvedValueOnce({ configValue: 'true' });
        FollowRelationship.findAndCountAll.mockResolvedValueOnce({ count: 2, rows: followers });
        FollowRelationship.findOne.mockResolvedValue(null); // Not following back

        const response = await request(server)
            .get(`/users/${targetUserId}/followers`)
            .set('Authorization', 'Bearer token')
            .expect(200);

        expect(response.body).toEqual({
            count: 2,
            rows: [
                {
                    MainUser: {
                        userId: 3,
                        username: 'user3',
                        profileImage: 'image3.png'
                    },
                    isFollowing: false,
                    isCurrentUser: false
                },
                {
                    MainUser: {
                        userId: 4,
                        username: 'user4',
                        profileImage: 'image4.png'
                    },
                    isFollowing: false,
                    isCurrentUser: false
                }
            ]
        });
    });

    test('Deve devolver erro 403 se a lista de seguidores for privada', async () => {
        console.log('Running test: Deve devolver erro 403 se a lista de seguidores for privada');

        const targetUserId = 2;

        User.findByPk.mockResolvedValueOnce({ userId: targetUserId });
        UserConfiguration.findOne.mockResolvedValueOnce({ configValue: 'false' });

        const response = await request(server)
            .get(`/users/${targetUserId}/followers`)
            .set('Authorization', 'Bearer token')
            .expect(403);

        expect(response.body).toEqual({ message: "The user's followers list is private." });
    });

    test('Deve devolver erro 404 se o utilizador alvo não existir', async () => {
        console.log('Running test: Deve devolver erro 404 se o utilizador alvo não existir');

        const targetUserId = 999;

        User.findByPk.mockResolvedValueOnce(null);

        const response = await request(server)
            .get(`/users/${targetUserId}/followers`)
            .set('Authorization', 'Bearer token')
            .expect(404);

        expect(response.body).toEqual({ message: 'User not found.' });
    });

    test('Deve devolver erro 500 se ocorrer um erro inesperado', async () => {
        console.log('Running test: Deve devolver erro 500 se ocorrer um erro inesperado');

        const targetUserId = 2;

        User.findByPk.mockResolvedValueOnce({ userId: targetUserId });
        UserConfiguration.findOne.mockImplementation(() => { throw new Error('Erro inesperado'); });

        const response = await request(server)
            .get(`/users/${targetUserId}/followers`)
            .set('Authorization', 'Bearer token')
            .expect(500);

        expect(response.body).toEqual({ message: 'Error retrieving followers list', error: 'Erro inesperado' });
    });
});
