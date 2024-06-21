const request = require('supertest');
const app = require('../../../../app');
const { Person, Role, PersonRole, sequelize } = require('../../../../models');
const { verifyToken } = require('../../../../middleware/authJwt');
const { isAdmin } = require('../../../../middleware/admin');

jest.mock('../../../../models');
jest.mock('../../../../middleware/authJwt');
jest.mock('../../../../middleware/admin');

describe('POST /persons', () => {
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

    test('Deve criar uma nova pessoa com sucesso', async () => {
        const newPersonData = {
            personName: 'New Person',
            roles: ['Author', 'Translator']
        };
        const roleData = [
            { roleId: 1, roleName: 'Author' },
            { roleId: 2, roleName: 'Translator' }
        ];
        const createdPerson = { personId: 1, personName: 'New Person' };

        Role.findAll.mockResolvedValue(roleData);
        Person.findOne.mockResolvedValue(null);
        Person.create.mockResolvedValue(createdPerson);
        PersonRole.bulkCreate.mockResolvedValue([]);

        const response = await request(server)
            .post('/persons')
            .send(newPersonData)
            .expect(201);

        expect(response.body).toEqual({
            success: true,
            message: 'New person created successfully',
            person: createdPerson,
            links: [
                { rel: "self", href: `/persons/${createdPerson.personId}`, method: "GET" },
                { rel: "delete", href: `/persons/${createdPerson.personId}`, method: "DELETE" },
                { rel: "modify", href: `/persons/${createdPerson.personId}`, method: "PUT" }
            ]
        });
    });

    test('Deve retornar erro 400 se o nome da pessoa não for fornecido', async () => {
        const newPersonData = { roles: ['Author'] };

        const response = await request(server)
            .post('/persons')
            .send(newPersonData)
            .expect(400);

        expect(response.body).toEqual({
            success: false,
            message: 'Person name is required.'
        });
    });

    test('Deve retornar erro 400 se as funções não forem fornecidas ou estiverem inválidas', async () => {
        const newPersonData = { personName: 'New Person' };

        const response = await request(server)
            .post('/persons')
            .send(newPersonData)
            .expect(400);

        expect(response.body).toEqual({
            success: false,
            message: 'Roles are required and should be a non-empty array.'
        });
    });

    test('Deve retornar erro 400 se algumas funções forem inválidas', async () => {
        const newPersonData = {
            personName: 'New Person',
            roles: ['Author', 'InvalidRole']
        };
        const validRoles = [{ roleId: 1, roleName: 'Author' }];

        Role.findAll.mockResolvedValue(validRoles);

        const response = await request(server)
            .post('/persons')
            .send(newPersonData)
            .expect(400);

        expect(response.body).toEqual({
            success: false,
            message: 'Some roles are invalid.',
            invalidRoles: ['InvalidRole']
        });
    });

    test('Deve retornar erro 400 se a pessoa já existir', async () => {
        const newPersonData = {
            personName: 'Existing Person',
            roles: ['Author']
        };
        const existingPerson = { personId: 1, personName: 'Existing Person' };

        Person.findOne.mockResolvedValue(existingPerson);

        const response = await request(server)
            .post('/persons')
            .send(newPersonData)
            .expect(400);

        expect(response.body).toEqual({
            success: false,
            message: 'Person with this name already exists.'
        });
    });

    test('Deve retornar erro 500 se ocorrer um erro inesperado', async () => {
        const newPersonData = {
            personName: 'New Person',
            roles: ['Author']
        };

        Role.findAll.mockImplementation(() => { throw new Error('Unexpected error'); });

        const response = await request(server)
            .post('/persons')
            .send(newPersonData)
            .expect(500);

        expect(response.body).toEqual({
            success: false,
            message: 'Unexpected error'
        });
    });
});
