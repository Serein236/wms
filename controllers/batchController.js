const InventoryService = require('../services/InventoryService');
const dbUtils = require('../utils/dbUtils');
const logger = require('../utils/logger');
const { formatDateForMySQL } = require('../utils/dataUtils');

// 按商品名解析 product_id（前端批量表格可能只提交商品名称）
async function resolveProductId(item) {
    if (item.product_id) return Number(item.product_id);
    const name = String(item.name || item.product_name || '').trim();
    if (!name) return null;
    const p = await dbUtils.queryOne('SELECT id FROM products WHERE name = ? LIMIT 1', [name]);
    return p ? p.id : null;
}

// 计算总金额：未显式传入时由 数量×单价 推导
function resolveTotalAmount(item, qty) {
    if (item.total_amount !== undefined && item.total_amount !== null && item.total_amount !== '') {
        return parseFloat(item.total_amount);
    }
    const price = item.unit_price !== undefined && item.unit_price !== null && item.unit_price !== ''
        ? parseFloat(item.unit_price) : 0;
    return parseFloat((qty * price).toFixed(2));
}

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
                const productId = await resolveProductId(item);
                if (!productId) {
                    failCount++;
                    errors.push(`第${i + 1}行: 商品不存在「${item.name || item.product_name || ''}」`);
                    continue;
                }
                if (!item.quantity || !item.batch_number || !item.stock_method_name) {
                    failCount++;
                    errors.push(`第${i + 1}行: 缺少必填字段（批号/数量/出入库方式）`);
                    continue;
                }
                const qty = parseInt(item.quantity);
                // 入库日期为 NOT NULL，未提供时给默认值（生产=今天，过期=一年后）
                const today = formatDateForMySQL(new Date());
                const nextYear = formatDateForMySQL(new Date(Date.now() + 365 * 24 * 3600 * 1000));

                await InventoryService.inStock({
                    product_id: productId,
                    stock_method_name: item.stock_method_name,
                    batch_number: item.batch_number,
                    production_date: item.production_date ? formatDateForMySQL(item.production_date) : today,
                    expiration_date: item.expiration_date ? formatDateForMySQL(item.expiration_date) : nextYear,
                    quantity: qty,
                    unit_price: item.unit_price !== undefined && item.unit_price !== null && item.unit_price !== '' ? parseFloat(item.unit_price) : 0,
                    total_amount: resolveTotalAmount(item, qty),
                    source: source || item.source || null,
                    remark: remark || item.remark || null,
                    recorded_date: recorded_date ? formatDateForMySQL(recorded_date) : today,
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
                const productId = await resolveProductId(item);
                if (!productId) {
                    failCount++;
                    errors.push(`第${i + 1}行: 商品不存在「${item.name || item.product_name || ''}」`);
                    continue;
                }
                if (!item.quantity || !item.batch_number || !item.stock_method_name) {
                    failCount++;
                    errors.push(`第${i + 1}行: 缺少必填字段（批号/数量/出入库方式）`);
                    continue;
                }
                const qty = parseInt(item.quantity);
                const today = formatDateForMySQL(new Date());

                await InventoryService.outStock({
                    product_id: productId,
                    stock_method_name: item.stock_method_name,
                    batch_number: item.batch_number,
                    quantity: qty,
                    unit_price: item.unit_price !== undefined && item.unit_price !== null && item.unit_price !== '' ? parseFloat(item.unit_price) : 0,
                    total_amount: resolveTotalAmount(item, qty),
                    destination: destination || item.destination || null,
                    remark: remark || item.remark || null,
                    recorded_date: recorded_date ? formatDateForMySQL(recorded_date) : today,
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
