const request = require('supertest');
const app = require('../../../../app');
const { Genre, BookGenre, sequelize } = require('../../../../models');
const { verifyToken } = require('../../../../middleware/authJwt');
const { isAdmin } = require('../../../../middleware/admin');

jest.mock('../../../../models');
jest.mock('../../../../middleware/authJwt');
jest.mock('../../../../middleware/admin');

describe('Genre API Integration Tests', () => {
    let server;

    beforeAll((done) => {
        server = app.listen(done);
    });

    afterAll((done) => {
        server.close(done);
    });

    beforeEach(async () => {
        jest.clearAllMocks();
        sequelize.transaction = jest.fn().mockImplementation(() => ({
            commit: jest.fn().mockResolvedValue(),
            rollback: jest.fn().mockResolvedValue(),
        }));
        verifyToken.mockImplementation((req, res, next) => next());
        isAdmin.mockImplementation((req, res, next) => next());
    });

    describe('POST /genres', () => {
        test('Deve criar um novo género com sucesso', async () => {
            const genreName = 'Mystery';
            Genre.create.mockResolvedValue({ genreId: 1, genreName });

            const response = await request(server)
                .post('/genres')
                .send({ genreName })
                .expect(201);

            expect(response.body).toEqual({
                success: true,
                message: 'New genre created successfully.',
                genre: expect.objectContaining({ genreName }),
                links: expect.any(Array)
            });
        });

        test('Deve retornar erro 400 se o nome do género estiver vazio', async () => {
            const response = await request(server)
                .post('/genres')
                .send({ genreName: '' })
                .expect(400);

            expect(response.body).toEqual({
                success: false,
                message: 'Genre name cannot be empty!'
            });
        });

        test('Deve retornar erro 400 se o género já existir', async () => {
            const genreName = 'Fantasy';
            Genre.findOne.mockResolvedValue({ genreId: 1, genreName });

            const response = await request(server)
                .post('/genres')
                .send({ genreName })
                .expect(400);

            expect(response.body).toEqual({
                success: false,
                message: 'Genre already exists.',
                existingGenreName: genreName,
                links: expect.any(Array)
            });
        });
    });

    describe('PATCH /genres/:genreId', () => {
/*         test('Deve atualizar um género com sucesso', async () => {
            const genreId = 1;
            const genreName = 'Epic Fantasy';
            const genre = { genreId, genreName: 'Fantasy' };

            Genre.findByPk.mockResolvedValue(genre);
            Genre.findOne.mockResolvedValue(null);
            Genre.update.mockResolvedValue([1, [{ genreId, genreName }]]);
            Genre.findByPk.mockResolvedValue({ genreId, genreName });

            const response = await request(server)
                .patch(`/genres/${genreId}`)
                .send({ genreName })
                .expect(200);

            expect(response.body).toEqual({
                success: true,
                message: 'Genre updated successfully.',
                genre: expect.objectContaining({ genreName }),
                links: expect.any(Array)
            });
        }); */

        test('Deve retornar erro 400 se o nome do género estiver vazio', async () => {
            const genreId = 1;

            const response = await request(server)
                .patch(`/genres/${genreId}`)
                .send({ genreName: '' })
                .expect(400);

            expect(response.body).toEqual({
                success: false,
                message: 'Genre name cannot be empty!'
            });
        });

        test('Deve retornar erro 404 se o género não for encontrado', async () => {
            const genreId = 999;
            const genreName = 'Nonexistent Genre';
            Genre.findByPk.mockResolvedValue(null);

            const response = await request(server)
                .patch(`/genres/${genreId}`)
                .send({ genreName })
                .expect(404);

            expect(response.body).toEqual({
                success: false,
                message: 'Genre not found.'
            });
        });

        test('Deve retornar erro 400 se o novo nome do género já existir', async () => {
            const genreId = 1;
            const genreName = 'Science Fiction';
            Genre.findByPk.mockResolvedValue({ genreId, genreName: 'Fantasy' });
            Genre.findOne.mockResolvedValue({ genreId: 2, genreName });

            const response = await request(server)
                .patch(`/genres/${genreId}`)
                .send({ genreName })
                .expect(400);

            expect(response.body).toEqual({
                success: false,
                message: 'Genre name already exists.',
                existingGenreName: genreName,
                links: expect.any(Array)
            });
        });
    });

    describe('DELETE /genres/:genreId', () => {
        // test('Deve remover um género com sucesso', async () => {
        //     const genreId = 1;
        //     Genre.findByPk.mockResolvedValue({ genreId, genreName: 'Fantasy' });
        //     BookGenre.count.mockResolvedValue(0);
        //     Genre.destroy.mockResolvedValue(1);

        //     const response = await request(server)
        //         .delete(`/genres/${genreId}`)
        //         .expect(204);

        //     expect(response.body).toEqual({});
        // });

        test('Deve retornar erro 404 se o género não for encontrado', async () => {
            const genreId = 999;
            Genre.findByPk.mockResolvedValue(null);

            const response = await request(server)
                .delete(`/genres/${genreId}`)
                .expect(404);

            expect(response.body).toEqual({
                success: false,
                message: 'Genre not found.'
            });
        });

        test('Deve retornar erro 400 se o género tiver associações', async () => {
            const genreId = 1;
            Genre.findByPk.mockResolvedValue({ genreId, genreName: 'Fantasy' });
            BookGenre.count.mockResolvedValue(1);

            const response = await request(server)
                .delete(`/genres/${genreId}`)
                .expect(400);

            expect(response.body).toEqual({
                success: false,
                message: 'Cannot delete genre with associated works. Please remove associations first.',
                links: expect.any(Array)
            });
        });
    });

    describe('DELETE /genres/:genreId/remove-associations', () => {
        test('Deve remover todas as associações de um género com sucesso', async () => {
            const genreId = 1;
            Genre.findByPk.mockResolvedValue({ genreId, genreName: 'Fantasy' });
            BookGenre.count.mockResolvedValue(1);
            BookGenre.destroy.mockResolvedValue(1);

            const response = await request(server)
                .delete(`/genres/${genreId}/remove-associations`)
                .expect(200);

            expect(response.body).toEqual({
                success: true,
                message: 'All associations removed successfully.'
            });
        });

        test('Deve retornar erro 404 se o género não for encontrado', async () => {
            const genreId = 999;
            Genre.findByPk.mockResolvedValue(null);

            const response = await request(server)
                .delete(`/genres/${genreId}/remove-associations`)
                .expect(404);

            expect(response.body).toEqual({
                success: false,
                message: 'Genre not found.'
            });
        });

        test('Deve retornar erro 400 se não houver associações para o género', async () => {
            const genreId = 1;
            Genre.findByPk.mockResolvedValue({ genreId, genreName: 'Fantasy' });
            BookGenre.count.mockResolvedValue(0);

            const response = await request(server)
                .delete(`/genres/${genreId}/remove-associations`)
                .expect(400);

            expect(response.body).toEqual({
                success: false,
                message: 'No associations found for this genre.'
            });
        });
    });

    // describe('GET /genres', () => {
    //     test('Deve procurar todos os géneros com paginação', async () => {
    //         Genre.findAll.mockResolvedValue([{ genreId: 1, genreName: 'Fantasy' }]);
    //         Genre.count.mockResolvedValue(1);

    //         const response = await request(server)
    //             .get('/genres?page=1')
    //             .expect(200);

    //         expect(response.body).toEqual({
    //             success: true,
    //             totalItems: expect.any(Number),
    //             totalPages: expect.any(Number),
    //             currentPage: 1,
    //             genres: expect.any(Array),
    //             filterGenres: expect.any(Array),
    //             links: expect.any(Array)
    //         });
    //     });
    // });

    describe('GET /genres/:genreId', () => {
        // test('Deve procurar um género por ID com sucesso', async () => {
        //     const genreId = 1;
        //     Genre.findByPk.mockResolvedValue({ genreId, genreName: 'Fantasy' });

        //     const response = await request(server)
        //         .get(`/genres/${genreId}`)
        //         .expect(200);

        //     expect(response.body).toEqual({
        //         success: true,
        //         genre: expect.objectContaining({ genreId, genreName: 'Fantasy' }),
        //         totalPages: expect.any(Number),
        //         currentPage: expect.any(Number),
        //         links: expect.any(Array)
        //     });
        // });

        test('Deve retornar erro 404 se o género não for encontrado', async () => {
            const genreId = 999;
            Genre.findByPk.mockResolvedValue(null);

            const response = await request(server)
                .get(`/genres/${genreId}`)
                .expect(404);

            expect(response.body).toEqual({
                success: false,
                message: 'Genre not found.'
            });
        });
    });
});
