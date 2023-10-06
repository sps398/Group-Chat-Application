const jwt = require('jsonwebtoken');
const User = require('../models/user');
require('dotenv').config();

module.exports.authenticate = async (req, res, next) => {
    try {
        const token = req.get('Authorization');
        const payload = jwt.verify(token, process.env.PRIVATE_KEY);
        const user = await User.findByPk(payload.userId);
        console.log("USER ", user);
        if(!user)
            return res.status(404).json({ message: "User Not found!", success: false });
        req.user = user;
        next();
    } catch(err) {
        return res.status(401).json({ message: "Unauthorized", success: false });
    }
};