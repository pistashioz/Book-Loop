/**
 * Retrieves ENUM values from a Sequelize model's attribute.
 * @param {Object} sequelize - The Sequelize instance.
 * @param {string} modelName - The name of the model.
 * @param {string} attribute - The attribute name to retrieve ENUM values from.
 * @returns {Array} The ENUM values.
 */
function getEnumValues(sequelize, modelName, attribute) {
    const model = sequelize.models[modelName];
    const attrDetails = model.rawAttributes[attribute];
    return attrDetails.values ? attrDetails.values.slice() : [];
}

module.exports = {
    getEnumValues
};
