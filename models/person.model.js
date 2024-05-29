module.exports = (sequelize, DataTypes) => {
    const Person = sequelize.define("person", {
        personId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        personName: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notNull: { msg: "Person Name cannot be empty!" }
            }
        }
    }, {
        timestamps: false,
        freezeTableName: true,
        tableName: 'person'
    });

    return Person;
};
