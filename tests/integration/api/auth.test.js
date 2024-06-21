const request = require('supertest');
const app = require('../../../app');
const { User, SessionLog, Token, sequelize } = require('../../../models');
const { issueAccessToken, handleRefreshToken } = require('../../../middleware/authJwt');

jest.mock('../../../models');
jest.mock('../../../middleware/authJwt');

describe('Auth Endpoints', () => {
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
  });

  test('Deve fazer login e devolver tokens e informações do utilizador', async () => {
    console.log('Running test: Deve fazer login e devolver tokens e informações do utilizador');

    const user = { userId: 1, username: 'testuser', email: 'test@example.com', isAdmin: false, validPassword: jest.fn().mockResolvedValue(true) };
    const session = { sessionId: 'session-id' };
    const accessToken = 'access-token';
    const refreshToken = 'refresh-token';

    User.findOne.mockResolvedValue(user);
    SessionLog.create.mockResolvedValue(session);
    issueAccessToken.mockReturnValue({ token: accessToken });
    handleRefreshToken.mockReturnValue({ refreshToken });

    const response = await request(server)
      .post('/users/login')
      .send({ usernameOrEmail: 'testuser', password: 'password' })
      .expect(200);

    expect(response.body).toEqual({
      message: "Login successful",
      user: { id: user.userId, username: user.username, email: user.email, isAdmin: user.isAdmin }
    });
    expect(response.headers['set-cookie']).toEqual(
      expect.arrayContaining([
        expect.stringContaining(`accessToken=${accessToken}`),
        expect.stringContaining(`refreshToken=${refreshToken}`)
      ])
    );
  });

  test('Deve devolver erro 401 se a password for incorreta', async () => {
    console.log('Running test: Deve devolver erro 401 se a password for incorreta');

    const user = { userId: 1, username: 'testuser', email: 'test@example.com', isAdmin: false, validPassword: jest.fn().mockResolvedValue(false) };

    User.findOne.mockResolvedValue(user);

    const response = await request(server)
      .post('/users/login')
      .send({ usernameOrEmail: 'testuser', password: 'wrongpassword' })
      .expect(401);

    expect(response.body).toEqual({ message: 'Invalid username or password' });
  });

  test('Deve devolver erro 404 se o utilizador não for encontrado', async () => {
    console.log('Running test: Deve devolver erro 404 se o utilizador não for encontrado');

    User.findOne.mockResolvedValue(null);

    const response = await request(server)
      .post('/users/login')
      .send({ usernameOrEmail: 'nonexistent', password: 'password' })
      .expect(404);

    expect(response.body).toEqual({ message: 'User not found' });
  });

  test('Deve devolver erro 500 se ocorrer um erro inesperado', async () => {
    console.log('Running test: Deve devolver erro 500 se ocorrer um erro inesperado');

    const error = new Error('Erro inesperado');
    User.findOne.mockImplementation(() => { throw error; });

    const response = await request(server)
      .post('/users/login')
      .send({ usernameOrEmail: 'testuser', password: 'password' })
      .expect(500);

    expect(response.body).toEqual({ message: 'Error logging in', error: 'Erro inesperado' });
  });
});
