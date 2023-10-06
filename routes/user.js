const userController = require('../controllers/user');
const userAuthentication = require('../middleware/userauthentication');
const groupCodeVerification = require('../middleware/groupcodeverification');
const { upload } = require('../services/storageservice');
const path = require('path');
const express = require('express');
const router = express.Router();

router.use(express.static(path.join(__basedir, 'public')));

router.post('/signup', userController.registerUser);

router.post('/login', userController.loginUser);

router.get('/verify', userAuthentication.authenticate, userController.verify);

router.post('/sendmessage', userAuthentication.authenticate, userController.postMessage);

router.post('/sendFile', userAuthentication.authenticate, upload.single('file'), userController.postFile);

router.get('/messages', userAuthentication.authenticate, userController.getMessages);

router.post('/messages/markAsSeen', userAuthentication.authenticate, userController.markMessagesAsSeen);
    
router.get('/new-messages', userAuthentication.authenticate, userController.getNewMessages);

router.get('/olderMessages', userAuthentication.authenticate, userController.getOlderMessages);

router.post('/createGroup', userAuthentication.authenticate, upload.single('file'), userController.createGroup);

router.get('/getAllUsers', userAuthentication.authenticate, userController.getAllOtherUsers);   

router.get('/groups', userAuthentication.authenticate, userController.getGroups);

router.get('/groups/new', userAuthentication.authenticate, userController.getNewGroups);

router.get('/groups/participants', userAuthentication.authenticate, userController.getParticipants);

router.get('/groups/admins', userAuthentication.authenticate, userController.getGroupAdmins);

router.post('/groups/:groupId/admins/add', userAuthentication.authenticate, userController.addGroupAdmin);

router.delete('/groups/:groupId/admins/remove/:participantId', userAuthentication.authenticate, userController.removeGroupAdmin);

router.delete('/groups/:groupId/users/remove/:participantId', userAuthentication.authenticate, userController.removeUserFromGroup);

router.get('/groups/:groupId/non-participants', userAuthentication.authenticate, userController.getNonMembersList);

router.post('/groups/:groupId/add-members', userAuthentication.authenticate, userController.addMoreMembersToGroup);

router.delete('/groups/:groupId', userAuthentication.authenticate, userController.leaveGroup);

router.post('/groups/:groupId/join', userAuthentication.authenticate, groupCodeVerification.verify, userController.addMoreMembersToGroup);

module.exports = router;