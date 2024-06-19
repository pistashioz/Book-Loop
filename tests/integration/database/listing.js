const { Sequelize, DataTypes } = require('sequelize');
const { sequelize } = require('../../../models');
const ListingModel = require('../../../models/listing.model');

describe('Listing Model', () => {
    let Listing;

    beforeAll(async () => {
        Listing = ListingModel(sequelize, DataTypes);
    });

    afterAll(async () => {
        await sequelize.close();
    });

    beforeEach(async () => {
        console.log('Starting a new test...');
        await Listing.destroy({ where: { listingId: { [Sequelize.Op.notIn]: [1, 2, 3, 4, 5, 6, 7] } } });
    });

    afterEach(async () => {
        console.log('Test completed.');
    });

    test('Deve criar uma nova listing', async () => {
        console.log('Running test: Deve criar uma nova listing');

        try {
            const listing = await Listing.create({
                sellerUserId: 15,
                editionUUID: '83d506ea-2023-11ef-a329-ac1f6bad9968',
                listingTitle: 'Test Listing - New Condition',
                price: 10.99,
                listingCondition: 'New',
                availability: 'Active',
                listingDescription: 'This is a test listing description that is sufficiently long to meet the validation requirements.'
            });

            expect(listing.sellerUserId).toBe(15);
            expect(listing.editionUUID).toBe('83d506ea-2023-11ef-a329-ac1f6bad9968');
            expect(listing.listingTitle).toBe('Test Listing - New Condition');
            expect(listing.price).toBe(10.99);
            expect(listing.listingCondition).toBe('New');
            expect(listing.availability).toBe('Active');
            expect(listing.listingDescription).toBe('This is a test listing description that is sufficiently long to meet the validation requirements.');
        } catch (error) {
            console.error('Error creating listing:', error);
            throw error;
        }
    });

    test('Deve falhar se listingTitle for nulo', async () => {
        console.log('Running test: Deve falhar se listingTitle for nulo');

        try {
            await Listing.create({
                sellerUserId: 15,
                editionUUID: '83d506ea-2023-11ef-a329-ac1f6bad9968',
                listingTitle: null,
                price: 10.99,
                listingCondition: 'New',
                availability: 'Active',
                listingDescription: 'This is a test listing description that is sufficiently long to meet the validation requirements.'
            });
        } catch (error) {
            expect(error).toBeDefined();
            expect(error.message).toContain('Listing title cannot be null or empty!');
        }
    });

    test('Deve atualizar uma listing', async () => {
        console.log('Running test: Deve atualizar uma listing');

        try {
            const listing = await Listing.create({
                sellerUserId: 15,
                editionUUID: '83d506ea-2023-11ef-a329-ac1f6bad9968',
                listingTitle: 'Old Listing Title',
                price: 10.99,
                listingCondition: 'New',
                availability: 'Active',
                listingDescription: 'This is a test listing description that is sufficiently long to meet the validation requirements.'
            });

            await Listing.update(
                { listingTitle: 'Updated Listing Title' },
                { where: { listingId: listing.listingId } }
            );

            const updatedListing = await Listing.findOne({ where: { listingId: listing.listingId } });

            expect(updatedListing.listingTitle).toBe('Updated Listing Title');
        } catch (error) {
            console.error('Error updating listing:', error);
            throw error;
        }
    });

    test('Deve apagar uma listing', async () => {
        console.log('Running test: Deve apagar uma listing');

        try {
            const listing = await Listing.create({
                sellerUserId: 15,
                editionUUID: '83d506ea-2023-11ef-a329-ac1f6bad9968',
                listingTitle: 'Listing to be deleted',
                price: 10.99,
                listingCondition: 'New',
                availability: 'Active',
                listingDescription: 'This is a test listing description that is sufficiently long to meet the validation requirements.'
            });

            await listing.destroy();

            const foundListing = await Listing.findOne({ where: { listingId: listing.listingId } });
            expect(foundListing).toBeNull();
        } catch (error) {
            console.error('Error deleting listing:', error);
            throw error;
        }
    });

    test('Deve encontrar uma listing existente', async () => {
        console.log('Running test: Deve encontrar uma listing existente');

        await Listing.create({
            listingId: 8,
            sellerUserId: 15,
            editionUUID: '83d506ea-2023-11ef-a329-ac1f6bad9968',
            listingTitle: 'Existing Listing',
            price: 10.99,
            listingCondition: 'New',
            availability: 'Active',
            listingDescription: 'This is an existing listing description that is sufficiently long to meet the validation requirements.'
        });

        const existingListing = await Listing.findOne({ where: { listingId: 8 } });

        expect(existingListing).not.toBeNull();
        expect(existingListing.listingTitle).toBe('Existing Listing');
        expect(existingListing.sellerUserId).toBe(15);
        expect(existingListing.editionUUID).toBe('83d506ea-2023-11ef-a329-ac1f6bad9968');
        expect(existingListing.price).toBe("10.99");
        expect(existingListing.listingCondition).toBe('New');
        expect(existingListing.availability).toBe('Active');
        expect(existingListing.listingDescription).toBe('This is an existing listing description that is sufficiently long to meet the validation requirements.');
    });
});
