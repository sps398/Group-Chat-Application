const Sequelize = require('sequelize');
const sequelize = require('../util/database');

const Group = sequelize.define('groups', {
    id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
    },
    name: {
        type: Sequelize.STRING,
        allowNull: false,
    },
    description: Sequelize.STRING,
    groupCode: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
    },
    groupPhoto: {
        type: Sequelize.STRING
    }
});

module.exports = Group;