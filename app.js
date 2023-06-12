global.__basedir = __dirname;

const bodyParser = require('body-parser');
const userRoutes = require('./routes/user');
const sequelize = require('./util/database');
const express = require('express');
const path = require('path');
const cors = require('cors');
const User = require('./models/user');
const Group = require('./models/group');
const Message = require('./models/chat');
require('dotenv').config();

const app = express();

app.use(bodyParser.json({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors({
    origin: 'http://127.0.0.1:5500',
    credentials: true
}));

app.use('/user', userRoutes);

User.hasMany(Message);
Message.belongsTo(User);

User.belongsToMany(Group, { through: 'user_group' });
Group.belongsToMany(User, { through: 'user_group' });

Group.hasMany(Message);
Message.belongsTo(Group);

sequelize
    .sync()
    // .sync({alter:true})
    .then(result => {
        console.log(__dirname);
        const port = process.env.PORT || 3000;
        app.listen(port);
    })
    .catch(err => console.log(err));