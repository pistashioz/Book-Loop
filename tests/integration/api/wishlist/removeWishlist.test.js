const request = require('supertest');
const app = require('../../../../app');
const { Listing, Wishlist } = require('../../../../models');
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

    describe('DELETE /wishlist/:listingId', () => {
        test('Deve remover uma listagem da wishlist com sucesso', async () => {
            jest.setTimeout(60000);
            const userId = 1;
            const listingId = 100;
            const listing = { availability: 'Active' };

            Listing.findByPk.mockResolvedValue(listing);
            Wishlist.destroy.mockResolvedValue(1);
            verifyToken.mockImplementation((req, res, next) => {
                req.userId = userId;
                next();
            });

            const response = await request(server)
                .delete(`/wishlist/${listingId}`)
                .set('Authorization', 'Bearer token')
                .expect(200);

            expect(response.body).toEqual({
                message: 'Listing removed from wishlist',
            });
        });

        test('Deve devolver erro 400 se a listagem não existir ou estiver oculta', async () => {
            jest.setTimeout(60000);
            const userId = 1;
            const listingId = 100;

            Listing.findByPk.mockResolvedValue(null);
            verifyToken.mockImplementation((req, res, next) => {
                req.userId = userId;
                next();
            });

            const response = await request(server)
                .delete(`/wishlist/${listingId}`)
                .set('Authorization', 'Bearer token')
                .expect(400);

            expect(response.body).toEqual({
                message: 'Cannot remove a non-existing or hidden listing from wishlist',
            });
        });

        test('Deve devolver erro 404 se a listagem não estiver na wishlist', async () => {
            jest.setTimeout(60000);
            const userId = 1;
            const listingId = 100;
            const listing = { availability: 'Active' };

            Listing.findByPk.mockResolvedValue(listing);
            Wishlist.destroy.mockResolvedValue(0);
            verifyToken.mockImplementation((req, res, next) => {
                req.userId = userId;
                next();
            });

            const response = await request(server)
                .delete(`/wishlist/${listingId}`)
                .set('Authorization', 'Bearer token')
                .expect(404);

            expect(response.body).toEqual({
                message: 'Listing not found in wishlist',
            });
        });

        test('Deve devolver erro 401 se o usuário não estiver autenticado', async () => {
            jest.setTimeout(60000);
            verifyToken.mockImplementation((req, res, next) => {
                res.status(401).send({ message: 'No access token found.' });
            });

            const response = await request(server)
                .delete('/wishlist/100')
                .expect(401);

            expect(response.body).toEqual({ message: 'No access token found.' });
        });

        test('Deve devolver erro 500 se ocorrer um erro inesperado', async () => {
            jest.setTimeout(60000);
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
                .delete(`/wishlist/${listingId}`)
                .set('Authorization', 'Bearer token')
                .expect(500);

            expect(response.body).toEqual({
                message: 'Error removing listing from wishlist',
                error: errorMessage,
            });
        });
    });
});
