const request = require('supertest');
const app = require('../../../../app');
const { User, Listing, Wishlist, BookEdition, ListingImage } = require('../../../../models');
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

    describe('GET /wishlist', () => {
        test('Deve retornar a wishlist com sucesso', async () => {
            jest.setTimeout(60000); 
            console.log('Running test: Deve retornar a wishlist com sucesso');

            const userId = 1;
            const wishlist = [{
                Listing: {
                    listingId: 100,
                    listingTitle: 'Test Listing',
                    price: 10.00,
                    listingCondition: 'Good',
                    availability: 'Active',
                    BookEdition: {
                        title: 'Test Book'
                    },
                    ListingImages: [{
                        imageUrl: 'test.jpg'
                    }]
                },
                addedDate: new Date()
            }];

            Wishlist.findAll.mockResolvedValue(wishlist);
            verifyToken.mockImplementation((req, res, next) => {
                req.userId = userId;
                next();
            });

            const response = await request(server)
                .get('/wishlist')
                .set('Authorization', 'Bearer token')
                .expect(200);

            expect(response.body).toEqual(wishlist.map(item => ({
                listingId: item.Listing.listingId,
                listingTitle: item.Listing.listingTitle,
                price: item.Listing.price,
                listingCondition: item.Listing.listingCondition,
                listingImage: item.Listing.ListingImages.length > 0 ? item.Listing.ListingImages[0].imageUrl : null,
                bookEditionTitle: item.Listing.BookEdition.title,
                addedDate: item.addedDate.toISOString()            })));

            console.log('Test completed: Deve retornar a wishlist com sucesso');
        });

        test('Deve retornar erro 401 se o usuário não estiver autenticado', async () => {
            jest.setTimeout(60000); 
            console.log('Running test: Deve retornar erro 401 se o usuário não estiver autenticado');

            verifyToken.mockImplementation((req, res, next) => {
                res.status(401).send({ message: 'No access token found.' });
            });

            const response = await request(server)
                .get('/wishlist')
                .expect(401);

            expect(response.body).toEqual({ message: 'No access token found.' });

            console.log('Test completed: Deve retornar erro 401 se o usuário não estiver autenticado');
        });

        test('Deve retornar erro 500 se ocorrer um erro inesperado', async () => {
            jest.setTimeout(60000); 
            console.log('Running test: Deve retornar erro 500 se ocorrer um erro inesperado');

            const userId = 1;
            const errorMessage = 'Erro inesperado';

            Wishlist.findAll.mockImplementation(() => {
                throw new Error(errorMessage);
            });
            verifyToken.mockImplementation((req, res, next) => {
                req.userId = userId;
                next();
            });

            const response = await request(server)
                .get('/wishlist')
                .set('Authorization', 'Bearer token')
                .expect(500);

            expect(response.body).toEqual({
                message: 'Error fetching wishlist',
                error: errorMessage,
            });

            console.log('Test completed: Deve retornar erro 500 se ocorrer um erro inesperado');
        });
    });
});
