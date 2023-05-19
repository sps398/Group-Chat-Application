const userController = require('../controllers/user');
const path = require('path');
const express = require('express');
const router = express.Router();

router.use(express.static(path.join(__basedir, 'public')));

router.post('/signup', userController.registerUser);

module.exports = router;