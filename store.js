const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');

const config = require('./config/config');
const settingsController = require('./controllers/settingsController');
const { requireLogin, checkLoggedIn } = require('./middleware/auth');
const { doubleCsrf } = require('./middleware/csrf');
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const logRoutes = require('./routes/logRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const importRoutes = require('./routes/importRoutes');
const batchRoutes = require('./routes/batchRoutes');
const stocktakingRoutes = require('./routes/stocktakingRoutes');
const logger = require('./utils/logger');

const app = express();
const port = config.port;

// 信任反向代理（nginx等），使 express-rate-limit 正确识别客户端IP
app.set('trust proxy', 1);

// CORS
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
}));

// Swagger（生产环境收紧为仅管理员可见，避免公开暴露全部接口结构）
if (process.env.NODE_ENV === 'production') {
    const { requireAdmin } = require('./middleware/auth');
    app.use('/api-docs', requireAdmin);
}

// Swagger
app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
});
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: '仓库管理系统 API 文档'
}));

// Body parser FIRST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Session BEFORE static (critical!)
app.use(session(config.session));
app.use(cookieParser());

// CSRF 保护（默认启用，覆盖所有 /api 写请求；登录/登出等在 middleware/csrf.js 豁免列表中）
// 本地跑 tests/ 下 API 回归脚本时可在 config/config.js 设 csrfDisabled=true 临时关闭
if (!config.csrfDisabled) {
    app.use('/api', (req, res, next) => {
        doubleCsrf(req, res, next);
    });
}

// Login status check
app.use(checkLoggedIn);

// Protected pages — old HTML pages now served by Vue SPA in dist/
// (kept for backward compatibility during transition)
// app.use(express.static('public'));

// Vue SPA — serve built dist/ directory
app.use(express.static(path.join(__dirname, 'dist')));

// Root route → SPA index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// 公开站点信息（页脚公司名/备案号，登录页也可访问，无需认证）
app.get('/api/settings/public', settingsController.getPublicSettings);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api', inventoryRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/customers', require('./routes/customerRoutes'));
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/import', importRoutes);
app.use('/api/batch', batchRoutes);
app.use('/api/stocktaking', stocktakingRoutes);

// SPA History Fallback — any non-API GET request serves index.html
// (Vue Router handles all client-side routing)
app.get(/^\/(?!api|api-docs).*/, (req, res, next) => {
    // Skip requests for static files (assets, css, js, etc.)
    if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map)$/)) {
        return next();
    }
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
    // CSRF 校验失败：csrf-csrf 抛出的是带 status=403 / code=EBADCSRFTOKEN 的 ForbiddenError。
    // 必须原样透传 403，否则会被下面的兜底吞成 500，前端 src/api/http.js 里
    // 「403 时刷新 token 重试一次」的兜底会彻底失效。
    if (err && (err.code === 'EBADCSRFTOKEN' || err.status === 403 || err.statusCode === 403)) {
        return res.status(403).json({ success: false, message: 'CSRF 校验失败，请刷新页面后重试' });
    }
    console.error('Unhandled error:', err);
    res.status(500).json({ success: false, message: '服务器内部错误' });
});

app.listen(port, () => {
    console.log(`仓库管理系统运行在 http://localhost:${port}`);
    console.log(`API 文档地址: http://localhost:${port}/api-docs`);
    logger.info('仓库管理系统启动', { port, timestamp: new Date().toISOString() });
});
