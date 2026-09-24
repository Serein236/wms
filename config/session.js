const session = require('express-session');

const isProduction = process.env.NODE_ENV === 'production';

// 安全要求：生产环境必须显式配置 SESSION_SECRET，缺失时拒绝启动。
// 旧的硬编码兜底值已随仓库泄露，不得再用于任何环境。
if (isProduction && !process.env.SESSION_SECRET) {
    throw new Error('[安全] 生产环境必须设置 SESSION_SECRET 环境变量后再启动（config/session.js）');
}

const sessionConfig = {
    // 本地开发专用兜底值（已轮换，非历史泄露值）；生产必须走环境变量
    secret: process.env.SESSION_SECRET || 'wms-local-dev-only-secret-do-not-use-in-prod',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.COOKIE_SECURE === 'true', // HTTPS 部署时设置 COOKIE_SECURE=true
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24小时
    }
};

module.exports = sessionConfig;
