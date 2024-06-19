const { Sequelize, DataTypes } = require('sequelize');
const { sequelize } = require('../../../models');
const LanguageModel = require('../../../models/language.model');

describe('Language Model', () => {
    let Language;

    beforeAll(async () => {
        Language = LanguageModel(sequelize, DataTypes);
    });

    afterAll(async () => {
        await sequelize.close();
    });

    beforeEach(async () => {
        console.log('Starting a new test...');
        await Language.destroy({ where: { languageId: { [Sequelize.Op.notIn]: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]  }} });
    });

    afterEach(async () => {
        console.log('Test completed.');
    });

    test('Deve criar uma nova linguagem', async () => {
        console.log('Running test: Deve criar uma nova linguagem');

        try {
            const language = await Language.create({
                languageName: 'Test Language'
            });

            expect(language.languageName).toBe('Test Language');
        } catch (error) {
            console.error('Error creating language:', error);
            throw error;
        }
    });

    test('Deve falhar se languageName for nulo', async () => {
        console.log('Running test: Deve falhar se languageName for nulo');

        try {
            await Language.create({
                languageName: null
            });
        } catch (error) {
            expect(error).toBeDefined();
            expect(error.message).toContain('languageName cannot be null');
        }
    });

    test('Deve atualizar uma linguagem', async () => {
        console.log('Running test: Deve atualizar uma linguagem');

        try {
            const language = await Language.create({
                languageName: 'Old Language'
            });

            await Language.update(
                { languageName: 'Updated Language' },
                { where: { languageId: language.languageId } }
            );

            const updatedLanguage = await Language.findOne({ where: { languageId: language.languageId } });

            expect(updatedLanguage.languageName).toBe('Updated Language');
        } catch (error) {
            console.error('Error updating language:', error);
            throw error;
        }
    });

    test('Deve apagar uma linguagem', async () => {
        console.log('Running test: Deve apagar uma linguagem');

        try {
            const language = await Language.create({
                languageName: 'To Be Deleted'
            });

            await language.destroy();

            const foundLanguage = await Language.findOne({ where: { languageId: language.languageId } });
            expect(foundLanguage).toBeNull();
        } catch (error) {
            console.error('Error deleting language:', error);
            throw error;
        }
    });

    test('Deve encontrar uma linguagem existente', async () => {
        console.log('Running test: Deve encontrar uma linguagem existente');

        await Language.create({
            languageId: 20,
            languageName: 'Existing Language'
        });

        const existingLanguage = await Language.findOne({ where: { languageId: 20 } });

        expect(existingLanguage).not.toBeNull();
        expect(existingLanguage.languageName).toBe('Existing Language');
    });
});
