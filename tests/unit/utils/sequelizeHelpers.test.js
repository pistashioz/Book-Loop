// tests/unit/utils/sequelizeHelpers.test.js

const { getEnumValues } = require('../../../utils/sequelizeHelpers');

describe('getEnumValues', () => {
  let sequelizeMock;

  beforeEach(() => {
    sequelizeMock = {
      models: {
        User: {
          rawAttributes: {
            isActiveStatus: {
              type: 'ENUM',
              values: ['active', 'suspended', 'deactivated', 'to be deleted']
            },
            defaultLanguage: {
              type: 'ENUM',
              values: ['EN', 'PT-EU']
            }
          }
        }
      }
    };
  });

  test('Deve devolver os valores ENUM para um atributo válido', () => {
    const values = getEnumValues(sequelizeMock, 'User', 'isActiveStatus');
    expect(values).toEqual(['active', 'suspended', 'deactivated', 'to be deleted']);
  });

  test('Deve devolver os valores ENUM para outro atributo válido', () => {
    const values = getEnumValues(sequelizeMock, 'User', 'defaultLanguage');
    expect(values).toEqual(['EN', 'PT-EU']);
  });

  test('Deve devolver um array vazio para um atributo sem valores ENUM', () => {
    sequelizeMock.models.User.rawAttributes.noEnumAttribute = {};
    const values = getEnumValues(sequelizeMock, 'User', 'noEnumAttribute');
    expect(values).toEqual([]);
  });

  test('Deve lançar um erro se o modelo não existir', () => {
    expect(() => {
      getEnumValues(sequelizeMock, 'NonExistentModel', 'isActiveStatus');
    }).toThrow();
  });

  test('Deve lançar um erro se o atributo não existir no modelo', () => {
    expect(() => {
      getEnumValues(sequelizeMock, 'User', 'nonExistentAttribute');
    }).toThrow();
  });
});
