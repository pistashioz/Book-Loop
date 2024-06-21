const request = require('supertest');
const app = require('../../../../app');
const { Person, Role, PersonRole, BookAuthor, BookContributor, BookEdition, User } = require('../../../../models');

jest.mock('../../../../models');

describe('Person API', () => {
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

    describe('GET /persons', () => {
        test('Deve retornar todas as pessoas com paginação', async () => {
            const page = 1;
            const limit = 10;
            const persons = Array.from({ length: limit }, (_, i) => ({
                personId: i + 1,
                personName: `Person ${i + 1}`
            }));

            Person.findAndCountAll.mockResolvedValue({ count: 20, rows: persons });
            BookAuthor.count.mockResolvedValue(0);
            BookContributor.count.mockResolvedValue(0);

            const response = await request(server)
                .get(`/persons?page=${page}&limit=${limit}`)
                .expect(200);

            expect(response.body).toEqual({
                success: true,
                totalItems: 20,
                totalPages: 2,
                currentPage: page,
                persons: persons.map(person => ({
                    ...person,
                    worksCount: 0,
                    translationCount: 0,
                    audiobookCount: 0,
                    mostRecentPublication: null
                }))
            });
        });

        test('Deve filtrar pessoas pelo nome começando com', async () => {
            const startsWith = 'John';
            const persons = [
                { personId: 1, personName: 'John Doe' },
                { personId: 2, personName: 'Johnny Appleseed' }
            ];

            Person.findAndCountAll.mockResolvedValue({ count: 2, rows: persons });
            BookAuthor.count.mockResolvedValue(0);
            BookContributor.count.mockResolvedValue(0);

            const response = await request(server)
                .get(`/persons?startsWith=${startsWith}`)
                .expect(200);

            expect(response.body).toEqual({
                success: true,
                totalItems: 2,
                totalPages: 1,
                currentPage: 1,
                persons: persons.map(person => ({
                    ...person,
                    worksCount: 0,
                    translationCount: 0,
                    audiobookCount: 0,
                    mostRecentPublication: null
                }))
            });
        });

        test('Deve filtrar pessoas por função', async () => {
            const role = 'Author';
            const roleData = { roleId: 1, roleName: role };
            const personRoles = [
                { personId: 1 },
                { personId: 2 }
            ];
            const persons = [
                { personId: 1, personName: 'Author One' },
                { personId: 2, personName: 'Author Two' }
            ];

            Role.findOne.mockResolvedValue(roleData);
            PersonRole.findAll.mockResolvedValue(personRoles);
            Person.findAndCountAll.mockResolvedValue({ count: 2, rows: persons });
            BookAuthor.count.mockResolvedValue(0);
            BookContributor.count.mockResolvedValue(0);

            const response = await request(server)
                .get(`/persons?role=${role}`)
                .expect(200);

            expect(response.body).toEqual({
                success: true,
                totalItems: 2,
                totalPages: 1,
                currentPage: 1,
                persons: persons.map(person => ({
                    ...person,
                    worksCount: 0,
                    translationCount: 0,
                    audiobookCount: 0,
                }))
            });
        });

        test('Deve retornar erro 404 se a função não for encontrada', async () => {
            const role = 'NonExistentRole';

            Role.findOne.mockResolvedValue(null);

            const response = await request(server)
                .get(`/persons?role=${role}`)
                .expect(404);

            expect(response.body).toEqual({
                success: false,
                message: `Role '${role}' not found.`
            });
        });

        test('Deve retornar erro 500 se ocorrer um erro inesperado', async () => {
            Person.findAndCountAll.mockImplementation(() => {
                throw new Error('Erro inesperado');
            });

            const response = await request(server)
                .get(`/persons`)
                .expect(500);

            expect(response.body).toEqual({
                success: false,
                message: 'Erro inesperado'
            });
        });
    });

    describe('POST /persons', () => {
        const mockUser = {
            userId: 1,
            isAdmin: true
        };

        const validPerson = {
            personName: 'New Person',
            roles: ['Author']
        };

        const validRole = {
            roleId: 1,
            roleName: 'Author'
        };

        beforeEach(() => {
            jest.clearAllMocks();
        });

        test('Deve criar uma nova pessoa com sucesso', async () => {
            User.findByPk.mockResolvedValue(mockUser);
            Role.findAll.mockResolvedValue([validRole]);
            Person.findOne.mockResolvedValue(null);
            Person.create.mockResolvedValue({ personId: 1, personName: 'New Person' });
            PersonRole.bulkCreate.mockResolvedValue([]);

            const response = await request(server)
                .post('/persons')
                .send(validPerson)
                .expect(201);

            expect(response.body).toEqual({
                success: true,
                message: 'New person created successfully',
                person: {
                    personId: 1,
                    personName: 'New Person'
                },
                links: [
                    { rel: "self", href: `/persons/1`, method: "GET" },
                    { rel: "delete", href: `/persons/1`, method: "DELETE" },
                    { rel: "modify", href: `/persons/1`, method: "PUT" }
                ]
            });
        });

        test('Deve retornar erro 400 se o nome da pessoa não for fornecido', async () => {
            const invalidPerson = { roles: ['Author'] };

            const response = await request(server)
                .post('/persons')
                .send(invalidPerson)
                .expect(400);

            expect(response.body).toEqual({
                success: false,
                message: 'Person name is required.'
            });
        });

        test('Deve retornar erro 400 se as funções não forem fornecidas ou forem inválidas', async () => {
            const invalidPerson = { personName: 'New Person' };

            const response = await request(server)
                .post('/persons')
                .send(invalidPerson)
                .expect(400);

            expect(response.body).toEqual({
                success: false,
                message: 'Roles are required and should be a non-empty array.'
            });
        });

        test('Deve retornar erro 400 se algumas funções forem inválidas', async () => {
            const invalidRolesPerson = { personName: 'New Person', roles: ['InvalidRole'] };

            Role.findAll.mockResolvedValue([]);

            const response = await request(server)
                .post('/persons')
                .send(invalidRolesPerson)
                .expect(400);

            expect(response.body).toEqual({
                success: false,
                message: 'Some roles are invalid.',
                invalidRoles: ['InvalidRole']
            });
        });

        test('Deve retornar erro 400 se a pessoa já existir', async () => {
            Person.findOne.mockResolvedValue({ personId: 1, personName: 'New Person' });

            const response = await request(server)
                .post('/persons')
                .send(validPerson)
                .expect(400);

            expect(response.body).toEqual({
                success: false,
                message: 'Person with this name already exists.'
            });
        });

        test('Deve retornar erro 500 se ocorrer um erro inesperado durante a criação', async () => {
            User.findByPk.mockResolvedValue(mockUser);
            Role.findAll.mockResolvedValue([validRole]);
            Person.findOne.mockResolvedValue(null);
            Person.create.mockImplementation(() => {
                throw new Error('Erro inesperado');
            });

            const response = await request(server)
                .post('/persons')
                .send(validPerson)
                .expect(500);

            expect(response.body).toEqual({
                success: false,
                message: 'Erro inesperado'
            });
        });
    });
});
