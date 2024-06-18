const request = require('supertest');
const app = require('../../app');
const { Token, sequelize } = require('../../models');
const { issueAccessToken, handleRefreshToken } = require('../../middleware/authJwt');
const jwt = require('jsonwebtoken');
const config = require('../../config/auth.config');

jest.mock('../../models');
jest.mock('../../middleware/authJwt');
jest.mock('jsonwebtoken');

describe('Auth Refresh Tokens Endpoint', () => {
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

  test('Deve atualizar os tokens se o refresh token for válido', async () => {
    console.log('Running test: Deve atualizar os tokens se o refresh token for válido');

    const refreshToken = 'valid-refresh-token';
    const userId = 1;
    const sessionId = 'session-id';
    const existingToken = { tokenKey: refreshToken, expiresAt: new Date(Date.now() + 10000), invalidated: false };

    Token.findOne.mockResolvedValue(existingToken);
    jwt.verify.mockReturnValue({ id: userId, session: sessionId });
    issueAccessToken.mockReturnValue({ token: 'new-access-token', expires: new Date(Date.now() + 10000), cookieExpires: new Date(Date.now() + 10000) });
    handleRefreshToken.mockReturnValue({ refreshToken: 'new-refresh-token', expires: new Date(Date.now() + 20000), cookieExpires: new Date(Date.now() + 20000) });

    const response = await request(server)
      .post('/users/me/refresh')
      .set('Cookie', [`refreshToken=${refreshToken}`])
      .expect(200);

    expect(response.body).toEqual({ success: true });
    expect(Token.update).toHaveBeenCalledWith(
      { invalidated: true, lastUsedAt: expect.any(Date) },
      { where: { sessionId, invalidated: false }, transaction: expect.any(Object) }
    );
    expect(Token.findOne).toHaveBeenCalledWith({ where: { tokenKey: refreshToken, tokenType: 'refresh' } });
    expect(jwt.verify).toHaveBeenCalledWith(refreshToken, config.secret);
    expect(issueAccessToken).toHaveBeenCalledWith(userId, sessionId);
    expect(handleRefreshToken).toHaveBeenCalledWith(userId, sessionId);
  });

  test('Deve retornar erro 401 se o refresh token for inválido', async () => {
    console.log('Running test: Deve retornar erro 401 se o refresh token for inválido');

    const refreshToken = 'invalid-refresh-token';

    Token.findOne.mockResolvedValue(null);

    const response = await request(server)
      .post('/users/me/refresh')
      .set('Cookie', [`refreshToken=${refreshToken}`])
      .expect(401);

    expect(response.body).toEqual({ message: "Token expired or invalidated, please log in again.", redirectTo: '/login' });
    expect(Token.findOne).toHaveBeenCalledWith({ where: { tokenKey: refreshToken, tokenType: 'refresh' } });
  });

  test('Deve retornar erro 500 se ocorrer um erro inesperado', async () => {
    console.log('Running test: Deve retornar erro 500 se ocorrer um erro inesperado');

    const refreshToken = 'valid-refresh-token';
    const error = new Error('Erro inesperado');

    Token.findOne.mockImplementation(() => { throw error; });

    const response = await request(server)
      .post('/users/me/refresh')
      .set('Cookie', [`refreshToken=${refreshToken}`])
      .expect(500);

    expect(response.body).toEqual({ message: "Failed to refresh tokens. Please try again later." });
  });

  test('Deve retornar erro 403 se nenhum refresh token for encontrado', async () => {
    console.log('Running test: Deve retornar erro 403 se nenhum refresh token for encontrado');

    const response = await request(server)
      .post('/users/me/refresh')
      .expect(403);

    expect(response.body).toEqual({ message: "No refresh token found. Please log in again.", redirectTo: '/login' });
  });
});
