const { Sequelize, DataTypes } = require('sequelize');
const { sequelize } = require('../../../models');
const EntityTypeModel = require('../../../models/entityType.model');

describe('EntityType Model', () => {
    let EntityType;

    beforeAll(async () => {
        EntityType = EntityTypeModel(sequelize, DataTypes);
    });

    afterAll(async () => {
        await sequelize.close();
    });

    beforeEach(async () => {
        console.log('Starting a new test...');
        await EntityType.destroy({ where: { entityTypeId: { [Sequelize.Op.notIn]: [1, 2, 3] } } });
    });

    afterEach(async () => {
        console.log('Test completed.');
    });

    test('Deve criar um novo tipo de entidade', async () => {
        console.log('Running test: Deve criar um novo tipo de entidade');

        try {
            const entityType = await EntityType.create({
                entityTypeName: 'new_entity_type'
            });

            expect(entityType.entityTypeName).toBe('new_entity_type');
        } catch (error) {
            console.error('Error creating entityType:', error);
            throw error;
        }
    });

    test('Deve falhar se entityTypeName for nulo', async () => {
        console.log('Running test: Deve falhar se entityTypeName for nulo');

        try {
            await EntityType.create({
                entityTypeName: null
            });
        } catch (error) {
            expect(error).toBeDefined();
            expect(error.message).toContain('notNull Violation: EntityType.entityTypeName cannot be null');
        }
    });

    test('Deve atualizar um tipo de entidade', async () => {
        console.log('Running test: Deve atualizar um tipo de entidade');

        try {
            const entityType = await EntityType.create({
                entityTypeName: 'old_entity_type'
            });

            await EntityType.update(
                { entityTypeName: 'updated_entity_type' },
                { where: { entityTypeId: entityType.entityTypeId } }
            );

            const updatedEntityType = await EntityType.findOne({ where: { entityTypeId: entityType.entityTypeId } });

            expect(updatedEntityType.entityTypeName).toBe('updated_entity_type');
        } catch (error) {
            console.error('Error updating entityType:', error);
            throw error;
        }
    });

    test('Deve apagar um tipo de entidade', async () => {
        console.log('Running test: Deve apagar um tipo de entidade');

        try {
            const entityType = await EntityType.create({
                entityTypeName: 'to_be_deleted'
            });

            await entityType.destroy();

            const foundEntityType = await EntityType.findOne({ where: { entityTypeId: entityType.entityTypeId } });
            expect(foundEntityType).toBeNull();
        } catch (error) {
            console.error('Error deleting entityType:', error);
            throw error;
        }
    });

    test('Deve encontrar um tipo de entidade existente', async () => {
        console.log('Running test: Deve encontrar um tipo de entidade existente');

        await EntityType.create({
            entityTypeId: 4,
            entityTypeName: 'existing_entity_type'
        });

        const existingEntityType = await EntityType.findOne({ where: { entityTypeId: 4 } });

        expect(existingEntityType).not.toBeNull();
        expect(existingEntityType.entityTypeName).toBe('existing_entity_type');
    });
});
