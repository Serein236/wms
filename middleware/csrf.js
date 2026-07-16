const { doubleCsrf } = require('csrf-csrf');

const csrfProtection = doubleCsrf({
    getSecret: () => process.env.CSRF_SECRET || 'warehouse-csrf-secret-change-in-production',
    cookieName: 'csrf-token',
    size: 64,
    ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
    ignoredPaths: ['/api/auth/login', '/api/auth/logout', '/api/auth/current-user', '/api/auth/check-admin', '/api/auth/check-default-admin']
});

module.exports = {
    doubleCsrf: csrfProtection.doubleCsrfProtection,
    generateToken: csrfProtection.generateCsrfToken
};
