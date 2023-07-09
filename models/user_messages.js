const Sequelize = require('sequelize');
const sequelize = require('../util/database');

const UserMessages = sequelize.define('user_messages', {
    id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
    },
    userId: {
        type: Sequelize.STRING,
        allowNull: false
    },
    messageId: {
        type: Sequelize.STRING,
        allowNull: false,
    },
    groupId: {
        type: Sequelize.STRING,
        allowNull: false
    },
    seen: Sequelize.BOOLEAN
});

module.exports = UserMessages;