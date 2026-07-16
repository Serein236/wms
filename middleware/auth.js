const UserModel = require('../models/UserModel');

function requireLogin(req, res, next) {
    if (req.session.userId) {
        next();
    } else if (req.path.startsWith('/api/')) {
        res.status(401).json({ success: false, message: '请先登录' });
    } else {
        res.redirect('/login.html');
    }
}

function checkLoggedIn(req, res, next) {
    req.isLoggedIn = !!req.session.userId;
    next();
}

async function requireAdmin(req, res, next) {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ success: false, message: '未登录' });
        }

        const isAdmin = await UserModel.isAdmin(req.session.userId);
        if (!isAdmin) {
            return res.status(403).json({ success: false, message: '权限不足，需要管理员权限' });
        }

        next();
    } catch (error) {
        console.error('权限检查失败:', error);
        return res.status(500).json({ success: false, message: '权限检查失败' });
    }
}

module.exports = {
    requireLogin,
    checkLoggedIn,
    requireAdmin
};