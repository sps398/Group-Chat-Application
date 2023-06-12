const User = require('../models/user');
const Chat = require('../models/chat');
const Group = require('../models/group');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sequelize = require('../util/database');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
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

const getAllUsers = async (req, res, next) => {
    try {
        const users = await User.findAll({
            attributes: { exclude: ['password'] }
        });
        return res.status(200).json({ success: true, users: users });
    } catch(err) {
        return res.status(500).json({ message: "Some error occurred!", success: false });
    }
};

const postMessage = async (req, res, next) => {
    try {
        const user = req.user;
    
        const newMessage = {
            message: req.body.message,
            userId: user.id,
            userName: user.name,
            groupId: req.query.groupId
        };
    
        const response = await Chat.create(newMessage);

        return res.status(200).json({ success: true, message: "Message posted successfully", messageId: response.id, userName: user.name });
    } catch(err) {
        console.log(err);
        return res.status(500).json({ success: false, message: "Something went wrong!" });
    }
}       

const getMessages = async (req, res, next) => {
    try {
        const lastMessageId = Number(req.query.lastMessageId);
        const groupId = Number(req.query.groupId);
        if(lastMessageId === -1)
            return res.status(200).json({ success: true, message: 'Retrieved all messages succesfully!', messages: [] });    
        const result = await Chat.findAll({ where: { id : { [Op.gt] : lastMessageId }, groupId: groupId } });
        return res.status(200).json({ success: true, message: 'Retrieved all messages succesfully!', messages: result });
    } catch(err) {
        console.log(err);
        return res.status(500).json({ success: false, message: 'Something went wrong!' });
    }
}

const getOlderMessages = async (req, res, next) => {
    try {
        const lastMessageId = Number(req.query.lastMessageId);
        if(lastMessageId === -1)
            return res.status(200).json({ success: true, message: 'Retrieved all messages succesfully!', messages: [] });    
        const result = await Chat.findAll({ where: { id : { [Op.lt] : lastMessageId } } });
        return res.status(200).json({ success: true, message: 'Retrieved all messages succesfully!', messages: result });
    } catch(err) {
        console.log(err);
        return res.status(500).json({ success: false, message: 'Something went wrong!' });
    }
}

const createGroup = async (req, res, next) => {
    try {
        let newGroup = req.body.newGroup;
        let members = newGroup.members;

        newGroup = {
            name: newGroup.name,
            description: newGroup.description
        };

        const group = await Group.create(newGroup);

        console.log('GROUP CREATED!');

        members.forEach(async (userId) => {
            try {
                const user = await User.findOne({ where: { id: userId } });
                await group.addUser(user);
                console.log('User ' + user.id + " successfully added to group!");
            } catch(err) {
                console.log(err);
                // throw new Error(err);
            }
        })

        return res.status(200).json({ success: true, group: group });

    } catch(err) {
        console.log(err);
        return res.status(500).json({ success: false, message: 'Something went wrong!' });
    }
}

const getGroups = async (req, res, next) => {
    try {
        const groups = await req.user.getGroups();
        return res.status(200).json({ success: true, groups: groups });
    } catch(err) {
        return res.status(500).json({ message: 'Something went wron!', success: false });
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
    getMessages,
    getOlderMessages,
    createGroup,
    getAllUsers,
    getGroups
};