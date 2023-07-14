const Sequelize = require('sequelize');
const sequelize = require('../util/database');

const Chat = sequelize.define('chats', {
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

module.exports = Chat;