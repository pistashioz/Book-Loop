const { Sequelize, DataTypes } = require('sequelize');
const { sequelize } = require('../../../models');
const WorkModel = require('../../../models/work.model');

describe('Work Model', () => {
    let Work;

    beforeAll(async () => {
        Work = WorkModel(sequelize, DataTypes);
    });

    afterAll(async () => {
        await sequelize.close();
    });

    beforeEach(async () => {
        console.log('Starting a new test...');
        await Work.destroy({ where: { workId: { [Sequelize.Op.notIn]: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15, 17] } } });
    });

    afterEach(async () => {
        console.log('Test completed.');
    });

    test('Deve criar uma nova Work', async () => {
        console.log('Running test: Deve criar uma nova Work');

        try {
            const work = await Work.create({
                averageLiteraryRating: 4.5,
                seriesId: 1,
                seriesOrder: 1,
                primaryEditionUUID: '83d50445-2023-11ef-a329-ac1f6bad9968'
            });

            expect(work.averageLiteraryRating).toBe(4.5);
            expect(work.seriesId).toBe(1);
            expect(work.primaryEditionUUID).toBe('83d50445-2023-11ef-a329-ac1f6bad9968');
        } catch (error) {
            console.error('Error creating Work:', error);
            throw error;
        }
    });

    test('Deve falhar se primaryEditionUUID for nulo', async () => {
        console.log('Running test: Deve falhar se primaryEditionUUID for nulo');

        try {
            await Work.create({
                averageLiteraryRating: 4.5,
                seriesId: 1,
                seriesOrder: 1,
                primaryEditionUUID: null
            });
        } catch (error) {
            expect(error).toBeDefined();
            expect(error.message).toContain('cannot be null');
        }
    });

    test('Deve atualizar uma Work', async () => {
        console.log('Running test: Deve atualizar uma Work');

        try {
            const work = await Work.create({
                averageLiteraryRating: 4.5,
                seriesId: 1,
                seriesOrder: 1,
                primaryEditionUUID: '83d50445-2023-11ef-a329-ac1f6bad9968'
            });

            await Work.update(
                { averageLiteraryRating: 4.8 },
                { where: { workId: work.workId } }
            );

            const updatedWork = await Work.findOne({ where: { workId: work.workId } });

            expect(updatedWork.averageLiteraryRating).toBe("4.80");
        } catch (error) {
            console.error('Error updating Work:', error);
            throw error;
        }
    });

    test('Deve apagar uma Work', async () => {
        console.log('Running test: Deve apagar uma Work');

        try {
            const work = await Work.create({
                averageLiteraryRating: 4.5,
                seriesId: 1,
                seriesOrder: 1,
                primaryEditionUUID: '83d50445-2023-11ef-a329-ac1f6bad9968'
            });

            await work.destroy();

            const foundWork = await Work.findOne({ where: { workId: work.workId } });
            expect(foundWork).toBeNull();
        } catch (error) {
            console.error('Error deleting Work:', error);
            throw error;
        }
    });

    test('Deve encontrar uma Work existente', async () => {
        console.log('Running test: Deve encontrar uma Work existente');

        await Work.create({
            workId: 18,
            averageLiteraryRating: 4.7,
            seriesId: 2,
            seriesOrder: 1,
            primaryEditionUUID: '83d50f7a-2023-11ef-a329-ac1f6bad9968'
        });

        const existingWork = await Work.findOne({ where: { workId: 18 } });

        expect(existingWork).not.toBeNull();
        expect(existingWork.averageLiteraryRating).toBe("4.70");
        expect(existingWork.seriesId).toBe(2);
    });
});
