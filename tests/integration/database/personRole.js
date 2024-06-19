const { Sequelize, DataTypes } = require('sequelize');
const { sequelize } = require('../../../models');
const PersonRoleModel = require('../../../models/personRoles.model');

describe('PersonRole Model', () => {
  let PersonRole;

  beforeAll(async () => {
    PersonRole = PersonRoleModel(sequelize, DataTypes);
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    console.log('Starting a new test...');
    await PersonRole.destroy({ where: { personId: { [Sequelize.Op.notIn]: [2, 3, 4, 5, 6, 7, 8, 9, 10, 28, 31, 32, 36] } } });
  });

  afterEach(async () => {
    console.log('Test completed.');
  });

  test('Deve criar uma nova personRole', async () => {
    console.log('Running test: Deve criar uma nova personRole');

    try {
      const personRole = await PersonRole.create({
        personId: 1,
        roleId: 1
      });

      expect(personRole.personId).toBe(1);
      expect(personRole.roleId).toBe(1);
    } catch (error) {
      console.error('Error creating personRole:', error);
      throw error;
    }
  });

  test('Deve falhar se personId for null', async () => {
    console.log('Running test: Deve falhar se personId for null');

    try {
      await PersonRole.create({
        personId: null,
        roleId: 1
      });
    } catch (error) {
      expect(error.errors[0].message).toBe('PersonRole.personId cannot be null');
    }
  });

  test('Deve atualizar uma personRole', async () => {
    console.log('Running test: Deve atualizar uma personRole');

    try {
      const personRole = await PersonRole.create({
        personId: 1,
        roleId: 1
      });

      await PersonRole.update(
        { roleId: 2 },
        { where: { personId: 1, roleId: 1 } }
      );

      const updatedPersonRole = await PersonRole.findOne({ where: { personId: 1, roleId: 2 } });

      expect(updatedPersonRole.roleId).toBe(2);
    } catch (error) {
      console.error('Error updating personRole:', error);
      throw error;
    }
  });

  test('Deve apagar uma personRole', async () => {
    console.log('Running test: Deve apagar uma personRole');

    try {
      const personRole = await PersonRole.create({
        personId: 1,
        roleId: 1
      });

      await personRole.destroy();

      const foundPersonRole = await PersonRole.findOne({ where: { personId: 1, roleId: 1 } });
      expect(foundPersonRole).toBeNull();
    } catch (error) {
      console.error('Error deleting personRole:', error);
      throw error;
    }
  });

  test('Deve encontrar uma personRole existente', async () => {
    console.log('Running test: Deve encontrar uma personRole existente');

    const existingPersonRole = await PersonRole.findOne({ where: { personId: 2, roleId: 1 } });

    expect(existingPersonRole).not.toBeNull();
    expect(existingPersonRole.personId).toBe(2);
    expect(existingPersonRole.roleId).toBe(1);
  });
});
