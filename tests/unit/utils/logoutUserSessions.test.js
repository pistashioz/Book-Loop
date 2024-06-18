const { logoutUserSessions } = require('../../../controllers/users.controller');
const { SessionLog, Token, sequelize } = require('../../../models');

jest.mock('../../../models');

describe('logoutUserSessions Helper Function', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sequelize.transaction = jest.fn().mockImplementation(() => ({
      commit: jest.fn().mockResolvedValue(),
      rollback: jest.fn().mockResolvedValue(),
    }));
  });

  test('Deve invalidar todas as sessões e tokens do utilizador', async () => {
    console.log('Running test: Deve invalidar todas as sessões e tokens do utilizador');

    const userId = 1;
    const transaction = await sequelize.transaction();
    SessionLog.update.mockResolvedValue([1]); 
    Token.update.mockResolvedValue([1]); 

    await logoutUserSessions(userId, transaction);

    expect(SessionLog.update).toHaveBeenCalledWith(
      { endTime: expect.any(Date) },
      { where: { userId, endTime: null }, transaction: expect.any(Object) }
    );
    expect(Token.update).toHaveBeenCalledWith(
      { invalidated: true, lastUsedAt: expect.any(Date) },
      { where: { userId, invalidated: false, lastUsedAt: null }, transaction: expect.any(Object) }
    );
  });

  test('Deve lançar um erro se ocorrer um erro durante o logout', async () => {
    console.log('Running test: Deve lançar um erro se ocorrer um erro durante o logout');

    const userId = 1;
    const transaction = await sequelize.transaction();
    const error = new Error('Erro durante o logout');
    SessionLog.update.mockImplementation(() => { throw error; });

    await expect(logoutUserSessions(userId, transaction)).rejects.toThrow('Erro durante o logout');

    expect(SessionLog.update).toHaveBeenCalledWith(
      { endTime: expect.any(Date) },
      { where: { userId, endTime: null }, transaction: expect.any(Object) }
    );
  });
});
