const { setTokenCookies } = require('../../../controllers/users.controller');

describe('setTokenCookies Helper Function', () => {
  let res;

  beforeEach(() => {
    res = {
      clearCookie: jest.fn(),
      cookie: jest.fn(),
    };
  });

  test('Deve configurar os cookies corretamente em ambiente de desenvolvimento', () => {
    process.env.NODE_ENV = 'test';
    const accessToken = 'new-access-token';
    const accessTokenCookieExpiry = new Date(Date.now() + 10000);
    const refreshToken = 'new-refresh-token';
    const refreshTokenCookieExpiry = new Date(Date.now() + 20000);

    setTokenCookies(res, accessToken, accessTokenCookieExpiry, refreshToken, refreshTokenCookieExpiry);

    expect(res.clearCookie).toHaveBeenCalledWith('accessToken');
    expect(res.clearCookie).toHaveBeenCalledWith('refreshToken', { path: '/users/me/refresh' });

    expect(res.cookie).toHaveBeenCalledWith('accessToken', accessToken, {
      httpOnly: true,
      secure: false,
      expires: accessTokenCookieExpiry,
      sameSite: 'Strict'
    });

    expect(res.cookie).toHaveBeenCalledWith('refreshToken', refreshToken, {
      httpOnly: true,
      secure: false,
      expires: refreshTokenCookieExpiry,
      sameSite: 'Strict',
      path: '/users/me/refresh'
    });
  });

  test('Deve configurar os cookies corretamente em ambiente de produção', () => {
    process.env.NODE_ENV = 'production';
    const accessToken = 'new-access-token';
    const accessTokenCookieExpiry = new Date(Date.now() + 10000);
    const refreshToken = 'new-refresh-token';
    const refreshTokenCookieExpiry = new Date(Date.now() + 20000);

    setTokenCookies(res, accessToken, accessTokenCookieExpiry, refreshToken, refreshTokenCookieExpiry);

    expect(res.clearCookie).toHaveBeenCalledWith('accessToken');
    expect(res.clearCookie).toHaveBeenCalledWith('refreshToken', { path: '/users/me/refresh' });

    expect(res.cookie).toHaveBeenCalledWith('accessToken', accessToken, {
      httpOnly: true,
      secure: true,
      expires: accessTokenCookieExpiry,
      sameSite: 'None'
    });

    expect(res.cookie).toHaveBeenCalledWith('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true,
      expires: refreshTokenCookieExpiry,
      sameSite: 'None',
      path: '/users/me/refresh'
    });
  });
});
