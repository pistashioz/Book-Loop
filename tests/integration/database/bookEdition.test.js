const { Sequelize, DataTypes } = require('sequelize');
const { sequelize } = require('../../../models');
const BookEditionModel = require('../../../models/bookEdition.model');

describe('BookEdition Model', () => {
    let BookEdition;

    beforeAll(async () => {
        BookEdition = BookEditionModel(sequelize, DataTypes);
    });

    afterAll(async () => {
        await sequelize.close();
    });

    beforeEach(async () => {
        console.log('Starting a new test...');
        await BookEdition.destroy({ where: { UUID: { [Sequelize.Op.notIn]: ['06cd9b07-f8e7-4b43-bcb6-ea275c352988', '7b1ac543-96c9-4cd1-91e4-46c68263af09', '83d5013a-2023-11ef-a329-ac1f6bad9968', '83d5028a-2023-11ef-a329-ac1f6bad9968', '83d50373-2023-11ef-a329-ac1f6bad9968', '83d503ff-2023-11ef-a329-ac1f6bad9968', '83d50445-2023-11ef-a329-ac1f6bad9968', '83d504c4-2023-11ef-a329-ac1f6bad9968', '83d5053b-2023-11ef-a329-ac1f6bad9968', '83d5057f-2023-11ef-a329-ac1f6bad9968', '83d505be-2023-11ef-a329-ac1f6bad9968', '83d50634-2023-11ef-a329-ac1f6bad9968', '83d506aa-2023-11ef-a329-ac1f6bad9968', '83d506ea-2023-11ef-a329-ac1f6bad9968', '83d5075d-2023-11ef-a329-ac1f6bad9968', '83d5079c-2023-11ef-a329-ac1f6bad9968', '83d50808-2023-11ef-a329-ac1f6bad9968', '83d5087e-2023-11ef-a329-ac1f6bad9968', '83d50971-2023-11ef-a329-ac1f6bad9968', '83d509bf-2023-11ef-a329-ac1f6bad9968', '83d509fb-2023-11ef-a329-ac1f6bad9968', '83d50a3d-2023-11ef-a329-ac1f6bad9968', '83d50aba-2023-11ef-a329-ac1f6bad9968', '83d50af8-2023-11ef-a329-ac1f6bad9968', '83d50b35-2023-11ef-a329-ac1f6bad9968', '83d50b75-2023-11ef-a329-ac1f6bad9968', '83d50bec-2023-11ef-a329-ac1f6bad9968', '83d50c2f-2023-11ef-a329-ac1f6bad9968', '83d50c6e-2023-11ef-a329-ac1f6bad9968', '83d50ce0-2023-11ef-a329-ac1f6bad9968', '83d50d1f-2023-11ef-a329-ac1f6bad9968', '83d50d5e-2023-11ef-a329-ac1f6bad9968', '83d50dd6-2023-11ef-a329-ac1f6bad9968', '83d50e16-2023-11ef-a329-ac1f6bad9968', '83d50e53-2023-11ef-a329-ac1f6bad9968', '83d50e95-2023-11ef-a329-ac1f6bad9968', '83d50f0c-2023-11ef-a329-ac1f6bad9968', 'c490b29e-60fd-49ad-92a6-f231933833f2', 'cfd3b0ee-b314-40a2-b30a-a4125ed451dc'] } } });
    });

    afterEach(async () => {
        console.log('Test completed.');
    });

    test('Deve criar uma nova BookEdition', async () => {
        console.log('Running test: Deve criar uma nova BookEdition');

        try {
            const bookEdition = await BookEdition.create({
                ISBN: '9781234567890',
                workId: 1,
                publisherId: 1,
                title: 'Test Title',
                synopsis: 'Test Synopsis',
                editionType: 'Paperback',
                publicationDate: '2023-01-01',
                languageId: 1,
                pageNumber: 100,
                coverImage: 'https://example.com/test_image.jpg'
            });

            expect(bookEdition.ISBN).toBe('9781234567890');
            expect(bookEdition.title).toBe('Test Title');
        } catch (error) {
            console.error('Error creating BookEdition:', error);
            throw error;
        }
    });

    test('Deve falhar se ISBN for inválido', async () => {
        console.log('Running test: Deve falhar se ISBN for inválido');

        try {
            await BookEdition.create({
                ISBN: '123',
                workId: 1,
                publisherId: 1,
                title: 'Test Title',
                synopsis: 'Test Synopsis',
                editionType: 'Paperback',
                publicationDate: '2023-01-01',
                languageId: 1,
                pageNumber: 100,
                coverImage: 'https://example.com/test_image.jpg'
            });
        } catch (error) {
            expect(error).toBeDefined();
            expect(error.message).toContain('Invalid ISBN format.');
        }
    });

    test('Deve atualizar uma BookEdition', async () => {
        console.log('Running test: Deve atualizar uma BookEdition');

        try {
            const bookEdition = await BookEdition.create({
                ISBN: '9781234567890',
                workId: 1,
                publisherId: 1,
                title: 'Old Title',
                synopsis: 'Test Synopsis',
                editionType: 'Paperback',
                publicationDate: '2023-01-01',
                languageId: 1,
                pageNumber: 100,
                coverImage: 'https://example.com/test_image.jpg'
            });

            await BookEdition.update(
                { title: 'Updated Title' },
                { where: { UUID: bookEdition.UUID } }
            );

            const updatedBookEdition = await BookEdition.findOne({ where: { UUID: bookEdition.UUID } });

            expect(updatedBookEdition.title).toBe('Updated Title');
        } catch (error) {
            console.error('Error updating BookEdition:', error);
            throw error;
        }
    });

    test('Deve apagar uma BookEdition', async () => {
        console.log('Running test: Deve apagar uma BookEdition');

        try {
            const bookEdition = await BookEdition.create({
                ISBN: '9781234567890',
                workId: 1,
                publisherId: 1,
                title: 'Test Title',
                synopsis: 'Test Synopsis',
                editionType: 'Paperback',
                publicationDate: '2023-01-01',
                languageId: 1,
                pageNumber: 100,
                coverImage: 'https://example.com/test_image.jpg'
            });

            await bookEdition.destroy();

            const foundBookEdition = await BookEdition.findOne({ where: { UUID: bookEdition.UUID } });
            expect(foundBookEdition).toBeNull();
        } catch (error) {
            console.error('Error deleting BookEdition:', error);
            throw error;
        }
    });

    test('Deve encontrar uma BookEdition existente', async () => {
        console.log('Running test: Deve encontrar uma BookEdition existente');

        await BookEdition.create({
            UUID: '83d50f7a-2023-11ef-a329-ac1f6bad9968',
            ISBN: '9780123456789',
            workId: 1,
            publisherId: 1,
            title: 'Existing Title',
            synopsis: 'Existing Synopsis',
            editionType: 'Paperback',
            publicationDate: '2023-01-01',
            languageId: 1,
            pageNumber: 100,
            coverImage: 'https://example.com/existing_image.jpg'
        });

        const existingBookEdition = await BookEdition.findOne({ where: { UUID: '83d50f7a-2023-11ef-a329-ac1f6bad9968' } });

        expect(existingBookEdition).not.toBeNull();
        expect(existingBookEdition.title).toBe('Existing Title');
    });
});
