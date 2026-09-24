/**
 * CSRF 中间件回归测试
 *
 * 背景：提交 8f563fd 启用 CSRF 后，生产环境「登录接口 + 所有写接口」全部返回 500。
 * 根因有两个，本测试把它们各自钉成一个用例：
 *   1. csrf-csrf 4.x 不支持 ignoredPaths（只有 skipCsrfProtection），
 *      写成 ignoredPaths 会被静默忽略 —— 登录接口因此也要 CSRF 令牌。
 *   2. express-session 在 saveUninitialized:false 下不为未修改的会话下发
 *      connect.sid，导致 /api/auth/csrf-token 拿到的令牌绑定在「下一次请求就变了」
 *      的会话 id 上，令牌永远校验不过。
 *
 * 另外覆盖：CSRF 失败必须返回 403 而不是被全局兜底吞成 500（否则前端
 * src/api/http.js 的「403 刷新 token 重试一次」兜底失效）。
 */
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const request = require('supertest');

// 数据层与鉴权链在这里不参与被测逻辑，全部打桩，保证用例只验证 CSRF 行为
jest.mock('../controllers/authController', () => ({
    login: (req, res) => res.json({ success: true, mockedLogin: true }),
    logout: (req, res) => res.json({ success: true, mockedLogout: true }),
    getCurrentUser: (req, res) => res.json({ loggedIn: false }),
    checkAdmin: (req, res) => res.json({ isAdmin: false }),
    checkDefaultAdmin: (req, res) => res.json({ isDefault: false }),
    // 用户管理接口：本用例不覆盖，仅需提供可注册的回调
    getUserList: (req, res) => res.json({ success: true, users: [] }),
    createUser: (req, res) => res.json({ success: true }),
    updateUser: (req, res) => res.json({ success: true }),
    deleteUser: (req, res) => res.json({ success: true }),
    toggleUserStatus: (req, res) => res.json({ success: true })
}));

jest.mock('../middleware/auth', () => ({
    requireLogin: (req, res, next) => next(),
    requireAdmin: (req, res, next) => next(),
    checkLoggedIn: (req, res, next) => next()
}));

jest.mock('../middleware/rateLimiter', () => ({
    loginLimiter: (req, res, next) => next()
}));

const sessionConfig = require('../config/config').session;
const { doubleCsrf } = require('../middleware/csrf');
const authRoutes = require('../routes/authRoutes');

/** 复刻 store.js 的中间件挂载顺序与错误处理，便于单独验证 CSRF 行为 */
function buildApp() {
    const app = express();
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());
    app.use(session(sessionConfig));
    app.use(cookieParser());

    // 与 store.js 一致：挂在 /api 之下
    app.use('/api', (req, res, next) => {
        doubleCsrf(req, res, next);
    });

    app.use('/api/auth', authRoutes);
    // 一个受 CSRF 保护的业务写接口桩
    app.post('/api/probe-write', (req, res) => res.json({ success: true, wrote: true }));

    app.use((err, req, res, next) => {
        if (err && (err.code === 'EBADCSRFTOKEN' || err.status === 403 || err.statusCode === 403)) {
            return res.status(403).json({ success: false, message: 'CSRF 校验失败，请刷新页面后重试' });
        }
        console.error('Unhandled error:', err);
        res.status(500).json({ success: false, message: '服务器内部错误' });
    });
    return app;
}

/** 从 Set-Cookie 头里抽出可直接回传的 Cookie 串 */
function cookieHeader(res) {
    const raw = res.headers['set-cookie'] || [];
    return raw.map((c) => c.split(';')[0]).join('; ');
}

describe('CSRF 中间件', () => {
    let app;
    beforeEach(() => {
        app = buildApp();
    });

    test('GET /api/auth/csrf-token 返回令牌，且下发会话 cookie', async () => {
        const res = await request(app).get('/api/auth/csrf-token');

        expect(res.status).toBe(200);
        expect(typeof res.body.csrfToken).toBe('string');
        expect(res.body.csrfToken.length).toBeGreaterThan(0);

        const setCookie = (res.headers['set-cookie'] || []).join(';');
        expect(setCookie).toContain('csrf-token=');
        // 关键：必须同时下发会话 cookie，否则令牌绑定的会话标识下次请求就变了
        expect(setCookie).toContain('connect.sid=');
    });

    test('登录接口免 CSRF：不带令牌也能到达 controller', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ username: 'admin', password: 'admin' });

        expect(res.status).toBe(200);
        expect(res.body.mockedLogin).toBe(true);
    });

    test('登出接口免 CSRF', async () => {
        const res = await request(app).post('/api/auth/logout').send({});
        expect(res.status).toBe(200);
        expect(res.body.mockedLogout).toBe(true);
    });

    test('业务写接口仍受保护：无令牌返回 403（不是 500）', async () => {
        const res = await request(app).post('/api/probe-write').send({});

        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/CSRF/);
    });

    test('业务写接口：令牌错误返回 403', async () => {
        const tokRes = await request(app).get('/api/auth/csrf-token');
        const res = await request(app)
            .post('/api/probe-write')
            .set('Cookie', cookieHeader(tokRes))
            .set('X-CSRF-Token', 'deadbeef')
            .send({});

        expect(res.status).toBe(403);
    });

    test('业务写接口：带正确令牌可通过（端到端，含会话稳定性）', async () => {
        const tokRes = await request(app).get('/api/auth/csrf-token');
        const cookies = cookieHeader(tokRes);

        const res = await request(app)
            .post('/api/probe-write')
            .set('Cookie', cookies)
            .set('X-CSRF-Token', tokRes.body.csrfToken)
            .send({});

        expect(res.status).toBe(200);
        expect(res.body.wrote).toBe(true);
    });

    test('会话标识不匹配时令牌失效（换一套会话 cookie 即拒绝）', async () => {
        const tokRes = await request(app).get('/api/auth/csrf-token');
        const otherSession = await request(app).get('/api/auth/csrf-token');

        const res = await request(app)
            .post('/api/probe-write')
            // 用 A 的令牌 + B 的会话 cookie
            .set('Cookie', cookieHeader(otherSession))
            .set('X-CSRF-Token', tokRes.body.csrfToken)
            .send({});

        expect(res.status).toBe(403);
    });

    test('GET 请求不受 CSRF 限制', async () => {
        const res = await request(app).get('/api/auth/current-user');
        expect(res.status).toBe(200);
    });
});
