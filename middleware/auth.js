const UserModel = require('../models/UserModel');

function isInactiveUser(user) {
    return !user || user.is_active === false || user.is_active === 0;
}

async function requireLogin(req, res, next) {
    try {
        if (!req.session.userId) {
            // 注意：必须用 originalUrl —— 在 router.use 挂载的中间件里 req.path 是相对路径，
            // 永远不会以 /api/ 开头，导致 API 请求被 302 到 /login.html（SPA 已无该页面）
            if (
                req.originalUrl.startsWith('/api/') ||
                req.xhr ||
                (req.headers.accept || '').includes('application/json')
            ) {
                return res.status(401).json({ success: false, message: '请先登录' });
            }
            return res.redirect('/login');
        }

        const user = await UserModel.findById(req.session.userId);
        if (isInactiveUser(user)) {
            req.session.destroy(() => {});
            return res.status(401).json({ success: false, message: '账号不可用，请重新登录' });
        }
        next();
    } catch (error) {
        console.error('登录校验失败:', error);
        return res.status(500).json({ success: false, message: '登录校验失败' });
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

        const user = await UserModel.findById(req.session.userId);
        if (isInactiveUser(user)) {
            req.session.destroy(() => {});
            return res.status(401).json({ success: false, message: '账号不可用，请重新登录' });
        }
        if (user.role !== 'admin') {
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
