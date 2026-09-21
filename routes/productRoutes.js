const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { requireLogin, requireAdmin } = require('../middleware/auth');

// 所有商品接口均需登录
router.use(requireLogin);

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: 获取所有商品
 *     tags: [商品]
 *     responses:
 *       200:
 *         description: 成功获取商品列表
 *       401:
 *         description: 未登录
 */
router.get('/', productController.getAllProducts);

/**
 * @swagger
 * /api/products/barcode/{barcode}:
 *   get:
 *     summary: 根据条码查询商品
 *     tags: [商品]
 *     parameters:
 *       - in: path
 *         name: barcode
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 成功获取商品信息
 *       404:
 *         description: 未找到商品
 */
router.get('/barcode/:barcode', productController.getProductByBarcode);

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: 获取单个商品详情
 *     tags: [商品]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 成功获取商品详情
 *       404:
 *         description: 商品不存在
 */
router.get('/:id', productController.getProductById);

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: 添加新商品（管理员）
 *     tags: [商品]
 *     responses:
 *       200:
 *         description: 添加成功
 *       400:
 *         description: 必填字段缺失或条码重复
 *       403:
 *         description: 需要管理员权限
 */
router.post('/', requireAdmin, productController.createProduct);

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: 更新商品信息（管理员）
 *     tags: [商品]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 更新成功
 *       403:
 *         description: 需要管理员权限
 *       404:
 *         description: 商品不存在
 */
router.put('/:id', requireAdmin, productController.updateProduct);

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: 删除商品（管理员）
 *     tags: [商品]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 删除成功
 *       403:
 *         description: 需要管理员权限
 */
router.delete('/:id', requireAdmin, productController.deleteProduct);

module.exports = router;
