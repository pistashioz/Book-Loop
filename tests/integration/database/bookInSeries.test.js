const { Sequelize, DataTypes } = require('sequelize');
const { sequelize } = require('../../../models');
const BookInSeriesModel = require('../../../models/bookInSeries.model');

describe('BookInSeries Model', () => {
    let BookInSeries;

    beforeAll(async () => {
        BookInSeries = BookInSeriesModel(sequelize, DataTypes);
    });

    afterAll(async () => {
        await sequelize.close();
    });

    beforeEach(async () => {
        console.log('Starting a new test...');
        await BookInSeries.destroy({ where: { seriesId: { [Sequelize.Op.notIn]: [1, 2] } } });
    });

    afterEach(async () => {
        console.log('Test completed.');
    });

    test('Deve criar uma nova série de livros', async () => {
        console.log('Running test: Deve criar uma nova série de livros');

        try {
            const bookInSeries = await BookInSeries.create({
                seriesName: 'New Series',
                seriesDescription: 'Description of the new series'
            });

            expect(bookInSeries.seriesName).toBe('New Series');
            expect(bookInSeries.seriesDescription).toBe('Description of the new series');
        } catch (error) {
            console.error('Error creating bookInSeries:', error);
            throw error;
        }
    });

    test('Deve falhar se seriesName for nulo', async () => {
        console.log('Running test: Deve falhar se seriesName for nulo');

        try {
            await BookInSeries.create({
                seriesName: null,
                seriesDescription: 'Description of the series'
            });
        } catch (error) {
            expect(error).toBeDefined();
            expect(error.message).toContain("Series name cannot be null or empty!");
        }
    });

    test('Deve atualizar uma série de livros', async () => {
        console.log('Running test: Deve atualizar uma série de livros');

        try {
            const bookInSeries = await BookInSeries.create({
                seriesName: 'Old Series',
                seriesDescription: 'Old description'
            });

            await BookInSeries.update(
                { seriesName: 'Updated Series', seriesDescription: 'Updated description' },
                { where: { seriesId: bookInSeries.seriesId } }
            );

            const updatedBookInSeries = await BookInSeries.findOne({ where: { seriesId: bookInSeries.seriesId } });

            expect(updatedBookInSeries.seriesName).toBe('Updated Series');
            expect(updatedBookInSeries.seriesDescription).toBe('Updated description');
        } catch (error) {
            console.error('Error updating bookInSeries:', error);
            throw error;
        }
    });

    test('Deve apagar uma série de livros', async () => {
        console.log('Running test: Deve apagar uma série de livros');

        try {
            const bookInSeries = await BookInSeries.create({
                seriesName: 'To Be Deleted',
                seriesDescription: 'Description of the series to be deleted'
            });

            await bookInSeries.destroy();

            const foundBookInSeries = await BookInSeries.findOne({ where: { seriesId: bookInSeries.seriesId } });
            expect(foundBookInSeries).toBeNull();
        } catch (error) {
            console.error('Error deleting bookInSeries:', error);
            throw error;
        }
    });

    test('Deve encontrar uma série de livros existente', async () => {
        console.log('Running test: Deve encontrar uma série de livros existente');

        await BookInSeries.create({
            seriesId: 3,
            seriesName: 'Existing Series',
            seriesDescription: 'Description of the existing series'
        });

        const existingBookInSeries = await BookInSeries.findOne({ where: { seriesId: 3 } });

        expect(existingBookInSeries).not.toBeNull();
        expect(existingBookInSeries.seriesName).toBe('Existing Series');
        expect(existingBookInSeries.seriesDescription).toBe('Description of the existing series');
    });
});
