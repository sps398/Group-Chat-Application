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
const ArchivedMessages = require('./models/archived_chats');
const fs = require('fs');
require('dotenv').config();

const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const { Sequelize } = require('sequelize');

app.use(bodyParser.json({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());

app.use('/user', userRoutes);

app.get('/', (req, res) => {
    res.redirect('/dashboard/chat.html');
})

app.use((req, res, next) => {
    const filePath = path.join(__dirname, `public/${req.url}`);
    if(!fs.existsSync(filePath))
        next();
    else
        res.status(200).sendFile(filePath);
});

app.use((req, res) => {
    const filePath = path.join(__dirname, 'public', 'error', 'errorpage.html');
    
    if (fs.existsSync(filePath)) {
        res.status(404).sendFile(filePath, (err) => {
            if (err) {
                console.error('Error sending file:', err);
                res.status(500).send('Error sending file');
            }
        });
    } else {
        res.status(404).send('Page not found');
    }
});

User.hasMany(Message);
Message.belongsTo(User);

User.belongsToMany(Group, { through: 'user_group' });
Group.belongsToMany(User, { through: 'user_group' });

Group.hasMany(Message);
Message.belongsTo(Group);

User.hasMany(ArchivedMessages);
ArchivedMessages.belongsTo(User);

Group.hasMany(ArchivedMessages);
ArchivedMessages.belongsTo(Group);

sequelize
    .sync()
    // .sync({alter:true})
    // .sync({force:true})
    .then(result => {
        const port = process.env.PORT || 3000;
        server.listen(port);
    })
    .catch(err => console.log(err));

// socket.io
    
const io = new Server(server);
    
let socketUsersMap = new Map();

io.on('connection', (socket) => {

    socket.on('new connection', (user) => {
        socketUsersMap.set(user.userId, socket.id);
        io.emit('new connection', user);
    }); 

    socket.on('new message', (from, message, groupId) => {
        try {
            socket.to(groupId).emit('receive message', from, message, groupId);
        } catch(err) {
            console.log('ERROR ', err);
        }
    })
  
    socket.on('disconnect', () => {
        const userName = socketUsersMap.get(socket.id);
        socketUsersMap.delete(socket.id);
        io.emit('disconnected',  `${userName} disconnected`);
    });

    socket.on('join-room', (room, cb) => {
        socket.join(room);
        cb(room);
    })

    socket.on('new group', (newGroup) => {
        const members = newGroup.members;
        members.forEach(member => {
            socket.to(socketUsersMap.get(Number(member))).emit('new group', { id:newGroup.id , name:newGroup.name });
        })
    })

    socket.on('removed from group', (userId, groupId, groupName) => {
        userId = Number(userId);
        if(socketUsersMap.has(Number(userId)))
            socket.to(socketUsersMap.get(userId)).emit('removed from group', groupId, groupName);
    })
});

// var CronJob = require('cron').CronJob;
// var job = new CronJob(
//     '50 18 1 * * *',
//     async function() {
//         console.log('You will see this message when cron runs');
//         const yesterday = new Date();
//         yesterday.setDate(yesterday.getDate() - 1);
//         const chats = await Message.findAll({ where: { createdAt: { [Sequelize.Op.lt]: yesterday } } });
//         chats.forEach(async chat => {
//             const { id, ...chatData } = chat.toJSON();
//             await ArchivedMessages.create(chatData);
//             await Message.destroy({ where: { id } });
//         })
//     },
//     null,
//     true
// );