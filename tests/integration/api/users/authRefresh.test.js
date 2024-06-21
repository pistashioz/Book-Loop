const request = require('supertest');
const app = require('../../../../app');
const { Token, sequelize } = require('../../../../models');
const { issueAccessToken, handleRefreshToken } = require('../../../../middleware/authJwt');
const jwt = require('jsonwebtoken'); 

jest.mock('../../../../models');
jest.mock('../../../../middleware/authJwt');

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

    const userId = 1;
    const sessionId = 'session-id';
    const validRefreshToken = 'valid-refresh-token';
    const newAccessToken = 'new-access-token';
    const newRefreshToken = 'new-refresh-token';
    const tokenData = { userId, sessionId, tokenKey: validRefreshToken, expiresAt: new Date(Date.now() + 10000), invalidated: false };

    Token.findOne.mockResolvedValue(tokenData);
    jwt.verify = jest.fn().mockReturnValue({ id: userId, session: sessionId });
    issueAccessToken.mockReturnValue({ token: newAccessToken, expires: new Date(Date.now() + 10000), cookieExpires: new Date(Date.now() + 10000) });
    handleRefreshToken.mockReturnValue({ refreshToken: newRefreshToken, expires: new Date(Date.now() + 20000), cookieExpires: new Date(Date.now() + 20000) });

    const response = await request(server)
      .post('/users/me/refresh')
      .set('Cookie', [`refreshToken=${validRefreshToken}`])
      .expect(200);

    expect(response.body).toEqual({ success: true });
    expect(Token.update).toHaveBeenCalledWith(
      { invalidated: true, lastUsedAt: expect.any(Date) },
      { where: { sessionId, invalidated: false }, transaction: expect.any(Object) }
    );
    expect(Token.create).toHaveBeenCalledWith(
      expect.objectContaining({ tokenKey: newRefreshToken, tokenType: 'refresh', userId, sessionId, invalidated: false }),
      { transaction: expect.any(Object) }
    );
  });

  test('Deve devolver erro 401 se o refresh token for inválido', async () => {
    console.log('Running test: Deve devolver erro 401 se o refresh token for inválido');

    Token.findOne.mockResolvedValue(null);

    const response = await request(server)
      .post('/users/me/refresh')
      .set('Cookie', ['refreshToken=invalid-refresh-token'])
      .expect(401);

    expect(response.body).toEqual({ message: "Token expired or invalidated, please log in again.", redirectTo: '/login' });
  });

  test('Deve devolver erro 500 se ocorrer um erro inesperado', async () => {
    console.log('Running test: Deve devolver erro 500 se ocorrer um erro inesperado');

    const error = new Error('Erro inesperado');
    Token.findOne.mockImplementation(() => { throw error; });

    const response = await request(server)
      .post('/users/me/refresh')
      .set('Cookie', ['refreshToken=valid-refresh-token'])
      .expect(500);

    expect(response.body).toEqual({ message: 'Failed to refresh tokens. Please try again later.' });
  });

  test('Deve devolver erro 403 se nenhum refresh token for encontrado', async () => {
    console.log('Running test: Deve devolver erro 403 se nenhum refresh token for encontrado');

    const response = await request(server)
      .post('/users/me/refresh')
      .expect(403);

    expect(response.body).toEqual({ message: "No refresh token found. Please log in again.", redirectTo: '/login' });
  });
});
