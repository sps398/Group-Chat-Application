const Sequelize = require('sequelize');
const sequelize = require('../util/database');

const ArchivedChat = sequelize.define('archived_chats', {
    id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
    },
    message: {
        type: Sequelize.TEXT,
        allowNull: false,
    },
    userName: {
        type: Sequelize.STRING,
        allowNull: false
    },
    messageType: {
        type: Sequelize.STRING,
        enum: [ 'text', 'file' ],
        default: 'text'
    }
});

module.exports = ArchivedChat;