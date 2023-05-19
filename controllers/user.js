const User = require('../models/user');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sequelize = require('../util/database');
const path = require('path');
require('dotenv').config();

const registerUser = async (req, res, next) => {
    try {
        const users = await User.findAll({ where: { email: req.body.email } });

        if (users[0]) return res.status(400).json({ message: "User already exist", success: false });

        const salt = await bcrypt.genSalt(10);
        let password = req.body.password;
        password = await bcrypt.hash(password, salt);

        await User.create({
            name: req.body.name,
            email: req.body.email,
            phoneNo: req.body.phoneNo,
            password: password
        });

        return res.status(200).json({ message: "You are registered successfully...", success: true });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Some error occurred!", success: false });
    }
};

module.exports = {
    registerUser
};