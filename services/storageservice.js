const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        if (!fs.existsSync('/files'))
            fs.mkdirSync('/files');
      cb(null, '/files');
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + '.' + file.mimetype.split('/')[1])
    }
})

const upload = multer({ storage: storage });

module.exports = {
    upload
}