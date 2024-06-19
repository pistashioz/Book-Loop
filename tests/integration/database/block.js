const { Sequelize, DataTypes } = require('sequelize');
const { sequelize } = require('../../../models');
const BlockModel = require('../../../models/block.model');

describe('Block Model', () => {
    let Block;

    beforeAll(async () => {
        Block = BlockModel(sequelize, DataTypes);
    });

    afterAll(async () => {
        await sequelize.close();
    });

    beforeEach(async () => {
        console.log('Starting a new test...');
        await Block.destroy({ where: {} });
    });

    afterEach(async () => {
        console.log('Test completed.');
    });

    test('Deve criar um novo bloqueio', async () => {
        console.log('Running test: Deve criar um novo bloqueio');

        try {
            const block = await Block.create({
                blockerUserId: 1,
                blockedUserId: 2
            });

            expect(block.blockerUserId).toBe(1);
            expect(block.blockedUserId).toBe(2);
        } catch (error) {
            console.error('Error creating block:', error);
            throw error;
        }
    });

    test('Deve falhar se blockerUserId for nulo', async () => {
        console.log('Running test: Deve falhar se blockerUserId for nulo');

        try {
            await Block.create({
                blockerUserId: null,
                blockedUserId: 2
            });
        } catch (error) {
            expect(error).toBeDefined();
            expect(error.message).toContain("notNull Violation: Block.blockerUserId cannot be null");
        }
    });

    test('Deve atualizar um bloqueio', async () => {
        console.log('Running test: Deve atualizar um bloqueio');

        try {
            const block = await Block.create({
                blockerUserId: 1,
                blockedUserId: 2
            });

            await Block.update(
                { blockedUserId: 3 },
                { where: { blockerUserId: 1, blockedUserId: 2 } }
            );

            const updatedBlock = await Block.findOne({ where: { blockerUserId: 1, blockedUserId: 3 } });

            expect(updatedBlock.blockedUserId).toBe(3);
        } catch (error) {
            console.error('Error updating block:', error);
            throw error;
        }
    });

    test('Deve apagar um bloqueio', async () => {
        console.log('Running test: Deve apagar um bloqueio');

        try {
            const block = await Block.create({
                blockerUserId: 1,
                blockedUserId: 2
            });

            await block.destroy();

            const foundBlock = await Block.findOne({ where: { blockerUserId: 1, blockedUserId: 2 } });
            expect(foundBlock).toBeNull();
        } catch (error) {
            console.error('Error deleting block:', error);
            throw error;
        }
    });

    test('Deve encontrar um bloqueio existente', async () => {
        console.log('Running test: Deve encontrar um bloqueio existente');

        await Block.create({
            blockerUserId: 24,
            blockedUserId: 15
        });

        const existingBlock = await Block.findOne({ where: { blockerUserId: 24, blockedUserId: 15 } });

        expect(existingBlock).not.toBeNull();
        expect(existingBlock.blockerUserId).toBe(24);
        expect(existingBlock.blockedUserId).toBe(15);
    });
});
