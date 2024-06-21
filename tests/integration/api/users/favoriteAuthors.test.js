const request = require('supertest');
const app = require('../../../../app');
const { UserFavoriteAuthor, Person, sequelize } = require('../../../../models');
const { verifyToken } = require('../../../../middleware/authJwt');

jest.mock('../../../../models');
jest.mock('../../../../middleware/authJwt');

describe('Favorite Authors API', () => {
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

    describe('GET /users/me/favorite-authors', () => {
        test('Deve devolver os autores favoritos do utilizador com sucesso', async () => {
            console.log('Running test: Deve devolver os autores favoritos do utilizador com sucesso');

            const favoriteAuthors = [
                { personId: 1, Person: { personId: 1, personName: 'Author One' } },
                { personId: 2, Person: { personId: 2, personName: 'Author Two' } }
            ];

            UserFavoriteAuthor.findAll.mockResolvedValue(favoriteAuthors);

            const response = await request(server)
                .get('/users/me/favorite-authors')
                .set('Authorization', 'Bearer token')
                .expect(200);

            expect(response.body).toEqual(favoriteAuthors);
        });

        test('Deve devolver erro 500 se ocorrer um erro inesperado', async () => {
            console.log('Running test: Deve devolver erro 500 se ocorrer um erro inesperado');
            jest.setTimeout(30000); // Aumentar o tempo limite para este teste

            UserFavoriteAuthor.findAll.mockImplementation(() => { throw new Error('Erro inesperado'); });

            const response = await request(server)
                .get('/users/me/favorite-authors')
                .set('Authorization', 'Bearer token')
                .expect(500);

            expect(response.body).toEqual({ message: 'Error fetching favorite authors', error: 'Erro inesperado' });
        });
    });

    describe('POST /users/me/favorite-authors', () => {
        test('Deve adicionar um autor favorito com sucesso', async () => {
            console.log('Running test: Deve adicionar um autor favorito com sucesso');

            const personId = 1;
            const person = { personId, personName: 'Author One' };
            const favoriteAuthor = { userId: 1, personId: person.personId };

            Person.findByPk.mockResolvedValue(person);
            UserFavoriteAuthor.count.mockResolvedValue(3);
            UserFavoriteAuthor.findOne.mockResolvedValue(null);
            UserFavoriteAuthor.create.mockResolvedValue(favoriteAuthor);

            const response = await request(server)
                .post('/users/me/favorite-authors')
                .set('Authorization', 'Bearer token')
                .send({ personId })
                .expect(201);

            expect(response.body).toEqual({ success: true, message: `Author '${person.personName}' added to favorites` });
        });

        test('Deve devolver erro 404 se o autor não existir', async () => {
            console.log('Running test: Deve devolver erro 404 se o autor não existir');

            const personId = 999;

            Person.findByPk.mockResolvedValue(null);

            const response = await request(server)
                .post('/users/me/favorite-authors')
                .set('Authorization', 'Bearer token')
                .send({ personId })
                .expect(404);

            expect(response.body).toEqual({ message: 'Author not found' });
        });

        test('Deve devolver erro 400 se o utilizador já tiver 5 autores favoritos', async () => {
            console.log('Running test: Deve devolver erro 400 se o utilizador já tiver 5 autores favoritos');

            const personId = 1;
            const person = { personId, personName: 'Author One' };

            Person.findByPk.mockResolvedValue(person);
            UserFavoriteAuthor.count.mockResolvedValue(5);

            const response = await request(server)
                .post('/users/me/favorite-authors')
                .set('Authorization', 'Bearer token')
                .send({ personId })
                .expect(400);

            expect(response.body).toEqual({ message: 'You can only have up to 5 favorite authors' });
        });

        test('Deve devolver erro 400 se o autor já for favorito', async () => {
            console.log('Running test: Deve devolver erro 400 se o autor já for favorito');

            const personId = 1;
            const person = { personId, personName: 'Author One' };
            const favoriteAuthor = { userId: 1, personId: person.personId };

            Person.findByPk.mockResolvedValue(person);
            UserFavoriteAuthor.count.mockResolvedValue(3);
            UserFavoriteAuthor.findOne.mockResolvedValue(favoriteAuthor);

            const response = await request(server)
                .post('/users/me/favorite-authors')
                .set('Authorization', 'Bearer token')
                .send({ personId })
                .expect(400);

            expect(response.body).toEqual({ message: 'Author is already a favorite' });
        });

        test('Deve devolver erro 500 se ocorrer um erro inesperado', async () => {
            console.log('Running test: Deve devolver erro 500 se ocorrer um erro inesperado');
            jest.setTimeout(30000); // Aumentar o tempo limite para este teste

            const personId = 1;

            Person.findByPk.mockImplementation(() => { throw new Error('Erro inesperado'); });

            const response = await request(server)
                .post('/users/me/favorite-authors')
                .set('Authorization', 'Bearer token')
                .send({ personId })
                .expect(500);

            expect(response.body).toEqual({ message: 'Error adding favorite author', error: 'Erro inesperado' });
        });
    });

    describe('DELETE /users/me/favorite-authors/:personId', () => {
        test('Deve remover um autor favorito com sucesso', async () => {
            console.log('Running test: Deve remover um autor favorito com sucesso');

            const personId = 1;
            const favoriteAuthor = { userId: 1, personId };

            UserFavoriteAuthor.findOne.mockResolvedValue(favoriteAuthor);
            UserFavoriteAuthor.destroy.mockResolvedValue(1);

            const response = await request(server)
                .delete(`/users/me/favorite-authors/${personId}`)
                .set('Authorization', 'Bearer token')
                .expect(200);

            expect(response.body).toEqual({ message: 'Favorite author removed successfully' });
        });

        test('Deve devolver erro 404 se o autor favorito não for encontrado', async () => {
            console.log('Running test: Deve devolver erro 404 se o autor favorito não for encontrado');

            const personId = 999;

            UserFavoriteAuthor.findOne.mockResolvedValue(null);

            const response = await request(server)
                .delete(`/users/me/favorite-authors/${personId}`)
                .set('Authorization', 'Bearer token')
                .expect(404);

            expect(response.body).toEqual({ message: 'Favorite author not found' });
        });

        test('Deve devolver erro 500 se ocorrer um erro inesperado', async () => {
            console.log('Running test: Deve devolver erro 500 se ocorrer um erro inesperado');
            jest.setTimeout(30000); // Aumentar o tempo limite para este teste

            const personId = 1;

            UserFavoriteAuthor.findOne.mockImplementation(() => { throw new Error('Erro inesperado'); });

            const response = await request(server)
                .delete(`/users/me/favorite-authors/${personId}`)
                .set('Authorization', 'Bearer token')
                .expect(500);

            expect(response.body).toEqual({ message: 'Error removing favorite author', error: 'Erro inesperado' });
        });
    });
});
