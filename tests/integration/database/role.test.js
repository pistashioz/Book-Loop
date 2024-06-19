const { Sequelize, DataTypes } = require('sequelize');
const { sequelize } = require('../../../models');
const RoleModel = require('../../../models/role.model');

describe('Role Model', () => {
  let Role;

  beforeAll(async () => {
    Role = RoleModel(sequelize, DataTypes);
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    console.log('Starting a new test...');
    await Role.destroy({ where: { roleId: { [Sequelize.Op.gt]: 3 } } }); // Limpar roles com roleId > 3 antes de cada teste
  });

  afterEach(async () => {
    console.log('Test completed.');
  });

  test('Deve criar um novo role', async () => {
    console.log('Running test: Deve criar um novo role');

    try {
      const role = await Role.create({
        roleName: 'editor'
      });

      expect(role.roleName).toBe('editor');
    } catch (error) {
      console.error('Error creating role:', error);
      throw error;
    }
  });

  test('Deve falhar se roleName não for fornecido', async () => {
    console.log('Running test: Deve falhar se roleName não for fornecido');

    try {
      await Role.create({});
    } catch (error) {
      expect(error.errors[0].message).toBe('Role.roleName cannot be null');
    }
  });

  test('Deve atualizar um role', async () => {
    console.log('Running test: Deve atualizar um role');

    try {
      const role = await Role.create({
        roleName: 'reviewer'
      });

      const updatedRole = await role.update({
        roleName: 'chief reviewer'
      });

      expect(updatedRole.roleName).toBe('chief reviewer');
    } catch (error) {
      console.error('Error updating role:', error);
      throw error;
    }
  });

  test('Deve apagar um role', async () => {
    console.log('Running test: Deve apagar um role');

    try {
      const role = await Role.create({
        roleName: 'assistant'
      });

      await role.destroy();

      const foundRole = await Role.findByPk(role.roleId);
      expect(foundRole).toBeNull();
    } catch (error) {
      console.error('Error deleting role:', error);
      throw error;
    }
  });
});

