const request = require('supertest');
const app = require('../../../../app');
const { User, Listing, Wishlist } = require('../../../../models');
const { verifyToken } = require('../../../../middleware/authJwt');

jest.mock('../../../../models');
jest.mock('../../../../middleware/authJwt');

describe('Wishlist API', () => {
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

    describe('POST /wishlist', () => {
        test('Deve adicionar um anúncio à wishlist com sucesso', async () => {
            jest.setTimeout(60000); // Define um timeout de 60 segundos para este teste
            console.log('Running test: Deve adicionar um anúncio à wishlist com sucesso');

            const userId = 1;
            const listingId = 100;
            const listing = { sellerUserId: 2, availability: 'Active' };

            Listing.findByPk.mockResolvedValue(listing);
            Wishlist.findOne.mockResolvedValue(null);
            Wishlist.create.mockResolvedValue({ userId, listingId });
            verifyToken.mockImplementation((req, res, next) => {
                req.userId = userId;
                next();
            });

            const response = await request(server)
                .post('/wishlist')
                .send({ listingId })
                .set('Authorization', 'Bearer token')
                .expect(201);

            expect(response.body).toEqual({
                message: 'Listing added to wishlist',
            });

            console.log('Test completed: Deve adicionar um anúncio à wishlist com sucesso');
        });

        test('Deve devolver erro 400 se o anúncio não existir ou estiver oculto', async () => {
            jest.setTimeout(60000);
            console.log('Running test: Deve devolver erro 400 se o anúncio não existir ou estiver oculto');

            const userId = 1;
            const listingId = 100;

            Listing.findByPk.mockResolvedValue(null);
            verifyToken.mockImplementation((req, res, next) => {
                req.userId = userId;
                next();
            });

            const response = await request(server)
                .post('/wishlist')
                .send({ listingId })
                .set('Authorization', 'Bearer token')
                .expect(400);

            expect(response.body).toEqual({
                message: 'Cannot add a non-existing or hidden listing to wishlist',
            });

            console.log('Test completed: Deve devolver erro 400 se o anúncio não existir ou estiver oculto');
        });

        test('Deve devolver erro 400 se o anúncio pertencer ao próprio utilizador', async () => {
            jest.setTimeout(60000); 
            console.log('Running test: Deve devolver erro 400 se o anúncio pertencer ao próprio utilizador');

            const userId = 1;
            const listingId = 100;
            const listing = { sellerUserId: 1, availability: 'Active' };

            Listing.findByPk.mockResolvedValue(listing);
            verifyToken.mockImplementation((req, res, next) => {
                req.userId = userId;
                next();
            });

            const response = await request(server)
                .post('/wishlist')
                .send({ listingId })
                .set('Authorization', 'Bearer token')
                .expect(400);

            expect(response.body).toEqual({
                message: 'Cannot add your own listing to wishlist',
            });

            console.log('Test completed: Deve devolver erro 400 se o anúncio pertencer ao próprio utilizador');
        });

        test('Deve devolver erro 400 se o anúncio já estiver na wishlist', async () => {
            jest.setTimeout(60000); 
            console.log('Running test: Deve devolver erro 400 se o anúncio já estiver na wishlist');

            const userId = 1;
            const listingId = 100;
            const listing = { sellerUserId: 2, availability: 'Active' };
            const wishlist = { userId, listingId };

            Listing.findByPk.mockResolvedValue(listing);
            Wishlist.findOne.mockResolvedValue(wishlist);
            verifyToken.mockImplementation((req, res, next) => {
                req.userId = userId;
                next();
            });

            const response = await request(server)
                .post('/wishlist')
                .send({ listingId })
                .set('Authorization', 'Bearer token')
                .expect(400);

            expect(response.body).toEqual({
                message: 'Listing already in wishlist',
            });

            console.log('Test completed: Deve devolver erro 400 se o anúncio já estiver na wishlist');
        });

        test('Deve devolver erro 500 se ocorrer um erro inesperado', async () => {
            jest.setTimeout(60000); 
            console.log('Running test: Deve devolver erro 500 se ocorrer um erro inesperado');

            const userId = 1;
            const listingId = 100;
            const errorMessage = 'Erro inesperado';

            Listing.findByPk.mockImplementation(() => {
                throw new Error(errorMessage);
            });
            verifyToken.mockImplementation((req, res, next) => {
                req.userId = userId;
                next();
            });

            const response = await request(server)
                .post('/wishlist')
                .send({ listingId })
                .set('Authorization', 'Bearer token')
                .expect(500);

            expect(response.body).toEqual({
                message: 'Error adding listing to wishlist',
                error: errorMessage,
            });

            console.log('Test completed: Deve devolver erro 500 se ocorrer um erro inesperado');
        });
    });
});
