const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { requireLogin, requireAdmin } = require('../middleware/auth');

router.use(requireLogin);

/**
 * @swagger
 * tags:
 *   name: 库存管理
 *   description: 出入库操作、记录查询、库存报表
 */

/**
 * @swagger
 * /in:
 *   post:
 *     summary: 商品入库
 *     description: 记录商品入库信息，增加库存数量
 *     tags: [库存管理]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [product_id, stock_method_name, quantity, recorded_date]
 *             properties:
 *               product_id:
 *                 type: integer
 *               stock_method_name:
 *                 type: string
 *               batch_number:
 *                 type: string
 *               production_date:
 *                 type: string
 *               expiration_date:
 *                 type: string
 *               quantity:
 *                 type: integer
 *               unit_price:
 *                 type: number
 *               total_amount:
 *                 type: number
 *               source:
 *                 type: string
 *               remark:
 *                 type: string
 *               recorded_date:
 *                 type: string
 *     responses:
 *       200:
 *         description: 入库成功
 *       500:
 *         description: 入库失败
 */
router.post('/in', inventoryController.inStock);

/**
 * @swagger
 * /out:
 *   post:
 *     summary: 商品出库
 *     description: 记录商品出库信息，减少库存数量
 *     tags: [库存管理]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [product_id, stock_method_name, quantity, recorded_date]
 *             properties:
 *               product_id:
 *                 type: integer
 *               stock_method_name:
 *                 type: string
 *               batch_number:
 *                 type: string
 *               quantity:
 *                 type: integer
 *               unit_price:
 *                 type: number
 *               total_amount:
 *                 type: number
 *               destination:
 *                 type: string
 *               remark:
 *                 type: string
 *               recorded_date:
 *                 type: string
 *     responses:
 *       200:
 *         description: 出库成功
 *       500:
 *         description: 出库失败或库存不足
 */
router.post('/out', inventoryController.outStock);

/**
 * @swagger
 * /in-records:
 *   get:
 *     summary: 入库记录查询
 *     description: 查询入库记录列表
 *     tags: [库存管理]
 *     parameters:
 *       - in: query
 *         name: month
 *         schema:
 *           type: string
 *         description: 月份筛选（YYYY-MM）
 *       - in: query
 *         name: product_id
 *         schema:
 *           type: integer
 *         description: 商品ID筛选
 *     responses:
 *       200:
 *         description: 入库记录列表
 *       500:
 *         description: 查询失败
 */
router.get('/in-records', inventoryController.getInRecords);

/**
 * @swagger
 * /in-records/{id}/cancel:
 *   delete:
 *     summary: 取消入库
 *     description: 撤销指定的入库记录
 *     tags: [库存管理]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 取消入库成功
 *       500:
 *         description: 取消入库失败
 */
router.delete('/in-records/:id/cancel', inventoryController.cancelInStock);

/**
 * @swagger
 * /in-records/{id}:
 *   put:
 *     summary: 更新入库记录
 *     description: 修改入库记录信息
 *     tags: [库存管理]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: 更新入库记录成功
 *       500:
 *         description: 更新入库记录失败
 */
router.put('/in-records/:id', inventoryController.updateInStock);

/**
 * @swagger
 * /out-records:
 *   get:
 *     summary: 出库记录查询
 *     description: 查询出库记录列表
 *     tags: [库存管理]
 *     parameters:
 *       - in: query
 *         name: month
 *         schema:
 *           type: string
 *       - in: query
 *         name: product_id
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 出库记录列表
 *       500:
 *         description: 查询失败
 */
router.get('/out-records', inventoryController.getOutRecords);

/**
 * @swagger
 * /out-records/{id}/cancel:
 *   delete:
 *     summary: 取消出库
 *     description: 撤销指定的出库记录
 *     tags: [库存管理]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 取消出库成功
 *       500:
 *         description: 取消出库失败
 */
router.delete('/out-records/:id/cancel', inventoryController.cancelOutStock);

