const User = require('../models/user');
const Chat = require('../models/chat');
const Group = require('../models/group');
const Admin = require('../models/admin');
const UserMessages = require('../models/user_messages');
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
            token: generateAccessToken({ userId: user.id, name: user.name, email: user.email, phoneNo: user.phoneNo })
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
        const { groupId } = req.body;
    
        const newMessage = {
            message: req.body.message,
            userId: user.id,
            userName: user.name,
            groupId: groupId
        };
    
        const response = await Chat.create(newMessage);

        await setMessageStatusAsUnseen(groupId, response.id, req);

        return res.status(200).json({ success: true, message: "Message added successfully", messageObj: response });
    } catch(err) {
        console.log(err);
        return res.status(500).json({ success: false, message: "Something went wrong!" });
    }
}

async function setMessageStatusAsUnseen(groupId, messageId, req) {
    return new Promise(async (resolve, reject) => {
        try {
            const groups = await Group.findAll({ where: { id: groupId }});
            const group = groups[0];
            const membersOfGroup = await group.getUsers();
            membersOfGroup.forEach(async (member) => {
                let seen=false;
                if(member.id === req.user.id)
                    seen = true;

                const user_messages = await UserMessages.create({
                    userId: member.id,
                    messageId: messageId,
                    groupId: groupId,
                    seen: seen
                });
            })
            resolve(membersOfGroup);
        } catch(err) {
            reject(err);
        }
    })
}

const markMessagesAsSeen = async (req, res) => {
    try {
        const userId = req.user.id;
        const groupId = req.body.groupId;

        await UserMessages.update(
            { seen: true },
            {
            where: {
                groupId: groupId,
                userId: userId,
                seen: false
            }
            }
        );
    
        return res
                .status(200)
                .json({
                    success: true,
                    message: "Marked the messages as seen"
                });
    } catch(err) {
        console.log(err);
        return res
                .status(500)
                .json({
                    success: false,
                    message: 'Something went wrong!'
                });
    }
  };

const getMessages = async (req, res, next) => {
    try {
        const groupId = Number(req.query.groupId);
        let result = await Chat.findAll({ where: { groupId: groupId }});
        return res.status(200).json({ success: true, message: 'Retrieved all messages succesfully!', messages: result });
    } catch(err) {
        console.log(err);
        return res.status(500).json({ success: false, message: 'Something went wrong!' });
    }
}

const getNewMessages = async (req, res) => {
    try {
        const newMessages = await UserMessages.findAll({ where: { groupId: req.query.groupId, userId: req.user.id, seen: false } });
        return res.status(200).json({ success: true, message: 'Retrieved new messages successfully!', newMessages: newMessages });
    } catch(err) {
        console.log(err);
        return res.status(500).json({ success: false, message: 'Something went wrong!' });
    }
}

// const getOlderMessages = async (req, res, next) => {
//     try {
//         const lastMessageId = Number(req.query.lastMessageId);
//         const groupId = Number(req.query.groupId);
//         console.log(lastMessageId);
//         if(lastMessageId === -1)
//             return res.status(200).json({ success: true, message: 'Retrieved all messages succesfully!', messages: [] });    
//         const result = await Chat.findAll({ where: { id : { [Op.lt] : lastMessageId }, groupId: groupId } });
//         return res.status(200).json({ success: true, message: 'Retrieved all messages succesfully!', messages: result });
//     } catch(err) {
//         console.log(err);
//         return res.status(500).json({ success: false, message: 'Something went wrong!' });
//     }
// }

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

        await Admin.create({
            groupId: group.id,
            adminId: req.user.id
        });

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

const getParticipants = async (req, res, next) => {
    try {
        const groupId = req.query.groupId;
        const group = await Group.findOne({ where: { id: groupId } });
        const participants = await group.getUsers({ attributes: ['id', 'name', 'email', 'phoneNo'] });
        console.log(participants);

        return res.status(200).json({ success: true, participants: participants });
    } catch(err) {
        console.log(err);
        return res.status(500).json({ success: false, message: "Something went wrong!" });
    }
}

const getGroupAdmins = async (req, res, next) => {
    try {
        const groupId = req.query.groupId;
        const result = await Admin.findAll({ where: { groupId: groupId } });
        console.log(result);

        return res.status(200).json({ success: true, admins: result });
    } catch(err) {
        console.log(err);
        return res.status(500).json({ success: false, message: 'Something went wrong!' });
    }
}

const addGroupAdmin = async (req, res, next) => {
    try {
        const userId = req.body.participantId;
        const groupId = req.params.groupId;
    
        await Admin.create({ groupId: groupId, adminId: userId });

        return res.status(200).json({ success: true, message: 'Added as an admin successfully' });
    } catch(err) {
        return res.status(500).json({ success: false, message: 'Something went wrong!' });
    }
}

const removeGroupAdmin = async (req, res, next) => {
    try {
        const userId = req.params.participantId;
        const groupId = req.params.groupId;
    
        await Admin.destroy({ where: { groupId: groupId, adminId: userId }});

        return res.status(200).json({ success: true, message: 'Removed as an admin successfully' });
    } catch(err) {
        return res.status(500).json({ success: false, message: 'Something went wrong!' });
    }
}

const removeUserFromGroup = async (req, res, next) => {
    try {
        const userId = req.params.participantId;
        const groupId = req.params.groupId;
    
        const group = await Group.findOne({ where: { id: groupId } });
        await group.removeUser(userId);

        return res.status(200).json({ success: true, message: 'Removed user from group successfully' });
    } catch(err) {
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
    getMessages,
    getNewMessages,
    // getOlderMessages,
    markMessagesAsSeen,
    createGroup,
    getAllUsers,
    getGroups,
    getParticipants,
    getGroupAdmins,
    addGroupAdmin,
    removeGroupAdmin,
    removeUserFromGroup
};