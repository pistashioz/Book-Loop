const request = require('supertest');
const app = require('../../../../app');
const { User, sequelize, FollowRelationship, Listing, PurchaseReview, LiteraryReview } = require('../../../../models');
const extractUserId = require('../../../../middleware/extractUserId');
const dayjs = require('dayjs');

jest.mock('../../../../models');
jest.mock('../../../../middleware/extractUserId');

describe('User Details API', () => {
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

        extractUserId.mockImplementation((req, res, next) => {
            req.userId = 1;
            next();
        });
    });

    test('Deve retornar os detalhes do usuário com sucesso', async () => {
        console.log('Running test: Deve retornar os detalhes do usuário com sucesso');

        const userId = 1;
        const user = {
            userId,
            username: 'user1',
            profileImage: 'image1.png',
            about: 'About user1',
            deliverByHand: true,
            totalFollowers: 100,
            totalFollowing: 200,
            sellerAverageRating: 4.5,
            sellerReviewCount: 10,
            userSocialMedias: [
                { socialMediaName: 'Twitter', profileUrl: 'https://twitter.com/user1' }
            ],
            postalCodeDetails: {
                locality: 'City1',
                country: 'Country1'
            }
        };

        const listings = {
            count: [{ count: 0 }],
            rows: []
        };

        User.findByPk.mockResolvedValue(user);
        FollowRelationship.findOne.mockResolvedValue(null);
        Listing.findAndCountAll.mockResolvedValue(listings);

        const response = await request(server)
            .get(`/users/${userId}`)
            .set('Authorization', 'Bearer token')
            .expect(200);

        expect(response.body).toEqual(expect.objectContaining(
            {
                followingCount: user.totalFollowing,
                followersCount: user.totalFollowers,
                isCurrentUser: true,
                isFollowing: false,
                isUser: true,
                listings: { count: 0, rows: [], totalPages: 0 }
            }
        ));
    });

    test('Deve retornar erro 404 se o usuário não for encontrado', async () => {
        console.log('Running test: Deve retornar erro 404 se o usuário não for encontrado');

        User.findByPk.mockResolvedValue(null);

        const response = await request(server)
            .get(`/users/2`)
            .set('Authorization', 'Bearer token')
            .expect(404);

        expect(response.body).toEqual({ message: "User not found." });
    });

    test('Deve retornar as avaliações do usuário na aba feedback', async () => {
        console.log('Running test: Deve retornar as avaliações do usuário na aba feedback');

        const userId = 1;
        const user = {
            userId,
            username: 'user1',
            profileImage: 'image1.png',
            about: 'About user1',
            deliverByHand: true,
            totalFollowers: 100,
            totalFollowing: 200,
            sellerAverageRating: 4.5,
            sellerReviewCount: 10
        };

        const feedback = {
            count: 1,
            rows: [
                {
                    sellerReview: 'Great seller!',
                    sellerRating: 5,
                    sellerResponse: null,
                    reviewDate: new Date().toISOString(),
                    Buyer: { username: 'buyer1', profileImage: 'buyerImage1.png' }
                }
            ]
        };

        User.findByPk.mockResolvedValue(user);
        PurchaseReview.findAndCountAll.mockResolvedValue(feedback);

        const response = await request(server)
            .get(`/users/${userId}?tab=feedback`)
            .set('Authorization', 'Bearer token')
            .expect(200);

        expect(response.body).toEqual(expect.objectContaining({
            followingCount: user.totalFollowing,
            followersCount: user.totalFollowers,
            isCurrentUser: true,
            isFollowing: false,
            isUser: true,
            feedback
        }));
    });

    test('Deve retornar as resenhas literárias do usuário na aba literaryReviews', async () => {
        console.log('Running test: Deve retornar as resenhas literárias do usuário na aba literaryReviews');

        const userId = 1;
        const user = {
            userId,
            username: 'user1',
            profileImage: 'image1.png',
            about: 'About user1',
            deliverByHand: true,
            totalFollowers: 100,
            totalFollowing: 200,
            sellerAverageRating: 4.5,
            sellerReviewCount: 10
        };

        const literaryReviews = {
            count: 1,
            rows: [
                {
                    literaryReviewId: 1,
                    literaryReview: 'Great book!',
                    literaryRating: 5,
                    creationDate: new Date().toISOString(),
                    totalLikes: 10,
                    totalComments: 5,
                    dataValues: { isLiked: true },
                    Work: {
                        workId: 1,
                        BookEditions: [
                            {
                                coverImage: 'coverImage1.png',
                                ISBN: '1234567890',
                                title: 'Book Title',
                                UUID: 'uuid1'
                            }
                        ],
                        BookAuthors: [
                            {
                                Person: { personId: 1, personName: 'Author Name' }
                            }
                        ]
                    }
                }
            ]
        };

        User.findByPk.mockResolvedValue(user);
        LiteraryReview.findAndCountAll.mockResolvedValue(literaryReviews);

        const response = await request(server)
            .get(`/users/${userId}?tab=literaryReviews`)
            .set('Authorization', 'Bearer token')
            .expect(200);

        console.log(response.body);
        console.log(response.body.literaryReviews)
        console.log(response.body.literaryReviews.rows[0].bookEdition)
        expect(response.body).toEqual(expect.objectContaining({
            followingCount: user.totalFollowing,
            followersCount: user.totalFollowers,
            isCurrentUser: true,
            isFollowing: false,
            isUser: true,
            literaryReviews
        }));
    });

    test('Deve retornar erro 500 se ocorrer um erro inesperado', async () => {
        console.log('Running test: Deve retornar erro 500 se ocorrer um erro inesperado');
        jest.setTimeout(30000); // Aumentar o tempo limite para este teste

        User.findByPk.mockImplementation(() => { throw new Error('Erro inesperado'); });

        const response = await request(server)
            .get(`/users/2`)
            .set('Authorization', 'Bearer token')
            .expect(500);

        expect(response.body).toEqual({ message: 'Error retrieving user and related data', error: 'Erro inesperado' });
    });
});
