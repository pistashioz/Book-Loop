const request = require('supertest');
const app = require('../../../../app');
const { Listing, sequelize } = require('../../../../models');

jest.mock('../../../../models');

describe('Find All Listings API', () => {
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

    test('Deve devolver todos os listings com sucesso', async () => {
        console.log('Running test: Deve devolver todos os listings com sucesso');

        const listings = [
            {
                listingId: 6,
                listingTitle: "Un lugar feliz - New",
                listingDescription: "Brand new copy, never read.",
                price: "14.99",
                listingDate: "2024-05-14T13:18:55.000Z",
                listingCondition: "New",
                availability: "Active",
                imageUrl: "https://example.com/images/un_lugar_feliz_1.jpg",
                seller: {
                    username: "NovelNavigator91",
                    profileImage: null
                },
                bookTitle: "Un lugar feliz",
                wishlistCount: 1
            },
            {
                listingId: 3,
                listingTitle: "It Ends with Us - New",
                listingDescription: "Brand new copy, never read.",
                price: "15.99",
                listingDate: "2024-05-13T22:05:57.000Z",
                listingCondition: "New",
                availability: "Active",
                imageUrl: "https://example.com/images/it_ends_with_us_1.jpg",
                seller: {
                    username: "User",
                    profileImage: null
                },
                bookTitle: "Isto Acaba Aqui",
                wishlistCount: 0
            }
        ];
        console.log(listings)
        console.log(listings.length)
        const length = listings.length
        console.log(length)
        Listing.findAndCountAll.mockResolvedValue({ count:listings.length, rows: listings });

        const response = await request(server)
            .get('/listings')
            .expect(200);

        expect(response.body).toEqual({
            listings: listings,
            currentPage: 1,
            totalPages: 1,
            totalItems: listings.length
        });
    });

});
