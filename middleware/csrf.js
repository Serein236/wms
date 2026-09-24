const { doubleCsrf } = require('csrf-csrf');

// 安全要求：生产环境必须显式配置 CSRF_SECRET，缺失时拒绝启动
if (process.env.NODE_ENV === 'production' && !process.env.CSRF_SECRET) {
    throw new Error('[安全] 生产环境必须设置 CSRF_SECRET 环境变量后再启动（middleware/csrf.js）');
}

/**
 * CSRF 豁免路径。
 *
 * 为什么需要：登录/登出/会话查询在「建立或销毁会话」的前后调用，此时客户端还没有
 * 稳定的会话标识，无法携带与会话绑定的有效令牌；若一并校验，登录接口必然失败。
 *
 * ⚠️ 两个坑（曾导致生产环境登录全部 500，勿改回去）：
 * 1. csrf-csrf 4.x **没有** `ignoredPaths` 选项（只有 `skipCsrfProtection`）。
 *    写成 ignoredPaths 不会报错，但会被静默忽略，等于没有豁免。
 * 2. 本中间件挂载在 `app.use('/api', ...)` 之下，进入回调时 `req.path` 已被剥掉
 *    挂载前缀（是 `/auth/login` 而不是 `/api/auth/login`），因此统一用
 *    `req.originalUrl` 匹配完整路径。
 */
const CSRF_EXEMPT_PATHS = new Set([
    '/api/auth/login',
    '/api/auth/logout',
    '/api/auth/current-user',
    '/api/auth/csrf-token',
    '/api/auth/check-admin',
    '/api/auth/check-default-admin'
]);

const csrfProtection = doubleCsrf({
    getSecret: () => process.env.CSRF_SECRET || 'wms-local-dev-only-csrf-secret-do-not-use-in-prod',
    // csrf-csrf 4.x 必需：返回会话唯一标识，用于生成与会话绑定的令牌
    getSessionIdentifier: (req) => (req.session ? req.session.id : ''),
    cookieName: 'csrf-token',
    size: 64,
    ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
    skipCsrfProtection: (req) => CSRF_EXEMPT_PATHS.has(req.originalUrl.split('?')[0])
});

module.exports = {
    doubleCsrf: csrfProtection.doubleCsrfProtection,
    generateToken: csrfProtection.generateCsrfToken,
    CSRF_EXEMPT_PATHS
};
