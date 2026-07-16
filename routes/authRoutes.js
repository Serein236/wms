const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireAdmin } = require('../middleware/auth');
const { generateToken } = require('../middleware/csrf');
const { loginLimiter } = require('../middleware/rateLimiter');

/**
 * @swagger
 * tags:
 *   name: 认证
 *   description: 用户认证相关操作
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: 用户登录
 *     description: 验证用户凭据并创建会话
 *     tags: [认证]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username:
 *                 type: string
 *                 description: 用户名
 *               password:
 *                 type: string
 *                 description: 密码
 *     responses:
 *       200:
 *         description: 登录结果（success=true时返回role，success=false时返回message）
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 role:
 *                   type: string
 *                   enum: [admin, user]
 *                 message:
 *                   type: string
 */
router.post('/login', loginLimiter, authController.login);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: 用户登出
 *     description: 销毁用户会话
 *     tags: [认证]
 *     responses:
 *       200:
 *         description: 登出成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 */
router.post('/logout', authController.logout);

/**
 * @swagger
 * /auth/csrf-token:
 *   get:
 *     summary: 获取CSRF令牌
 *     description: 获取用于CSRF保护的令牌
 *     tags: [认证]
 *     responses:
 *       200:
 *         description: 返回CSRF令牌
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 csrfToken:
 *                   type: string
 */
router.get('/csrf-token', (req, res) => {
    const token = generateToken(req);
    res.json({ csrfToken: token });
});

/**
 * @swagger
 * /auth/current-user:
 *   get:
 *     summary: 获取当前登录用户
 *     description: 返回当前用户的登录状态和用户名
 *     tags: [认证]
 *     responses:
 *       200:
 *         description: 成功返回用户信息
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isLoggedIn:
 *                   type: boolean
 *                 username:
 *                   type: string
 *                 role:
 *                   type: string
 */
router.get('/current-user', authController.getCurrentUser);

/**
 * @swagger
 * tags:
 *   name: 用户管理
 *   description: 需要管理员权限的用户管理操作
 */

/**
 * @swagger
 * /auth/users:
 *   get:
 *     summary: 获取用户列表
 *     description: 获取系统中所有用户的信息列表（需要管理员权限）
 *     tags: [用户管理]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: 用户列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *       403:
 *         description: 权限不足
 */
router.get('/users', requireAdmin, authController.getUserList);

/**
 * @swagger
 * /auth/users:
 *   post:
 *     summary: 创建用户
 *     description: 创建新用户（需要管理员权限）
 *     tags: [用户管理]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username:
 *                 type: string
 *                 description: 用户名
 *               password:
 *                 type: string
 *                 description: 密码（至少6位）
 *               role:
 *                 type: string
 *                 enum: [admin, user]
 *                 default: user
 *     responses:
 *       200:
 *         description: 创建成功
 *       400:
 *         description: 参数错误或用户名已存在
 *       403:
 *         description: 权限不足
 */
router.post('/users', requireAdmin, authController.createUser);

/**
 * @swagger
 * /auth/users/{id}:
 *   put:
 *     summary: 更新用户
 *     description: 更新指定用户的信息（需要管理员权限）
 *     tags: [用户管理]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 用户ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [admin, user]
 *               password:
 *                 type: string
 *                 description: 新密码（至少6位）
 *     responses:
 *       200:
 *         description: 更新成功
 *       400:
 *         description: 参数错误或不能修改自己的角色
 *       403:
 *         description: 权限不足
 *       404:
 *         description: 用户不存在
 */
router.put('/users/:id', requireAdmin, authController.updateUser);

/**
 * @swagger
 * /auth/users/{id}:
 *   delete:
 *     summary: 删除用户
 *     description: 删除指定用户（需要管理员权限）
 *     tags: [用户管理]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 用户ID
 *     responses:
 *       200:
 *         description: 删除成功
 *       400:
 *         description: 不能删除自己或最后一个管理员
 *       403:
 *         description: 权限不足
 *       404:
 *         description: 用户不存在
 */
router.delete('/users/:id', requireAdmin, authController.deleteUser);

/**
 * @swagger
 * /auth/users/{id}/toggle:
 *   post:
 *     summary: 切换用户状态
 *     description: 切换用户启用/禁用状态（需要管理员权限）
 *     tags: [用户管理]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 用户ID
 *     responses:
 *       200:
 *         description: 状态切换成功
 *       400:
 *         description: 不能禁用自己或最后一个管理员
 *       403:
 *         description: 权限不足
 *       404:
 *         description: 用户不存在
 */
router.post('/users/:id/toggle', requireAdmin, authController.toggleUserStatus);

/**
 * @swagger
 * /auth/check-admin:
 *   get:
 *     summary: 检查管理员权限
 *     description: 检查当前用户是否为管理员
 *     tags: [认证]
 *     responses:
 *       200:
 *         description: 成功返回是否管理员
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isAdmin:
 *                   type: boolean
 */
router.get('/check-admin', authController.checkAdmin);

/**
 * @swagger
 * /auth/check-default-admin:
 *   get:
 *     summary: 检查默认密码
 *     description: 检查admin用户是否仍在使用默认密码
 *     tags: [认证]
 *     responses:
 *       200:
 *         description: 返回检查结果
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isDefault:
 *                   type: boolean
 */
router.get('/check-default-admin', authController.checkDefaultAdmin);

module.exports = router;