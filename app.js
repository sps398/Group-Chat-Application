global.__basedir = __dirname;

const bodyParser = require('body-parser');
const userRoutes = require('./routes/user');
const sequelize = require('./util/database');
const express = require('express');
const path = require('path');
const cors = require('cors');
const User = require('./models/user');
require('dotenv').config();

const app = express();

app.use(bodyParser.json({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors({
    origin: 'http://127.0.0.1:5500',
    // credentials: true
}));

app.use('/user', userRoutes);

sequelize
    .sync()
    // .sync({alter:true})
    .then(result => {
        const port = process.env.PORT || 3000;
        app.listen(port);
    })
    .catch(err => console.log(err));