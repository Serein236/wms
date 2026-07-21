const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');

const sessionConfig = require('./config/session');
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
const port = process.env.PORT || 3000;

// 信任反向代理（nginx等），使 express-rate-limit 正确识别客户端IP
app.set('trust proxy', 1);

// CORS
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

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
app.use(session(sessionConfig));
app.use(cookieParser());

// CSRF disabled - frontend doesn't use CSRF tokens
// app.use((req, res, next) => {
//     if (req.path.startsWith('/api/')) return next();
//     doubleCsrf(req, res, next);
// });

// Login status check
app.use(checkLoggedIn);

// Protected pages BEFORE static file serving
const protectedPages = [
    '/index.html',
    '/products.html',
    '/product_list.html',
    '/in.html',
    '/out.html',
    '/in_records.html',
    '/out_records.html',
    '/stock.html',
    '/query.html',
    '/settings.html',
    '/suppliers.html',
    '/supplier_add.html',
    '/dashboard.html',
    '/import.html',
    '/batch.html',
    '/batch_in.html',
    '/batch_out.html',
    '/stocktaking.html',
    '/customers.html',
    '/customer_list.html'
];

protectedPages.forEach(page => {
    app.get(page, requireLogin, (req, res) => {
        res.sendFile(path.join(__dirname, 'public', page));
    });
});

// Root redirect
app.get('/', (req, res) => {
    if (req.isLoggedIn) {
        res.redirect('/index.html');
    } else {
        res.redirect('/login.html');
    }
});

// Static files AFTER protected routes
app.use(express.static('public'));

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

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ success: false, message: '服务器内部错误' });
});

app.listen(port, () => {
    console.log(`仓库管理系统运行在 http://localhost:${port}`);
    console.log(`API 文档地址: http://localhost:${port}/api-docs`);
    logger.info('仓库管理系统启动', { port, timestamp: new Date().toISOString() });
});
