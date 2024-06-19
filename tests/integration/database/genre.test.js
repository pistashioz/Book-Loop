const { Sequelize, DataTypes } = require('sequelize');
const { sequelize } = require('../../../models');
const GenreModel = require('../../../models/genre.model');

describe('Genre Model', () => {
    let Genre;

    beforeAll(async () => {
        Genre = GenreModel(sequelize, DataTypes);
    });

    afterAll(async () => {
        await sequelize.close();
    });

    beforeEach(async () => {
        console.log('Starting a new test...');
        await Genre.destroy({ where: { genreId: { [Sequelize.Op.notIn]: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] } } });
    });

    afterEach(async () => {
        console.log('Test completed.');
    });

    test('Deve criar um novo género', async () => {
        console.log('Running test: Deve criar um novo género');

        try {
            const genre = await Genre.create({
                genreName: 'Test Genre'
            });

            expect(genre.genreName).toBe('Test Genre');
        } catch (error) {
            console.error('Error creating genre:', error);
            throw error;
        }
    });

    test('Deve falhar se genreName for nulo', async () => {
        console.log('Running test: Deve falhar se genreName for nulo');

        try {
            await Genre.create({
                genreName: null
            });
        } catch (error) {
            expect(error).toBeDefined();
            expect(error.message).toContain('Genre name cannot be empty!');
        }
    });

    test('Deve atualizar um género', async () => {
        console.log('Running test: Deve atualizar um género');

        try {
            const genre = await Genre.create({
                genreName: 'Old Genre'
            });

            await Genre.update(
                { genreName: 'Updated Genre' },
                { where: { genreId: genre.genreId } }
            );

            const updatedGenre = await Genre.findOne({ where: { genreId: genre.genreId } });

            expect(updatedGenre.genreName).toBe('Updated Genre');
        } catch (error) {
            console.error('Error updating genre:', error);
            throw error;
        }
    });

    test('Deve apagar um género', async () => {
        console.log('Running test: Deve apagar um género');

        try {
            const genre = await Genre.create({
                genreName: 'To Be Deleted'
            });

            await genre.destroy();

            const foundGenre = await Genre.findOne({ where: { genreId: genre.genreId } });
            expect(foundGenre).toBeNull();
        } catch (error) {
            console.error('Error deleting genre:', error);
            throw error;
        }
    });

    test('Deve encontrar um género existente', async () => {
        console.log('Running test: Deve encontrar um género existente');

        await Genre.create({
            genreId: 21,
            genreName: 'Existing Genre'
        });

        const existingGenre = await Genre.findOne({ where: { genreId: 21 } });

        expect(existingGenre).not.toBeNull();
        expect(existingGenre.genreName).toBe('Existing Genre');
    });
});
