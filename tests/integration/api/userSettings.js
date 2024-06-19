const request = require('supertest');
const app = require('../../../app');
const { User, UserSocialMedia, Configuration, UserConfiguration, PostalCode } = require('../../../models');
const { verifyToken } = require('../../../middleware/authJwt');

jest.mock('../../../models');
jest.mock('../../../middleware/authJwt');

describe('GET /users/me/settings', () => {
    let server;

    beforeAll((done) => {
        server = app.listen(done);
    });

    afterAll((done) => {
        server.close(done);
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('Deve retornar as configurações do perfil do utilizador', async () => {
        console.log('Running test: Deve retornar as configurações do perfil do utilizador');

        const userId = 1;
        const userProfile = {
            userId,
            username: 'testuser',
            email: 'test@example.com',
            profileImage: 'profile.jpg',
            about: 'About me',
            defaultLanguage: 'en',
            showCity: true,
            street: 'Street',
            streetNumber: '123',
            postalCode: '12345',
            postalCodeDetails: {
                locality: 'City',
                country: 'Country'
            }
        };

        User.findByPk.mockResolvedValue(userProfile);
        verifyToken.mockImplementation((req, res, next) => {
            req.userId = userId;
            next();
        });

        const response = await request(server)
            .get('/users/me/settings')
            .query({ type: 'profile' })
            .set('Authorization', 'Bearer token')
            .expect(200);

        expect(response.body).toEqual({
            userId: userProfile.userId,
            profileImage: userProfile.profileImage,
            about: userProfile.about,
            defaultLanguage: userProfile.defaultLanguage,
            address: {
                streetName: userProfile.street,
                streetNumber: userProfile.streetNumber,
                postalCode: userProfile.postalCode,
                locality: userProfile.postalCodeDetails.locality,
                country: userProfile.postalCodeDetails.country
            },
            showCity: userProfile.showCity
        });
    });

    test('Deve retornar as configurações da conta do utilizador', async () => {
        console.log('Running test: Deve retornar as configurações da conta do utilizador');

        const userId = 1;
        const user = {
            userId,
            email: 'test@example.com',
            username: 'testuser',
            name: 'Test User',
            birthDate: '2000-01-01',
            holidayMode: false,
            userSocialMedias: [
                { socialMediaName: 'Twitter', profileUrl: 'http://twitter.com/testuser' }
            ]
        };

        User.findByPk.mockResolvedValue(user);
        verifyToken.mockImplementation((req, res, next) => {
            req.userId = userId;
            next();
        });

        const response = await request(server)
            .get('/users/me/settings')
            .query({ type: 'account' })
            .set('Authorization', 'Bearer token')
            .expect(200);

        expect(response.body).toEqual({
            email: user.email,
            username: user.username,
            name: user.name,
            birthdayDate: user.birthDate,
            holidayMode: user.holidayMode,
            socialMediaProfiles: [
                { socialMediaName: 'Twitter', profileUrl: 'http://twitter.com/testuser' }
            ]
        });
    });

    test('Deve retornar as configurações de notificações do utilizador', async () => {
        console.log('Running test: Deve retornar as configurações de notificações do utilizador');

        const userId = 1;
        const configs = [
            { configKey: 'enable_email_notifications', description: 'Enable email notifications', userConfiguration: { configValue: 'true' } },
            { configKey: 'platform_updates', description: 'Platform updates', userConfiguration: { configValue: 'false' } }
        ];

        Configuration.findAll.mockResolvedValue(configs);
        verifyToken.mockImplementation((req, res, next) => {
            req.userId = userId;
            next();
        });

        const response = await request(server)
            .get('/users/me/settings')
            .query({ type: 'notifications' })
            .set('Authorization', 'Bearer token')
            .expect(200);

        expect(response.body).toEqual({
            main: {
                enable_email_notifications: {
                    description: 'Enable email notifications',
                    value: 'true'
                }
            },
            news: {
                platform_updates: {
                    description: 'Platform updates',
                    value: 'false'
                }
            },
            highPriority: {},
            other: {}
        });
    });

    test('Deve retornar as configurações de privacidade do utilizador', async () => {
        console.log('Running test: Deve retornar as configurações de privacidade do utilizador');

        const userId = 1;
        const configs = [
            { configKey: 'allow_data_tracking', description: 'Allow data tracking', userConfiguration: { configValue: 'true' } },
            { configKey: 'personalise_experience', description: 'Personalise experience', userConfiguration: { configValue: 'false' } }
        ];

        Configuration.findAll.mockResolvedValue(configs);
        verifyToken.mockImplementation((req, res, next) => {
            req.userId = userId;
            next();
        });

        const response = await request(server)
            .get('/users/me/settings')
            .query({ type: 'privacy' })
            .set('Authorization', 'Bearer token')
            .expect(200);

        expect(response.body).toEqual({
            dataTracking: {
                allow_data_tracking: {
                    description: 'Allow data tracking',
                    value: 'true'
                }
            },
            personalization: {
                personalise_experience: {
                    description: 'Personalise experience',
                    value: 'false'
                }
            },
            marketing: {},
            account: {}
        });
    });

    test('Deve retornar erro 400 se o tipo de configuração for inválido', async () => {
        console.log('Running test: Deve retornar erro 400 se o tipo de configuração for inválido');

        const userId = 1;
        verifyToken.mockImplementation((req, res, next) => {
            req.userId = userId;
            next();
        });

        const response = await request(server)
            .get('/users/me/settings')
            .query({ type: 'invalid_type' })
            .set('Authorization', 'Bearer token')
            .expect(400);

        expect(response.body).toEqual({ message: "Invalid settings type specified" });
    });

    test('Deve retornar erro 500 se ocorrer um erro inesperado', async () => {
        console.log('Running test: Deve retornar erro 500 se ocorrer um erro inesperado');

        const userId = 1;
        verifyToken.mockImplementation((req, res, next) => {
            req.userId = userId;
            next();
        });

        Configuration.findAll.mockImplementation(() => { throw new Error('Erro inesperado'); });

        const response = await request(server)
            .get('/users/me/settings')
            .query({ type: 'privacy' })
            .set('Authorization', 'Bearer token')
            .expect(500);

        expect(response.body).toEqual({ message: "Error retrieving settings", error: "Failed to retrieve privacy settings" });
    });
});
