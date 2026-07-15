// controllers/inventoryController.js
const InventoryService = require('../services/InventoryService');
const { formatDateForMySQL } = require('../utils/dataUtils');
const InRecordModel = require('../models/InRecordModel');
const OutRecordModel = require('../models/OutRecordModel');
const StockMethodModel = require('../models/StockMethodModel');
const dbUtils = require('../utils/dbUtils');
const logger = require('../utils/logger');

/**
 * 库存控制器
 * 处理商品入库、出库、库存查询、记录管理等相关操作
 * @namespace inventoryController
 */
const inventoryController = {
    /**
     * 商品入库
     * @async
     * @param {Object} req - Express请求对象
     * @param {Object} req.body - 请求体
     * @param {number} req.body.product_id - 商品ID
     * @param {string} req.body.stock_method_name - 入库方式
     * @param {string} [req.body.batch_number] - 批次号
     * @param {string} [req.body.production_date] - 生产日期
     * @param {string} [req.body.expiration_date] - 保质期
     * @param {number} req.body.quantity - 数量
     * @param {number} [req.body.unit_price] - 单价
     * @param {number} [req.body.total_amount] - 总金额
     * @param {string} [req.body.source] - 供应商/来源
     * @param {string} [req.body.remark] - 备注
     * @param {string} req.body.recorded_date - 记录日期
     * @param {Object} res - Express响应对象
     * @returns {Promise<void>}
     * @description 记录商品入库信息，增加库存数量
     * @success {Object} { success: true }
     * @error {Object} { success: false, message: string }
     */
    async inStock(req, res) {
        const { product_id, stock_method_name, batch_number, production_date, expiration_date, quantity, unit_price, total_amount, source, remark, recorded_date } = req.body;
        const created_by = req.session.userId;
        const username = req.session.username;
        
        try {
            // 输入校验
            if (!product_id || !Number.isInteger(Number(product_id)) || Number(product_id) <= 0) {
                return res.status(400).json({ success: false, message: '无效的商品ID' });
            }
            if (!stock_method_name) {
                return res.status(400).json({ success: false, message: '请选择入库方式' });
            }
            if (!batch_number) {
                return res.status(400).json({ success: false, message: '请输入批次号' });
            }
            if (!quantity || !Number.isInteger(Number(quantity)) || Number(quantity) <= 0) {
                return res.status(400).json({ success: false, message: '数量必须为正整数' });
            }
            if (!recorded_date) {
                return res.status(400).json({ success: false, message: '请选择记录日期' });
            }
            const formattedDate = formatDateForMySQL(recorded_date);
            const formattedProductionDate = formatDateForMySQL(production_date);
            const formattedExpirationDate = formatDateForMySQL(expiration_date);
            
            // 获取商品名称用于日志记录
            const product = await dbUtils.queryOne('SELECT name FROM products WHERE id = ?', [product_id]);
            const productName = product ? product.name : '未知商品';
            
            await InventoryService.inStock({
                product_id, stock_method_name, batch_number, production_date: formattedProductionDate, expiration_date: formattedExpirationDate, quantity, unit_price, total_amount, source, remark, recorded_date: formattedDate, created_by
            });
            
            logger.inStock(product_id, productName, batch_number, quantity, unit_price, total_amount, stock_method_name, source, username, req.session.userId);
            res.json({ success: true });
        } catch (error) {
            console.error('入库错误:', error);
            logger.error('入库失败', { operator: username, operatorId: req.session.userId, product_id, stock_method_name, batch_number, quantity, error: error.message });
            res.status(500).json({ 
                success: false, 
                message: error.message || '入库失败' 
            });
        }
    },

    /**
     * 商品出库
     * @async
     * @param {Object} req - Express请求对象
     * @param {Object} req.body - 请求体
     * @param {number} req.body.product_id - 商品ID
     * @param {string} req.body.stock_method_name - 出库方式
     * @param {string} [req.body.batch_number] - 批次号
     * @param {number} req.body.quantity - 数量
     * @param {number} [req.body.unit_price] - 单价
     * @param {number} [req.body.total_amount] - 总金额
     * @param {string} [req.body.destination] - 客户/去向
     * @param {string} [req.body.remark] - 备注
     * @param {string} req.body.recorded_date - 记录日期
     * @param {Object} res - Express响应对象
     * @returns {Promise<void>}
     * @description 记录商品出库信息，减少库存数量
     * @success {Object} { success: true }
     * @error {Object} { success: false, message: string }
     */
    async outStock(req, res) {
        const { product_id, stock_method_name, batch_number, quantity, unit_price, total_amount, destination, remark, recorded_date } = req.body;
        const created_by = req.session.userId;
        const username = req.session.username;
        
        try {
            // 输入校验
            if (!product_id || !Number.isInteger(Number(product_id)) || Number(product_id) <= 0) {
                return res.status(400).json({ success: false, message: '无效的商品ID' });
            }
            if (!stock_method_name) {
                return res.status(400).json({ success: false, message: '请选择出库方式' });
            }
            if (!batch_number) {
                return res.status(400).json({ success: false, message: '请输入批次号' });
            }
            if (!quantity || !Number.isInteger(Number(quantity)) || Number(quantity) <= 0) {
                return res.status(400).json({ success: false, message: '数量必须为正整数' });
            }
            if (!recorded_date) {
                return res.status(400).json({ success: false, message: '请选择记录日期' });
            }
            const formattedDate = formatDateForMySQL(recorded_date);
            
            // 获取商品名称用于日志记录
            const product = await dbUtils.queryOne('SELECT name FROM products WHERE id = ?', [product_id]);
            const productName = product ? product.name : '未知商品';
            
            await InventoryService.outStock({
                product_id, stock_method_name, batch_number, quantity, unit_price, total_amount, destination, remark, recorded_date: formattedDate, created_by
            });
            
            logger.outStock(product_id, productName, batch_number, quantity, unit_price, total_amount, stock_method_name, destination, username, req.session.userId);
            res.json({ success: true });
        } catch (error) {
            console.error('出库错误:', error);
            logger.error('出库失败', { operator: username, operatorId: req.session.userId, product_id, stock_method_name, batch_number, quantity, error: error.message });
            const message = error.message === '库存不足' || error.message === '批次库存不足' || error.message === '总库存不足' ? error.message : '出库失败';
            res.status(500).json({ 
                success: false, 
                message 
            });
        }
    },

    /**
     * 获取入库记录列表
     * @async
     * @param {Object} req - Express请求对象
     * @param {string} [req.query.month] - 月份筛选
     * @param {number} [req.query.product_id] - 商品ID筛选
     * @param {Object} res - Express响应对象
     * @returns {Promise<void>}
     * @description 获取入库记录列表，支持按月份和商品筛选
     * @success {Array<InRecord>} 入库记录数组
     * @error {Object} { error: string }
     */
    async getInRecords(req, res) {
        const username = req.session.username;
        const userId = req.session.userId;
        
        try {
            const { month, product_id } = req.query;
            const inRecords = await InRecordModel.findAll(month, product_id);
            const formattedRows = inRecords.map(row => ({
                ...row,
                recorded_date: row.display_date
            }));
            logger.query('查看入库记录', { month, product_id }, username, userId, formattedRows.length);
            res.json(formattedRows);
        } catch (error) {
            console.error('获取入库记录错误:', error);
            logger.error('获取入库记录失败', { operator: username, operatorId: userId, error: error.message });
            res.status(500).json({ success: false, message: '获取入库记录失败' });
        }
    },

    /**
     * 获取出库记录列表
     * @async
     * @param {Object} req - Express请求对象
     * @param {string} [req.query.month] - 月份筛选
     * @param {number} [req.query.product_id] - 商品ID筛选
     * @param {Object} res - Express响应对象
     * @returns {Promise<void>}
     * @description 获取出库记录列表，支持按月份和商品筛选
     * @success {Array<OutRecord>} 出库记录数组
     * @error {Object} { error: string }
     */
    async getOutRecords(req, res) {
        const username = req.session.username;
        const userId = req.session.userId;
        
        try {
            const { month, product_id } = req.query;
            const outRecords = await OutRecordModel.findAll(month, product_id);
            const formattedRows = outRecords.map(row => ({
                ...row,
                recorded_date: row.display_date
            }));
            logger.query('查看出库记录', { month, product_id }, username, userId, formattedRows.length);
            res.json(formattedRows);
        } catch (error) {
            console.error('获取出库记录错误:', error);
            logger.error('获取出库记录失败', { operator: username, operatorId: userId, error: error.message });
            res.status(500).json({ success: false, message: '获取出库记录失败' });
        }
    },

    /**
     * 获取库存报表
     * @async
     * @param {Object} req - Express请求对象
     * @param {Object} res - Express响应对象
     * @returns {Promise<void>}
     * @description 获取所有商品的当前库存状况报表
     * @success {Array<StockReport>} 库存报表数组
     * @error {Object} { error: string }
     */
    async getStock(req, res) {
        const username = req.session.username;
        const userId = req.session.userId;
        
        try {
            const stock = await InventoryService.getStockReport();
            logger.query('查看库存报表', {}, username, userId, stock.length);
            res.json(stock);
        } catch (error) {
            console.error('获取库存错误:', error);
            logger.error('获取库存失败', { operator: username, operatorId: userId, error: error.message });
            res.status(500).json({ success: false, message: '获取库存失败' });
        }
    },

    /**
     * 查询商品明细
     * @async
     * @param {Object} req - Express请求对象
     * @param {number} req.params.productId - 商品ID
     * @param {string} [req.query.month] - 月份筛选
     * @param {Object} res - Express响应对象
     * @returns {Promise<void>}
     * @description 查询指定商品的详细出入库记录和库存变动
     * @success {Object} { success: true, product: Object, records: Array }
     * @error {Object} { success: false, message: string }
     */
    async queryProductDetail(req, res) {
        const { productId } = req.params;
        const { month } = req.query;
        const username = req.session.username;
        const userId = req.session.userId;
        
        try {
            const result = await InventoryService.getProductDetail(productId, month);
            
            // 获取商品名称用于日志记录
            const product = await dbUtils.queryOne('SELECT name FROM products WHERE id = ?', [productId]);
            const productName = product ? product.name : '未知商品';
            
            logger.query('查询商品明细', { productId, productName, month }, username, userId, result.records?.length || 0);
            
            res.json({
                success: true,
                ...result
            });
        } catch (error) {
            console.error('查询错误:', error);
            logger.error('查询失败', { operator: username, operatorId: userId, productId, month, error: error.message });
            const message = error.message === '商品不存在' ? '商品不存在' : '查询失败';
            res.status(500).json({ 
                success: false, 
                message 
            });
        }
    },

    /**
     * 获取出入库方式列表
     * @async
     * @param {Object} req - Express请求对象
     * @param {string} [req.query.type] - 类型筛选（in/out）
     * @param {Object} res - Express响应对象
     * @returns {Promise<void>}
     * @description 获取可用的出入库方式名称列表
     * @success {Array<string>} 方式名称数组
     * @error {Object} { error: string }
     */
    async getStockMethods(req, res) {
        const { type } = req.query;
        const username = req.session.username;
        const userId = req.session.userId;
        
        try {
            const methods = await StockMethodModel.findByType(type);
            logger.getStockMethods(type, methods, username, userId);
            res.json(methods.map(method => method.method_name));
        } catch (error) {
            console.error('获取出入库方式错误:', error);
            logger.error('获取出入库方式失败', { operator: username, operatorId: userId, type, error: error.message });
            res.status(500).json({ success: false, message: '获取出入库方式失败' });
        }
    },

    /**
     * 获取商品批次列表
     * @async
     * @param {Object} req - Express请求对象
     * @param {Object} req.params - 路由参数
     * @param {number} req.params.productId - 商品ID
     * @param {Object} res - Express响应对象
     * @returns {Promise<void>}
     * @description 获取指定商品的所有批次及库存信息
     * @success {Array<Object>} 批次信息数组 [{ batch_number, current_stock }]
     * @error {Object} { error: string }
     */
    async getProductBatches(req, res) {
        const username = req.session?.username;
        const userId = req.session?.userId;
        const { productId } = req.params;
        const { query } = req.query;
        
        try {
            if (productId) {
                // 获取指定商品的批次
                const batches = await dbUtils.query(
                    'SELECT batch_number, batch_current_stock as current_stock FROM batch_stock WHERE product_id = ? ORDER BY batch_number ASC',
                    [productId]
                );
                logger.getProductBatches(productId, batches, username, userId);
                res.json(batches);
            } else {
                // 获取所有批次（支持查询）
                let batches = [];
                if (query && query.length >= 2) {
                    batches = await dbUtils.query(
                        'SELECT DISTINCT batch_number FROM in_records WHERE batch_number LIKE ? AND batch_number IS NOT NULL AND batch_number != "" ORDER BY batch_number ASC',
                        [query + '%']
                    );
                } else {
                    batches = await dbUtils.query(
                        'SELECT DISTINCT batch_number FROM in_records WHERE batch_number IS NOT NULL AND batch_number != "" ORDER BY batch_number ASC LIMIT 10'
                    );
                }
                
                logger.query('获取产品批号列表', { query }, username, userId, batches.length);
                res.json(batches.map(item => ({ batch_number: item.batch_number })));
            }
        } catch (error) {
            console.error('获取产品批号列表错误:', error);
            logger.error('获取产品批号列表失败', { operator: username, operatorId: userId, productId, query, error: error.message });
            res.status(500).json({ success: false, message: '获取产品批号列表失败' });
        }
    },

    /**
     * 获取出库记录详情
     * @async
     * @param {Object} req - Express请求对象
     * @param {Object} req.params - 路由参数
     * @param {number} req.params.id - 出库记录ID
     * @param {Object} res - Express响应对象
     * @returns {Promise<void>}
     * @description 获取指定出库记录的详细信息，包括关联的商品和批次信息
     * @success {Object} 出库记录详情
     * @error {Object} { error: string }
     */
    async getOutRecordById(req, res) {
        const { id } = req.params;
        const username = req.session?.username || '未登录用户';
        
        try {
            // 首先获取出库记录和商品信息
            const record = await dbUtils.queryOne(
                `SELECT 
                    o.id,
                    o.product_id,
                    p.name as product_name,
                    p.product_code,
                    p.spec,
                    p.unit,
                    p.manufacturer,
                    p.retail_price,
                    o.stock_method_name,
                    o.batch_number,
                    o.quantity,
                    o.unit_price,
                    o.total_amount,
                    o.destination,
                    o.remark,
                    DATE_FORMAT(o.recorded_date, '%Y-%m-%d') as display_date,
                    DATE_FORMAT(o.created_at, '%Y-%m-%d') as created_at
                FROM 
                    out_records o
                LEFT JOIN 
                    products p ON o.product_id = p.id
                WHERE 
                    o.id = ?`,
                [id]
            );
            
            if (record && record.batch_number) {
                // 获取该批次的入库记录（包含生产日期和保质期）
                const batchRecord = await dbUtils.queryOne(
                    `SELECT 
                        DATE_FORMAT(production_date, '%Y-%m-%d') as production_date,
                        DATE_FORMAT(expiration_date, '%Y-%m-%d') as expiration_date
                    FROM 
                        in_records
                    WHERE 
                        product_id = ? AND batch_number = ?
                    LIMIT 1`,
                    [record.product_id, record.batch_number]
                );
                
                if (batchRecord) {
                    record.production_date = batchRecord.production_date;
                    record.expiration_date = batchRecord.expiration_date;
                }
            }
            
            logger.query('查看出库单详情', { recordId: id }, username, req.session?.userId, 1);
            if (!record) {
                return res.status(404).json({ success: false, message: '记录不存在' });
            }
            res.json(record);
        } catch (error) {
            console.error('获取出库记录错误:', error);
            logger.error('获取出库记录失败', { operator: username, operatorId: req.session?.userId, id, error: error.message });
            res.status(500).json({ success: false, message: '获取出库记录失败' });
        }
    },

    /**
     * 获取供应商列表
     * @async
     * @param {Object} req - Express请求对象
     * @param {string} [req.query.query] - 查询关键词（至少2个字符）
     * @param {Object} res - Express响应对象
     * @returns {Promise<void>}
     * @description 获取入库记录中的供应商列表，支持模糊查询
     * @success {Array<string>} 供应商名称数组
     * @error {Object} { error: string }
     */
    async getSuppliers(req, res) {
        const username = req.session?.username;
        const userId = req.session?.userId;
        const { query } = req.query;
        
        try {
            let suppliers = [];
            if (query && query.length >= 2) {
                suppliers = await dbUtils.query(
                    'SELECT DISTINCT source FROM in_records WHERE source LIKE ? AND source IS NOT NULL AND source != "" ORDER BY source ASC',
                    [`${query}%`]
                );
            } else {
                suppliers = await dbUtils.query(
                    'SELECT DISTINCT source FROM in_records WHERE source IS NOT NULL AND source != "" ORDER BY source ASC LIMIT 10'
                );
            }
            
            logger.query('获取供应商列表', { query }, username, userId, suppliers.length);
            res.json(suppliers.map(item => item.source));
        } catch (error) {
            console.error('获取供应商列表错误:', error);
            logger.error('获取供应商列表失败', { operator: username, operatorId: userId, query, error: error.message });
            res.status(500).json({ success: false, message: '获取供应商列表失败' });
        }
    },

    /**
     * 获取客户列表
     * @async
     * @param {Object} req - Express请求对象
     * @param {string} [req.query.query] - 查询关键词（至少2个字符）
     * @param {Object} res - Express响应对象
     * @returns {Promise<void>}
     * @description 获取出库记录中的客户/去向列表，支持模糊查询
     * @success {Array<string>} 客户名称数组
     * @error {Object} { error: string }
     */
    async getCustomers(req, res) {
        const username = req.session?.username;
        const userId = req.session?.userId;
        const { query } = req.query;
        
        try {
            let customers = [];
            if (query && query.length >= 2) {
                customers = await dbUtils.query(
                    'SELECT DISTINCT destination FROM out_records WHERE destination LIKE ? AND destination IS NOT NULL AND destination != "" ORDER BY destination ASC',
                    [`${query}%`]
                );
            } else {
                customers = await dbUtils.query(
                    'SELECT DISTINCT destination FROM out_records WHERE destination IS NOT NULL AND destination != "" ORDER BY destination ASC LIMIT 10'
                );
            }
            
            logger.query('获取客户列表', { query }, username, userId, customers.length);
            res.json(customers.map(item => item.destination));
        } catch (error) {
            console.error('获取客户列表错误:', error);
            logger.error('获取客户列表失败', { operator: username, operatorId: userId, query, error: error.message });
            res.status(500).json({ success: false, message: '获取客户列表失败' });
        }
    },

    async getProductBatches(req, res) {
        const username = req.session?.username;
        const userId = req.session?.userId;
        const { productId } = req.params;
        const { query } = req.query;
        
        try {
            if (productId) {
                // 获取指定商品的批次
                const batches = await dbUtils.query(
                    'SELECT batch_number, batch_current_stock as current_stock FROM batch_stock WHERE product_id = ? ORDER BY batch_number ASC',
                    [productId]
                );
                logger.getProductBatches(productId, batches, username, userId);
                res.json(batches);
            } else {
                // 获取所有批次（支持查询）
                let batches = [];
                if (query && query.length >= 2) {
                    batches = await dbUtils.query(
                        'SELECT DISTINCT batch_number FROM in_records WHERE batch_number LIKE ? AND batch_number IS NOT NULL AND batch_number != "" ORDER BY batch_number ASC',
                        [query + '%']
                    );
                } else {
                    batches = await dbUtils.query(
                        'SELECT DISTINCT batch_number FROM in_records WHERE batch_number IS NOT NULL AND batch_number != "" ORDER BY batch_number ASC LIMIT 10'
                    );
                }
                
                logger.query('获取产品批号列表', { query }, username, userId, batches.length);
                res.json(batches.map(item => ({ batch_number: item.batch_number })));
            }
        } catch (error) {
            console.error('获取产品批号列表错误:', error);
            logger.error('获取产品批号列表失败', { operator: username, operatorId: userId, productId, query, error: error.message });
            res.status(500).json({ success: false, message: '获取产品批号列表失败' });
        }
    },

    /**
     * 撤销入库记录
     * @async
     * @param {Object} req - Express请求对象
     * @param {Object} req.params - 路由参数
     * @param {number} req.params.id - 入库记录ID
     * @param {Object} res - Express响应对象
     * @returns {Promise<void>}
     * @description 撤销指定的入库记录，恢复库存数量
     * @success {Object} { success: true }
     * @error {Object} { success: false, message: string }
     */
    async cancelInStock(req, res) {
        const { id } = req.params;
        const username = req.session?.username;
        const userId = req.session?.userId;
        
        try {
            await InventoryService.cancelInStock(id);
            
            logger.info('撤销入库', { operator: username, operatorId: userId, target: `记录ID:${id}`, description: '撤销入库记录' });
            res.json({ success: true });
        } catch (error) {
            console.error('撤销入库错误:', error);
            logger.error('撤销入库失败', { operator: username, operatorId: userId, inRecordId: id, error: error.message });
            res.status(500).json({ success: false, message: error.message || '撤销入库失败' });
        }
    },

    /**
     * 修改入库记录
     * @async
     * @param {Object} req - Express请求对象
     * @param {Object} req.params - 路由参数
     * @param {number} req.params.id - 入库记录ID
     * @param {Object} req.body - 更新的数据
     * @param {Object} res - Express响应对象
     * @returns {Promise<void>}
     * @description 修改入库记录信息，同时调整库存数量
     * @success {Object} { success: true }
     * @error {Object} { success: false, message: string }
     */
    async updateInStock(req, res) {
        const { id } = req.params;
        const updateData = req.body;
        const username = req.session?.username;
        const userId = req.session?.userId;
        
        try {
            const formattedDate = updateData.recorded_date ? formatDateForMySQL(updateData.recorded_date) : undefined;
            const formattedProductionDate = updateData.production_date ? formatDateForMySQL(updateData.production_date) : undefined;
            const formattedExpirationDate = updateData.expiration_date ? formatDateForMySQL(updateData.expiration_date) : undefined;
            
            const data = {
                ...updateData,
                recorded_date: formattedDate,
                production_date: formattedProductionDate,
                expiration_date: formattedExpirationDate
            };
            
            const result = await InventoryService.updateInStock(id, data);
            
            // 记录修改前后的值
            const changes = {};
            if (result.originalRecord) {
                if (result.originalRecord.quantity !== updateData.quantity) {
                    changes.quantity = { from: result.originalRecord.quantity, to: updateData.quantity };
                }
                if (result.originalRecord.unit_price !== updateData.unit_price) {
                    changes.unit_price = { from: result.originalRecord.unit_price, to: updateData.unit_price };
                }
                if (result.originalRecord.batch_number !== updateData.batch_number) {
                    changes.batch_number = { from: result.originalRecord.batch_number, to: updateData.batch_number };
                }
                if (result.originalRecord.source !== updateData.source) {
                    changes.source = { from: result.originalRecord.source, to: updateData.source };
                }
            }
            
            logger.info('修改入库', { 
                operator: username, 
                operatorId: userId, 
                target: `记录ID:${id}`, 
                description: '修改入库记录', 
                extra: { 
                    productId: updateData.product_id, 
                    changes,
                    quantityChanged: result.quantityChanged,
                    quantityDiff: result.quantityDiff
                } 
            });
            res.json({ success: true });
        } catch (error) {
            console.error('修改入库错误:', error);
            logger.error('修改入库失败', { operator: username, operatorId: userId, inRecordId: id, error: error.message });
            res.status(500).json({ success: false, message: error.message || '修改入库失败' });
        }
    },

    /**
     * 撤销出库记录
     * @async
     * @param {Object} req - Express请求对象
     * @param {Object} req.params - 路由参数
     * @param {number} req.params.id - 出库记录ID
     * @param {Object} res - Express响应对象
     * @returns {Promise<void>}
     * @description 撤销指定的出库记录，恢复库存数量
     * @success {Object} { success: true }
     * @error {Object} { success: false, message: string }
     */
    async cancelOutStock(req, res) {
        const { id } = req.params;
        const username = req.session?.username;
        const userId = req.session?.userId;
        
        try {
            await InventoryService.cancelOutStock(id);
            
            logger.info('撤销出库', { operator: username, operatorId: userId, target: `记录ID:${id}`, description: '撤销出库记录' });
            res.json({ success: true });
        } catch (error) {
            console.error('撤销出库错误:', error);
            logger.error('撤销出库失败', { operator: username, operatorId: userId, outRecordId: id, error: error.message });
            res.status(500).json({ success: false, message: error.message || '撤销出库失败' });
        }
    },

    /**
     * 修改出库记录
     * @async
     * @param {Object} req - Express请求对象
     * @param {Object} req.params - 路由参数
     * @param {number} req.params.id - 出库记录ID
     * @param {Object} req.body - 更新的数据
     * @param {Object} res - Express响应对象
     * @returns {Promise<void>}
     * @description 修改出库记录信息，同时调整库存数量
     * @success {Object} { success: true }
     * @error {Object} { success: false, message: string }
     */
    async updateOutStock(req, res) {
        const { id } = req.params;
        const updateData = req.body;
        const username = req.session?.username;
        const userId = req.session?.userId;
        
        try {
            const formattedDate = updateData.recorded_date ? formatDateForMySQL(updateData.recorded_date) : undefined;
            
            const data = {
                ...updateData,
                recorded_date: formattedDate
            };
            
            const result = await InventoryService.updateOutStock(id, data);
            
            // 记录修改前后的值
            const changes = {};
            if (result.originalRecord) {
                if (result.originalRecord.quantity !== updateData.quantity) {
                    changes.quantity = { from: result.originalRecord.quantity, to: updateData.quantity };
                }
                if (result.originalRecord.unit_price !== updateData.unit_price) {
                    changes.unit_price = { from: result.originalRecord.unit_price, to: updateData.unit_price };
                }
                if (result.originalRecord.batch_number !== updateData.batch_number) {
                    changes.batch_number = { from: result.originalRecord.batch_number, to: updateData.batch_number };
                }
                if (result.originalRecord.destination !== updateData.destination) {
                    changes.destination = { from: result.originalRecord.destination, to: updateData.destination };
                }
            }
            
            logger.info('修改出库', { 
                operator: username, 
                operatorId: userId, 
                target: `记录ID:${id}`, 
                description: '修改出库记录', 
                extra: { 
                    productId: updateData.product_id, 
                    changes,
                    quantityChanged: result.quantityChanged,
                    quantityDiff: result.quantityDiff
                } 
            });
            res.json({ success: true });
        } catch (error) {
            console.error('修改出库错误:', error);
            logger.error('修改出库失败', { operator: username, operatorId: userId, outRecordId: id, error: error.message });
            res.status(500).json({ success: false, message: error.message || '修改出库失败' });
        }
    },

    // 获取设置
    async getSettings(req, res) {
        try {
            // 从数据库或配置文件获取设置
            const settings = await InventoryService.getSettings();
            res.json(settings);
        } catch (error) {
            console.error('获取设置错误:', error);
            res.status(500).json({ success: false, message: '获取设置失败' });
        }
    },

    // 保存设置
    async saveSettings(req, res) {
        const username = req.session?.username;
        const userId = req.session?.userId;
        try {
            const settings = req.body;
            if (!settings || typeof settings !== 'object') {
                return res.status(400).json({ success: false, message: '无效的设置数据' });
            }
            // 只允许已知的设置键
            const allowedKeys = ['export', 'autoBackup'];
            const sanitized = {};
            for (const key of allowedKeys) {
                if (settings[key] !== undefined) {
                    sanitized[key] = settings[key];
                }
            }
            await InventoryService.saveSettings(sanitized);
            logger.settingsUpdated('export', null, settings, username, userId);
            res.json({ success: true });
        } catch (error) {
            console.error('保存设置错误:', error);
            logger.error('保存设置失败', { operator: username, operatorId: userId, error: error.message });
            res.status(500).json({ success: false, message: '保存设置失败' });
        }
    },

    // 创建备份
    async createBackup(req, res) {
        const username = req.session?.username;
        const userId = req.session?.userId;
        try {
            // 手动备份，类型为'manual'
            const result = await InventoryService.createBackup(username, 'manual');
            // 记录备份创建成功日志
            logger.backupCreated(result.fileName, result.fileSize, 'manual', username, userId);
            res.json(result);
        } catch (error) {
            console.error('创建备份错误:', error);
            logger.error('创建备份失败', { operator: username, operatorId: userId, error: error.message });
            res.status(500).json({ success: false, message: error.message || '创建备份失败' });
        }
    },

    // 获取备份列表
    async getBackupList(req, res) {
        const username = req.session?.username;
        const userId = req.session?.userId;
        try {
            const backups = await InventoryService.getBackupList();
            res.json(backups);
        } catch (error) {
            console.error('获取备份列表错误:', error);
            logger.error('获取备份列表失败', { operator: username, operatorId: userId, error: error.message });
            res.status(500).json({ success: false, message: '获取备份列表失败' });
        }
    },

    // 下载备份
    async downloadBackup(req, res) {
        const { id } = req.params;
        const username = req.session?.username;
        const userId = req.session?.userId;
        try {
            const backup = await InventoryService.getBackupById(id);
            if (!backup) {
                return res.status(404).json({ success: false, message: '备份文件不存在' });
            }
            logger.info('下载备份', { operator: username, operatorId: userId, target: backup.file_name, description: '下载备份文件' });
            res.download(backup.file_path, backup.file_name);
        } catch (error) {
            console.error('下载备份错误:', error);
            logger.error('下载备份失败', { operator: username, operatorId: userId, backupId: id, error: error.message });
            res.status(500).json({ success: false, message: '下载备份失败' });
        }
    },

    // 删除备份
    async deleteBackup(req, res) {
        const { id } = req.params;
        const username = req.session?.username;
        const userId = req.session?.userId;
        try {
            const backup = await InventoryService.getBackupById(id);
            await InventoryService.deleteBackup(id);
            logger.backupDeleted(backup?.file_name || `ID:${id}`, username, userId);
            res.json({ success: true });
        } catch (error) {
            console.error('删除备份错误:', error);
            logger.error('删除备份失败', { operator: username, operatorId: userId, backupId: id, error: error.message });
            res.status(500).json({ success: false, message: error.message || '删除备份失败' });
        }
    },

    // 恢复备份
    async restoreBackup(req, res) {
        const { id } = req.params;
        const username = req.session?.username;
        const userId = req.session?.userId;
        try {
            const backup = await InventoryService.getBackupById(id);
            await InventoryService.restoreBackup(id);
            logger.backupRestored(backup?.file_name || `ID:${id}`, username, userId);
            res.json({ success: true, message: '数据恢复成功' });
        } catch (error) {
            console.error('恢复备份错误:', error);
            logger.error('恢复备份失败', { operator: username, operatorId: userId, backupId: id, error: error.message });
            res.status(500).json({ success: false, message: error.message || '恢复备份失败' });
        }
    },

    // 保存自动备份配置
    async saveAutoBackupConfig(req, res) {
        const username = req.session?.username;
        const userId = req.session?.userId;
        try {
            const config = req.body;
            await InventoryService.saveAutoBackupConfig(config);
            logger.settingsUpdated('autoBackup', null, config, username, userId);
            res.json({ success: true });
        } catch (error) {
            console.error('保存自动备份配置错误:', error);
            logger.error('保存自动备份配置失败', { operator: username, operatorId: userId, error: error.message });
            res.status(500).json({ success: false, message: '保存自动备份配置失败' });
        }
    },

    // 修改密码
    async changePassword(req, res) {
        const username = req.session?.username;
        const userId = req.session?.userId;
        if (!username || !userId) {
            return res.status(401).json({ success: false, message: '未登录' });
        }

        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: '当前密码和新密码不能为空' });
        }

        try {
            const result = await InventoryService.changePassword(userId, currentPassword, newPassword);
            if (result.success) {
                logger.passwordChanged(username, userId, true);
                res.json({ success: true, message: '密码修改成功' });
            } else {
                res.status(400).json({ success: false, message: result.message });
            }
        } catch (error) {
            console.error('修改密码错误:', error);
            logger.error('修改密码失败', { operator: username, operatorId: userId, error: error.message });
            res.status(500).json({ success: false, message: '修改密码失败' });
        }
    },

    // 清理数据（清理前会自动备份）
    async cleanupData(req, res) {
        const username = req.session?.username;
        const userId = req.session?.userId;
        try {
            // 先创建删除前备份（pre_delete类型，不受自动备份上限限制）
            const backupResult = await InventoryService.createBackup(username, 'pre_delete');

            // 执行数据清理
            const result = await InventoryService.clearAllData();

            logger.dataCleaned(backupResult.fileName, username, userId);

            res.json({
                success: true,
                message: '数据清理成功，已自动备份',
                backupFile: backupResult.fileName
            });
        } catch (error) {
            console.error('清理数据错误:', error);
            logger.error('清理数据失败', { operator: username, operatorId: userId, error: error.message });
            res.status(500).json({ success: false, message: '数据清理失败: ' + error.message });
        }
    },

    // 获取所有出入库方式（管理员）
    async getAllStockMethods(req, res) {
        const username = req.session?.username;
        const userId = req.session?.userId;
        try {
            const methods = await StockMethodModel.findAll();
            res.json({ success: true, methods });
        } catch (error) {
            console.error('获取出入库方式列表错误:', error);
            logger.error('获取出入库方式列表失败', { operator: username, operatorId: userId, error: error.message });
            res.status(500).json({ success: false, message: '获取出入库方式列表失败' });
        }
    },

    // 创建出入库方式（管理员）
    async createStockMethod(req, res) {
        const username = req.session?.username;
        const userId = req.session?.userId;
        const { type, method_name } = req.body;

        if (!type || !method_name) {
            return res.status(400).json({ success: false, message: '类型和方式名称不能为空' });
        }

        if (!['in', 'out'].includes(type)) {
            return res.status(400).json({ success: false, message: '类型必须是 in 或 out' });
        }

        try {
            // 检查是否已存在
            const existing = await StockMethodModel.findByMethodName(method_name);
            if (existing) {
                return res.status(400).json({ success: false, message: '该方式名称已存在' });
            }

            const result = await StockMethodModel.create({ type, method_name });
            logger.info('创建出入库方式', {
                operator: username,
                operatorId: userId,
                target: method_name,
                description: `创建${type === 'in' ? '入库' : '出库'}方式`,
                extra: { id: result.id, type, method_name }
            });
            res.json({ success: true, message: '创建成功', method: result });
        } catch (error) {
            console.error('创建出入库方式错误:', error);
            logger.error('创建出入库方式失败', { operator: username, operatorId: userId, type, method_name, error: error.message });
            res.status(500).json({ success: false, message: error.message || '创建出入库方式失败' });
        }
    },

    // 更新出入库方式（管理员）
    async updateStockMethod(req, res) {
        const username = req.session?.username;
        const userId = req.session?.userId;
        const { id } = req.params;
        const { type, method_name } = req.body;

        if (!type || !method_name) {
            return res.status(400).json({ success: false, message: '类型和方式名称不能为空' });
        }

        try {
            const result = await StockMethodModel.update(id, { type, method_name });
            logger.info('更新出入库方式', {
                operator: username,
                operatorId: userId,
                target: method_name,
                description: `修改${type === 'in' ? '入库' : '出库'}方式`,
                extra: { id: parseInt(id), type, method_name, oldMethodName: result.oldMethodName }
            });
            res.json({ success: true, message: '更新成功', method: { id: parseInt(id), type, method_name } });
        } catch (error) {
            console.error('更新出入库方式错误:', error);
            logger.error('更新出入库方式失败', { operator: username, operatorId: userId, id, type, method_name, error: error.message });
            res.status(500).json({ success: false, message: error.message || '更新出入库方式失败' });
        }
    },

    // 删除出入库方式（管理员）
    async deleteStockMethod(req, res) {
        const username = req.session?.username;
        const userId = req.session?.userId;
        const { id } = req.params;

        try {
            const method = await StockMethodModel.delete(id);
            logger.info('删除出入库方式', {
                operator: username,
                operatorId: userId,
                target: method.method_name,
                description: `删除${method.type === 'in' ? '入库' : '出库'}方式`,
                extra: { id: parseInt(id), type: method.type, method_name: method.method_name }
            });
            res.json({ success: true, message: '删除成功' });
        } catch (error) {
            console.error('删除出入库方式错误:', error);
            logger.error('删除出入库方式失败', { operator: username, operatorId: userId, id, error: error.message });
            res.status(500).json({ success: false, message: error.message || '删除出入库方式失败' });
        }
    }
};

module.exports = inventoryController;