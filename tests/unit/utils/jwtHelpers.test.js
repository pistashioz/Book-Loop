// tests/unit/utils/jwtHelpers.test.js

const jwt = require('jsonwebtoken');
const { verifyTokenHelper } = require('../../../utils/jwtHelpers');
const config = require('../../../config/auth.config');

jest.mock('jsonwebtoken');
jest.mock('../../../config/auth.config', () => ({
    secret: 'test-secret'
}));

describe('verifyTokenHelper', () => {
    const validToken = 'valid-token';
    const invalidToken = 'invalid-token';
    const decodedData = { userId: 1, username: 'testuser' };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('Deve verificar o token com sucesso e retornar dados decodificados', async () => {
        jwt.verify.mockImplementation((token, secret, callback) => {
            callback(null, decodedData);
        });

        const result = await verifyTokenHelper(validToken);
        expect(result).toEqual(decodedData);
        expect(jwt.verify).toHaveBeenCalledWith(validToken, config.secret, expect.any(Function));
    });

    test('Deve rejeitar com um erro se a verificação do token falhar', async () => {
        const verificationError = new Error('Invalid token');
        verificationError.name = 'JsonWebTokenError';

        jwt.verify.mockImplementation((token, secret, callback) => {
            callback(verificationError, null);
        });

        await expect(verifyTokenHelper(invalidToken)).rejects.toThrow('Invalid token');
        expect(jwt.verify).toHaveBeenCalledWith(invalidToken, config.secret, expect.any(Function));
    });

    test('Deve rejeitar com um erro se o token estiver expirado', async () => {
        const expirationError = new Error('Token expired');
        expirationError.name = 'TokenExpiredError';

        jwt.verify.mockImplementation((token, secret, callback) => {
            callback(expirationError, null);
        });

        await expect(verifyTokenHelper(invalidToken)).rejects.toThrow('Token expired');
        expect(jwt.verify).toHaveBeenCalledWith(invalidToken, config.secret, expect.any(Function));
    });
});
