const { doubleCsrf } = require('csrf-csrf');

// 安全要求：生产环境必须显式配置 CSRF_SECRET，缺失时拒绝启动
if (process.env.NODE_ENV === 'production' && !process.env.CSRF_SECRET) {
    throw new Error('[安全] 生产环境必须设置 CSRF_SECRET 环境变量后再启动（middleware/csrf.js）');
}

const csrfProtection = doubleCsrf({
    getSecret: () => process.env.CSRF_SECRET || 'wms-local-dev-only-csrf-secret-do-not-use-in-prod',
    // csrf-csrf 4.x 必需：返回会话唯一标识，用于生成与会话绑定的令牌
    getSessionIdentifier: (req) => (req.session ? req.session.id : ''),
    cookieName: 'csrf-token',
    size: 64,
    ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
    ignoredPaths: ['/api/auth/login', '/api/auth/logout', '/api/auth/current-user', '/api/auth/check-admin', '/api/auth/check-default-admin']
});

module.exports = {
    doubleCsrf: csrfProtection.doubleCsrfProtection,
    generateToken: csrfProtection.generateCsrfToken
};
