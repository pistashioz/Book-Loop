const request = require('supertest');
const app = require('../../../../app');
const { User, Block, sequelize } = require('../../../../models');
const { verifyToken } = require('../../../../middleware/authJwt');

jest.mock('../../../../models');
jest.mock('../../../../middleware/authJwt');

describe('List Blocked Users API', () => {
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

    test('Deve listar os utilizadores bloqueados com sucesso', async () => {
        console.log('Running test: Deve listar os utilizadores bloqueados com sucesso');

        const blockedUsers = [
            {
                BlockedUser: {
                    userId: 2,
                    username: 'blockeduser1',
                    profileImage: 'image1.png'
                }
            },
            {
                BlockedUser: {
                    userId: 3,
                    username: 'blockeduser2',
                    profileImage: 'image2.png'
                }
            }
        ];

        Block.findAll.mockResolvedValueOnce(blockedUsers);

        const response = await request(server)
            .get('/users/me/blocked')
            .set('Authorization', 'Bearer token')
            .expect(200);

        expect(response.body).toEqual(blockedUsers);
    });

    test('Deve devolver erro 500 se ocorrer um erro inesperado', async () => {
        console.log('Running test: Deve devolver erro 500 se ocorrer um erro inesperado');
  

        Block.findAll.mockImplementation(() => { throw new Error('Erro inesperado'); });

        const response = await request(server)
            .get('/users/me/blocked')
            .set('Authorization', 'Bearer token')
            .expect(500);

        expect(response.body).toEqual({ message: 'Error retrieving blocked users', error: 'Erro inesperado' });
    });
});
