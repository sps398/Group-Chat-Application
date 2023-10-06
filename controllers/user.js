const User = require('../models/user');
const Chat = require('../models/chat');
const ArchivedChats = require('../models/archived_chats');
const Group = require('../models/group');
const Admin = require('../models/admin');
const UserMessages = require('../models/user_messages');
const s3Services = require('../services/s3services');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sequelize = require('../util/database');
const fs = require('fs');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const path = require('path');
const shortid = require('shortid');
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

const verify = (req, res) => {
    let user = req.user;
    user = {
        userId: user.id,
        name: user.name,
        phoneNo: user.phoneNo,
        email: user.email
    }
    return res.status(200).json({ success: true, user: user });
}

const getAllOtherUsers = async (req, res, next) => {
    try {
        const users = await User.findAll({
            where: {
                id: {
                    [Op.ne] : req.user.id
                }
            },
            attributes: { exclude: ['password'] }
        });
        return res.status(200).json({ success: true, users: users });
    } catch (err) {
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
            groupId: groupId,
            messageType: 'text'
        };

        const response = await Chat.create(newMessage);

        await setMessageStatusAsUnseen(groupId, response.id, req);

        console.log(response);

        return res.status(200).json({ success: true, message: "Message added successfully", messageObj: response });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ success: false, message: "Something went wrong!" });
    }
}

async function setMessageStatusAsUnseen(groupId, messageId, req) {
    return new Promise(async (resolve, reject) => {
        try {
            const groups = await Group.findAll({ where: { id: groupId } });
            const group = groups[0];
            const membersOfGroup = await group.getUsers();
            membersOfGroup.forEach(async (member) => {
                let seen = false;
                if (member.id === req.user.id)
                    seen = true;

                const user_messages = await UserMessages.create({
                    userId: member.id,
                    messageId: messageId,
                    groupId: groupId,
                    seen: seen
                });
            })
            resolve(membersOfGroup);
        } catch (err) {
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
    } catch (err) {
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
        let result = await Chat.findAll({ where: { groupId: groupId } });
        return res.status(200).json({ success: true, message: 'Retrieved all messages succesfully!', messages: result });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ success: false, message: 'Something went wrong!' });
    }
}

const getNewMessages = async (req, res) => {
    try {
        const newMessages = await UserMessages.findAll({ where: { groupId: req.query.groupId, userId: req.user.id, seen: false } });
        return res.status(200).json({ success: true, message: 'Retrieved new messages successfully!', newMessages: newMessages });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ success: false, message: 'Something went wrong!' });
    }
}

const getOlderMessages = async (req, res, next) => {
    try {
        const groupId = Number(req.query.groupId);
        const result = await ArchivedChats.findAll({ where: { groupId: groupId } });
        return res.status(200).json({ success: true, message: 'Retrieved all messages succesfully!', messages: result });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ success: false, message: 'Something went wrong!' });
    }
}

const createGroup = async (req, res, next) => {
    try {
        let newGroup = JSON.parse(req.body.newGroup);
        let members = newGroup.members;
        const file = req.file;
        let fileUrl;

        if(file) {
            const fileContent = fs.readFileSync(file.path);
            const s3Response = await s3Services.uploadToS3(fileContent, file.originalname);
            fileUrl = s3Response.Location
        }
        else
            fileUrl=null;

        let isUnique=false;
        let groupCode=null;
        while(!isUnique) {
            groupCode = shortid.generate();
            const group = await Group.findOne({ where: { groupCode } });
            if(!group)
                isUnique=true;
        }

        newGroup = {
            name: newGroup.name,
            description: newGroup.description,
            groupCode: groupCode,
            groupPhoto: fileUrl
        };

        const group = await Group.create(newGroup);

        await Admin.create({
            groupId: group.id,
            adminId: req.user.id
        });

        members.forEach(async (userId) => {
            try {
                const user = await User.findOne({ where: { id: userId } });
                await group.addUser(user);
            } catch (err) {
                console.log(err);
            }
        })

        return res.status(200).json({ success: true, group: group });

    } catch (err) {
        console.log(err);
        return res.status(500).json({ success: false, message: 'Something went wrong!' });
    }
}

const getGroups = async (req, res, next) => {
    try {
        const groups = await req.user.getGroups();
        return res.status(200).json({ success: true, groups: groups });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: 'Something went wrong!', success: false });
    }
}

