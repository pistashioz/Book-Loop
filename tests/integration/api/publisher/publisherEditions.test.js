const request = require('supertest');
const app = require('../../../../app');
const { Publisher, BookEdition, Work, BookInSeries, BookAuthor, Person, BookContributor, Role } = require('../../../../models');

jest.mock('../../../../models');

describe('Publisher API', () => {
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

    describe('GET /publishers/:publisherId/editions', () => {
        test('Deve retornar todas as edições de um publisher com paginação', async () => {
            const publisherId = 1;
            const page = 1;
            const limit = 10;
            const totalItems = 20;

            const editions = Array.from({ length: 10 }, (v, k) => ({
                UUID: `UUID${k + 1}`,
                title: `Title ${k + 1}`,
                coverImage: `CoverImage${k + 1}`,
                publicationDate: new Date(),
                pageNumber: 100 + k,
                Work: {
                    totalReviews: 100,
                    averageLiteraryRating: 4.5,
                    seriesOrder: k + 1,
                    BookAuthors: [
                        {
                            Person: {
                                personId: k + 1,
                                personName: `Author ${k + 1}`
                            }
                        }
                    ],
                    BookInSeries: {
                        seriesId: k + 1,
                        seriesName: `Series ${k + 1}`,
                        seriesDescription: `Description ${k + 1}`
                    }
                },
                bookContributors: [
                    {
                        Person: {
                            personId: k + 1,
                            personName: `Contributor ${k + 1}`
                        },
                        Role: {
                            roleName: `Role ${k + 1}`
                        }
                    }
                ]
            }));

            Publisher.findByPk.mockResolvedValue({ publisherId });
            BookEdition.count.mockResolvedValue(totalItems);
            BookEdition.findAll.mockResolvedValue(editions);

            const response = await request(server)
                .get(`/publishers/${publisherId}/editions?page=${page}&limit=${limit}`)
                .expect(200);

            expect(response.body).toEqual({
                success: true,
                totalItems,
                totalPages: Math.ceil(totalItems / limit),
                currentPage: page,
                editions: editions.map(edition => ({
                    UUID: edition.UUID,
                    title: edition.title,
                    coverImage: edition.coverImage,
                    publicationDate: edition.publicationDate.toISOString(),
                    pageNumber: edition.pageNumber,
                    workDetails: {
                        totalReviews: edition.Work.totalReviews,
                        averageLiteraryRating: edition.Work.averageLiteraryRating,
                        author: edition.Work.BookAuthors.map(author => ({
                            personId: author.Person.personId,
                            personName: author.Person.personName
                        })),
                        series: edition.Work.BookInSeries ? {
                            seriesId: edition.Work.BookInSeries.seriesId,
                            seriesName: edition.Work.BookInSeries.seriesName,
                            seriesDescription: edition.Work.BookInSeries.seriesDescription,
                            seriesOrder: edition.Work.seriesOrder
                        } : null
                    },
                    contributors: edition.bookContributors.map(contributor => ({
                        personId: contributor.Person.personId,
                        personName: contributor.Person.personName,
                        roles: contributor.Role.roleName
                    }))
                }))
            });
        });

        test('Deve retornar erro 400 se page ou limit não forem números positivos', async () => {
            const publisherId = 1;

            const response = await request(server)
                .get(`/publishers/${publisherId}/editions?page=-1&limit=abc`)
                .expect(400);

            expect(response.body).toEqual({
                success: false,
                message: "Page and limit must be positive integers."
            });
        });

        test('Deve retornar erro 404 se o publisher não for encontrado', async () => {
            const publisherId = 999;

            Publisher.findByPk.mockResolvedValue(null);

            const response = await request(server)
                .get(`/publishers/${publisherId}/editions?page=1&limit=10`)
                .expect(404);

            expect(response.body).toEqual({
                success: false,
                message: 'Publisher not found.'
            });
        });

        test('Deve retornar erro 500 se ocorrer um erro inesperado', async () => {
            const publisherId = 1;

            Publisher.findByPk.mockResolvedValue({ publisherId });
            BookEdition.findAll.mockImplementation(() => {
                throw new Error('Erro inesperado');
            });

            const response = await request(server)
                .get(`/publishers/${publisherId}/editions?page=1&limit=10`)
                .expect(500);

            expect(response.body).toEqual({
                success: false,
                message: 'Erro inesperado'
            });
        });
    });
});
