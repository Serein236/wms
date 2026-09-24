// models/ProductModel.js
const dbUtils = require('../utils/dbUtils');
const { addPagination } = require('../utils/pagination');

const ProductModel = {
    async findAll() {
        return await dbUtils.query(`
            SELECT p.*, s.warning_quantity, s.danger_quantity, s.current_stock as stock
            FROM products p
            LEFT JOIN stock_inventory s ON p.id = s.product_id
            ORDER BY p.id DESC
        `);
    },

    async countAll(query) {
        let whereClause = '';
        const params = [];
        if (query) {
            whereClause = 'WHERE name LIKE ? OR product_code LIKE ? OR spec LIKE ?';
            params.push(`%${query}%`, `%${query}%`, `%${query}%`);
        }
        const result = await dbUtils.queryOne(`SELECT COUNT(*) as count FROM products ${whereClause}`, params);
        return result ? result.count : 0;
    },

    async findAllPaginated(pagination, query) {
        let whereClause = '';
        const params = [];
        if (query) {
            whereClause = 'WHERE p.name LIKE ? OR p.product_code LIKE ? OR p.spec LIKE ?';
            params.push(`%${query}%`, `%${query}%`, `%${query}%`);
        }
        const baseQuery = `
            SELECT p.*, s.warning_quantity, s.danger_quantity, s.current_stock as stock
            FROM products p
            LEFT JOIN stock_inventory s ON p.id = s.product_id
            ${whereClause}
            ORDER BY p.id DESC
        `;
        return await dbUtils.query(addPagination(baseQuery, pagination), params);
    },

    async findById(id) {
        const result = await dbUtils.queryOne(`
            SELECT p.*, s.warning_quantity, s.danger_quantity, s.current_stock as stock
            FROM products p
            LEFT JOIN stock_inventory s ON p.id = s.product_id
            WHERE p.id = ?
        `, [id]);
        return result;
    },

    async findByProductCode(productCode) {
        return await dbUtils.queryOne('SELECT * FROM products WHERE product_code = ?', [productCode]);
    },

    async findByBarcode(barcode) {
        return await dbUtils.queryOne('SELECT * FROM products WHERE barcode = ?', [barcode]);
    },

    // 生成随机6位数商品编码
    generateProductCode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    },

    async create(productData) {
        const { name, spec, unit, packing_spec, retail_price, barcode, manufacturer, warning_quantity = 10, danger_quantity = 5 } = productData;
        // 自动生成随机6位数商品编码，确保唯一性
        let product_code;
        let isUnique = false;
        
        while (!isUnique) {
            product_code = this.generateProductCode();
            const existingProduct = await this.findByProductCode(product_code);
            if (!existingProduct) {
                isUnique = true;
            }
        }
        
        // 商品 + 库存初始化放进同一事务：
        // 避免 stock_inventory 初始化失败产生"无库存行的商品"（后续出库全报总库存不足）
        return await dbUtils.executeTransaction(async (connection) => {
            const result = await dbUtils.insert(
                'INSERT INTO products (product_code, name, spec, unit, packing_spec, retail_price, barcode, manufacturer) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [product_code, name, spec, unit, packing_spec, retail_price, barcode, manufacturer],
                connection
            );

            // 创建商品后，初始化库存记录
            await dbUtils.insert(
                'INSERT INTO stock_inventory (product_id, total_in_quantity, total_out_quantity, current_stock, warning_quantity, danger_quantity) VALUES (?, 0, 0, 0, ?, ?)',
                [result.insertId, warning_quantity, danger_quantity],
                connection
            );

            return { id: result.insertId, product_code, ...productData };
        });
    },

    async update(id, productData) {
        const { name, spec, unit, packing_spec, retail_price, barcode, manufacturer, warning_quantity, danger_quantity } = productData;
        await dbUtils.update(
            'UPDATE products SET name = ?, spec = ?, unit = ?, packing_spec = ?, retail_price = ?, barcode = ?, manufacturer = ? WHERE id = ?',
            [name, spec, unit, packing_spec, retail_price, barcode, manufacturer, id]
        );
        
        // 更新库存表中的警告和危险库存数量
        if (warning_quantity !== undefined || danger_quantity !== undefined) {
            await dbUtils.update(
                'UPDATE stock_inventory SET warning_quantity = ?, danger_quantity = ? WHERE product_id = ?',
                [warning_quantity || 10, danger_quantity || 5, id]
            );
        }
        
        return { id, ...productData };
    },

    // 统计商品的出入库记录数（删除前引用检查：
    // in_records/out_records/batch_stock/stock_inventory 对 products 均为 ON DELETE CASCADE，
    // 直接删除会静默级联清空该商品全部历史流水，不可恢复）
    async countRecords(id) {
        const result = await dbUtils.queryOne(
            `SELECT (SELECT COUNT(*) FROM in_records WHERE product_id = ?) +
                    (SELECT COUNT(*) FROM out_records WHERE product_id = ?) AS count`,
            [id, id]
        );
        return result ? Number(result.count) : 0;
    },

    async delete(id) {
        await dbUtils.delete('DELETE FROM products WHERE id = ?', [id]);
        return true;
    }
};

module.exports = ProductModel;