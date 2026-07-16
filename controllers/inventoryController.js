// controllers/inventoryController.js
const InventoryService = require('../services/InventoryService');
const BackupService = require('../services/BackupService');
const { formatDateForMySQL } = require('../utils/dataUtils');
const InRecordModel = require('../models/InRecordModel');
const OutRecordModel = require('../models/OutRecordModel');
const StockMethodModel = require('../models/StockMethodModel');
const dbUtils = require('../utils/dbUtils');
const logger = require('../utils/logger');
const { parsePagination, addPagination, buildPaginationResponse } = require('../utils/pagination');
const SupplierModel = require('../models/SupplierModel');

const inventoryController = {
    async inStock(req, res) {
        const { product_id, stock_method_name, batch_number, production_date, expiration_date, quantity, unit_price, total_amount, source, remark, recorded_date } = req.body;
        const created_by = req.session.userId;
        const username = req.session.username;
        
        try {
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
            
            const product = await dbUtils.queryOne('SELECT name FROM products WHERE id = ?', [product_id]);
            const productName = product ? product.name : '未知商品';

            // Auto-create supplier if new name
            if (source && source.trim()) {
                const existing = await dbUtils.queryOne('SELECT id FROM suppliers WHERE name = ?', [source.trim()]);
                if (!existing) {
                    await dbUtils.insert('INSERT IGNORE INTO suppliers (name) VALUES (?)', [source.trim()]);
                }
            }

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

    async outStock(req, res) {
        const { product_id, stock_method_name, batch_number, quantity, unit_price, total_amount, destination, remark, recorded_date } = req.body;
        const created_by = req.session.userId;
        const username = req.session.username;
        
        try {
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
            
            const product = await dbUtils.queryOne('SELECT name FROM products WHERE id = ?', [product_id]);
            const productName = product ? product.name : '未知商品';

            // Auto-create supplier if new name
            if (destination && destination.trim()) {
                const existing = await dbUtils.queryOne('SELECT id FROM suppliers WHERE name = ?', [destination.trim()]);
                if (!existing) {
                    await dbUtils.insert('INSERT IGNORE INTO suppliers (name) VALUES (?)', [destination.trim()]);
                }
            }

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

    async getInRecords(req, res) {
        const username = req.session.username;
        const userId = req.session.userId;

        try {
            const { month, product_id } = req.query;

            // If no pagination params, return all results (backward compatibility)
            if (!req.query.page && !req.query.pageSize) {
                const inRecords = await InRecordModel.findAll(month, product_id);
                const formattedRows = inRecords.map(row => ({
                    ...row,
                    recorded_date: row.display_date
                }));
                logger.query('查看入库记录', { month, product_id }, username, userId, formattedRows.length);
                return res.json(formattedRows);
            }

            const pagination = parsePagination(req.query);
            const total = await InRecordModel.countAll(month, product_id);
            const inRecords = await InRecordModel.findAllPaginated(month, product_id, pagination);
            const formattedRows = inRecords.map(row => ({
                ...row,
                recorded_date: row.display_date
            }));
            logger.query('查看入库记录', { month, product_id }, username, userId, formattedRows.length);
            res.json({ success: true, data: formattedRows, pagination: buildPaginationResponse(total, pagination) });
        } catch (error) {
            console.error('获取入库记录错误:', error);
            logger.error('获取入库记录失败', { operator: username, operatorId: userId, error: error.message });
            res.status(500).json({ success: false, message: '获取入库记录失败' });
        }
    },

    async getOutRecords(req, res) {
        const username = req.session.username;
        const userId = req.session.userId;

        try {
            const { month, product_id } = req.query;

            // If no pagination params, return all results (backward compatibility)
            if (!req.query.page && !req.query.pageSize) {
                const outRecords = await OutRecordModel.findAll(month, product_id);
                const formattedRows = outRecords.map(row => ({
                    ...row,
                    recorded_date: row.display_date
                }));
                logger.query('查看出库记录', { month, product_id }, username, userId, formattedRows.length);
                return res.json(formattedRows);
            }

            const pagination = parsePagination(req.query);
            const total = await OutRecordModel.countAll(month, product_id);
            const outRecords = await OutRecordModel.findAllPaginated(month, product_id, pagination);
            const formattedRows = outRecords.map(row => ({
                ...row,
                recorded_date: row.display_date
            }));
            logger.query('查看出库记录', { month, product_id }, username, userId, formattedRows.length);
            res.json({ success: true, data: formattedRows, pagination: buildPaginationResponse(total, pagination) });
        } catch (error) {
            console.error('获取出库记录错误:', error);
            logger.error('获取出库记录失败', { operator: username, operatorId: userId, error: error.message });
            res.status(500).json({ success: false, message: '获取出库记录失败' });
        }
    },

    async getStock(req, res) {
        const username = req.session.username;
        const userId = req.session.userId;

        try {
            // If no pagination params, return all results (backward compatibility)
            if (!req.query.page && !req.query.pageSize) {
                const stock = await InventoryService.getStockReport();
                logger.query('查看库存报表', {}, username, userId, stock.length);
                return res.json(stock);
            }

            const pagination = parsePagination(req.query);
            const total = await InventoryService.getStockReportCount();
            const stock = await InventoryService.getStockReportPaginated(pagination);
            logger.query('查看库存报表', {}, username, userId, stock.length);
            res.json({ success: true, data: stock, pagination: buildPaginationResponse(total, pagination) });
        } catch (error) {
            console.error('获取库存错误:', error);
            logger.error('获取库存失败', { operator: username, operatorId: userId, error: error.message });
            res.status(500).json({ success: false, message: '获取库存失败' });
        }
    },

    async queryProductDetail(req, res) {
        const { productId } = req.params;
        const { month } = req.query;
        const username = req.session.username;
        const userId = req.session.userId;
        
        try {
            const result = await InventoryService.getProductDetail(productId, month);
            
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

    async getProductBatches(req, res) {
        const username = req.session?.username;
        const userId = req.session?.userId;
        const { productId } = req.params;
        const { query } = req.query;
        
        try {
            if (productId) {
                const batches = await dbUtils.query(
                    'SELECT batch_number, batch_current_stock as current_stock FROM batch_stock WHERE product_id = ? ORDER BY batch_number ASC',
                    [productId]
                );
                logger.getProductBatches(productId, batches, username, userId);
                res.json(batches);
            } else {
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

    async getOutRecordById(req, res) {
        const { id } = req.params;
        const username = req.session?.username || '未登录用户';
        
        try {
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

    async getSuppliers(req, res) {
        const username = req.session?.username;
        const userId = req.session?.userId;
        const { query } = req.query;

        try {
            const suppliers = await SupplierModel.search(query);
            logger.query('获取供应商列表', { query }, username, userId, suppliers.length);
            res.json(suppliers.map(s => s.name));
        } catch (error) {
            console.error('获取供应商列表错误:', error);
            logger.error('获取供应商列表失败', { operator: username, operatorId: userId, query, error: error.message });
            res.status(500).json({ success: false, message: '获取供应商列表失败' });
        }
    },

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

    async cleanupData(req, res) {
        const username = req.session?.username;
        const userId = req.session?.userId;
        try {
            const backupResult = await BackupService.createBackup(username, 'pre_delete');
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
