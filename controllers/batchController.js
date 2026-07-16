const InventoryService = require('../services/InventoryService');
const dbUtils = require('../utils/dbUtils');
const logger = require('../utils/logger');
const { formatDateForMySQL } = require('../utils/dataUtils');

const batchController = {
    async batchInStock(req, res) {
        const { items, source, remark, recorded_date } = req.body;
        const created_by = req.session.userId;
        const username = req.session.username;

        if (!items || !items.length) {
            return res.status(400).json({ success: false, message: '请添加入库项目' });
        }

        let successCount = 0, failCount = 0, errors = [];

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            try {
                if (!item.product_id || !item.quantity || !item.batch_number || !item.stock_method_name) {
                    failCount++;
                    errors.push(`第${i + 1}行: 缺少必填字段`);
                    continue;
                }

                await InventoryService.inStock({
                    product_id: item.product_id,
                    stock_method_name: item.stock_method_name,
                    batch_number: item.batch_number,
                    production_date: item.production_date ? formatDateForMySQL(item.production_date) : null,
                    expiration_date: item.expiration_date ? formatDateForMySQL(item.expiration_date) : null,
                    quantity: parseInt(item.quantity),
                    unit_price: item.unit_price ? parseFloat(item.unit_price) : null,
                    total_amount: item.total_amount ? parseFloat(item.total_amount) : null,
                    source: source || item.source || null,
                    remark: remark || item.remark || null,
                    recorded_date: recorded_date ? formatDateForMySQL(recorded_date) : formatDateForMySQL(new Date()),
                    created_by
                });
                successCount++;
            } catch (err) {
                failCount++;
                errors.push(`第${i + 1}行: ${err.message}`);
            }
        }

        logger.info('批量入库', { operator: username, operatorId: created_by, successCount, failCount });
        res.json({ success: true, successCount, failCount, errors: errors.slice(0, 10) });
    },

    async batchOutStock(req, res) {
        const { items, destination, remark, recorded_date } = req.body;
        const created_by = req.session.userId;
        const username = req.session.username;

        if (!items || !items.length) {
            return res.status(400).json({ success: false, message: '请添加出库项目' });
        }

        let successCount = 0, failCount = 0, errors = [];

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            try {
                if (!item.product_id || !item.quantity || !item.batch_number || !item.stock_method_name) {
                    failCount++;
                    errors.push(`第${i + 1}行: 缺少必填字段`);
                    continue;
                }

                await InventoryService.outStock({
                    product_id: item.product_id,
                    stock_method_name: item.stock_method_name,
                    batch_number: item.batch_number,
                    quantity: parseInt(item.quantity),
                    unit_price: item.unit_price ? parseFloat(item.unit_price) : null,
                    total_amount: item.total_amount ? parseFloat(item.total_amount) : null,
                    destination: destination || item.destination || null,
                    remark: remark || item.remark || null,
                    recorded_date: recorded_date ? formatDateForMySQL(recorded_date) : formatDateForMySQL(new Date()),
                    created_by
                });
                successCount++;
            } catch (err) {
                failCount++;
                errors.push(`第${i + 1}行: ${err.message}`);
            }
        }

        logger.info('批量出库', { operator: username, operatorId: created_by, successCount, failCount });
        res.json({ success: true, successCount, failCount, errors: errors.slice(0, 10) });
    }
};

module.exports = batchController;
