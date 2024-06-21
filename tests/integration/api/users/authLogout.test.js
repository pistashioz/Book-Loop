const request = require('supertest');
const app = require('../../../../app');
const { SessionLog, Token, sequelize } = require('../../../../models');
const { verifyTokenHelper } = require('../../../../utils/jwtHelpers');
const { verifyToken } = require('../../../../middleware/authJwt');

jest.mock('../../../../models');
jest.mock('../../../../middleware/authJwt');
jest.mock('../../../../utils/jwtHelpers');

describe('Auth Logout Endpoint', () => {
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

    verifyToken.mockImplementation((req, res, next) => {
      req.userId = 1;
      req.sessionId = 'session-id';
      next();
    });

    verifyTokenHelper.mockResolvedValue({ id: 1, session: 'session-id' });
  });

  test('Deve fazer logout e invalidar sessão e token', async () => {
    console.log('Running test: Deve fazer logout e invalidar sessão e token');

    const sessionId = 'session-id';
    SessionLog.update.mockResolvedValue([1]); 
    Token.update.mockResolvedValue([1]); 

    const response = await request(server)
      .post('/users/logout')
      .set('Cookie', [`accessToken=valid-token`])
      .expect(200);

    expect(response.body).toEqual({
      message: "Logout successful.",
      logout: true
    });
    expect(SessionLog.update).toHaveBeenCalledWith(
      { endTime: expect.any(Date) },
      { where: { sessionId }, transaction: expect.any(Object) }
    );
    expect(Token.update).toHaveBeenCalledWith(
      { invalidated: true, lastUsedAt: expect.any(Date) },
      { where: { sessionId, tokenType: 'refresh', invalidated: false }, transaction: expect.any(Object) }
    );
  });

  test('Deve devolver erro 500 se ocorrer um erro durante o logout', async () => {
    console.log('Running test: Deve devolver erro 500 se ocorrer um erro durante o logout');

    const sessionId = 'session-id';
    const error = new Error('Erro durante logout');
    SessionLog.update.mockImplementation(() => { throw error; });

    const response = await request(server)
      .post('/users/logout')
      .set('Cookie', [`accessToken=valid-token`])
      .expect(500);

    expect(response.body).toEqual({ message: "Error during logout", error: error.message });
    expect(SessionLog.update).toHaveBeenCalledWith(
      { endTime: expect.any(Date) },
      { where: { sessionId }, transaction: expect.any(Object) }
    );
  });
});
