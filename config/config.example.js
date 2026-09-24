// config/config.example.js — 配置模板
//
// 使用方法：复制本文件为 config/config.js（已 gitignore，不会提交），按需修改。
// 所有配置集中在这一个文件；部署生产环境时必须更换三个密钥/密码字段。
// 也可用同名环境变量覆盖（PORT / DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_NAME /
// SESSION_SECRET / COOKIE_SECURE / CSRF_SECRET / CSRF_DISABLED）。

const isProduction = process.env.NODE_ENV === 'production';

const DEV_SESSION_SECRET = 'wms-local-dev-only-secret-do-not-use-in-prod';
const DEV_CSRF_SECRET = 'wms-local-dev-only-csrf-secret-do-not-use-in-prod';

const config = {
    // 服务端口
    port: parseInt(process.env.PORT) || 3000,

    // 数据库（MySQL 8.0+）
    database: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'your-password',
        database: process.env.DB_NAME || 'warehouse',
        charset: 'utf8mb4',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    },

    // 会话密钥（生产环境必须更换）
    sessionSecret: process.env.SESSION_SECRET || DEV_SESSION_SECRET,
    // HTTPS 部署时设为 true
    cookieSecure: process.env.COOKIE_SECURE === 'true',

    // CSRF 密钥（生产环境必须更换）
    csrfSecret: process.env.CSRF_SECRET || DEV_CSRF_SECRET,
    // 跑 tests/ 下 API 回归脚本时可临时设为 true
    csrfDisabled: process.env.CSRF_DISABLED === 'true'
};

// 生产环境安全检查：不得使用开发默认密钥
if (isProduction) {
    if (config.sessionSecret === DEV_SESSION_SECRET) {
        throw new Error('[安全] 生产环境必须更换 sessionSecret（config/config.js 或环境变量 SESSION_SECRET）');
    }
    if (config.csrfSecret === DEV_CSRF_SECRET) {
        throw new Error('[安全] 生产环境必须更换 csrfSecret（config/config.js 或环境变量 CSRF_SECRET）');
    }
    if (!config.database.password || config.database.password === 'root') {
        throw new Error('[安全] 生产环境必须配置数据库密码（config/config.js 或环境变量 DB_PASSWORD）');
    }
}

// express-session 完整配置（store.js 与测试直接复用）
config.session = {
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: config.cookieSecure,
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 小时
    }
};

module.exports = config;
