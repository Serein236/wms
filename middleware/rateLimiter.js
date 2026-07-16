const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { success: false, message: '登录尝试次数过多，请15分钟后再试' },
    standardHeaders: true,
    legacyHeaders: false
});

module.exports = { loginLimiter };
