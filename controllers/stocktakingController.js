const dbUtils = require('../utils/dbUtils');
const logger = require('../utils/logger');

const stocktakingController = {
    async list(req, res) {
        try {
            const items = await dbUtils.query('SELECT * FROM stocktaking ORDER BY created_at DESC');
            res.json({ success: true, data: items });
        } catch (error) {
            console.error('获取盘点列表错误:', error);
            res.status(500).json({ success: false, message: '获取盘点列表失败' });
        }
    },

    async get(req, res) {
        try {
            const stocktaking = await dbUtils.queryOne('SELECT * FROM stocktaking WHERE id = ?', [req.params.id]);
            if (!stocktaking) return res.status(404).json({ success: false, message: '盘点单不存在' });

            const items = await dbUtils.query(`
                SELECT si.*, p.name as product_name, p.spec, p.unit
                FROM stocktaking_items si
                JOIN products p ON si.product_id = p.id
                WHERE si.stocktaking_id = ?
                ORDER BY p.name ASC
            `, [req.params.id]);

            res.json({ success: true, data: { ...stocktaking, items } });
        } catch (error) {
            console.error('获取盘点详情错误:', error);
            res.status(500).json({ success: false, message: '获取盘点详情失败' });
        }
    },

    async create(req, res) {
        const { name } = req.body;
        if (!name) return res.status(400).json({ success: false, message: '请输入盘点名称' });

        try {
            const result = await dbUtils.insert(
                'INSERT INTO stocktaking (name, created_by) VALUES (?, ?)',
                [name, req.session.userId]
            );

            const products = await dbUtils.query(`
                SELECT p.id, COALESCE(s.current_stock, 0) as current_stock
                FROM products p
                LEFT JOIN stock_inventory s ON p.id = s.product_id
            `);

            for (const product of products) {
                await dbUtils.insert(
                    'INSERT INTO stocktaking_items (stocktaking_id, product_id, system_stock) VALUES (?, ?, ?)',
                    [result.insertId, product.id, product.current_stock]
                );
            }

            logger.info('创建盘点单', { operator: req.session.username, operatorId: req.session.userId, name });
            res.json({ success: true, data: { id: result.insertId } });
        } catch (error) {
            console.error('创建盘点单错误:', error);
            res.status(500).json({ success: false, message: '创建盘点单失败' });
        }
    },

    async start(req, res) {
        try {
            await dbUtils.update(
                "UPDATE stocktaking SET status = 'in_progress', started_at = NOW() WHERE id = ? AND status = 'draft'",
                [req.params.id]
            );
            res.json({ success: true, message: '盘点已开始' });
        } catch (error) {
            console.error('开始盘点错误:', error);
            res.status(500).json({ success: false, message: '操作失败' });
        }
    },

    async updateItem(req, res) {
        const { actual_stock, remark } = req.body;
        try {
            const item = await dbUtils.queryOne(
                'SELECT * FROM stocktaking_items WHERE id = ? AND stocktaking_id = ?',
                [req.params.itemId, req.params.id]
            );
            if (!item) return res.status(404).json({ success: false, message: '项目不存在' });

            const difference = actual_stock !== null ? actual_stock - item.system_stock : 0;
            await dbUtils.update(
                'UPDATE stocktaking_items SET actual_stock = ?, difference = ?, remark = ?, counted_at = NOW(), counted_by = ? WHERE id = ?',
                [actual_stock, difference, remark || null, req.session.userId, req.params.itemId]
            );

            res.json({ success: true, message: '已更新' });
        } catch (error) {
            console.error('更新盘点项错误:', error);
            res.status(500).json({ success: false, message: '更新失败' });
        }
    },

    async complete(req, res) {
        try {
            const stocktaking = await dbUtils.queryOne(
                "SELECT * FROM stocktaking WHERE id = ? AND status = 'in_progress'",
                [req.params.id]
            );
            if (!stocktaking) return res.status(400).json({ success: false, message: '盘点单不在进行中状态' });

            const uncounted = await dbUtils.queryOne(
                'SELECT COUNT(*) as count FROM stocktaking_items WHERE stocktaking_id = ? AND actual_stock IS NULL',
                [req.params.id]
            );

            if (uncounted.count > 0) {
                return res.status(400).json({ success: false, message: `还有 ${uncounted.count} 个商品未盘点` });
            }

            const differences = await dbUtils.query(
                'SELECT * FROM stocktaking_items WHERE stocktaking_id = ? AND difference != 0',
                [req.params.id]
            );

            for (const item of differences) {
                const adjustment = item.actual_stock - item.system_stock;
                if (adjustment > 0) {
                    await dbUtils.insert(
                        'INSERT INTO in_records (product_id, stock_method_name, batch_number, quantity, recorded_date, created_by) VALUES (?, ?, ?, ?, CURDATE(), ?)',
                        [item.product_id, '盘点入库', `PANDIAN-${req.params.id}`, adjustment, req.session.userId]
                    );
                    await dbUtils.update(
                        'UPDATE stock_inventory SET current_stock = current_stock + ?, total_in_quantity = total_in_quantity + ? WHERE product_id = ?',
                        [adjustment, adjustment, item.product_id]
                    );
                } else if (adjustment < 0) {
                    const absAdj = Math.abs(adjustment);
                    await dbUtils.insert(
                        'INSERT INTO out_records (product_id, stock_method_name, batch_number, quantity, recorded_date, created_by) VALUES (?, ?, ?, ?, CURDATE(), ?)',
                        [item.product_id, '盘点出库', `PANDIAN-${req.params.id}`, absAdj, req.session.userId]
                    );
                    await dbUtils.update(
                        'UPDATE stock_inventory SET current_stock = current_stock - ?, total_out_quantity = total_out_quantity + ? WHERE product_id = ?',
                        [absAdj, absAdj, item.product_id]
                    );
                }
            }

            await dbUtils.update(
                "UPDATE stocktaking SET status = 'completed', completed_at = NOW() WHERE id = ?",
                [req.params.id]
            );

            logger.info('完成盘点', { operator: req.session.username, operatorId: req.session.userId, adjustments: differences.length });
            res.json({ success: true, message: '盘点完成，库存已调整', adjustedCount: differences.length });
        } catch (error) {
            console.error('完成盘点错误:', error);
            res.status(500).json({ success: false, message: '完成盘点失败' });
        }
    },

    async cancel(req, res) {
        try {
            await dbUtils.update(
                "UPDATE stocktaking SET status = 'cancelled' WHERE id = ? AND status IN ('draft', 'in_progress')",
                [req.params.id]
            );
            res.json({ success: true, message: '盘点已取消' });
        } catch (error) {
            console.error('取消盘点错误:', error);
            res.status(500).json({ success: false, message: '操作失败' });
        }
    }
};

module.exports = stocktakingController;
