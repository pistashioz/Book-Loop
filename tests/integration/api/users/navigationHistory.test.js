const request = require('supertest');
const app = require('../../../../app');
const { User, Listing, BookEdition, NavigationHistory, EntityType, sequelize } = require('../../../../models');
const { verifyToken } = require('../../../../middleware/authJwt');

jest.mock('../../../../models');
jest.mock('../../../../middleware/authJwt');

describe('Navigation History API', () => {
    let server;

    beforeAll((done) => {
        server = app.listen(done);
        done();
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

    describe('POST /me/navigation-history', () => {
        test('Deve criar uma nova entrada de histórico de navegação com sucesso', async () => {
            const newEntry = {
                entityTypeId: 1,
                elementId: 2,
                visitDuration: 300,
                actionType: 'view'
            };

            User.findByPk.mockResolvedValueOnce({ userId: 2 });
            NavigationHistory.findOne.mockResolvedValueOnce(null);
            NavigationHistory.count.mockResolvedValueOnce(0);
            NavigationHistory.create.mockResolvedValueOnce();

            const response = await request(server)
                .post('/users/me/navigation-history')
                .set('Authorization', 'Bearer token')
                .send(newEntry)
                .expect(201);

            expect(response.body).toEqual({});
        });

        test('Deve devolver erro 404 se a entidade referenciada não existir', async () => {
            const newEntry = {
                entityTypeId: 1,
                elementId: 99,
                visitDuration: 300,
                actionType: 'view'
            };

            User.findByPk.mockResolvedValueOnce(null);

            const response = await request(server)
                .post('/users/me/navigation-history')
                .set('Authorization', 'Bearer token')
                .send(newEntry)
                .expect(404);

            expect(response.body).toEqual({ message: 'User does not exist.' });
        });

        test('Deve devolver erro 400 se tentar criar uma entrada de navegação para visualizar seu próprio perfil', async () => {
            const newEntry = {
                entityTypeId: 1,
                elementId: 1,
                visitDuration: 300,
                actionType: 'view'
            };

            User.findByPk.mockResolvedValueOnce({ userId: 1 });

            const response = await request(server)
                .post('/users/me/navigation-history')
                .set('Authorization', 'Bearer token')
                .send(newEntry)
                .expect(400);

            expect(response.body).toEqual({ message: 'Cannot create navigation history entry for viewing own profile.' });
        });

        test('Deve devolver erro 500 se ocorrer um erro inesperado', async () => {
            jest.setTimeout(30000); // Aumentar o tempo limite para este teste

            const newEntry = {
                entityTypeId: 1,
                elementId: 2,
                visitDuration: 300,
                actionType: 'view'
            };

            User.findByPk.mockImplementation(() => { throw new Error('Erro inesperado'); });

            const response = await request(server)
                .post('/users/me/navigation-history')
                .set('Authorization', 'Bearer token')
                .send(newEntry)
                .expect(500);

            expect(response.body).toEqual({ message: 'Error creating navigation history entry', error: 'Erro inesperado' });
        });
    });

    describe('GET /me/navigation-history', () => {
        test('Deve devolver o histórico de navegação filtrado pelo tipo com sucesso', async () => {
            console.log('Running test: Deve devolver o histórico de navegação filtrado pelo tipo com sucesso');
    
            const entityType = { entityTypeId: 2, entityTypeName: 'listing' };
            const navigationHistoryEntries = [
                {
                    historyId: 1,
                    userId: 1,
                    entityTypeId: 2,
                    elementId: 1,
                    dateTime: new Date(),
                    entityType: entityType
                },
            ];
            const listingDetails = {
                listingId: 1,
                listingTitle: 'Test Listing',
                price: 100,
                listingCondition: 'new',
                likesCount: 10,
                BookEdition: { title: 'Test Book' },
                ListingImages: [{ imageUrl: 'test.jpg' }]
            };
    
            EntityType.findOne.mockResolvedValue(entityType);
            NavigationHistory.findAndCountAll.mockResolvedValue({ rows: navigationHistoryEntries, count: 1 });
            Listing.findOne.mockResolvedValue(listingDetails);
    
            const response = await request(server)
                .get('/users/me/navigation-history')
                .query({ type: 'listing', page: 1, limit: 10 })
                .set('Authorization', 'Bearer token')
                .expect(200);
    
            expect(response.body).toEqual({
                currentPage: 1,
                totalPages: 1,
                totalCount: 1,
                data: [
                    {
                        historyId: 1,
                        details: {
                            listingId: 1,
                            listingTitle: 'Test Listing',
                            price: 100,
                            listingCondition: 'new',
                            likesCount: 10,
                            listingImage: 'test.jpg',
                            BookEdition: { title: 'Test Book' }
                        }
                    }
                ]
            });
        });
    
        test('Deve devolver erro 404 se o tipo de entidade não for encontrado', async () => {
            console.log('Running test: Deve devolver erro 404 se o tipo de entidade não for encontrado');
    
            EntityType.findOne.mockResolvedValue(null);
    
            const response = await request(server)
                .get('/users/me/navigation-history')
                .query({ type: 'unknown' })
                .set('Authorization', 'Bearer token')
                .expect(404);
    
            expect(response.body).toEqual({ message: 'Entity type not found' });
        });
    
        test('Deve devolver erro 500 se ocorrer um erro inesperado', async () => {
            console.log('Running test: Deve devolver erro 500 se ocorrer um erro inesperado');

    
            EntityType.findOne.mockImplementation(() => { throw new Error('Erro inesperado'); });
    
            const response = await request(server)
                .get('/users/me/navigation-history')
                .set('Authorization', 'Bearer token')
                .expect(500);
    
            expect(response.body).toEqual({ message: 'Error fetching navigation history', error: 'Erro inesperado' });
        })
    });});