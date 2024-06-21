const jwt = require('jsonwebtoken');
const { verifyToken } = require('../../../middleware/authJwt');
const { Token, SessionLog } = require('../../../models');
const { verifyTokenHelper } = require('../../../utils/jwtHelpers');

jest.mock('jsonwebtoken');
jest.mock('../../../models');
jest.mock('../../../utils/jwtHelpers');

describe('Middleware de Autenticação - verifyToken', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      cookies: {
        accessToken: 'valid-token',
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      clearCookie: jest.fn(),
    };
    next = jest.fn();
  });

  afterAll(() => {
    jest.resetAllMocks(); 
  });

  test('Deve devolver 401 se não houver token', async () => {
    req.cookies.accessToken = null;
    console.log('Running test: Deve devolver 401 se não houver token');

    await verifyToken(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith({ refresh: true });
  });

  test('Deve adicionar userId e sessionId ao request se o token for válido', async () => {
    const decoded = { id: 1, session: 'session-id' };
    verifyTokenHelper.mockResolvedValue(decoded);
    SessionLog.findOne.mockResolvedValue({ sessionId: 'session-id', endTime: null });
    console.log('Running test: Deve adicionar userId e sessionId ao request se o token for válido');

    await verifyToken(req, res, next);

    expect(req.userId).toBe(decoded.id);
    expect(req.sessionId).toBe(decoded.session);
    expect(next).toHaveBeenCalled();
  });

  test('Deve devolver 403 se a sessão for inválida', async () => {
    const decoded = { id: 1, session: 'session-id' };
    verifyTokenHelper.mockResolvedValue(decoded);
    SessionLog.findOne.mockResolvedValue(null);
    console.log('Running test: Deve devolver 403 se a sessão for inválida');

    await verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.send).toHaveBeenCalledWith({ redirectTo: '/login' });
    expect(res.clearCookie).toHaveBeenCalledWith('accessToken');
    expect(res.clearCookie).toHaveBeenCalledWith('refreshToken', { path: '/users/me/refresh' });
  });

  test('Deve devolver 401 se o token precisar de ser atualizado', async () => {
    const decoded = { id: 1, session: 'session-id', needsRefresh: true };
    verifyTokenHelper.mockResolvedValue(decoded);
    SessionLog.findOne.mockResolvedValue({ sessionId: 'session-id', endTime: null });
    console.log('Running test: Deve devolver 401 se o token precisar de ser atualizado');

    await verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith({ refresh: true });
  });

  test('Deve devolver 401 se o token estiver expirado ou inválido', async () => {
    const error = new Error('TokenExpiredError');
    error.name = 'TokenExpiredError';
    verifyTokenHelper.mockRejectedValue(error);
    console.log('Running test: Deve devolver 401 se o token estiver expirado ou inválido');

    await verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith({ refresh: true });
  });

  test('Deve devolver 500 para outros erros de autenticação', async () => {
    const error = new Error('Erro de autenticação');
    verifyTokenHelper.mockRejectedValue(error);
    console.log('Running test: Deve devolver 500 para outros erros de autenticação');

    await verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({ message: 'Failed to authenticate token.' });
  });
});
