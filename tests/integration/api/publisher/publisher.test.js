const request = require('supertest');
const app = require('../../../../app');
const { Publisher } = require('../../../../models');
const { verifyToken } = require('../../../../middleware/authJwt');
const { isAdmin } = require('../../../../middleware/admin');

jest.mock('../../../../models');
jest.mock('../../../../middleware/authJwt');
jest.mock('../../../../middleware/admin');

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

    describe('POST /publishers', () => {
        test('Deve criar um novo publisher com sucesso', async () => {
            const publisherName = 'New Publisher';

            Publisher.create.mockResolvedValue({ publisherId: 1, publisherName });
            verifyToken.mockImplementation((req, res, next) => {
                req.userId = 1;
                next();
            });
            isAdmin.mockImplementation((req, res, next) => {
                next();
            });

            const response = await request(server)
                .post('/publishers')
                .send({ publisherName })
                .set('Authorization', 'Bearer token')
                .expect(201);

            expect(response.body).toEqual({
                success: true,
                message: 'New Publisher created successfully.',
                publisher: { publisherId: 1, publisherName },
                links: [
                    { rel: "self", href: `/publishers/1`, method: "GET" },
                    { rel: "delete", href: `/publishers/1`, method: "DELETE" },
                    { rel: "modify", href: `/publishers/1`, method: "PUT" }
                ]
            });
        });

        test('Deve retornar erro 400 se o publisherName não for fornecido', async () => {
            verifyToken.mockImplementation((req, res, next) => {
                req.userId = 1;
                next();
            });
            isAdmin.mockImplementation((req, res, next) => {
                next();
            });

            const response = await request(server)
                .post('/publishers')
                .send({})
                .set('Authorization', 'Bearer token')
                .expect(400);

            expect(response.body).toEqual({
                success: false,
                message: 'Publisher name is required.'
            });
        });

        test('Deve retornar erro 400 se um publisher com o mesmo nome já existir', async () => {
            const publisherName = 'Existing Publisher';

            Publisher.findOne.mockResolvedValue({ publisherName });
            verifyToken.mockImplementation((req, res, next) => {
                req.userId = 1;
                next();
            });
            isAdmin.mockImplementation((req, res, next) => {
                next();
            });

            const response = await request(server)
                .post('/publishers')
                .send({ publisherName })
                .set('Authorization', 'Bearer token')
                .expect(400);

            expect(response.body).toEqual({
                success: false,
                message: 'Publisher with this name already exists.',
                publisherName
            });
        });

        test('Deve retornar erro 401 se o usuário não estiver autenticado', async () => {
            const publisherName = 'New Publisher';

            verifyToken.mockImplementation((req, res, next) => {
                return res.status(401).send({ auth: false, message: 'No token provided.' });
            });

            const response = await request(server)
                .post('/publishers')
                .send({ publisherName })
                .set('Authorization', 'Bearer token')
                .expect(401);

            expect(response.body).toEqual({
                auth: false,
                message: 'No token provided.'
            });
        });

        test('Deve retornar erro 403 se o usuário não for admin', async () => {
            const publisherName = 'New Publisher';

            verifyToken.mockImplementation((req, res, next) => {
                req.userId = 1;
                next();
            });
            isAdmin.mockImplementation((req, res, next) => {
                return res.status(403).json({ message: 'Access denied. Admins only.' });
            });

            const response = await request(server)
                .post('/publishers')
                .send({ publisherName })
                .set('Authorization', 'Bearer token')
                .expect(403);

            expect(response.body).toEqual({
                message: 'Access denied. Admins only.'
            });
        });

        test('Deve retornar erro 500 se ocorrer um erro inesperado', async () => {
            const publisherName = 'New Publisher2';

            Publisher.findOne.mockResolvedValue(null);
            Publisher.create.mockImplementation(() => {
                throw new Error('Erro inesperado');
            });
            verifyToken.mockImplementation((req, res, next) => {
                req.userId = 1;
                next();
            });
            isAdmin.mockImplementation((req, res, next) => {
                next();
            });

            const response = await request(server)
                .post('/publishers')
                .send({ publisherName })
                .set('Authorization', 'Bearer token')
                .expect(500);

            expect(response.body).toEqual({
                success: false,
                message: 'Erro inesperado'
            });
        });
    });

    describe('GET /publishers', () => {
        test('Deve retornar todos os publishers com paginação', async () => {
            const publishers = Array.from({ length: 10 }, (v, k) => ({
                publisherId: k + 1,
                publisherName: `Publisher ${k + 1}`,
                BookEditions: []
            }));
            Publisher.findAll.mockResolvedValue(publishers);
            Publisher.count.mockResolvedValue(20);

            const response = await request(server)
                .get('/publishers?page=1&limit=10')
                .expect(200);

            expect(response.body).toEqual({
                success: true,
                totalItems: 20,
                totalPages: 2,
                currentPage: 1,
                publishers: publishers.map(publisher => ({
                    publisherId: publisher.publisherId,
                    publisherName: publisher.publisherName,
                    publicationCount: 0,
                    mostRecentPublication: null
                })),
                links: [
                    { rel: "self", href: `/publishers?page=1&limit=10`, method: "GET" },
                    { rel: "create", href: `/publishers`, method: "POST" }
                ]
            });
        });

        test('Deve retornar erro 400 se page ou limit não forem números positivos', async () => {
            const response = await request(server)
                .get('/publishers?page=-1&limit=abc')
                .expect(400);

            expect(response.body).toEqual({
                success: false,
                message: "Page and limit must be positive integers."
            });
        });

        test('Deve retornar erro 500 se ocorrer um erro inesperado', async () => {
            Publisher.findAll.mockImplementation(() => {
                throw new Error('Erro inesperado');
            });

            const response = await request(server)
                .get('/publishers?page=1&limit=10')
                .expect(500);

            expect(response.body).toEqual({
                success: false,
                message: 'Erro inesperado'
            });
        });
    });
});
