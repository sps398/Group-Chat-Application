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

module.exports = router;