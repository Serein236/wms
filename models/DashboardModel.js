const dbUtils = require('../utils/dbUtils');

const DashboardModel = {
    async getKPIs() {
        const [totalProducts, todayIn, todayOut, lowStock] = await Promise.all([
            dbUtils.queryOne('SELECT COUNT(*) as count FROM products'),
            dbUtils.queryOne("SELECT COUNT(*) as count, COALESCE(SUM(quantity), 0) as totalQty FROM in_records WHERE DATE(created_at) = CURDATE()"),
            dbUtils.queryOne("SELECT COUNT(*) as count, COALESCE(SUM(quantity), 0) as totalQty FROM out_records WHERE DATE(created_at) = CURDATE()"),
            dbUtils.queryOne("SELECT COUNT(*) as count FROM stock_inventory WHERE stock_status IN ('warning', 'danger', 'out_of_stock')")
        ]);

        return {
            totalProducts: totalProducts.count,
            todayInbound: todayIn.count,
            todayInboundQty: todayIn.totalQty,
            todayOutbound: todayOut.count,
            todayOutboundQty: todayOut.totalQty,
            lowStockCount: lowStock.count
        };
    },

    async getDailyTrend(days = 7) {
        const inRecords = await dbUtils.query(`
            SELECT DATE(created_at) as date, COUNT(*) as count, COALESCE(SUM(quantity), 0) as totalQty
            FROM in_records 
            WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
            GROUP BY DATE(created_at) ORDER BY date
        `, [days]);

        const outRecords = await dbUtils.query(`
            SELECT DATE(created_at) as date, COUNT(*) as count, COALESCE(SUM(quantity), 0) as totalQty
            FROM out_records 
            WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
            GROUP BY DATE(created_at) ORDER BY date
        `, [days]);

        const dates = [];
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            dates.push(d.toISOString().slice(0, 10));
        }

        const inMap = {};
        inRecords.forEach(r => { inMap[r.date.toISOString().slice(0, 10)] = r; });
        const outMap = {};
        outRecords.forEach(r => { outMap[r.date.toISOString().slice(0, 10)] = r; });

        return dates.map(date => ({
            date,
            inbound: inMap[date] ? inMap[date].totalQty : 0,
            outbound: outMap[date] ? outMap[date].totalQty : 0
        }));
    },

    async getTopProducts(limit = 10) {
        return await dbUtils.query(`
            SELECT p.name, si.current_stock as stock
            FROM products p
            LEFT JOIN stock_inventory si ON p.id = si.product_id
            ORDER BY si.current_stock DESC
            LIMIT ?
        `, [limit]);
    },

    async getRecentActivities(limit = 10) {
        const inRecords = await dbUtils.query(`
            SELECT 'in' as type, p.name as productName, ir.quantity, ir.created_at
            FROM in_records ir
            JOIN products p ON ir.product_id = p.id
            ORDER BY ir.created_at DESC LIMIT ?
        `, [limit]);

        const outRecords = await dbUtils.query(`
            SELECT 'out' as type, p.name as productName, or2.quantity, or2.created_at
            FROM out_records or2
            JOIN products p ON or2.product_id = p.id
            ORDER BY or2.created_at DESC LIMIT ?
        `, [limit]);

        return [...inRecords, ...outRecords]
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, limit);
    },

    async getStockMethodDistribution() {
        return await dbUtils.query(`
            SELECT sm.method_name as name, COUNT(DISTINCT ir.product_id) as productCount, COALESCE(SUM(ir.quantity), 0) as totalQty
            FROM in_records ir
            JOIN stock_methods sm ON ir.stock_method_name = sm.method_name
            GROUP BY sm.id, sm.method_name
        `);
    }
};

module.exports = DashboardModel;