/**
 * @swagger
 * /out-records/{id}:
 *   put:
 *     summary: 更新出库记录
 *     description: 修改出库记录信息
 *     tags: [库存管理]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: 更新出库记录成功
 *       500:
 *         description: 更新出库记录失败
 */
router.put('/out-records/:id', inventoryController.updateOutStock);

/**
 * @swagger
 * /stock:
 *   get:
 *     summary: 库存报表
 *     description: 查询库存报表
 *     tags: [库存管理]
 *     responses:
 *       200:
 *         description: 库存报表列表
 *       500:
 *         description: 查询失败
 */
router.get('/stock', inventoryController.getStock);

/**
 * @swagger
 * /query/{productId}:
 *   get:
 *     summary: 商品明细查询
 *     description: 查询指定商品的详细出入库记录
 *     tags: [库存管理]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 商品信息
 *       404:
 *         description: 商品不存在
 */
router.get('/query/:productId', inventoryController.queryProductDetail);

/**
 * @swagger
 * /stock-methods:
 *   get:
 *     summary: 出入库方式列表
 *     description: 获取出入库方式列表
 *     tags: [库存管理]
 *     responses:
 *       200:
 *         description: 出入库方式列表
 *       500:
 *         description: 查询失败
 */
router.get('/stock-methods', inventoryController.getStockMethods);

/**
 * @swagger
 * /product-batches:
 *   get:
 *     summary: 商品批次列表
 *     description: 获取商品批次列表
 *     tags: [库存管理]
 *     responses:
 *       200:
 *         description: 商品批次列表
 *       500:
 *         description: 查询失败
 */
router.get('/product-batches', inventoryController.getProductBatches);

/**
 * @swagger
 * /product-batches/{productId}:
 *   get:
 *     summary: 商品批次列表
 *     description: 获取指定商品的批次列表
 *     tags: [库存管理]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 商品批次列表
 *       404:
 *         description: 商品不存在
 */
router.get('/product-batches/:productId', inventoryController.getProductBatches);

/**
 * @swagger
 * /suppliers:
 *   get:
 *     summary: 供应商列表
 *     description: 获取供应商列表
 *     tags: [库存管理]
 *     responses:
 *       200:
 *         description: 供应商列表
 *       500:
 *         description: 查询失败
 */
router.get('/suppliers', inventoryController.getSuppliers);

/**
 * @swagger
 * /customers:
 *   get:
 *     summary: 客户列表
 *     description: 获取客户列表
 *     tags: [库存管理]
 *     responses:
 *       200:
 *         description: 客户列表
 *       500:
 *         description: 查询失败
 */
router.get('/customers', inventoryController.getCustomers);

/**
 * @swagger
 * /out-records/{id}:
 *   get:
 *     summary: 出库记录详情
 *     description: 获取指定出库记录的详情
 *     tags: [库存管理]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 出库记录信息
 *       404:
 *         description: 记录不存在
 */
router.get('/out-records/:id', inventoryController.getOutRecordById);

/**
 * @swagger
 * /stock-methods-admin:
 *   get:
 *     summary: 出入库方式管理列表
 *     description: 获取出入库方式管理列表
 *     tags: [库存管理]
 *     security:
 *       - JWT: []
 *     responses:
 *       200:
 *         description: 出入库方式管理列表
 *       403:
 *         description: 权限不足
 */
router.get('/stock-methods-admin', requireAdmin, inventoryController.getAllStockMethods);

/**
 * @swagger
 * /stock-methods-admin:
 *   post:
 *     summary: 创建出入库方式
 *     description: 创建新的出入库方式
 *     tags: [库存管理]
 *     security:
 *       - JWT: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: 出入库方式创建成功
 *       403:
 *         description: 权限不足
 */
router.post('/stock-methods-admin', requireAdmin, inventoryController.createStockMethod);

