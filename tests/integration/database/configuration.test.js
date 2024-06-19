const { Sequelize, DataTypes } = require('sequelize');
const { sequelize } = require('../../../models');
const ConfigurationModel = require('../../../models/configuration.model');

describe('Configuration Model', () => {
    let Configuration;

    beforeAll(async () => {
        Configuration = ConfigurationModel(sequelize, DataTypes);
    });

    afterAll(async () => {
        await sequelize.close();
    });

    beforeEach(async () => {
        console.log('Starting a new test...');
        await Configuration.destroy({ where: { configId: { [Sequelize.Op.notIn]: [] } } });
    });

    afterEach(async () => {
        console.log('Test completed.');
    });

    test('Deve criar uma nova configuração', async () => {
        console.log('Running test: Deve criar uma nova configuração');

        try {
            const config = await Configuration.create({
                configType: 'privacy',
                configKey: 'show_email',
                description: 'Determines if the email should be shown publicly'
            });

            expect(config.configType).toBe('privacy');
            expect(config.configKey).toBe('show_email');
            expect(config.description).toBe('Determines if the email should be shown publicly');
        } catch (error) {
            console.error('Error creating configuration:', error);
            throw error;
        }
    });

    test('Deve falhar se configType for nulo', async () => {
        console.log('Running test: Deve falhar se configType for nulo');

        try {
            await Configuration.create({
                configType: null,
                configKey: 'show_email',
                description: 'Determines if the email should be shown publicly'
            });
        } catch (error) {
            expect(error).toBeDefined();
            expect(error.message).toContain("notNull Violation: Configuration.configType cannot be null");
        }
    });

    test('Deve atualizar uma configuração', async () => {
        console.log('Running test: Deve atualizar uma configuração');

        try {
            const config = await Configuration.create({
                configType: 'privacy',
                configKey: 'show_email',
                description: 'Determines if the email should be shown publicly'
            });

            await Configuration.update(
                { description: 'Updated description' },
                { where: { configId: config.configId } }
            );

            const updatedConfig = await Configuration.findOne({ where: { configId: config.configId } });

            expect(updatedConfig.description).toBe('Updated description');
        } catch (error) {
            console.error('Error updating configuration:', error);
            throw error;
        }
    });

    test('Deve apagar uma configuração', async () => {
        console.log('Running test: Deve apagar uma configuração');

        try {
            const config = await Configuration.create({
                configType: 'privacy',
                configKey: 'show_email',
                description: 'Determines if the email should be shown publicly'
            });

            await config.destroy();

            const foundConfig = await Configuration.findOne({ where: { configId: config.configId } });
            expect(foundConfig).toBeNull();
        } catch (error) {
            console.error('Error deleting configuration:', error);
            throw error;
        }
    });

    test('Deve encontrar uma configuração existente', async () => {
        console.log('Running test: Deve encontrar uma configuração existente');

        await Configuration.create({
            configId: 1,
            configType: 'privacy',
            configKey: 'show_email',
            description: 'Determines if the email should be shown publicly'
        });

        const existingConfig = await Configuration.findOne({ where: { configId: 1 } });

        expect(existingConfig).not.toBeNull();
        expect(existingConfig.configType).toBe('privacy');
        expect(existingConfig.configKey).toBe('show_email');
        expect(existingConfig.description).toBe('Determines if the email should be shown publicly');
    });
});
