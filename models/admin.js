const Sequelize = require('sequelize');
const sequelize = require('../util/database');

const Admin = sequelize.define('admins', {
    groupId: {
        type: Sequelize.INTEGER,
        allowNull: false
    },
    adminId: {
        type: Sequelize.INTEGER,
        allowNull: false
    }
});

module.exports = Admin;