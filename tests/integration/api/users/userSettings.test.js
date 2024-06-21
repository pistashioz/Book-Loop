const request = require('supertest');
const app = require('../../../../app');
const { User, UserSocialMedia, Configuration, UserConfiguration, PostalCode, sequelize } = require('../../../../models');
const { verifyToken } = require('../../../../middleware/authJwt');

jest.mock('../../../../models');
jest.mock('../../../../middleware/authJwt');

describe('User Settings API', () => {
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

    test('Deve devolver as configurações do perfil do utilizador', async () => {
        console.log('Running test: Deve devolver as configurações do perfil do utilizador');

        const userProfile = {
            userId: 1,
            username: 'testuser',
            email: 'testuser@example.com',
            profileImage: 'image.png',
            about: 'About me',
            defaultLanguage: 'en',
            showCity: true,
            street: 'Street',
            streetNumber: '123',
            postalCode: '12345',
            postalCodeDetails: {
                locality: 'Locality',
                country: 'Country'
            }
        };

        User.findByPk.mockResolvedValue(userProfile);

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

    test('Deve devolver as configurações da conta do utilizador', async () => {
        console.log('Running test: Deve devolver as configurações da conta do utilizador');

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

    test('Deve devolver as configurações de notificações do utilizador', async () => {
        console.log('Running test: Deve devolver as configurações de notificações do utilizador');

        const userId = 1;
        const configs = [
            { configKey: 'enable_email_notifications', description: 'Enable email notifications', userConfiguration: { configValue: 'true' } },
            { configKey: 'platform_updates', description: 'Platform updates', userConfiguration: { configValue: 'false' } }
        ];

        Configuration.findAll.mockResolvedValue(configs);

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

    test('Deve devolver as configurações de privacidade do utilizador', async () => {
        console.log('Running test: Deve devolver as configurações de privacidade do utilizador');

        const userId = 1;
        const configs = [
            { configKey: 'allow_data_tracking', description: 'Allow data tracking', userConfiguration: { configValue: 'true' } },
            { configKey: 'personalise_experience', description: 'Personalise experience', userConfiguration: { configValue: 'false' } }
        ];

        Configuration.findAll.mockResolvedValue(configs);

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

    test('Deve devolver erro 400 se o tipo de configuração for inválido', async () => {
        console.log('Running test: Deve devolver erro 400 se o tipo de configuração for inválido');

        const userId = 1;

        const response = await request(server)
            .get('/users/me/settings')
            .query({ type: 'invalid_type' })
            .set('Authorization', 'Bearer token')
            .expect(400);

        expect(response.body).toEqual({ message: "Invalid settings type specified" });
    });

    test('Deve devolver erro 500 se ocorrer um erro inesperado', async () => {
        console.log('Running test: Deve devolver erro 500 se ocorrer um erro inesperado');

        const userId = 1;
        Configuration.findAll.mockImplementation(() => { throw new Error('Erro inesperado'); });

        const response = await request(server)
            .get('/users/me/settings')
            .query({ type: 'privacy' })
            .set('Authorization', 'Bearer token')
            .expect(500);

        expect(response.body).toEqual({ message: "Error retrieving settings", error: "Failed to retrieve privacy settings" });
    });
});

describe('PATCH /users/me/settings', () => {
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
    test('Deve atualizar as configurações do perfil do utilizador', async () => {
        console.log('Running test: Deve atualizar as configurações do perfil do utilizador');
    
        const userId = 1;
        const updatedProfile = {
            about: 'Updated about me',
            defaultLanguage: 'pt',
            showCity: false
        };
    
        const user = {
            userId,
            update: jest.fn().mockResolvedValue(),
            about: updatedProfile.about,
            defaultLanguage: updatedProfile.defaultLanguage,
            showCity: updatedProfile.showCity
        };
    
        User.findByPk.mockResolvedValue(user);
    
        const response = await request(server)
            .patch('/users/me/settings')
            .query({ type: 'profile' })
            .set('Authorization', 'Bearer token')
            .send(updatedProfile)
            .expect(200);
    
        expect(response.body).toEqual({
            message: "User profile updated successfully",
            user: {
                about: updatedProfile.about,
                defaultLanguage: updatedProfile.defaultLanguage,
                showCity: updatedProfile.showCity
            }
        });
    });
    
    
    test('Deve devolver erro 400 se a validação falhar ao atualizar configurações do perfil', async () => {
        console.log('Running test: Deve devolver erro 400 se a validação falhar ao atualizar configurações do perfil');
    
        const userId = 1;
        const invalidProfile = {
            about: 'Updated about me',
            defaultLanguage: 'invalid_language_code',
            showCity: false
        };
    
        const user = {
            userId,
            update: jest.fn().mockRejectedValue({ name: 'SequelizeValidationError', errors: [{ message: 'Invalid language code' }] })
        };
    
        User.findByPk.mockResolvedValue(user);
    
        const response = await request(server)
            .patch('/users/me/settings')
            .query({ type: 'profile' })
            .set('Authorization', 'Bearer token')
            .send(invalidProfile)
            .expect(400);
    
        expect(response.body).toEqual({
            message: "Validation error",
            errors: ['Invalid language code']
        });
    });
    
test('Deve atualizar as configurações da conta do utilizador', async () => {
    console.log('Running test: Deve atualizar as configurações da conta do utilizador');

    const userId = 1;
    const updatedAccount = {
        email: 'updated@example.com',
        username: 'updateduser',
        name: 'Updated User',
        birthdayDate: '1990-01-01',
        holidayMode: true
    };

    const user = {
        update: jest.fn().mockResolvedValue(),
        email: updatedAccount.email,
        username: updatedAccount.username,
        name: updatedAccount.name,
        birthDate: updatedAccount.birthdayDate,
        holidayMode: updatedAccount.holidayMode
    };

    User.findByPk.mockResolvedValue(user);

    const response = await request(server)
        .patch('/users/me/settings')
        .query({ type: 'account' })
        .set('Authorization', 'Bearer token')
        .send(updatedAccount)
        .expect(200);

    expect(response.body).toEqual({
        message: "User account updated successfully",
        user: {
            email: updatedAccount.email,
            username: updatedAccount.username,
            name: updatedAccount.name,
            birthDate: updatedAccount.birthdayDate,
            holidayMode: updatedAccount.holidayMode
        }
    });
});

    test('Deve devolver erro 400 se a validação falhar ao atualizar configurações da conta', async () => {
        console.log('Running test: Deve devolver erro 400 se a validação falhar ao atualizar configurações da conta');

        const userId = 1;
        const invalidAccount = {
            email: '',
            username: '',
            name: 'Updated User',
            birthdayDate: '',
            holidayMode: true
        };

        const user = {
            update: jest.fn().mockRejectedValue({ name: 'ValidationError', errors: [
                { message: 'Email cannot be null or empty!', field: 'email' },
                { message: 'Username cannot be null or empty!', field: 'username' },
                { message: 'Birth date cannot be null or empty!', field: 'birthDate' }
            ] })
        };

        User.findByPk.mockResolvedValue(user);

        const response = await request(server)
            .patch('/users/me/settings')
            .query({ type: 'account' })
            .set('Authorization', 'Bearer token')
            .send(invalidAccount)
            .expect(400);

        expect(response.body).toEqual({
            message: "Validation errors occurred.",
            errors: [
                { message: 'Email cannot be null or empty!', field: 'email' },
                { message: 'Username cannot be null or empty!', field: 'username' },
                { message: 'Birth date cannot be null or empty!', field: 'birthDate' }
            ]
        });
    });

    test('Deve atualizar as configurações de notificações do utilizador', async () => {
        console.log('Running test: Deve atualizar as configurações de notificações do utilizador');

        const userId = 1;
        const updatedNotifications = {
            notifications: {
                enable_email_notifications: 'true',
                platform_updates: 'false'
            }
        };

        Configuration.findOne.mockResolvedValue({ configId: 1, configKey: 'enable_email_notifications' });
        UserConfiguration.findOne.mockResolvedValue(null);
        UserConfiguration.create.mockResolvedValue({ userId, configId: 1, configValue: 'true' });

        Configuration.findOne.mockResolvedValue({ configId: 2, configKey: 'platform_updates' });
        UserConfiguration.findOne.mockResolvedValue({ userId, configId: 2, configValue: 'false' });
        UserConfiguration.update.mockResolvedValue({ userId, configId: 2, configValue: 'false' });

        const response = await request(server)
            .patch('/users/me/settings')
            .query({ type: 'notifications' })
            .set('Authorization', 'Bearer token')
            .send(updatedNotifications)
            .expect(200);

        expect(response.body).toEqual({
            message: "Notification settings updated successfully"
        });
    });

    test('Deve atualizar as configurações de privacidade do utilizador', async () => {
        console.log('Running test: Deve atualizar as configurações de privacidade do utilizador');

        const userId = 1;
        const updatedPrivacy = {
            privacy: {
                allow_data_tracking: 'true',
                personalise_experience: 'false'
            }
        };

        Configuration.findOne.mockResolvedValue({ configId: 1, configKey: 'allow_data_tracking' });
        UserConfiguration.findOne.mockResolvedValue(null);
        UserConfiguration.create.mockResolvedValue({ userId, configId: 1, configValue: 'true' });

        Configuration.findOne.mockResolvedValue({ configId: 2, configKey: 'personalise_experience' });
        UserConfiguration.findOne.mockResolvedValue({ userId, configId: 2, configValue: 'false' });
        UserConfiguration.update.mockResolvedValue({ userId, configId: 2, configValue: 'false' });

        const response = await request(server)
            .patch('/users/me/settings')
            .query({ type: 'privacy' })
            .set('Authorization', 'Bearer token')
            .send(updatedPrivacy)
            .expect(200);

        expect(response.body).toEqual({
            message: "Privacy settings updated successfully"
        });
    });

    test('Deve devolver erro 400 se o tipo de configuração para atualização for inválido', async () => {
        console.log('Running test: Deve devolver erro 400 se o tipo de configuração para atualização for inválido');

        const userId = 1;

        const response = await request(server)
            .patch('/users/me/settings')
            .query({ type: 'invalid_type' })
            .set('Authorization', 'Bearer token')
            .send({})
            .expect(400);

        expect(response.body).toEqual({ message: "Invalid settings type specified" });
    });

    test('Deve devolver erro 500 se ocorrer um erro inesperado ao atualizar configurações', async () => {
        console.log('Running test: Deve devolver erro 500 se ocorrer um erro inesperado ao atualizar configurações');

        const userId = 1;
        Configuration.findOne.mockImplementation(() => { throw new Error('Erro inesperado'); });

        const response = await request(server)
            .patch('/users/me/settings')
            .query({ type: 'privacy' })
            .set('Authorization', 'Bearer token')
            .send({ privacy: { allow_data_tracking: 'true' } })
            .expect(500);

        expect(response.body).toEqual({ message: "Failed to update privacy settings", error: 'Erro inesperado' });
    });
});
