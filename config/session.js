const session = require('express-session');

const sessionConfig = {
    secret: process.env.SESSION_SECRET || 'warehouse-system-session-secret-2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24小时
    }
};

module.exports = sessionConfig;
