const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

/**
 * @swagger
 * tags:
 *   name: 商品管理
 *   description: 商品相关操作
 */

/**
 * @swagger
 * /products:
 *   get:
 *     summary: 获取商品列表
 *     description: 获取所有商品的完整列表
 *     tags: [商品管理]
 *     responses:
 *       200:
 *         description: 商品列表
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 *       500:
 *         description: 服务器错误
 */
router.get('/', productController.getAllProducts);

/**
 * @swagger
 * /products:
 *   post:
 *     summary: 创建商品
 *     description: 创建新商品，条形码如果提供则必须唯一
 *     tags: [商品管理]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, spec, unit]
 *             properties:
 *               name:
 *                 type: string
 *                 description: 商品名称
 *               spec:
 *                 type: string
 *                 description: 规格
 *               unit:
 *                 type: string
 *                 description: 单位
 *               packing_spec:
 *                 type: string
 *                 description: 包装规格
 *               retail_price:
 *                 type: number
 *                 description: 零售价
 *               barcode:
 *                 type: string
 *                 description: 条形码（唯一）
 *               manufacturer:
 *                 type: string
 *                 description: 生产厂家
 *               warning_quantity:
 *                 type: integer
 *                 description: 预警数量
 *               danger_quantity:
 *                 type: integer
 *                 description: 危险数量
 *     responses:
 *       200:
 *         description: 创建成功
 *       400:
 *         description: 参数错误或条形码已存在
 *       500:
 *         description: 服务器错误
 */
router.post('/', productController.createProduct);

/**
 * @swagger
 * /products/{id}:
 *   put:
 *     summary: 更新商品
 *     description: 更新指定商品的信息
 *     tags: [商品管理]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 商品ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               spec:
 *                 type: string
 *               unit:
 *                 type: string
 *               packing_spec:
 *                 type: string
 *               retail_price:
 *                 type: number
 *               barcode:
 *                 type: string
 *               manufacturer:
 *                 type: string
 *               warning_quantity:
 *                 type: integer
 *               danger_quantity:
 *                 type: integer
 *     responses:
 *       200:
 *         description: 更新成功
 *       400:
 *         description: 参数错误或条形码已被使用
 *       500:
 *         description: 服务器错误
 */
router.put('/:id', productController.updateProduct);

/**
 * @swagger
 * /products/{id}:
 *   delete:
 *     summary: 删除商品
 *     description: 删除指定商品
 *     tags: [商品管理]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 商品ID
 *     responses:
 *       200:
 *         description: 删除成功
 *       500:
 *         description: 服务器错误
 */
router.delete('/:id', productController.deleteProduct);

module.exports = router;