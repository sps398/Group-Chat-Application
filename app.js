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
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");

app.use(bodyParser.json({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());

app.use('/user', userRoutes);

app.get('/', (req, res) => {
    res.redirect('/dashboard/chat.html');
})

app.use((req, res) => {
    console.log(req.url);
    res.sendFile(path.join(__dirname, `public/${req.url}`));
});

User.hasMany(Message);
Message.belongsTo(User);

User.belongsToMany(Group, { through: 'user_group' });
Group.belongsToMany(User, { through: 'user_group' });

Group.hasMany(Message);
Message.belongsTo(Group);

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
    
io.on('connection', (socket) => {
    console.log(socket.id, ' user connected');
  
    io.emit('new connection', socket.id);
  
    socket.on('disconnect', () => {
      io.emit('disconnected',  `${socket.id} disconnected`);
    });
  
    socket.on('new message', (msg) => {
        socket.broadcast.emit('new message', socket.id, msg);
    });
});