/**
 * @swagger
 * /stock-methods-admin/{id}:
 *   put:
 *     summary: 更新出入库方式
 *     description: 更新指定出入库方式的信息
 *     tags: [库存管理]
 *     security:
 *       - JWT: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: 出入库方式更新成功
 *       403:
 *         description: 权限不足
 */
router.put('/stock-methods-admin/:id', requireAdmin, inventoryController.updateStockMethod);

/**
 * @swagger
 * /stock-methods-admin/{id}:
 *   delete:
 *     summary: 删除出入库方式
 *     description: 删除指定出入库方式
 *     tags: [库存管理]
 *     security:
 *       - JWT: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 出入库方式删除成功
 *       403:
 *         description: 权限不足
 */
router.delete('/stock-methods-admin/:id', requireAdmin, inventoryController.deleteStockMethod);

/**
 * @swagger
 * /settings:
 *   get:
 *     summary: 获取设置信息
 *     description: 获取系统设置信息
 *     tags: [系统管理]
 *     responses:
 *       200:
 *         description: 设置信息
 *       500:
 *         description: 查询失败
 */
router.get('/settings', inventoryController.getSettings);

/**
 * @swagger
 * /settings:
 *   post:
 *     summary: 保存设置信息
 *     description: 保存系统设置信息
 *     tags: [系统管理]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: 设置保存成功
 *       500:
 *         description: 设置保存失败
 */
router.post('/settings', inventoryController.saveSettings);

/**
 * @swagger
 * /backup:
 *   post:
 *     summary: 创建备份
 *     description: 创建系统备份
 *     tags: [系统管理]
 *     responses:
 *       200:
 *         description: 备份创建成功
 *       500:
 *         description: 备份创建失败
 */
router.post('/backup', inventoryController.createBackup);

/**
 * @swagger
 * /backups:
 *   get:
 *     summary: 获取备份列表
 *     description: 获取系统备份列表
 *     tags: [系统管理]
 *     responses:
 *       200:
 *         description: 备份列表
 *       500:
 *         description: 查询失败
 */
router.get('/backups', inventoryController.getBackupList);

/**
 * @swagger
 * /backups/{id}/download:
 *   get:
 *     summary: 下载备份
 *     description: 下载指定备份文件
 *     tags: [系统管理]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 备份下载成功
 *       404:
 *         description: 备份不存在
 */
router.get('/backups/:id/download', inventoryController.downloadBackup);

/**
 * @swagger
 * /backups/{id}:
 *   delete:
 *     summary: 删除备份
 *     description: 删除指定备份文件
 *     tags: [系统管理]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 备份删除成功
 *       404:
 *         description: 备份不存在
 */
router.delete('/backups/:id', inventoryController.deleteBackup);

/**
 * @swagger
 * /backups/{id}/restore:
 *   post:
 *     summary: 还原备份
 *     description: 还原指定备份文件
 *     tags: [系统管理]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 备份还原成功
 *       404:
 *         description: 备份不存在
 */
router.post('/backups/:id/restore', inventoryController.restoreBackup);

/**
 * @swagger
 * /auto-backup-config:
 *   post:
 *     summary: 保存自动备份配置
 *     description: 保存自动备份配置信息
 *     tags: [系统管理]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: 自动备份配置保存成功
 *       500:
 *         description: 自动备份配置保存失败
 */
router.post('/auto-backup-config', inventoryController.saveAutoBackupConfig);

/**
 * @swagger
 * /change-password:
 *   post:
 *     summary: 修改密码
 *     description: 修改当前用户密码
 *     tags: [系统管理]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               oldPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: 修改成功
 *       400:
 *         description: 原密码错误
 */
router.post('/change-password', inventoryController.changePassword);

/**
 * @swagger
 * /cleanup:
 *   post:
 *     summary: 数据清理
 *     description: 清理历史数据（清理前会自动备份）
 *     tags: [系统管理]
 *     responses:
 *       200:
 *         description: 清理成功
 *       500:
 *         description: 清理失败
 */
router.post('/cleanup', inventoryController.cleanupData);

module.exports = router;