const getParticipants = async (req, res, next) => {
    try {
        const groupId = req.query.groupId;
        const group = await Group.findOne({ where: { id: groupId } });
        const participants = await group.getUsers({ attributes: ['id', 'name', 'email', 'phoneNo'] });

        return res.status(200).json({ success: true, participants: participants });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ success: false, message: "Something went wrong!" });
    }
}

const getGroupAdmins = async (req, res, next) => {
    try {
        const groupId = req.query.groupId;
        const result = await Admin.findAll({ where: { groupId: groupId } });

        return res.status(200).json({ success: true, admins: result });
    } catch (err) {
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
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Something went wrong!' });
    }
}

const removeGroupAdmin = async (req, res, next) => {
    try {
        const userId = req.params.participantId;
        const groupId = req.params.groupId;

        await Admin.destroy({ where: { groupId: groupId, adminId: userId } });

        return res.status(200).json({ success: true, message: 'Removed as an admin successfully' });
    } catch (err) {
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
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Something went wrong!' });
    }
}

const postFile = async (req, res) => {
    try {
        const user = req.user;
        const groupId = req.body.groupId;
        const file = req.file;

        const fileContent = fs.readFileSync(file.path);

        const s3Response = await s3Services.uploadToS3(fileContent, file.originalname);

        const msg = {
            fileName: file.originalname,
            fileUrl: s3Response.Location,
            type: file.mimetype
        };

        const messageResponse = await Chat.create({
            message: JSON.stringify(msg),
            userId: user.id,
            userName: user.name,
            groupId: groupId,
            messageType: 'file'
        });

        await setMessageStatusAsUnseen(groupId, messageResponse.id, req);

        return res.status(200).json({ success: true, message: 'File uploaded successfully!', fileObj: messageResponse });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ success: false, message: 'Something went wrong!' });
    }
}

const getNonMembersList = async (req, res) => {
    try {
        const groupId = +req.params.groupId;
        const group = await Group.findOne({ where: { id: groupId } });
        let participants = await group.getUsers({ attributes: ['id'] });
        participants = participants.map(participant => participant.id);
        const nonParticipants = await User.findAll({ where: { id: { [Op.notIn]: participants } }, attributes: ['id', 'name', 'email', 'phoneNo'] });
        return res.status(200).json({ success: true, users: nonParticipants });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ success: false, message: "Something went wrong!" });
    }
}

const addMoreMembersToGroup = async (req, res) => {
    try {
        const groupId = +req.params.groupId;
        const members = req.body.members;
        const group = await Group.findOne({ where: { id: groupId } });
        if(!group)
                return res.status(400).json({ success: false, message: 'Bad request! Group Not found.' });
        members.forEach(async (userId) => {
            const user = await User.findOne({ where: { id: userId } });
            if(!user)
                return res.status(400).json({ success: false, message: 'Bad request! User Not found.' });
            await group.addUser(user);
        })

        return res.status(200).json({ success: true, group: group });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ success: false, message: 'Something went wrong!' });
    }
}

const leaveGroup = async (req, res) => {
    try {
        const groupId = +req.params.groupId;
        const group = await Group.findOne({ where: { id: groupId } });
        await group.removeUser(req.user.id);
        return res.status(200).json({ success: true });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ success: false, message: 'Something went wrong!' });
    }
}

const getNewGroups = async (req, res) => {
    try {
        let userGroups = await req.user.getGroups({ attributes: ['id'] });
        userGroups = userGroups.map(group => group.id);
        const newGroups = await Group.findAll({ where: { id: { [Op.notIn]: userGroups } } });
        return res.status(200).json({ success: true, newGroups: newGroups });
    } catch(err) {
        console.log(err);
        return res.status(500).json({ success: false, message: 'Something went wrong!' });
    }
}

const generateAccessToken = function (user) {
    const token = jwt.sign(user, process.env.PRIVATE_KEY);
    return token;
}

module.exports = {
    registerUser,
    loginUser,
    verify,
    postMessage,
    postFile,
    getMessages,
    getNewMessages,
    getOlderMessages,
    markMessagesAsSeen,
    createGroup,
    getAllOtherUsers,
    getGroups,
    getParticipants,
    getGroupAdmins,
    addGroupAdmin,
    removeGroupAdmin,
    removeUserFromGroup,
    getNonMembersList,
    addMoreMembersToGroup,
    leaveGroup,
    getNewGroups
};