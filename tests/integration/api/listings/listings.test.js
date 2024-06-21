const request = require('supertest');
const app = require('../../../../app');
const { User, Listing, BookEdition, sequelize } = require('../../../../models');
const { verifyToken } = require('../../../../middleware/authJwt');
const { getTransaction } = require('../../../../tests/setup');
const { ValidationError } = require('sequelize'); 

jest.mock('../../../../models');
jest.mock('../../../../middleware/authJwt');

describe('Listings API', () => {
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

    describe('POST /listings', () => {
        test('Deve criar um novo anúncio com sucesso', async () => {
            console.log('Running test: Deve criar um novo anúncio com sucesso');

            const newListing = {
                sellerUserId: 1,
                ISBN: '978-3-16-148410-0',
                listingTitle: 'Novo Livro',
                price: 15.99,
                listingCondition: 'Novo',
                listingDescription: 'Descrição do novo livro'
            };

            Listing.create.mockResolvedValue(newListing);
            BookEdition.findByPk.mockResolvedValue({ ISBN: '978-3-16-148410-0' });
            verifyToken.mockImplementation((req, res, next) => {
                req.userId = newListing.sellerUserId;
                next();
            });

            const response = await request(server)
                .post('/listings')
                .send(newListing)
                .set('Authorization', 'Bearer token')
                .expect(201);

            expect(response.body).toEqual({
                success: true,
                message: "Listing created successfully.",
                listing: newListing
            });
        }, 60000); 

        const { ValidationError } = require('sequelize');

        test('Deve devolver erro 400 se o corpo da requisição estiver inválido', async () => {
            console.log('Running test: Deve devolver erro 400 se o corpo da requisição estiver inválido');
        
            const invalidListing = {
                sellerUserId: 1,
                listingTitle: 'Novo Livro',
                price: 15.99
            };
        
            // Simulando ValidationError com uma mensagem de erro específica
            const validationError = new ValidationError("Validation Error", [
                { message: "Campo obrigatório faltando", path: "ISBN" }
            ]);
        
            Listing.create.mockImplementation(() => {
                throw validationError;
            });
        
            const response = await request(server)
                .post('/listings')
                .send(invalidListing)
                .set('Authorization', 'Bearer token')
                .expect(400);
        
            expect(response.body).toEqual({
                success: false,
                message: ["Campo obrigatório faltando"]
            });
        }, 60000); 
        

        test('Deve devolver erro 500 se ocorrer um erro inesperado', async () => {
            console.log('Running test: Deve devolver erro 500 se ocorrer um erro inesperado');

            const newListing = {
                sellerUserId: 1,
                ISBN: '978-3-16-148410-0',
                listingTitle: 'Novo Livro',
                price: 15.99,
                listingCondition: 'Novo',
                listingDescription: 'Descrição do novo livro'
            };

            Listing.create.mockImplementation(() => {
                throw new Error("Erro inesperado");
            });

            const response = await request(server)
                .post('/listings')
                .send(newListing)
                .set('Authorization', 'Bearer token')
                .expect(500);

            expect(response.body).toEqual({
                success: false,
                message: "Erro inesperado"
            });
        }, 60000); 
    });

    describe('GET /listings', () => {
        test('Deve devolver todos os anúncios com sucesso', async () => {
            console.log('Running test: Deve devolver todos os anúncios com sucesso');
        
            const listings = [{
                listingId: 1,
                listingTitle: 'Novo Livro',
                listingDescription: 'Descrição do novo livro',
                price: 15.99,
                listingDate: new Date(),
                listingCondition: 'Novo',
                availability: 'Active',
                ListingImages: [{ imageUrl: 'image_url' }],
                User: { username: 'user1', profileImage: 'profile_image' },
                BookEdition: { title: 'Book Title' }
            }];
        
            Listing.findAndCountAll.mockResolvedValue({ rows: listings, count: 1 });
        
            const response = await request(server)
                .get('/listings')
                .expect(200);
        
            expect(response.body).toEqual({
                success: true,
                message: "Listings fetched successfully.",
                totalItems: 1,
                totalPages: 1,
                currentPage: 1,
                listings: [{
                    listingId: 1,
                    listingTitle: 'Novo Livro',
                    listingDescription: 'Descrição do novo livro',
                    price: 15.99,
                    listingDate: expect.any(String),
                    listingCondition: 'Novo',
                    availability: 'Active',
                    imageUrl: 'image_url',
                    seller: { username: 'user1', profileImage: 'profile_image' },
                    bookTitle: 'Book Title'
                }]
            });
        }, 60000); 
        
        test('Deve devolver erro 500 se ocorrer um erro inesperado ao procurar anúncios', async () => {
            console.log('Running test: Deve devolver erro 500 se ocorrer um erro inesperado ao procurar anúncios');

            Listing.findAndCountAll.mockImplementation(() => {
                throw new Error("Erro inesperado");
            });

            const response = await request(server)
                .get('/listings')
                .expect(500);

            expect(response.body).toEqual({
                success: false,
                message: "Erro inesperado"
            });
        }, 60000); 
    });
});
