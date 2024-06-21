const request = require('supertest');
const app = require('../../../../app');
const { User, PostalCode, sequelize } = require('../../../../models');
const { verifyToken } = require('../../../../middleware/authJwt');

jest.mock('../../../../models');
jest.mock('../../../../middleware/authJwt');

describe('PATCH /users/me/address', () => {
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

    test('Deve atualizar o endereço do utilizador com sucesso', async () => {
        console.log('Running test: Deve atualizar o endereço do utilizador com sucesso');

        const userId = 1;
        const userAddress = {
            street: 'Rua Nova',
            streetNumber: '123',
            postalCode: '4567-890',
            locality: 'Localidade',
            country: 'País'
        };

        const user = {
            save: jest.fn().mockResolvedValue(),
            street: userAddress.street,
            streetNumber: userAddress.streetNumber,
            postalCode: userAddress.postalCode
        };

        const postalCode = {
            postalCode: userAddress.postalCode,
            locality: userAddress.locality,
            country: userAddress.country,
            update: jest.fn().mockResolvedValue()
        };

        // Adicionando um método findByPk ao protótipo do User
        User.findByPk = jest.fn().mockResolvedValue(user);
        PostalCode.findByPk.mockResolvedValue(postalCode);
        PostalCode.create.mockResolvedValue(postalCode);
        verifyToken.mockImplementation((req, res, next) => {
            req.userId = userId;
            next();
        });

        const response = await request(server)
            .patch('/users/me/address')
            .set('Authorization', 'Bearer token')
            .send(userAddress)
            .expect(200);

        expect(response.body).toEqual({
            message: "User address updated successfully",
            user: {
                street: userAddress.street,
                streetNumber: userAddress.streetNumber,
                postalCode: userAddress.postalCode,
                locality: userAddress.locality,
                country: userAddress.country
            }
        });
    });

    test('Deve devolver erro 400 se a rua e o número da rua não forem fornecidos juntos', async () => {
        console.log('Running test: Deve devolver erro 400 se a rua e o número da rua não forem fornecidos juntos');

        const userId = 1;
        const invalidAddress = {
            street: 'Rua Nova'
        };

        verifyToken.mockImplementation((req, res, next) => {
            req.userId = userId;
            next();
        });

        const response = await request(server)
            .patch('/users/me/address')
            .set('Authorization', 'Bearer token')
            .send(invalidAddress)
            .expect(400);

        expect(response.body).toEqual({
            message: "Both street and street number must be provided together.",
            missingFields: ['streetNumber']
        });
    });

    test('Deve devolver erro 400 se o código postal, localidade e país não forem fornecidos juntos', async () => {
        console.log('Running test: Deve devolver erro 400 se o código postal, localidade e país não forem fornecidos juntos');

        const userId = 1;
        const invalidAddress = {
            postalCode: '4567-890'
        };

        verifyToken.mockImplementation((req, res, next) => {
            req.userId = userId;
            next();
        });

        const response = await request(server)
            .patch('/users/me/address')
            .set('Authorization', 'Bearer token')
            .send(invalidAddress)
            .expect(400);

        expect(response.body).toEqual({
            message: "Postal code, locality, and country must be provided together.",
            missingFields: ['locality', 'country']
        });
    });

    test('Deve devolver erro 404 se o utilizador não for encontrado', async () => {
        console.log('Running test: Deve devolver erro 404 se o utilizador não for encontrado');

        const userId = 1;
        const validAddress = {
            street: 'Rua Nova',
            streetNumber: '123',
            postalCode: '4567-890',
            locality: 'Localidade',
            country: 'País'
        };

        User.findByPk.mockResolvedValue(null);
        verifyToken.mockImplementation((req, res, next) => {
            req.userId = userId;
            next();
        });

        const response = await request(server)
            .patch('/users/me/address')
            .set('Authorization', 'Bearer token')
            .send(validAddress)
            .expect(404);

        expect(response.body).toEqual({
            message: "User not found."
        });
    });

    test('Deve devolver erro 500 se ocorrer um erro inesperado', async () => {
        console.log('Running test: Deve devolver erro 500 se ocorrer um erro inesperado');

        const userId = 1;
        const validAddress = {
            street: 'Rua Nova',
            streetNumber: '123',
            postalCode: '4567-890',
            locality: 'Localidade',
            country: 'País'
        };

        User.findByPk.mockRejectedValue(new Error('Erro inesperado'));
        verifyToken.mockImplementation((req, res, next) => {
            req.userId = userId;
            next();
        });

        const response = await request(server)
            .patch('/users/me/address')
            .set('Authorization', 'Bearer token')
            .send(validAddress)
            .expect(500);

        expect(response.body).toEqual({
            message: "Error updating user address",
            error: "Erro inesperado"
        });
    });
});
