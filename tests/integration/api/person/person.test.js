const request = require('supertest');
const app = require('../../../../app');
const { Person, Role, BookAuthor, BookContributor, Work, BookEdition, BookInSeries, PersonRole, sequelize } = require('../../../../models');
const { verifyToken } = require('../../../../middleware/authJwt');
const { isAdmin } = require('../../../../middleware/admin');

jest.mock('../../../../models');
jest.mock('../../../../middleware/authJwt');
jest.mock('../../../../middleware/admin');

describe('Person API Integration Tests', () => {
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
        verifyToken.mockImplementation((req, res, next) => next());
        isAdmin.mockImplementation((req, res, next) => next());
    });

    describe('GET /persons/:personId', () => {
        test('Deve encontrar uma pessoa pelo ID com sucesso', async () => {
            const personId = 1;
            const person = { personId, personName: 'Person One' };

            Person.findByPk.mockResolvedValue(person);
            BookAuthor.findAll.mockResolvedValue([]); // Mock vazio para simular que não há obras
            BookContributor.findAll.mockResolvedValue([]); // Mock vazio para simular que não há contribuições

            const response = await request(server)
                .get(`/persons/${personId}`)
                .expect(200);

            expect(response.body).toEqual({
                success: true,
                person: {
                    personId: person.personId,
                    personName: person.personName,
                    author: [],
                },
                links: [
                    { rel: "self", href: `/persons/${person.personId}`, method: "GET" },
                    { rel: "delete", href: `/persons/${person.personId}`, method: "DELETE" },
                    { rel: "modify", href: `/persons/${person.personId}`, method: "PATCH" }
                ]
            });
        });

        test('Deve retornar erro 404 se a pessoa não for encontrada', async () => {
            const personId = 999;
            Person.findByPk.mockResolvedValue(null);

            const response = await request(server)
                .get(`/persons/${personId}`)
                .expect(404);

            expect(response.body).toEqual({
                success: false,
                message: `No person found with ID ${personId}`,
            });
        });

        test('Deve retornar erro 500 se ocorrer um erro inesperado', async () => {
            const personId = 1;
            Person.findByPk.mockImplementation(() => { throw new Error('Unexpected error'); });

            const response = await request(server)
                .get(`/persons/${personId}`)
                .expect(500);

            expect(response.body).toEqual({
                success: false,
                message: 'Unexpected error',
            });
        });
    });

    describe('PATCH /persons/:personId', () => {
        test('Deve atualizar o nome de uma pessoa com sucesso', async () => {
            const personId = 1;
            const updatedPersonName = 'Updated Person Name';
            const person = { personId, personName: 'Person One', update: jest.fn().mockResolvedValue() };
            Person.findByPk.mockResolvedValue(person);

            const response = await request(server)
                .patch(`/persons/${personId}`)
                .send({ personName: updatedPersonName })
                .expect(200);

            expect(response.body).toEqual({
                success: true,
                msg: `Person with ID ${personId} was updated successfully.`,
            });
            expect(person.update).toHaveBeenCalledWith({ personName: updatedPersonName }, { transaction: expect.any(Object) });
        });

        test('Deve retornar erro 404 se a pessoa não for encontrada para atualização', async () => {
            const personId = 999;
            const updatedPersonName = 'Updated Person Name';
            Person.findByPk.mockResolvedValue(null);

            const response = await request(server)
                .patch(`/persons/${personId}`)
                .send({ personName: updatedPersonName })
                .expect(404);

            expect(response.body).toEqual({
                success: false,
                msg: `Person with ID ${personId} not found.`,
            });
        });

        test('Deve retornar erro 400 se personName for inválido', async () => {
            const personId = 1;
            const person = { personId, personName: 'Person One' };
            Person.findByPk.mockResolvedValue(person);

            const response = await request(server)
                .patch(`/persons/${personId}`)
                .send({ personName: '' })
                .expect(400);

            expect(response.body).toEqual({
                success: false,
                msg: 'personName is required and cannot be empty.',
            });
        });

        test('Deve retornar erro 500 se ocorrer um erro inesperado ao atualizar', async () => {
            const personId = 1;
            const updatedPersonName = 'Updated Person Name';
            Person.findByPk.mockImplementation(() => { throw new Error('Unexpected error'); });

            const response = await request(server)
                .patch(`/persons/${personId}`)
                .send({ personName: updatedPersonName })
                .expect(500);

            expect(response.body).toEqual({
                success: false,
                msg: 'Unexpected error',
            });
        });
    });

    describe('DELETE /persons/:personId', () => {
        test('Deve remover uma pessoa com sucesso', async () => {
            const personId = 1;
            const person = { personId, personName: 'Person One', destroy: jest.fn().mockResolvedValue() };
            Person.findByPk.mockResolvedValue(person);
            BookAuthor.count.mockResolvedValue(0);
            BookContributor.count.mockResolvedValue(0);

            const response = await request(server)
                .delete(`/persons/${personId}`)
                .expect(200);

            expect(response.body).toEqual({
                success: true,
                message: `Person with ID ${personId} deleted successfully.`,
                personId: String(personId) // Corrigido para string
            });
            expect(person.destroy).toHaveBeenCalledWith({ transaction: expect.any(Object) });
        });

        test('Deve retornar erro 404 se a pessoa não for encontrada para deleção', async () => {
            const personId = 999;
            Person.findByPk.mockResolvedValue(null);

            const response = await request(server)
                .delete(`/persons/${personId}`)
                .expect(404);

            expect(response.body).toEqual({
                success: false,
                message: `Person with ID ${personId} not found.`,
                personId: String(personId) // Corrigido para string
            });
        });

        test('Deve retornar erro 400 se a pessoa tiver obras associadas', async () => {
            const personId = 1;
            const person = { personId, personName: 'Person One' };
            Person.findByPk.mockResolvedValue(person);
            BookAuthor.count.mockResolvedValue(1);

            const response = await request(server)
                .delete(`/persons/${personId}`)
                .expect(400);

            expect(response.body).toEqual({
                success: false,
                message: 'Cannot delete person with associated works.',
                personId: String(personId), // Corrigido para string
                links: [{ rel: 'self', href: `/persons/${personId}/works`, method: 'GET' }]
            });
        });

        test('Deve retornar erro 500 se ocorrer um erro inesperado ao remover', async () => {
            const personId = 1;
            Person.findByPk.mockImplementation(() => { throw new Error('Unexpected error'); });

            const response = await request(server)
                .delete(`/persons/${personId}`)
                .expect(500);

            expect(response.body).toEqual({
                success: false,
                message: 'Unexpected error',
            });
        });
    });
});
