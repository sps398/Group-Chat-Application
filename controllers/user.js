const User = require('../models/user');
const Chat = require('../models/chat');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sequelize = require('../util/database');
const path = require('path');
require('dotenv').config();

const registerUser = async (req, res, next) => {
    try {
        const users = await User.findAll({ where: { email: req.body.email } });

        if (users[0]) return res.status(400).json({ message: "User already exist, Please login", success: false });

        const salt = await bcrypt.genSalt(10);
        let password = req.body.password;
        password = await bcrypt.hash(password, salt);

        await User.create({
            name: req.body.name,
            email: req.body.email,
            phoneNo: req.body.phoneNo,
            password: password
        });

        return res.status(200).json({ message: "Successfuly signed up...", success: true });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Some error occurred!", success: false });
    }
};

const loginUser = async (req, res, next) => {
    try {
        const users = await User.findAll({
            where: { email: req.body.email }
        });

        const user = users[0];

        if (!user)
            return res.status(404).json({ message: 'Error 404 : User not Found!', success: false });

        const isValidPassword = await bcrypt.compare(req.body.password, user.password);

        if (!isValidPassword) return res.status(401).json({ message: "Error 401 (Unauthorized) : Incorrect Password!", success: false });

        return res.status(200).json({
            message: "User login succesfull!", success: true,
            token: generateAccessToken({ userId: user.id, name: user.name, email: user.email, isPremium: user.isPremium })
        });

    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Some error occurred!", success: false });
    }
};

const postMessage = async (req, res, next) => {
    try {
        const user = req.user;
    
        const newMessage = {
            message: req.body.message,
            userId: user.id,
            userName: user.name
        };
    
        await Chat.create(newMessage);

        return res.status(200).json({ success: true, message: "Message posted successfully" });
    } catch(err) {
        console.log(err);
        return res.status(500).json({ success: false, message: "Something went wrong!" });
    }
}

const getMessages = async (req, res, next) => {
    try {
        const result = await Chat.findAll();
        return res.status(200).json({ success: true, message: 'Retrieved all messages succesfully!', messages: result });
    } catch(err) {
        console.log(err);
        return res.status(500).json({ success: false, message: 'Something went wrong!' });
    }
}

const generateAccessToken = function (user) {
    console.log("authenticating..." + process.env.PRIVATE_KEY);
    const token = jwt.sign(user, process.env.PRIVATE_KEY);
    console.log(token);
    return token;
}

module.exports = {
    registerUser,
    loginUser,
    postMessage,
    getMessages
};