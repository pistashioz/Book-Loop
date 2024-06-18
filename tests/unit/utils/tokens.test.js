// tests/unit/utils/jwtHelpers.test.js

const jwt = require('jsonwebtoken');
const { issueAccessToken, handleRefreshToken } = require('../../../middleware/authJwt');
const config = require('../../../config/auth.config');

jest.mock('jsonwebtoken');

describe('Token Creation Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Deve criar um accessToken com os atributos corretos', () => {
    console.log('Running test: Deve criar um accessToken com os atributos corretos');

    const userId = 1;
    const sessionId = 'session-id';
    const token = 'access-token';
    const expirationTime = 3600; 

    config.jwtExpiration = expirationTime / 60; 
    jwt.sign.mockReturnValue(token);

    const result = issueAccessToken(userId, sessionId);

    expect(jwt.sign).toHaveBeenCalledWith(
      { id: userId, session: sessionId },
      config.secret,
      { expiresIn: expirationTime }
    );
    expect(result.token).toBe(token);
  });

  test('Deve criar um refreshToken com os atributos corretos', () => {
    console.log('Running test: Deve criar um refreshToken com os atributos corretos');

    const userId = 1;
    const sessionId = 'session-id';
    const token = 'refresh-token';
    const expirationTime = 86400; 

    config.jwtRefreshExpiration = expirationTime / 3600; 
    jwt.sign.mockReturnValue(token);

    const result = handleRefreshToken(userId, sessionId);

    expect(jwt.sign).toHaveBeenCalledWith(
      { id: userId, session: sessionId },
      config.secret,
      { expiresIn: expirationTime }
    );
    expect(result.refreshToken).toBe(token);
  });

  test('Deve lançar um erro ao criar um accessToken se ocorrer um erro', () => {
    console.log('Running test: Deve lançar um erro ao criar um accessToken se ocorrer um erro');

    const userId = 1;
    const sessionId = 'session-id';
    const expirationTime = 3600; 

    config.jwtExpiration = expirationTime / 60; 
    const error = new Error('Falha ao criar access token');
    jwt.sign.mockImplementation(() => { throw error; });

    expect(() => issueAccessToken(userId, sessionId)).toThrow('Failed to issue access token.');
  });

  test('Deve lançar um erro ao criar um refreshToken se ocorrer um erro', () => {
    console.log('Running test: Deve lançar um erro ao criar um refreshToken se ocorrer um erro');

    const userId = 1;
    const sessionId = 'session-id';
    const expirationTime = 86400; 

    config.jwtRefreshExpiration = expirationTime / 3600; 
    const error = new Error('Falha ao criar refresh token');
    jwt.sign.mockImplementation(() => { throw error; });

    expect(() => handleRefreshToken(userId, sessionId)).toThrow('Failed to handle refresh token.');
  });
});
