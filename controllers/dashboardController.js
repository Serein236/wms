const dbUtils = require('../utils/dbUtils');

const dashboardController = {
    async getKPI(req, res) {
        try {
            const [productCount, stockSummary, inCount, outCount] = await Promise.all([
                dbUtils.queryOne('SELECT COUNT(*) as count FROM products'),
                dbUtils.queryOne('SELECT COALESCE(SUM(current_stock), 0) as total_stock, COALESCE(SUM(current_stock * retail_price), 0) as total_value FROM stock_inventory s JOIN products p ON s.product_id = p.id'),
                dbUtils.queryOne('SELECT COUNT(*) as count FROM in_records'),
                dbUtils.queryOne('SELECT COUNT(*) as count FROM out_records')
            ]);
            res.json({
                success: true,
                data: {
                    totalProducts: productCount ? productCount.count : 0,
                    totalStock: stockSummary ? stockSummary.total_stock : 0,
                    totalValue: stockSummary ? stockSummary.total_value : 0,
                    totalInRecords: inCount ? inCount.count : 0,
                    totalOutRecords: outCount ? outCount.count : 0
                }
            });
        } catch (error) {
            console.error('获取KPI数据错误:', error);
            res.status(500).json({ success: false, message: '获取KPI数据失败' });
        }
    },

    async getMonthlyTrend(req, res) {
        try {
            const { months = 6 } = req.query;
            const inRecords = await dbUtils.query(`
                SELECT DATE_FORMAT(recorded_date, '%Y-%m') as month,
                       SUM(quantity) as total_quantity,
                       SUM(total_amount) as total_amount
                FROM in_records
                WHERE recorded_date >= DATE_SUB(NOW(), INTERVAL ? MONTH)
                GROUP BY DATE_FORMAT(recorded_date, '%Y-%m')
                ORDER BY month ASC
            `, [parseInt(months)]);
            const outRecords = await dbUtils.query(`
                SELECT DATE_FORMAT(recorded_date, '%Y-%m') as month,
                       SUM(quantity) as total_quantity,
                       SUM(total_amount) as total_amount
                FROM out_records
                WHERE recorded_date >= DATE_SUB(NOW(), INTERVAL ? MONTH)
                GROUP BY DATE_FORMAT(recorded_date, '%Y-%m')
                ORDER BY month ASC
            `, [parseInt(months)]);
            res.json({ success: true, data: { inbound: inRecords, outbound: outRecords } });
        } catch (error) {
            console.error('获取月度趋势错误:', error);
            res.status(500).json({ success: false, message: '获取月度趋势失败' });
        }
    },

    async getTopProducts(req, res) {
        try {
            const { limit = 10 } = req.query;
            const products = await dbUtils.query(`
                SELECT p.name, s.current_stock, s.total_in_quantity, s.total_out_quantity
                FROM stock_inventory s JOIN products p ON s.product_id = p.id
                ORDER BY s.current_stock DESC LIMIT ?
            `, [parseInt(limit)]);
            res.json({ success: true, data: products });
        } catch (error) {
            console.error('获取库存排行错误:', error);
            res.status(500).json({ success: false, message: '获取库存排行失败' });
        }
    },

    async getStockStatus(req, res) {
        try {
            const status = await dbUtils.query('SELECT stock_status, COUNT(*) as count FROM stock_inventory GROUP BY stock_status');
            res.json({ success: true, data: status });
        } catch (error) {
            console.error('获取库存状态错误:', error);
            res.status(500).json({ success: false, message: '获取库存状态失败' });
        }
    }
};

module.exports = dashboardController;
