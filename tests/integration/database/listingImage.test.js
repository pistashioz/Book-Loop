const { Sequelize, DataTypes } = require('sequelize');
const { sequelize } = require('../../../models');
const ListingImageModel = require('../../../models/listingImage.model');

describe('ListingImage Model', () => {
    let ListingImage;

    beforeAll(async () => {
        ListingImage = ListingImageModel(sequelize, DataTypes);
    });

    afterAll(async () => {
        await sequelize.close();
    });

    beforeEach(async () => {
        console.log('Starting a new test...');
        await ListingImage.destroy({ where: { imageId: { [Sequelize.Op.notIn]: [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28] } } });
    });

    afterEach(async () => {
        console.log('Test completed.');
    });

    test('Deve criar uma nova listingImage', async () => {
        console.log('Running test: Deve criar uma nova listingImage');

        try {
            const listingImage = await ListingImage.create({
                listingId: 1,
                imageUrl: 'https://example.com/test_image.jpg'
            });

            expect(listingImage.listingId).toBe(1);
            expect(listingImage.imageUrl).toBe('https://example.com/test_image.jpg');
        } catch (error) {
            console.error('Error creating listingImage:', error);
            throw error;
        }
    });

    test('Deve falhar se imageUrl for nulo', async () => {
        console.log('Running test: Deve falhar se imageUrl for nulo');

        try {
            await ListingImage.create({
                listingId: 1,
                imageUrl: null
            });
        } catch (error) {
            expect(error).toBeDefined();
            expect(error.message).toContain('ListingImage.imageUrl cannot be null');
        }
    });

    test('Deve atualizar uma listingImage', async () => {
        console.log('Running test: Deve atualizar uma listingImage');

        try {
            const listingImage = await ListingImage.create({
                listingId: 1,
                imageUrl: 'https://example.com/old_image.jpg'
            });

            await ListingImage.update(
                { imageUrl: 'https://example.com/updated_image.jpg' },
                { where: { imageId: listingImage.imageId } }
            );

            const updatedListingImage = await ListingImage.findOne({ where: { imageId: listingImage.imageId } });

            expect(updatedListingImage.imageUrl).toBe('https://example.com/updated_image.jpg');
        } catch (error) {
            console.error('Error updating listingImage:', error);
            throw error;
        }
    });

    test('Deve apagar uma listingImage', async () => {
        console.log('Running test: Deve apagar uma listingImage');

        try {
            const listingImage = await ListingImage.create({
                listingId: 1,
                imageUrl: 'https://example.com/test_image.jpg'
            });

            await listingImage.destroy();

            const foundListingImage = await ListingImage.findOne({ where: { imageId: listingImage.imageId } });
            expect(foundListingImage).toBeNull();
        } catch (error) {
            console.error('Error deleting listingImage:', error);
            throw error;
        }
    });

    test('Deve encontrar uma listingImage existente', async () => {
        console.log('Running test: Deve encontrar uma listingImage existente');

        await ListingImage.create({
            imageId: 29,
            listingId: 1,
            imageUrl: 'https://example.com/existing_image.jpg'
        });

        const existingListingImage = await ListingImage.findOne({ where: { imageId: 29 } });

        expect(existingListingImage).not.toBeNull();
        expect(existingListingImage.imageUrl).toBe('https://example.com/existing_image.jpg');
    });
});
