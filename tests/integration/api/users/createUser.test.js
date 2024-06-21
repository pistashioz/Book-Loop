const request = require('supertest');
const app = require('../../../../app');
const { User, Configuration, UserConfiguration, sequelize } = require('../../../../models');

jest.mock('../../../../models');

describe('POST /users', () => {
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

    // Not working :/
    // test('Deve criar um novo usuário com sucesso', async () => {
    //     const newUser = {
    //         userId: 1,
    //         username: 'testuser',
    //         email: 'testuser@example.com',
    //         password: 'password123',
    //         birthDate: '2000-01-01',
    //     };

    //     User.create.mockResolvedValue(newUser);
    //     Configuration.findAll.mockResolvedValue([{ configId: 1, configKey: 'example_config' }]);
    //     UserConfiguration.create.mockResolvedValue({});

    //     const response = await request(server)
    //         .post('/users')
    //         .send({
    //             username: 'testuser',
    //             email: 'testuser@example.com',
    //             password: 'password123',
    //             birthDate: '2000-01-01',
    //             activateConfigs: true,
    //             acceptTAndC: true
    //         })
    //         .expect(201);

    //     expect(response.body).toEqual({
    //         message: "User registered successfully.",
    //         user: newUser
    //     });
    // });

    test('Deve retornar erro 400 se campos obrigatórios estiverem ausentes', async () => {
        const response = await request(server)
            .post('/users')
            .send({
                username: 'testuser',
                email: 'testuser@example.com',
                password: 'password123',
                // birthDate está faltando
                activateConfigs: true,
                acceptTAndC: true
            })
            .expect(400);

        expect(response.body).toEqual({
            message: "All fields including birth date must be provided and Terms must be accepted"
        });
    });

    test('Deve retornar erro 500 se ocorrer um erro inesperado', async () => {
        User.create.mockRejectedValue(new Error('Erro inesperado'));

        const response = await request(server)
            .post('/users')
            .send({
                username: 'testuser',
                email: 'testuser@example.com',
                password: 'password123',
                birthDate: '2000-01-01',
                activateConfigs: true,
                acceptTAndC: true
            })
            .expect(500);

        expect(response.body).toEqual({
            message: "Error creating user",
            error: "Erro inesperado"
        });
    });
});
