const request = require('supertest');
const app = require('../../../../app');
const { Publisher, BookEdition } = require('../../../../models');
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

    describe('PUT /publishers/:publisherId', () => {
        test('Deve atualizar o nome de um publisher com sucesso', async () => {
            const publisherId = 1;
            const publisherName = 'Updated Publisher';
            const publisher = { publisherId, publisherName: 'Old Publisher', save: jest.fn().mockResolvedValue({}) };

            Publisher.findByPk.mockResolvedValue(publisher);
            Publisher.findOne.mockResolvedValue(null);
            verifyToken.mockImplementation((req, res, next) => {
                req.userId = 1;
                next();
            });
            isAdmin.mockImplementation((req, res, next) => {
                next();
            });

            const response = await request(server)
                .put(`/publishers/${publisherId}`)
                .send({ publisherName })
                .set('Authorization', 'Bearer token')
                .expect(200);

            expect(response.body).toEqual({
                success: true,
                message: 'Publisher name updated successfully.',
                publisher: {
                    publisherId,
                    publisherName
                },
                links: [
                    { rel: "self", href: `/publishers/${publisherId}`, method: "GET" },
                    { rel: "delete", href: `/publishers/${publisherId}`, method: "DELETE" },
                    { rel: "modify", href: `/publishers/${publisherId}`, method: "PUT" }
                ]
            });
            expect(publisher.save).toHaveBeenCalled();
        });

        test('Deve retornar erro 400 se o nome do publisher não for fornecido', async () => {
            const publisherId = 1;

            verifyToken.mockImplementation((req, res, next) => {
                req.userId = 1;
                next();
            });
            isAdmin.mockImplementation((req, res, next) => {
                next();
            });

            const response = await request(server)
                .put(`/publishers/${publisherId}`)
                .send({})
                .set('Authorization', 'Bearer token')
                .expect(400);

            expect(response.body).toEqual({
                success: false,
                message: 'Publisher name is required.'
            });
        });

        test('Deve retornar erro 400 se um publisher com o mesmo nome já existir', async () => {
            const publisherId = 1;
            const publisherName = 'Existing Publisher';

            Publisher.findByPk.mockResolvedValue({ publisherId, publisherName: 'Old Publisher' });
            Publisher.findOne.mockResolvedValue({ publisherId: 2, publisherName });
            verifyToken.mockImplementation((req, res, next) => {
                req.userId = 1;
                next();
            });
            isAdmin.mockImplementation((req, res, next) => {
                next();
            });

            const response = await request(server)
                .put(`/publishers/${publisherId}`)
                .send({ publisherName })
                .set('Authorization', 'Bearer token')
                .expect(400);

            expect(response.body).toEqual({
                success: false,
                message: 'Publisher with this name already exists.',
                publisherName
            });
        });

        test('Deve retornar erro 404 se o publisher não for encontrado', async () => {
            const publisherId = '999';
            const publisherName = 'Updated Publisher';

            Publisher.findByPk.mockResolvedValue(null);
            verifyToken.mockImplementation((req, res, next) => {
                req.userId = 1;
                next();
            });
            isAdmin.mockImplementation((req, res, next) => {
                next();
            });

            const response = await request(server)
                .put(`/publishers/${publisherId}`)
                .send({ publisherName })
                .set('Authorization', 'Bearer token')
                .expect(404);

            expect(response.body).toEqual({
                success: false,
                message: 'Publisher not found.',
                publisherId
            });
        });

        test('Deve retornar erro 500 se ocorrer um erro inesperado durante a atualização', async () => {
            const publisherId = 1;
            const publisherName = 'Updated Publisher';

            Publisher.findByPk.mockResolvedValue({ publisherId, publisherName: 'Old Publisher', save: jest.fn().mockRejectedValue(new Error('Erro inesperado')) });
            Publisher.findOne.mockResolvedValue(null);
            verifyToken.mockImplementation((req, res, next) => {
                req.userId = 1;
                next();
            });
            isAdmin.mockImplementation((req, res, next) => {
                next();
            });

            const response = await request(server)
                .put(`/publishers/${publisherId}`)
                .send({ publisherName })
                .set('Authorization', 'Bearer token')
                .expect(500);

            expect(response.body).toEqual({
                success: false,
                message: 'Erro inesperado'
            });
        });
    });

    describe('DELETE /publishers/:publisherId', () => {
        test('Deve remover um publisher com sucesso', async () => {
            const publisherId = 1;
            const publisher = { publisherId, destroy: jest.fn().mockResolvedValue({}) };

            Publisher.findByPk.mockResolvedValue(publisher);
            BookEdition.count.mockResolvedValue(0);
            verifyToken.mockImplementation((req, res, next) => {
                req.userId = 1;
                next();
            });
            isAdmin.mockImplementation((req, res, next) => {
                next();
            });

            const response = await request(server)
                .delete(`/publishers/${publisherId}`)
                .set('Authorization', 'Bearer token')
                .expect(200);

            expect(response.body).toEqual({
                success: true,
                message: 'Publisher deleted successfully.'
            });
            expect(publisher.destroy).toHaveBeenCalled();
        });

        test('Deve retornar erro 404 se o publisher não for encontrado', async () => {
            const publisherId = '999';

            Publisher.findByPk.mockResolvedValue(null);
            verifyToken.mockImplementation((req, res, next) => {
                req.userId = 1;
                next();
            });
            isAdmin.mockImplementation((req, res, next) => {
                next();
            });

            const response = await request(server)
                .delete(`/publishers/${publisherId}`)
                .set('Authorization', 'Bearer token')
                .expect(404);

            expect(response.body).toEqual({
                success: false,
                message: 'Publisher not found.',
                publisherId
            });
        });

        test('Deve retornar erro 400 se o publisher tiver edições associadas', async () => {
            const publisherId = '1';
            const publisher = { publisherId };

            Publisher.findByPk.mockResolvedValue(publisher);
            BookEdition.count.mockResolvedValue(5);
            verifyToken.mockImplementation((req, res, next) => {
                req.userId = 1;
                next();
            });
            isAdmin.mockImplementation((req, res, next) => {
                next();
            });

            const response = await request(server)
                .delete(`/publishers/${publisherId}`)
                .set('Authorization', 'Bearer token')
                .expect(400);

            expect(response.body).toEqual({
                success: false,
                message: 'Cannot delete publisher with associated book editions.',
                publisherId,
                links: [{ rel: 'self', href: `/publishers/${publisherId}/editions`, method: 'GET' }]
            });
        });

        test('Deve retornar erro 500 se ocorrer um erro inesperado durante a deleção', async () => {
            const publisherId = 1;
            const publisher = { publisherId, destroy: jest.fn().mockRejectedValue(new Error('Erro inesperado')) };

            Publisher.findByPk.mockResolvedValue(publisher);
            BookEdition.count.mockResolvedValue(0);
            verifyToken.mockImplementation((req, res, next) => {
                req.userId = 1;
                next();
            });
            isAdmin.mockImplementation((req, res, next) => {
                next();
            });

            const response = await request(server)
                .delete(`/publishers/${publisherId}`)
                .set('Authorization', 'Bearer token')
                .expect(500);

            expect(response.body).toEqual({
                success: false,
                message: 'Erro inesperado'
            });
        });
    });
});
