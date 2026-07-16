// controllers/productController.js
const ProductModel = require('../models/ProductModel');
const logger = require('../utils/logger');
const { parsePagination, buildPaginationResponse } = require('../utils/pagination');

/**
 * 商品控制器
 * 处理商品的增删改查等相关操作
 * @namespace productController
 */
const productController = {
    /**
     * 获取所有商品列表
     * @async
     * @param {Object} req - Express请求对象
     * @param {Object} res - Express响应对象
     * @returns {Promise<void>}
     * @description 获取系统中所有商品的完整列表
     * @success {Array<Product>} 商品对象数组
     * @error {Object} { error: string }
     * @example
     * GET /api/products
     * Response: [{ "id": 1, "name": "商品A", "product_code": "P001", ... }]
     */
    async getAllProducts(req, res) {
        const username = req.session.username;
        const userId = req.session.userId;
        const { query } = req.query;

        try {
            // If no pagination params, return all results (backward compatibility)
            if (!req.query.page && !req.query.pageSize) {
                const products = await ProductModel.findAll();
                logger.query('获取商品列表', {}, username, userId, products.length);
                return res.json(products);
            }

            const pagination = parsePagination(req.query);
            const total = await ProductModel.countAll(query);
            const products = await ProductModel.findAllPaginated(pagination, query);
            logger.query('获取商品列表', { query }, username, userId, products.length);
            res.json({ success: true, data: products, pagination: buildPaginationResponse(total, pagination) });
        } catch (error) {
            console.error('获取商品错误:', error);
            logger.error('获取商品失败', { operator: username, operatorId: userId, error: error.message });
            res.status(500).json({ success: false, message: '获取商品失败' });
        }
    },

    /**
     * 创建新商品
     * @async
     * @param {Object} req - Express请求对象
     * @param {Object} req.body - 请求体
     * @param {string} req.body.name - 商品名称（必填）
     * @param {string} req.body.spec - 规格（必填）
     * @param {string} req.body.unit - 单位（必填）
     * @param {string} [req.body.packing_spec] - 包装规格
     * @param {number} [req.body.retail_price] - 零售价
     * @param {string} [req.body.barcode] - 条形码（唯一）
     * @param {string} [req.body.manufacturer] - 生产厂家
     * @param {number} [req.body.warning_quantity] - 预警数量
     * @param {number} [req.body.danger_quantity] - 危险数量
     * @param {Object} res - Express响应对象
     * @returns {Promise<void>}
     * @description 创建新商品，条形码如果提供则必须唯一
     * @success {Object} { success: true, id: number }
     * @error {Object} { success: false, message: string }
     * @example
     * POST /api/products
     * Body: { "name": "商品A", "spec": "规格1", "unit": "个" }
     * Response: { "success": true, "id": 1 }
     */
    async createProduct(req, res) {
        const { name, spec, unit, packing_spec, retail_price, barcode, manufacturer, warning_quantity, danger_quantity } = req.body;
        const username = req.session.username;
        const userId = req.session.userId;
        
        try {
            // 检查条形码是否已存在
            if (barcode) {
                const existingProductByBarcode = await ProductModel.findByBarcode(barcode);
                if (existingProductByBarcode) {
                    return res.status(400).json({ 
                        success: false, 
                        message: '条形码已存在' 
                    });
                }
            }
            
            const product = await ProductModel.create({
                name, spec, unit, packing_spec, retail_price, barcode, manufacturer, warning_quantity, danger_quantity
            });
            
            logger.productCreated(product.id, name, product.product_code || 'N/A', username, userId, { spec, unit, barcode, manufacturer });
            res.json({ success: true, id: product.id });
        } catch (error) {
            console.error('添加商品错误:', error);
            logger.error('添加商品失败', { operator: username, operatorId: userId, name, spec, error: error.message });
            res.status(500).json({ 
                success: false, 
                message: '添加商品失败' 
            });
        }
    },

    /**
     * 更新商品信息
     * @async
     * @param {Object} req - Express请求对象
     * @param {Object} req.params - 路由参数
     * @param {number} req.params.id - 商品ID
     * @param {Object} req.body - 请求体
     * @param {string} req.body.name - 商品名称
     * @param {string} req.body.spec - 规格
     * @param {string} req.body.unit - 单位
     * @param {string} [req.body.packing_spec] - 包装规格
     * @param {number} [req.body.retail_price] - 零售价
     * @param {string} [req.body.barcode] - 条形码（唯一）
     * @param {string} [req.body.manufacturer] - 生产厂家
     * @param {number} [req.body.warning_quantity] - 预警数量
     * @param {number} [req.body.danger_quantity] - 危险数量
     * @param {Object} res - Express响应对象
     * @returns {Promise<void>}
     * @description 更新指定商品的信息，条形码如果提供则必须唯一且不能被其他商品使用
     * @success {Object} { success: true }
     * @error {Object} { success: false, message: string }
     * @example
     * PUT /api/products/1
     * Body: { "name": "商品A-修改", "spec": "规格1", "unit": "个" }
     * Response: { "success": true }
     */
    async updateProduct(req, res) {
        const { id } = req.params;
        const { name, spec, unit, packing_spec, retail_price, barcode, manufacturer, warning_quantity, danger_quantity } = req.body;
        const username = req.session.username;
        const userId = req.session.userId;
        
        try {
            // 检查条形码是否已被其他商品使用
            if (barcode) {
                const existingProductByBarcode = await ProductModel.findByBarcode(barcode);
                if (existingProductByBarcode && existingProductByBarcode.id !== Number(id)) {
                    return res.status(400).json({ 
                        success: false, 
                        message: '条形码已存在' 
                    });
                }
            }
            
            await ProductModel.update(id, {
                name, spec, unit, packing_spec, retail_price, barcode, manufacturer, warning_quantity, danger_quantity
            });
            
            logger.productUpdated(id, name, barcode || 'N/A', username, userId, { spec, unit, retail_price, manufacturer });
            res.json({ success: true });
        } catch (error) {
            console.error('更新商品错误:', error);
            logger.error('更新商品失败', { operator: username, operatorId: userId, id, name, spec, error: error.message });
            res.status(500).json({ 
                success: false, 
                message: '更新商品失败' 
            });
        }
    },

    /**
     * 删除商品
     * @async
     * @param {Object} req - Express请求对象
     * @param {Object} req.params - 路由参数
     * @param {number} req.params.id - 商品ID
     * @param {Object} res - Express响应对象
     * @returns {Promise<void>}
     * @description 删除指定商品
     * @success {Object} { success: true }
     * @error {Object} { success: false, message: string }
     * @example
     * DELETE /api/products/1
     * Response: { "success": true }
     */
    async deleteProduct(req, res) {
        const { id } = req.params;
        const username = req.session.username;
        const userId = req.session.userId;
        
        try {
            // 获取商品名称用于日志记录
            const product = await ProductModel.findById(id);
            const productName = product ? product.name : '未知商品';
            
            await ProductModel.delete(id);
            
            logger.productDeleted(id, productName, product ? product.product_code || 'N/A' : '未知', username, userId);
            res.json({ success: true });
        } catch (error) {
            console.error('删除商品错误:', error);
            logger.error('删除商品失败', { operator: username, operatorId: userId, id, error: error.message });
            res.status(500).json({ 
                success: false, 
                message: '删除商品失败' 
            });
        }
    }
};

module.exports = productController;