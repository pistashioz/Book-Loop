const request = require('supertest');
const app = require('../../../../app');
const { Person, Role, PersonRole, sequelize } = require('../../../../models');
const { verifyToken } = require('../../../../middleware/authJwt');
const { isAdmin } = require('../../../../middleware/admin');

jest.mock('../../../../models');
jest.mock('../../../../middleware/authJwt');
jest.mock('../../../../middleware/admin');

describe('Person Roles API Integration Tests', () => {
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

        // Garantir que os papéis existam no banco de dados de teste
        await Role.bulkCreate([
            { roleId: 1, roleName: 'Author' },
            { roleId: 2, roleName: 'NonExistentRole' }
        ]);
    });

    describe('POST /persons/:personId/roles', () => {/* 
        test('Deve adicionar um papel a uma pessoa com sucesso', async () => {
            const personId = 1;
            const roleName = 'Author';
            const person = { personId, personName: 'Person One' };
            const role = { roleId: 1, roleName: 'Author' };

            Person.findByPk.mockResolvedValue(person);
            Role.findOne.mockResolvedValue(role);
            PersonRole.findOne.mockResolvedValue(null);
            PersonRole.create.mockResolvedValue({ personId, roleId: role.roleId });

            const response = await request(server)
                .post(`/persons/${personId}/roles`)
                .send({ role: roleName })
                .expect(201);

            expect(response.body).toEqual({
                success: true,
                message: `Role '${roleName}' added to person successfully.`,
                personId: String(personId),
                roleId: role.roleId,
                links: [
                    { rel: "self", href: `/persons/${personId}`, method: "GET" },
                    { rel: "delete", href: `/persons/${personId}`, method: "DELETE" },
                    { rel: "modify", href: `/persons/${personId}`, method: "PUT" }
                ]
            });
        }); */

        test('Deve retornar erro 400 se o papel não for fornecido', async () => {
            const personId = 1;

            const response = await request(server)
                .post(`/persons/${personId}/roles`)
                .send({})
                .expect(400);

            expect(response.body).toEqual({
                success: false,
                message: 'Role is required.'
            });
        });

        test('Deve retornar erro 404 se o papel não for encontrado', async () => {
            const personId = 1;
            const roleName = 'NonExistentRole';

            Role.findOne.mockResolvedValue(null);

            const response = await request(server)
                .post(`/persons/${personId}/roles`)
                .send({ role: roleName })
                .expect(404);

            expect(response.body).toEqual({
                success: false,
                message: `Role '${roleName}' not found.`,
                invalidRole: roleName
            });
        });

        test('Deve retornar erro 404 se a pessoa não for encontrada', async () => {
            const personId = 999;
            const roleName = 'Author';
            const role = { roleId: 1, roleName: 'Author' };

            Role.findOne.mockResolvedValue(role);
            Person.findByPk.mockResolvedValue(null);

            const response = await request(server)
                .post(`/persons/${personId}/roles`)
                .send({ role: roleName })
                .expect(404);

            expect(response.body).toEqual({
                success: false,
                message: `Person with ID '${personId}' not found.`,
                personId: String(personId)
            });
        });

        test('Deve retornar erro 400 se o papel já estiver associado à pessoa', async () => {
            const personId = 1;
            const roleName = 'Author';
            const person = { personId, personName: 'Person One' };
            const role = { roleId: 1, roleName: 'Author' };
            const existingAssociation = { personId, roleId: role.roleId };

            Person.findByPk.mockResolvedValue(person);
            Role.findOne.mockResolvedValue(role);
            PersonRole.findOne.mockResolvedValue(existingAssociation);

            const response = await request(server)
                .post(`/persons/${personId}/roles`)
                .send({ role: roleName })
                .expect(400);

            expect(response.body).toEqual({
                success: false,
                message: `Role '${roleName}' is already associated with this person.`,
                personId: String(personId),
                personName: person.personName,
                roleId: role.roleId
            });
        });
    });

    describe('DELETE /persons/:personId/roles', () => {
        test('Deve remover um papel de uma pessoa com sucesso', async () => {
            const personId = 1;
            const roleName = 'Author';
            const person = { personId, personName: 'Person One' };
            const role = { roleId: 1, roleName: 'Author' };
            const existingAssociation = { personId, roleId: role.roleId };

            Person.findByPk.mockResolvedValue(person);
            Role.findOne.mockResolvedValue(role);
            PersonRole.findOne.mockResolvedValue(existingAssociation);
            PersonRole.count.mockResolvedValue(2);

            const response = await request(server)
                .delete(`/persons/${personId}/roles`)
                .send({ role: roleName })
                .expect(200);

            expect(response.body).toEqual({
                success: true,
                message: `Role '${roleName}' removed from person successfully.`,
                personId: String(personId),
                roleId: role.roleId
            });
        });

        test('Deve retornar erro 400 se o papel não for fornecido', async () => {
            const personId = 1;

            const response = await request(server)
                .delete(`/persons/${personId}/roles`)
                .send({})
                .expect(400);

            expect(response.body).toEqual({
                success: false,
                message: 'Role is required.'
            });
        });

        test('Deve retornar erro 404 se o papel não for encontrado', async () => {
            const personId = 1;
            const roleName = 'NonExistentRole';

            Role.findOne.mockResolvedValue(null);

            const response = await request(server)
                .delete(`/persons/${personId}/roles`)
                .send({ role: roleName })
                .expect(404);

            expect(response.body).toEqual({
                success: false,
                message: `Role '${roleName}' not found.`,
                invalidRole: roleName
            });
        });

        test('Deve retornar erro 404 se a pessoa não for encontrada', async () => {
            const personId = 999;
            const roleName = 'Author';
            const role = { roleId: 1, roleName: 'Author' };

            Role.findOne.mockResolvedValue(role);
            Person.findByPk.mockResolvedValue(null);

            const response = await request(server)
                .delete(`/persons/${personId}/roles`)
                .send({ role: roleName })
                .expect(404);

            expect(response.body).toEqual({
                success: false,
                message: `Person with ID '${personId}' not found.`,
                personId: String(personId)
            });
        });

/*         test('Deve retornar erro 400 se o papel não estiver associado à pessoa', async () => {
            const personId = 1;
            const roleName = 'Author';
            const person = { personId, personName: 'Person One' };
            const role = { roleId: 1, roleName: 'Author' };

            Person.findByPk.mockResolvedValue(person);
            Role.findOne.mockResolvedValue(role);
            PersonRole.findOne.mockResolvedValue(null);

            const response = await request(server)
                .delete(`/persons/${personId}/roles`)
                .send({ role: roleName })
                .expect(400);

            expect(response.body).toEqual({
                success: false,
                message: `Role '${roleName}' is not associated with this person.`,
                personId: String(personId),
                roleId: role.roleId
            });
        });
 */
        test('Deve retornar erro 400 se tentar remover o único papel associado à pessoa', async () => {
            const personId = 1;
            const roleName = 'Author';
            const person = { personId, personName: 'Person One' };
            const role = { roleId: 1, roleName: 'Author' };
            const existingAssociation = { personId, roleId: role.roleId };

            Person.findByPk.mockResolvedValue(person);
            Role.findOne.mockResolvedValue(role);
            PersonRole.findOne.mockResolvedValue(existingAssociation);
            PersonRole.count.mockResolvedValue(1);

            const response = await request(server)
                .delete(`/persons/${personId}/roles`)
                .send({ role: roleName })
                .expect(400);

            expect(response.body).toEqual({
                success: false,
                message: 'Cannot remove the only role associated with this person.',
                personId: String(personId),
                roleId: role.roleId
            });
        });
    });
});
