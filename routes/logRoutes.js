const express = require('express');
const router = express.Router();
const logController = require('../controllers/logController');
const { requireLogin } = require('../middleware/auth');

// 所有日志路由都需要登录
router.use(requireLogin);

/**
 * @swagger
 * tags:
 *   name: 日志管理
 *   description: 系统日志查询
 */

/**
 * @swagger
 * /logs:
 *   get:
 *     summary: 获取日志列表
 *     description: 获取日志列表，支持多种筛选条件和分页
 *     tags: [日志管理]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *         description: 日期筛选（today/yesterday/week/month/all/YYYY-MM-DD）
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *         description: 级别筛选（all/INFO/WARN/ERROR）
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: 操作类型筛选
 *       - in: query
 *         name: operator
 *         schema:
 *           type: string
 *         description: 操作人用户名筛选
 *       - in: query
 *         name: operatorId
 *         schema:
 *           type: string
 *         description: 操作人ID筛选
 *       - in: query
 *         name: target
 *         schema:
 *           type: string
 *         description: 操作对象筛选
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *         description: 关键词搜索
 *       - in: query
 *         name: startTime
 *         schema:
 *           type: string
 *         description: 开始时间 HH:mm
 *       - in: query
 *         name: endTime
 *         schema:
 *           type: string
 *         description: 结束时间 HH:mm
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 页码
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 50
 *         description: 每页数量
 *     responses:
 *       200:
 *         description: 日志列表及分页信息
 *       401:
 *         description: 未登录
 */
router.get('/', logController.getLogs);

/**
 * @swagger
 * /logs/raw:
 *   get:
 *     summary: 获取原始日志内容
 *     description: 获取指定日期的原始日志文件内容
 *     tags: [日志管理]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *         description: 日期筛选
 *     responses:
 *       200:
 *         description: 原始日志内容
 *       401:
 *         description: 未登录
 */
router.get('/raw', logController.getRawLogs);

/**
 * @swagger
 * /logs/dates:
 *   get:
 *     summary: 获取日志日期列表
 *     description: 获取系统中所有可用的日志文件日期列表
 *     tags: [日志管理]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: 可用日志日期列表
 *       401:
 *         description: 未登录
 */
router.get('/dates', logController.getLogDates);

module.exports = router;
