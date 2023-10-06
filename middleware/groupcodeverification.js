const Group = require('../models/group');

module.exports.verify = async (req, res, next) => {
    try {
        const groupCode = req.body.enteredCode;
        const groupId = +req.params.groupId;
        console.log('GROUP ID ', req.params.groupId);
        const group = await Group.findOne({ where: { id: groupId, groupCode: groupCode } });
        if(!group)
            return res.status(404).json({ success: false, message: 'Wrong group code!' });
        next();
    } catch(err) {
        return res.status(401).json({ message: "Unauthorized", success: false });
    }
};