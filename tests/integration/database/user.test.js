// tests/integration/database/user.test.js

const { Sequelize, DataTypes } = require('sequelize');
const { sequelize } = require('../../../models');
const UserModel = require('../../../models/user.model');

describe('User Model', () => {
  let User;

  beforeAll(async () => {
    User = UserModel(sequelize, DataTypes);

  });

  afterAll(async () => {

    await sequelize.close();
  });

  beforeEach(async () => {
    console.log('Starting a new test...');
    await User.destroy({ where: { userId: { [Sequelize.Op.gt]: 24 } } }); // Limpar utilizadores com userId > 24 antes de cada teste
  });

  afterEach(async () => {
    console.log('Test completed.');
  });

  test('Deve criar um novo utilizador', async () => {
    console.log('Running test: Deve criar um novo utilizador');

    try {
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        birthDate: '2000-01-01',
      });

      expect(user.username).toBe('testuser');
      expect(user.email).toBe('test@example.com');
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  });

  test('Deve validar o campo de email', async () => {
    console.log('Running test: Deve validar o campo de email');

    try {
      await User.create({
        username: 'testuser',
        email: 'invalid-email',
        password: 'password123',
        birthDate: '2000-01-01',
      });
    } catch (error) {
      expect(error.errors[0].message).toBe('Must be a valid email address');
    }
  });

  test('Deve criptografar a senha antes de salvar', async () => {
    console.log('Running test: Deve criptografar a senha antes de salvar');

    try {
      const user = await User.create({
        username: 'secureuser',
        email: 'secure@example.com',
        password: 'securepassword',
        birthDate: '2000-01-01',
      });

      expect(user.password).not.toBe('securepassword');
      const isValid = await user.validPassword('securepassword');
      expect(isValid).toBe(true);
    } catch (error) {
      console.error('Error encrypting password:', error);
      throw error;
    }
  });

  test('Deve falhar se a senha for muito curta', async () => {
    console.log('Running test: Deve falhar se a senha for muito curta');

    try {
      await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: '123',
        birthDate: '2000-01-01',
      });
    } catch (error) {
      expect(error.errors[0].message).toBe('Password should be between 8 and 60 characters');
    }
  });

  test('Deve validar que o utilizador tem pelo menos 16 anos', async () => {
    console.log('Running test: Deve validar que o utilizador tem pelo menos 16 anos');

    try {
      await User.create({
        username: 'younguser',
        email: 'young@example.com',
        password: 'password123',
        birthDate: new Date().toISOString().split('T')[0], // birthDate é hoje
      });
    } catch (error) {
      expect(error.errors[0].message).toBe('User must be at least 16 years of age to register.');
    }
  });

  test('Deve falhar se o username for duplicado', async () => {
    console.log('Running test: Deve falhar se o username for duplicado');

    try {
      await User.create({
        username: 'uniqueuser',
        email: 'unique1@example.com',
        password: 'password123',
        birthDate: '2000-01-01',
      });

      await User.create({
        username: 'uniqueuser',
        email: 'unique2@example.com',
        password: 'password123',
        birthDate: '2000-01-01',
      });
    } catch (error) {
      expect(error.name).toBe('SequelizeUniqueConstraintError');
    }
  });

  test('Deve falhar se o email for duplicado', async () => {
    console.log('Running test: Deve falhar se o email for duplicado');

    try {
      await User.create({
        username: 'user1',
        email: 'duplicate@example.com',
        password: 'password123',
        birthDate: '2000-01-01',
      });

      await User.create({
        username: 'user2',
        email: 'duplicate@example.com',
        password: 'password123',
        birthDate: '2000-01-01',
      });
    } catch (error) {
      expect(error.name).toBe('SequelizeUniqueConstraintError');
    }
  });

  // Novo teste para ler um utilizador
  test('Deve ler um utilizador existente', async () => {
    console.log('Running test: Deve ler um utilizador existente');

    try {
      const createdUser = await User.create({
        username: 'readuser',
        email: 'read@example.com',
        password: 'password123',
        birthDate: '2000-01-01',
      });

      const foundUser = await User.findByPk(createdUser.userId);

      expect(foundUser).not.toBeNull();
      expect(foundUser.username).toBe('readuser');
      expect(foundUser.email).toBe('read@example.com');
    } catch (error) {
      console.error('Error reading user:', error);
      throw error;
    }
  });

  // Novo teste para atualizar um utilizador
  test('Deve atualizar um utilizador existente', async () => {
    console.log('Running test: Deve atualizar um utilizador existente');

    try {
      const user = await User.create({
        username: 'updateuser',
        email: 'update@example.com',
        password: 'password123',
        birthDate: '2000-01-01',
      });

      user.username = 'updateduser';
      await user.save();

      const updatedUser = await User.findByPk(user.userId);

      expect(updatedUser.username).toBe('updateduser');
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  });

  // Novo teste para apagar um utilizador
  test('Deve apagar um utilizador existente', async () => {
    console.log('Running test: Deve apagar um utilizador existente');

    try {
      const user = await User.create({
        username: 'deleteuser',
        email: 'delete@example.com',
        password: 'password123',
        birthDate: '2000-01-01',
      });

      await user.destroy();

      const deletedUser = await User.findByPk(user.userId);

      expect(deletedUser).toBeNull();
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  });

  // Outros testes de modelo...
});
