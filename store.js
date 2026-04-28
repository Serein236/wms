const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');

const sessionConfig = require('./config/session');
const { requireLogin, checkLoggedIn } = require('./middleware/auth');
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const logRoutes = require('./routes/logRoutes');
const logger = require('./utils/logger');

const app = express();
const port = 3000;

// CORS 支持（允许 Apifox 等工具跨域访问）
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Swagger API 文档 - 提供 JSON 端点供 Apifox 导入
app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
});

// Swagger UI 界面
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: '仓库管理系统 API 文档'
}));

// 中间件配置
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));
app.use(session(sessionConfig));
app.use(checkLoggedIn); // 全局登录状态检查

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api', inventoryRoutes);
app.use('/api/logs', logRoutes);

// 保护所有需要登录的页面
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
    '/settings.html'
];

protectedPages.forEach(page => {
    app.get(page, requireLogin, (req, res) => {
        res.sendFile(path.join(__dirname, 'public', page));
    });
});

// 重定向根路径
app.get('/', (req, res) => {
    if (req.isLoggedIn) {
        res.redirect('/index.html');
    } else {
        res.redirect('/login.html');
    }
});

// 启动服务器
app.listen(port, () => {
    console.log(`仓库管理系统运行在 http://localhost:${port}`);
    console.log(`API 文档地址: http://localhost:${port}/api-docs`);
    logger.info('仓库管理系统启动', { port, timestamp: new Date().toISOString() });
});