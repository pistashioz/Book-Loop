const request = require('supertest');
const app = require('../../../../app');
const { User, Listing, BookEdition, sequelize } = require('../../../../models');
const { verifyToken } = require('../../../../middleware/authJwt');
const extractUserId = require('../../../../middleware/extractUserId');
const { ValidationError } = require('sequelize'); 

jest.mock('../../../../models');
jest.mock('../../../../middleware/authJwt');
jest.mock('../../../../middleware/extractUserId');

describe('Listings API - /:listingId', () => {
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

    describe('GET /listings/:listingId', () => {
        test('Deve devolver o anúncio com sucesso', async () => {
            console.log('Running test: Deve devolver o anúncio com sucesso');

            const listing = {
                listingId: 1,
                listingTitle: 'Novo Livro',
                listingDescription: 'Descrição do novo livro',
                price: 15.99,
                listingDate: new Date(),
                listingCondition: 'Novo',
                availability: 'Active',
                sellerUserId: 1,
                User: {
                    username: 'user1',
                    profileImage: 'profile_image',
                    showCity: true,
                    postalCode: '12345',
                    sellerAverageRating: 4.5,
                    postalCodeDetails: {
                        locality: 'Localidade',
                        country: 'País'
                    }
                },
                BookEdition: {
                    ISBN: '978-3-16-148410-0',
                    title: 'Título do Livro',
                    editionType: 'Edição',
                    pageNumber: 300,
                    Work: {
                        BookAuthors: [
                            { Person: { personName: 'Autor 1' } },
                            { Person: { personName: 'Autor 2' } }
                        ],
                        BookGenres: [
                            { Genre: { genreName: 'Género 1' } },
                            { Genre: { genreName: 'Género 2' } }
                        ]
                    }
                }
            };

            Listing.findByPk.mockResolvedValue(listing);
            extractUserId.mockImplementation((req, res, next) => {
                req.userId = 1;
                req.isAdmin = false;
                next();
            });

            const response = await request(server)
                .get('/listings/1')
                .expect(200);

            expect(response.body).toEqual({
                success: true,
                listing: expect.any(Object)
            });
        }, 60000); 

        test('Deve devolver erro 404 se o anúncio não for encontrado', async () => {
            console.log('Running test: Deve devolver erro 404 se o anúncio não for encontrado');

            Listing.findByPk.mockResolvedValue(null);

            const response = await request(server)
                .get('/listings/1')
                .expect(404);

            expect(response.body).toEqual({
                success: false,
                message: 'Listing not found.'
            });
        }, 60000); 

        test('Deve devolver erro 403 se o usuário não estiver autorizado a visualizar o anúncio', async () => {
            console.log('Running test: Deve devolver erro 403 se o usuário não estiver autorizado a visualizar o anúncio');

            const listing = {
                listingId: 1,
                availability: 'Hidden',
                sellerUserId: 2,
                User: { userId: 2 }
            };

            Listing.findByPk.mockResolvedValue(listing);
            extractUserId.mockImplementation((req, res, next) => {
                req.userId = 1;
                req.isAdmin = false;
                next();
            });

            const response = await request(server)
                .get('/listings/1')
                .expect(403);

            expect(response.body).toEqual({
                success: false,
                message: 'You are not authorized to view this listing.'
            });
        }, 60000); 

        test('Deve devolver erro 500 se ocorrer um erro inesperado', async () => {
            console.log('Running test: Deve devolver erro 500 se ocorrer um erro inesperado');

            Listing.findByPk.mockImplementation(() => {
                throw new Error("Erro inesperado");
            });

            const response = await request(server)
                .get('/listings/1')
                .expect(500);

            expect(response.body).toEqual({
                success: false,
                message: "Erro inesperado"
            });
        }, 60000); 
    });

    describe('PATCH /listings/:listingId', () => {
        test('Deve atualizar o anúncio com sucesso', async () => {
            console.log('Running test: Deve atualizar o anúncio com sucesso');

            const listing = {
                listingId: 1,
                ISBN: '978-3-16-148410-0',
                listingTitle: 'Novo Livro',
                price: 15.99,
                listingCondition: 'Novo',
                availability: 'Active',
                listingDescription: 'Descrição do novo livro',
                save: jest.fn().mockResolvedValue()
            };

            Listing.findByPk.mockResolvedValue(listing);
            verifyToken.mockImplementation((req, res, next) => {
                req.userId = 1;
                next();
            });

            const updatedData = {
                listingTitle: 'Título Atualizado',
                price: 20.00
            };

            const response = await request(server)
                .patch('/listings/1')
                .send(updatedData)
                .set('Authorization', 'Bearer token')
                .expect(200);

            expect(response.body).toEqual({
                success: true,
                message: "Listing updated successfully.",
                listing: expect.any(Object)
            });
        }, 60000); 

        test('Deve devolver erro 404 se o anúncio não for encontrado', async () => {
            console.log('Running test: Deve devolver erro 404 se o anúncio não for encontrado');

            Listing.findByPk.mockResolvedValue(null);

            const response = await request(server)
                .patch('/listings/1')
                .set('Authorization', 'Bearer token')
                .expect(404);

            expect(response.body).toEqual({
                success: false,
                message: 'Listing not found.'
            });
        }, 60000); 

        test('Deve devolver erro 400 se o corpo da requisição estiver inválido', async () => {
            console.log('Running test: Deve devolver erro 400 se o corpo da requisição estiver inválido');

            const listing = {
                listingId: 1,
                ISBN: '978-3-16-148410-0',
                listingTitle: 'Novo Livro',
                price: 15.99,
                listingCondition: 'Novo',
                availability: 'Active',
                listingDescription: 'Descrição do novo livro',
                save: jest.fn().mockImplementation(() => {
                    throw new ValidationError("Validation Error", [
                        { message: "Campo obrigatório faltando", path: "price" }
                    ]);
                })
            };

            Listing.findByPk.mockResolvedValue(listing);
            verifyToken.mockImplementation((req, res, next) => {
                req.userId = 1;
                next();
            });

            const invalidData = {
                price: null
            };

            const response = await request(server)
                .patch('/listings/1')
                .send(invalidData)
                .set('Authorization', 'Bearer token')
                .expect(400);

            expect(response.body).toEqual({
                success: false,
                message: ["Campo obrigatório faltando"]
            });
        }, 60000); 
        test('Deve devolver erro 500 se ocorrer um erro inesperado', async () => {
            console.log('Running test: Deve devolver erro 500 se ocorrer um erro inesperado');

            Listing.findByPk.mockImplementation(() => {
                throw new Error("Erro inesperado");
            });

            const response = await request(server)
                .patch('/listings/1')
                .set('Authorization', 'Bearer token')
                .expect(500);

            expect(response.body).toEqual({
                success: false,
                message: "Erro inesperado"
            });
        }, 60000); 
    });
});
