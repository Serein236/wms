const dbUtils = require('../utils/dbUtils');
const logger = require('../utils/logger');
const InventoryService = require('../services/InventoryService');
const { formatDateForMySQL } = require('../utils/dataUtils');

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
        if (actual_stock === undefined) {
            return res.status(400).json({ success: false, message: '请提供实盘数量' });
        }
        if (actual_stock !== null && actual_stock !== undefined) {
            const n = Number(actual_stock);
            if (!Number.isInteger(n) || n < 0) {
                return res.status(400).json({ success: false, message: '实盘数量必须是不小于 0 的整数' });
            }
        }
        try {
            const stocktaking = await dbUtils.queryOne(
                "SELECT * FROM stocktaking WHERE id = ? AND status = 'in_progress'",
                [req.params.id]
            );
            if (!stocktaking) {
                return res.status(400).json({ success: false, message: '盘点单不在进行中状态' });
            }

            const item = await dbUtils.queryOne(
                'SELECT * FROM stocktaking_items WHERE id = ? AND stocktaking_id = ?',
                [req.params.itemId, req.params.id]
            );
            if (!item) return res.status(404).json({ success: false, message: '项目不存在' });

            const actual = actual_stock === null ? null : Number(actual_stock);
            const difference = actual !== null ? actual - Number(item.system_stock) : 0;
            await dbUtils.update(
                'UPDATE stocktaking_items SET actual_stock = ?, difference = ?, remark = ?, counted_at = NOW(), counted_by = ? WHERE id = ?',
                [actual, difference, remark || null, req.session.userId, req.params.itemId]
            );

            res.json({ success: true, message: '已更新' });
        } catch (error) {
            console.error('更新盘点项错误:', error);
            res.status(500).json({ success: false, message: '更新失败' });
        }
    },

    async complete(req, res) {
        try {
            const adjustedCount = await dbUtils.executeTransaction(async (connection) => {
                const stocktaking = await dbUtils.queryOne(
                    "SELECT * FROM stocktaking WHERE id = ? AND status = 'in_progress' FOR UPDATE",
                    [req.params.id],
                    connection
                );
                if (!stocktaking) throw new Error('盘点单不在进行中状态');

                const uncounted = await dbUtils.queryOne(
                    'SELECT COUNT(*) as count FROM stocktaking_items WHERE stocktaking_id = ? AND actual_stock IS NULL',
                    [req.params.id],
                    connection
                );
                if (uncounted.count > 0) {
                    throw new Error(`还有 ${uncounted.count} 个商品未盘点`);
                }

                const differences = await dbUtils.query(
                    `SELECT si.*, p.name as product_name
                     FROM stocktaking_items si
                     LEFT JOIN products p ON si.product_id = p.id
                     WHERE si.stocktaking_id = ? AND si.difference != 0 AND si.adjusted_at IS NULL`,
                    [req.params.id],
                    connection
                );

                const today = formatDateForMySQL(new Date());
                const adjustBatchNo = `PANDIAN-${req.params.id}`;
                for (const item of differences) {
                    const adjustment = Number(item.actual_stock) - Number(item.system_stock);
                    if (adjustment > 0) {
                        await InventoryService.inStock({
                            product_id: item.product_id,
                            stock_method_name: '盘点入库',
                            batch_number: adjustBatchNo,
                            production_date: today,
                            expiration_date: '9999-12-31',
                            quantity: adjustment,
                            unit_price: 0,
                            total_amount: 0,
                            source: null,
                            recorded_date: today,
                            created_by: req.session.userId
                        }, connection);
                    } else if (adjustment < 0) {
                        let remain = Math.abs(adjustment);
                        const batches = await dbUtils.query(
                            `SELECT batch_number, batch_current_stock FROM batch_stock
                             WHERE product_id = ? AND batch_current_stock > 0
                             ORDER BY expiration_date ASC, batch_number ASC
                             FOR UPDATE`,
                            [item.product_id],
                            connection
                        );
                        for (const b of batches) {
                            if (remain <= 0) break;
                            const q = Math.min(Number(b.batch_current_stock), remain);
                            await InventoryService.outStock({
                                product_id: item.product_id,
                                stock_method_name: '盘点出库',
                                batch_number: b.batch_number,
                                quantity: q,
                                unit_price: 0,
                                total_amount: 0,
                                destination: null,
                                recorded_date: today,
                                created_by: req.session.userId
                            }, connection);
                            remain -= q;
                        }
                        if (remain > 0) {
                            throw new Error(`商品「${item.product_name || item.product_id}」可用批次库存不足，无法完成盘亏`);
                        }
                    }
                    await dbUtils.update(
                        'UPDATE stocktaking_items SET adjusted_at = NOW() WHERE id = ?',
                        [item.id],
                        connection
                    );
                }

                await dbUtils.update(
                    "UPDATE stocktaking SET status = 'completed', completed_at = NOW() WHERE id = ?",
                    [req.params.id],
                    connection
                );
                return differences.length;
            });

            logger.info('完成盘点', { operator: req.session.username, operatorId: req.session.userId, adjustments: adjustedCount });
            res.json({ success: true, message: '盘点完成，库存已调整', adjustedCount });
        } catch (error) {
            console.error('完成盘点错误:', error);
            const message = error.message || '完成盘点失败';
            const clientError = message.includes('不在进行中') || message.includes('未盘点') || message.includes('批次库存不足');
            res.status(clientError ? 400 : 500).json({ success: false, message });
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
