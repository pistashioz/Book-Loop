const request = require('supertest');
const app = require('../../../app');
const { Work, User, Token, sequelize } = require('../../../models');
const { verifyToken } = require('../../../middleware/authJwt');
const { isAdmin } = require('../../../middleware/admin');

jest.mock('../../../middleware/admin');
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
    verifyToken.mockImplementation((req, res, next) => {
        req.userId = 2;
        req.sessionId = 'session-id';
        next();
      });
  
      isAdmin.mockImplementation(async (req, res, next) => {
        const user = await User.findByPk(req.userId);
        if (!user || !user.isAdmin) {
          return res.status(403).json({ message: 'Access denied. Admins only.' });
        }
        next();
      });
  
      User.findByPk = jest.fn().mockImplementation((userId) => {
        if (userId === 2) {
          return Promise.resolve({ userId: 2, isAdmin: true });
        }
        return Promise.resolve(null);
      });
  });

  test.only('Deve fazer login e retornar tokens e informações do utilizador', async () => {
    console.log('Running test: Deve fazer login e retornar tokens e informações do utilizador');


    const response = await request(server).get('/works');

    console.log('response: ', response);
  });
});