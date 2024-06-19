const { Sequelize, DataTypes } = require('sequelize');
const { sequelize } = require('../../../models');
const BookGenreModel = require('../../../models/bookGenre.model');

describe('BookGenre Model', () => {
    let BookGenre;

    beforeAll(async () => {
        BookGenre = BookGenreModel(sequelize, DataTypes);
    });

    afterAll(async () => {
        await sequelize.close();
    });

    beforeEach(async () => {
        console.log('Starting a new test...');
        await BookGenre.destroy({ where: { workId: { [Sequelize.Op.notIn]: [1, 17, 19, 21, 13, 4, 7, 8, 10, 12, 2, 5, 6, 9, 11, 15, 16, 22, 18] } } });
    });

    afterEach(async () => {
        console.log('Test completed.');
    });

    test('Deve criar uma nova relação bookGenre', async () => {
        console.log('Running test: Deve criar uma nova relação bookGenre');

        try {
            const bookGenre = await BookGenre.create({
                workId: 111,
                genreId: 111
            });

            expect(bookGenre.workId).toBe(111);
            expect(bookGenre.genreId).toBe(111);
        } catch (error) {
            console.error('Error creating bookGenre:', error);
            throw error;
        }
    });

    test('Deve falhar se workId for nulo', async () => {
        console.log('Running test: Deve falhar se workId for nulo');

        try {
            await BookGenre.create({
                workId: null,
                genreId: 1
            });
        } catch (error) {
            expect(error).toBeDefined();
            expect(error.message).toContain("notNull Violation: bookGenre.workId cannot be null");
        }
    });

    test('Deve atualizar uma relação bookGenre', async () => {
        console.log('Running test: Deve atualizar uma relação bookGenre');

        try {
            const bookGenre = await BookGenre.create({
                workId: 111,
                genreId: 1
            });

            await BookGenre.update(
                { genreId: 2 },
                { where: { workId: 111, genreId: 1 } }
            );

            const updatedBookGenre = await BookGenre.findOne({ where: { workId: 111, genreId: 2 } });

            expect(updatedBookGenre.genreId).toBe(2);
        } catch (error) {
            console.error('Error updating bookGenre:', error);
            throw error;
        }
    });

    test('Deve apagar uma relação bookGenre', async () => {
        console.log('Running test: Deve apagar uma relação bookGenre');

        try {
            const bookGenre = await BookGenre.create({
                workId: 111,
                genreId: 111
            });

            await bookGenre.destroy();

            const foundBookGenre = await BookGenre.findOne({ where: { workId: 111, genreId: 111 } });
            expect(foundBookGenre).toBeNull();
        } catch (error) {
            console.error('Error deleting bookGenre:', error);
            throw error;
        }
    });

    test('Deve encontrar uma relação bookGenre existente', async () => {
        console.log('Running test: Deve encontrar uma relação bookGenre existente');

        await BookGenre.create({
            workId: 111,
            genreId: 111
        });

        const existingBookGenre = await BookGenre.findOne({ where: { workId: 111, genreId: 111 } });

        expect(existingBookGenre).not.toBeNull();
        expect(existingBookGenre.workId).toBe(111);
        expect(existingBookGenre.genreId).toBe(111);
    });
});
