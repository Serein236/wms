const UserModel = require('../models/UserModel');

async function requireLogin(req, res, next) {
    if (req.session.userId) {
        try {
            // 每次请求校验用户仍有效且未被禁用：
            // 防止被禁用用户在 session 有效期（24h）内继续调用业务接口
            const user = await UserModel.findById(req.session.userId);
            if (!user || !user.is_active) {
                req.session.destroy(() => {});
                return res.status(401).json({ success: false, message: '账号已被禁用或不存在，请重新登录' });
            }
            return next();
        } catch (error) {
            console.error('登录状态校验失败:', error);
            return res.status(500).json({ success: false, message: '登录状态校验失败' });
        }
    } else if (
        // 注意：必须用 originalUrl —— 在 router.use 挂载的中间件里 req.path 是相对路径，
        // 永远不会以 /api/ 开头，导致 API 请求被 302 到 /login.html（SPA 已无该页面）
        req.originalUrl.startsWith('/api/') ||
        req.xhr ||
        (req.headers.accept || '').includes('application/json')
    ) {
        res.status(401).json({ success: false, message: '请先登录' });
    } else {
        res.redirect('/login');
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
        if (!user || !user.is_active) {
            req.session.destroy(() => {});
            return res.status(401).json({ success: false, message: '账号已被禁用或不存在，请重新登录' });
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