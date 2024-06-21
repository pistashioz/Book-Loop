const request = require('supertest');
const app = require('../../../../app');
const { NavigationHistory, sequelize } = require('../../../../models');
const { verifyToken } = require('../../../../middleware/authJwt');

jest.mock('../../../../models');
jest.mock('../../../../middleware/authJwt');

describe('Delete Navigation History API', () => {
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
            next();
        });
    });

    test('Deve eliminar uma entrada específica do histórico de navegação com sucesso', async () => {
        console.log('Running test: Deve eliminar uma entrada específica do histórico de navegação com sucesso');

        NavigationHistory.destroy.mockResolvedValue(1); 

        const response = await request(server)
            .delete('/users/me/navigation-history/1')
            .set('Authorization', 'Bearer token')
            .expect(200);

        expect(response.body).toEqual({ message: 'Navigation history entry deleted successfully' });
    });

    test('Deve devolver erro 404 se a entrada específica do histórico de navegação não for encontrada', async () => {
        console.log('Running test: Deve devolver erro 404 se a entrada específica do histórico de navegação não for encontrada');

        NavigationHistory.destroy.mockResolvedValue(0); 
        const response = await request(server)
            .delete('/users/me/navigation-history/999')
            .set('Authorization', 'Bearer token')
            .expect(404);

        expect(response.body).toEqual({ message: 'Navigation history entry not found' });
    });

    test('Deve eliminar todas as entradas do histórico de navegação com sucesso', async () => {
        console.log('Running test: Deve eliminar todas as entradas do histórico de navegação com sucesso');

        NavigationHistory.destroy.mockResolvedValue(1); 

        const response = await request(server)
            .delete('/users/me/navigation-history')
            .set('Authorization', 'Bearer token')
            .expect(200);

        expect(response.body).toEqual({ message: 'All navigation history entries deleted successfully' });
    });

    test('Deve devolver erro 500 se ocorrer um erro inesperado', async () => {
        console.log('Running test: Deve devolver erro 500 se ocorrer um erro inesperado');


        NavigationHistory.destroy.mockImplementation(() => { throw new Error('Erro inesperado'); });

        const response = await request(server)
            .delete('/users/me/navigation-history/1')
            .set('Authorization', 'Bearer token')
            .expect(500);

        expect(response.body).toEqual({ message: 'Error deleting navigation history entries', error: 'Erro inesperado' });
    });
});
