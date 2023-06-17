const userController = require('../controllers/user');
const userAuthentication = require('../middleware/userauthentication');
const path = require('path');
const express = require('express');
const router = express.Router();

router.use(express.static(path.join(__basedir, 'public')));

router.post('/signup', userController.registerUser);

router.post('/login', userController.loginUser);

router.post('/sendmessage', userAuthentication.authenticate, userController.postMessage);

router.get('/messages', userAuthentication.authenticate, userController.getMessages);

router.get('/olderMessages', userAuthentication.authenticate, userController.getOlderMessages);

router.post('/createGroup', userAuthentication.authenticate, userController.createGroup);

router.get('/getAllUsers', userAuthentication.authenticate, userController.getAllUsers);

router.get('/groups', userAuthentication.authenticate, userController.getGroups);

router.get('/groups/participants', userAuthentication.authenticate, userController.getParticipants);

router.get('/groups/admins', userAuthentication.authenticate, userController.getGroupAdmins);

router.post('/groups/:groupId/admins/add', userAuthentication.authenticate, userController.addGroupAdmin);

router.delete('/groups/:groupId/admins/remove/:participantId', userAuthentication.authenticate, userController.removeGroupAdmin);

router.delete('/groups/:groupId/users/remove/:participantId', userAuthentication.authenticate, userController.removeUserFromGroup);

module.exports = router;