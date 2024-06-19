const { Sequelize, DataTypes } = require('sequelize');
const { sequelize } = require('../../../models');
const UserSocialMediaModel = require('../../../models/userSocialMedia.model');

describe('UserSocialMedia Model', () => {
  let UserSocialMedia;

  beforeAll(async () => {
    UserSocialMedia = UserSocialMediaModel(sequelize, DataTypes);

  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    console.log('Starting a new test...');
    await UserSocialMedia.destroy({ where: {} });
  });

  afterEach(async () => {
    console.log('Test completed.');
  });

  test('Deve criar uma nova mídia social para o utilizador', async () => {
    console.log('Running test: Deve criar uma nova mídia social para o utilizador');

    try {
      const socialMedia = await UserSocialMedia.create({
        userId: 1,
        socialMediaName: 'Facebook',
        profileUrl: 'https://facebook.com/userprofile',
      });

      expect(socialMedia.userId).toBe(1);
      expect(socialMedia.socialMediaName).toBe('Facebook');
      expect(socialMedia.profileUrl).toBe('https://facebook.com/userprofile');
    } catch (error) {
      console.error('Error creating user social media:', error);
      throw error;
    }
  });

  test('Deve ler uma mídia social existente do utilizador', async () => {
    console.log('Running test: Deve ler uma mídia social existente do utilizador');

    try {
      const socialMedia = await UserSocialMedia.create({
        userId: 1,
        socialMediaName: 'Facebook',
        profileUrl: 'https://facebook.com/userprofile',
      });

      const foundMedia = await UserSocialMedia.findOne({ where: { userId: 1, socialMediaName: 'Facebook' } });

      expect(foundMedia).not.toBeNull();
      expect(foundMedia.userId).toBe(1);
      expect(foundMedia.socialMediaName).toBe('Facebook');
    } catch (error) {
      console.error('Error reading user social media:', error);
      throw error;
    }
  });

  test('Deve atualizar a URL do perfil da mídia social do utilizador', async () => {
    console.log('Running test: Deve atualizar a URL do perfil da mídia social do utilizador');

    try {
      const socialMedia = await UserSocialMedia.create({
        userId: 1,
        socialMediaName: 'Facebook',
        profileUrl: 'https://facebook.com/userprofile',
      });

      socialMedia.profileUrl = 'https://facebook.com/updatedprofile';
      await socialMedia.save();

      const updatedMedia = await UserSocialMedia.findOne({ where: { userId: 1, socialMediaName: 'Facebook' } });

      expect(updatedMedia.profileUrl).toBe('https://facebook.com/updatedprofile');
    } catch (error) {
      console.error('Error updating user social media:', error);
      throw error;
    }
  });

  test('Deve apagar uma mídia social do utilizador', async () => {
    console.log('Running test: Deve apagar uma mídia social do utilizador');

    try {
      const socialMedia = await UserSocialMedia.create({
        userId: 1,
        socialMediaName: 'Facebook',
        profileUrl: 'https://facebook.com/userprofile',
      });

      await socialMedia.destroy();

      const deletedMedia = await UserSocialMedia.findOne({ where: { userId: 1, socialMediaName: 'Facebook' } });

      expect(deletedMedia).toBeNull();
    } catch (error) {
      console.error('Error deleting user social media:', error);
      throw error;
    }
  });
});
