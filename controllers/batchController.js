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
    },

    async getTemplate(req, res) {
        const XLSX = require('xlsx');
        const template = [
            ['商品名称*', '入库方式', '批号', '生产日期', '过期日期', '数量*', '单价'],
            ['示例商品A', '采购入库', 'B20260716', '2026/07/01', '2027/07/01', 100, 25.00]
        ];
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(template);
        ws['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 10 }];
        XLSX.utils.book_append_sheet(wb, ws, '批量出入库模板');
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Disposition', 'attachment; filename=batch_template.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    }
};

module.exports = batchController;
