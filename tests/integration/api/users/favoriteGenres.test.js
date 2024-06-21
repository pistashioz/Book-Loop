const request = require('supertest');
const app = require('../../../../app');
const { UserFavoriteGenre, Genre, sequelize } = require('../../../../models');
const { verifyToken } = require('../../../../middleware/authJwt');

jest.mock('../../../../models');
jest.mock('../../../../middleware/authJwt');

describe('Favorite Genres API', () => {
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

        verifyToken.mockImplementation((req, res, next) => {
            req.userId = 1;
            next();
        });
    });

    describe('GET /users/me/favorite-genres', () => {
        test('Deve devolver os géneros favoritos do utilizador com sucesso', async () => {
            console.log('Running test: Deve devolver os géneros favoritos do utilizador com sucesso');

            const favoriteGenres = [
                { genreId: 1, Genre: { genreId: 1, genreName: 'Fantasy' } },
                { genreId: 2, Genre: { genreId: 2, genreName: 'Science Fiction' } }
            ];

            UserFavoriteGenre.findAll.mockResolvedValue(favoriteGenres);

            const response = await request(server)
                .get('/users/me/favorite-genres')
                .set('Authorization', 'Bearer token')
                .expect(200);

            expect(response.body).toEqual(favoriteGenres);
        });

        test('Deve devolver erro 500 se ocorrer um erro inesperado', async () => {
            console.log('Running test: Deve devolver erro 500 se ocorrer um erro inesperado');
            jest.setTimeout(30000); // Aumentar o tempo limite para este teste

            UserFavoriteGenre.findAll.mockImplementation(() => { throw new Error('Erro inesperado'); });

            const response = await request(server)
                .get('/users/me/favorite-genres')
                .set('Authorization', 'Bearer token')
                .expect(500);

            expect(response.body).toEqual({ message: 'Error fetching favorite genres', error: 'Erro inesperado' });
        });
    });

    describe('POST /users/me/favorite-genres', () => {
        test('Deve adicionar um género favorito com sucesso', async () => {
            console.log('Running test: Deve adicionar um género favorito com sucesso');

            const genreId = 1;
            const genre = { genreId, genreName: 'Fantasy' };
            const favoriteGenre = { userId: 1, genreId: genre.genreId };

            Genre.findByPk.mockResolvedValue(genre);
            UserFavoriteGenre.count.mockResolvedValue(3);
            UserFavoriteGenre.findOne.mockResolvedValue(null);
            UserFavoriteGenre.create.mockResolvedValue(favoriteGenre);

            const response = await request(server)
                .post('/users/me/favorite-genres')
                .set('Authorization', 'Bearer token')
                .send({ genreId })
                .expect(201);

            expect(response.body).toEqual({ success: true, message: `Genre '${genre.genreName}' added to favorites` });
        });

        test('Deve devolver erro 404 se o género não existir', async () => {
            console.log('Running test: Deve devolver erro 404 se o género não existir');

            const genreId = 999;

            Genre.findByPk.mockResolvedValue(null);

            const response = await request(server)
                .post('/users/me/favorite-genres')
                .set('Authorization', 'Bearer token')
                .send({ genreId })
                .expect(404);

            expect(response.body).toEqual({ success: false, message: 'Genre not found' });
        });

        test('Deve devolver erro 400 se o utilizador já tiver 5 géneros favoritos', async () => {
            console.log('Running test: Deve devolver erro 400 se o utilizador já tiver 5 géneros favoritos');

            const genreId = 1;
            const genre = { genreId, genreName: 'Fantasy' };

            Genre.findByPk.mockResolvedValue(genre);
            UserFavoriteGenre.count.mockResolvedValue(5);

            const response = await request(server)
                .post('/users/me/favorite-genres')
                .set('Authorization', 'Bearer token')
                .send({ genreId })
                .expect(400);

            expect(response.body).toEqual({ success: false, message: 'You can only have up to 5 favorite genres' });
        });

        test('Deve devolver erro 400 se o género já for favorito', async () => {
            console.log('Running test: Deve devolver erro 400 se o género já for favorito');

            const genreId = 1;
            const genre = { genreId, genreName: 'Fantasy' };
            const favoriteGenre = { userId: 1, genreId: genre.genreId };

            Genre.findByPk.mockResolvedValue(genre);
            UserFavoriteGenre.count.mockResolvedValue(3);
            UserFavoriteGenre.findOne.mockResolvedValue(favoriteGenre);

            const response = await request(server)
                .post('/users/me/favorite-genres')
                .set('Authorization', 'Bearer token')
                .send({ genreId })
                .expect(400);

            expect(response.body).toEqual({ success: false, message: 'Genre is already a favorite' });
        });

        test('Deve devolver erro 500 se ocorrer um erro inesperado', async () => {
            console.log('Running test: Deve devolver erro 500 se ocorrer um erro inesperado');
            jest.setTimeout(30000); // Aumentar o tempo limite para este teste

            const genreId = 1;

            Genre.findByPk.mockImplementation(() => { throw new Error('Erro inesperado'); });

            const response = await request(server)
                .post('/users/me/favorite-genres')
                .set('Authorization', 'Bearer token')
                .send({ genreId })
                .expect(500);

            expect(response.body).toEqual({ success: false, message: 'Error adding favorite genre', error: 'Erro inesperado' });
        });
    });

    describe('DELETE /users/me/favorite-genres/:genreId', () => {
        test('Deve remover um género favorito com sucesso', async () => {
            console.log('Running test: Deve remover um género favorito com sucesso');

            const genreId = 1;

            UserFavoriteGenre.destroy.mockResolvedValue(1);

            const response = await request(server)
                .delete(`/users/me/favorite-genres/${genreId}`)
                .set('Authorization', 'Bearer token')
                .expect(200);

            expect(response.body).toEqual({ success: true, message: 'Favorite genre removed successfully' });
        });

        test('Deve devolver erro 404 se o género favorito não for encontrado', async () => {
            console.log('Running test: Deve devolver erro 404 se o género favorito não for encontrado');

            const genreId = 999;

            UserFavoriteGenre.destroy.mockResolvedValue(0);

            const response = await request(server)
                .delete(`/users/me/favorite-genres/${genreId}`)
                .set('Authorization', 'Bearer token')
                .expect(404);

            expect(response.body).toEqual({ success: false, message: 'Favorite genre not found' });
        });

        test('Deve devolver erro 500 se ocorrer um erro inesperado', async () => {
            console.log('Running test: Deve devolver erro 500 se ocorrer um erro inesperado');
            jest.setTimeout(30000); // Aumentar o tempo limite para este teste

            const genreId = 1;

            UserFavoriteGenre.destroy.mockImplementation(() => { throw new Error('Erro inesperado'); });

            const response = await request(server)
                .delete(`/users/me/favorite-genres/${genreId}`)
                .set('Authorization', 'Bearer token')
                .expect(500);

            expect(response.body).toEqual({ success: false, message: 'Error removing favorite genre', error: 'Erro inesperado' });
        });
    });
});
