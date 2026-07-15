const session = require('express-session');
const crypto = require('crypto');

const sessionConfig = {
    secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 24 * 60 * 60 * 1000 // 24小时
    }
};

module.exports = sessionConfig;