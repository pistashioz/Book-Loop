const { Sequelize, DataTypes } = require('sequelize');
const { sequelize } = require('../../../models');
const FollowRelationshipModel = require('../../../models/followRelationship.model');
const UserModel = require('../../../models/user.model'); 

describe('FollowRelationship Model', () => {
    let FollowRelationship;
    let User;

    beforeAll(async () => {
        FollowRelationship = FollowRelationshipModel(sequelize, DataTypes);
        User = UserModel(sequelize, DataTypes);
    });

    afterAll(async () => {
        await sequelize.close();
    });

    beforeEach(async () => {
        console.log('Starting a new test...');
        await FollowRelationship.destroy({ where: { mainUserId: { [Sequelize.Op.notIn]: [24] } } });
    });

    afterEach(async () => {
        console.log('Test completed.');
    });

    test('Deve criar um novo FollowRelationship', async () => {
        console.log('Running test: Deve criar um novo FollowRelationship');

        try {
            const follow = await FollowRelationship.create({
                mainUserId: 1,
                followedUserId: 2
            });

            expect(follow.mainUserId).toBe(1);
            expect(follow.followedUserId).toBe(2);
        } catch (error) {
            console.error('Error creating FollowRelationship:', error);
            throw error;
        }
    });

    test('Deve falhar se mainUserId for nulo', async () => {
        console.log('Running test: Deve falhar se mainUserId for nulo');

        try {
            await FollowRelationship.create({
                mainUserId: null,
                followedUserId: 1
            });
        } catch (error) {
            expect(error).toBeDefined();
            expect(error.message).toContain("notNull Violation: FollowRelationship.mainUserId cannot be null");
        }
    });

    test('Deve atualizar um FollowRelationship', async () => {
        console.log('Running test: Deve atualizar um FollowRelationship');

        try {
            const follow = await FollowRelationship.create({
                mainUserId: 1,
                followedUserId: 2
            });

            await FollowRelationship.update(
                { followedUserId: 3 },
                { where: { mainUserId: 1, followedUserId: 2 } }
            );

            const updatedFollow = await FollowRelationship.findOne({ where: { mainUserId: 1, followedUserId: 3 } });

            expect(updatedFollow.followedUserId).toBe(3);
        } catch (error) {
            console.error('Error updating FollowRelationship:', error);
            throw error;
        }
    });

    test('Deve apagar um FollowRelationship', async () => {
        console.log('Running test: Deve apagar um FollowRelationship');

        try {
            const follow = await FollowRelationship.create({
                mainUserId: 1,
                followedUserId: 2
            });

            await follow.destroy();

            const foundFollow = await FollowRelationship.findOne({ where: { mainUserId: 1, followedUserId: 2 } });
            expect(foundFollow).toBeNull();
        } catch (error) {
            console.error('Error deleting FollowRelationship:', error);
            throw error;
        }
    });

    test('Deve encontrar um FollowRelationship existente', async () => {
        console.log('Running test: Deve encontrar um FollowRelationship existente');

        await FollowRelationship.create({
            mainUserId: 25,
            followedUserId: 16
        });

        const existingFollow = await FollowRelationship.findOne({ where: { mainUserId: 25, followedUserId: 16 } });

        expect(existingFollow).not.toBeNull();
        expect(existingFollow.mainUserId).toBe(25);
        expect(existingFollow.followedUserId).toBe(16);
    });
});
