const request = require('supertest');
const app = require('../../../../app');
const { Role, sequelize } = require('../../../../models');
const { verifyToken } = require('../../../../middleware/authJwt');
const { isAdmin } = require('../../../../middleware/admin');

jest.mock('../../../../models');
jest.mock('../../../../middleware/authJwt');
jest.mock('../../../../middleware/admin');

describe('GET /persons/roles', () => {
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
        verifyToken.mockImplementation((req, res, next) => next());
        isAdmin.mockImplementation((req, res, next) => next());
    });

    test('Deve retornar todas as funções com sucesso', async () => {
        const roles = [
            { roleId: 1, roleName: 'Author' },
            { roleId: 2, roleName: 'Editor' }
        ];

        Role.findAll.mockResolvedValue(roles);

        const response = await request(server)
            .get('/persons/roles')
            .expect(200);

        expect(response.body).toEqual({
            success: true,
            message: `Found ${roles.length} roles`,
            roles,
            links: [
                { rel: "self", href: `/persons/roles`, method: "GET" },
                { rel: "create", href: `/persons/roles`, method: "POST" }
            ]
        });
    });

    test('Deve retornar erro 404 se nenhuma função for encontrada', async () => {
        Role.findAll.mockResolvedValue([]);

        const response = await request(server)
            .get('/persons/roles')
            .expect(404);

        expect(response.body).toEqual({
            success: false,
            message: 'No roles found.'
        });
    });

    test('Deve retornar erro 500 se ocorrer um erro inesperado', async () => {
        Role.findAll.mockImplementation(() => { throw new Error('Unexpected error'); });

        const response = await request(server)
            .get('/persons/roles')
            .expect(500);

        expect(response.body).toEqual({
            success: false,
            message: 'Unexpected error'
        });
    });
});
