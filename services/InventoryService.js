// services/InventoryService.js
const ProductModel = require('../models/ProductModel');
const InRecordModel = require('../models/InRecordModel');
const OutRecordModel = require('../models/OutRecordModel');
const StockModel = require('../models/StockModel');
const dbUtils = require('../utils/dbUtils');
const bcrypt = require('bcryptjs');
const { addPagination } = require('../utils/pagination');

const BackupService = require('./BackupService');
const SettingsService = require('./SettingsService');

function assertPositiveQty(quantity) {
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 1) {
        throw new Error('数量必须为正整数');
    }
    return qty;
}

async function inStockOnConnection(connection, data) {
    const qty = assertPositiveQty(data.quantity);
    const payload = { ...data, quantity: qty };
    const record = await InRecordModel.create(payload, connection);

    const existingBatch = await dbUtils.queryOne(
        'SELECT * FROM batch_stock WHERE product_id = ? AND batch_number = ? FOR UPDATE',
        [payload.product_id, payload.batch_number],
        connection
    );

    if (existingBatch) {
        await dbUtils.update(
            'UPDATE batch_stock SET batch_in_quantity = batch_in_quantity + ?, batch_current_stock = batch_current_stock + ? WHERE id = ?',
            [qty, qty, existingBatch.id],
            connection
        );
    } else {
        await dbUtils.insert(
            'INSERT INTO batch_stock (product_id, batch_number, production_date, expiration_date, batch_in_quantity, batch_out_quantity, batch_current_stock, batch_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [payload.product_id, payload.batch_number, payload.production_date, payload.expiration_date, qty, 0, qty, 'normal'],
            connection
        );
    }

    await StockModel.updateStock(payload.product_id, qty, 0, connection);
    return record;
}

async function outStockOnConnection(connection, data) {
    const qty = assertPositiveQty(data.quantity);
    const payload = { ...data, quantity: qty };
    const batchStock = await dbUtils.queryOne(
        'SELECT * FROM batch_stock WHERE product_id = ? AND batch_number = ? FOR UPDATE',
        [payload.product_id, payload.batch_number],
        connection
    );

    if (!batchStock || Number(batchStock.batch_current_stock) < qty) {
        throw new Error('批次库存不足');
    }

    const stock = await StockModel.findByProductId(payload.product_id, connection);
    if (!stock || Number(stock.current_stock) < qty) {
        throw new Error('总库存不足');
    }

    const record = await OutRecordModel.create(payload, connection);

    await dbUtils.update(
        'UPDATE batch_stock SET batch_out_quantity = batch_out_quantity + ?, batch_current_stock = batch_current_stock - ? WHERE id = ? AND batch_current_stock >= ?',
        [qty, qty, batchStock.id, qty],
        connection
    );

    await StockModel.updateStock(payload.product_id, 0, qty, connection);
    return record;
}

const InventoryService = {
    async inStock(data, connection = null) {
        if (connection) {
            return await inStockOnConnection(connection, data);
        }
        return await dbUtils.executeTransaction(async (conn) => inStockOnConnection(conn, data));
    },

    async outStock(data, connection = null) {
        if (connection) {
            return await outStockOnConnection(connection, data);
        }
        return await dbUtils.executeTransaction(async (conn) => outStockOnConnection(conn, data));
    },

    async getStockReport() {
        return await StockModel.getBatchStockReport();
    },

    async getStockReportCount() {
        return await StockModel.countBatchStockReport();
    },

    async getStockReportPaginated(pagination) {
        const baseQuery = `
            SELECT
                p.id as product_id,
                p.name as product_name,
                p.spec as product_spec,
                p.unit as product_unit,
                s.warning_quantity,
                s.danger_quantity,
                b.batch_number,
                b.production_date,
                b.expiration_date,
                b.batch_in_quantity,
                b.batch_out_quantity,
                b.batch_current_stock as current_stock,
                b.batch_status,
                MAX(i.unit_price) as in_price
            FROM
                batch_stock b
            JOIN
                products p ON b.product_id = p.id
            JOIN
                stock_inventory s ON b.product_id = s.product_id
            JOIN
                in_records i ON b.product_id = i.product_id AND b.batch_number = i.batch_number
            WHERE
                b.batch_current_stock > 0
            GROUP BY
                p.id,
                p.name,
                p.spec,
                p.unit,
                s.warning_quantity,
                s.danger_quantity,
                b.batch_number,
                b.production_date,
                b.expiration_date,
                b.batch_in_quantity,
                b.batch_out_quantity,
                b.batch_current_stock,
                b.batch_status,
                b.id
            ORDER BY
                p.name ASC, b.batch_number ASC
        `;
        return await dbUtils.query(addPagination(baseQuery, pagination));
    },

    async getProductDetail(productId, month = null) {
        const product = await ProductModel.findById(productId);
        if (!product) {
            throw new Error('商品不存在');
        }

        const inRecords = await InRecordModel.findByProductId(productId, month);
        const outRecords = await OutRecordModel.findByProductId(productId, month);
        
        const monthlyStats = await dbUtils.query(`
            SELECT 
                DATE_FORMAT(recorded_date, '%Y-%m') as month,
                SUM(CASE WHEN table_type = 'in' THEN quantity ELSE 0 END) as in_quantity,
                SUM(CASE WHEN table_type = 'out' THEN quantity ELSE 0 END) as out_quantity
            FROM (
                SELECT 'in' as table_type, product_id, quantity, recorded_date FROM in_records
                UNION ALL
                SELECT 'out' as table_type, product_id, quantity, recorded_date FROM out_records
            ) as records
            WHERE product_id = ?
            GROUP BY DATE_FORMAT(recorded_date, '%Y-%m')
            ORDER BY month DESC
        `, [productId]);

        const batchStock = await dbUtils.query(`
            SELECT 
                batch_number, 
                production_date, 
                expiration_date, 
                batch_current_stock as current_stock
            FROM batch_stock 
            WHERE product_id = ? 
            ORDER BY batch_current_stock DESC
        `, [productId]);

        return {
            product,
            inRecords: inRecords.map(record => ({
                ...record,
                recorded_date: record.display_date
            })),
            outRecords: outRecords.map(record => ({
                ...record,
                recorded_date: record.display_date,
                production_date: record.production_date,
                expiration_date: record.expiration_date
            })),
            monthlyStats,
            batchStock
        };
    },

    async cancelInStock(inRecordId) {
        return await dbUtils.executeTransaction(async (connection) => {
            const inRecord = await InRecordModel.findById(inRecordId, connection);
            if (!inRecord) {
                throw new Error('入库记录不存在');
            }

            const batchStock = await dbUtils.queryOne(
                'SELECT * FROM batch_stock WHERE product_id = ? AND batch_number = ? FOR UPDATE',
                [inRecord.product_id, inRecord.batch_number],
                connection
            );

            if (!batchStock || Number(batchStock.batch_current_stock) < Number(inRecord.quantity)) {
                throw new Error('批次库存不足，无法撤销');
            }

            const stock = await StockModel.findByProductId(inRecord.product_id, connection);
            if (!stock || Number(stock.current_stock) < Number(inRecord.quantity)) {
                throw new Error('总库存不足，无法撤销');
            }

            const upd = await dbUtils.update(
                'UPDATE batch_stock SET batch_in_quantity = batch_in_quantity - ?, batch_current_stock = batch_current_stock - ? WHERE id = ? AND batch_current_stock >= ?',
                [inRecord.quantity, inRecord.quantity, batchStock.id, inRecord.quantity],
                connection
            );
            if (upd && upd.affectedRows === 0) {
                throw new Error('批次库存不足，无法撤销');
            }

            await StockModel.updateStock(inRecord.product_id, 0, inRecord.quantity, connection);

            await InRecordModel.delete(inRecordId, connection);

            return { success: true };
        });
    },

    async updateInStock(inRecordId, data) {
        return await dbUtils.executeTransaction(async (connection) => {
            const originalRecord = await InRecordModel.findById(inRecordId, connection);
            if (!originalRecord) {
                throw new Error('入库记录不存在');
            }

            if (data.batch_number !== undefined && data.batch_number !== null && data.batch_number !== originalRecord.batch_number) {
                throw new Error('不允许修改批号，请撤销后重新录入');
            }
            if (data.product_id !== undefined && data.product_id !== null && Number(data.product_id) !== Number(originalRecord.product_id)) {
                throw new Error('不允许修改商品，请撤销后重新录入');
            }

            if (data.quantity !== undefined && (!Number.isInteger(Number(data.quantity)) || Number(data.quantity) < 1)) {
                throw new Error('数量必须为正整数');
            }
            const nextQty = data.quantity !== undefined ? Number(data.quantity) : Number(originalRecord.quantity);
            const nextPrice = data.unit_price !== undefined && data.unit_price !== null && data.unit_price !== ''
                ? parseFloat(data.unit_price) : Number(originalRecord.unit_price || 0);
            if (data.total_amount === undefined || data.total_amount === null || data.total_amount === '') {
                data = { ...data, total_amount: parseFloat((nextQty * nextPrice).toFixed(2)) };
            }

            const quantityDiff = Number(data.quantity !== undefined ? data.quantity : originalRecord.quantity) - Number(originalRecord.quantity);

            if (quantityDiff !== 0) {
                if (quantityDiff < 0) {
                    const batchStock = await dbUtils.queryOne(
                        'SELECT * FROM batch_stock WHERE product_id = ? AND batch_number = ?',
                        [originalRecord.product_id, originalRecord.batch_number],
                        connection
                    );

                    if (!batchStock || batchStock.batch_current_stock < Math.abs(quantityDiff)) {
                        throw new Error('批次库存不足，无法修改');
                    }

                    const stock = await StockModel.findByProductId(originalRecord.product_id, connection);
                    if (!stock || stock.current_stock < Math.abs(quantityDiff)) {
                        throw new Error('总库存不足，无法修改');
                    }
                }

                const batchStock = await dbUtils.queryOne(
                    'SELECT * FROM batch_stock WHERE product_id = ? AND batch_number = ?',
                    [originalRecord.product_id, originalRecord.batch_number],
                    connection
                );

                if (batchStock) {
                    await dbUtils.update(
                        'UPDATE batch_stock SET batch_in_quantity = batch_in_quantity + ?, batch_current_stock = batch_current_stock + ? WHERE id = ?',
                        [quantityDiff, quantityDiff, batchStock.id],
                        connection
                    );
                }

                if (quantityDiff > 0) {
                    await StockModel.updateStock(originalRecord.product_id, quantityDiff, 0, connection);
                } else {
                    await StockModel.updateStock(originalRecord.product_id, 0, Math.abs(quantityDiff), connection);
                }
            }

            await InRecordModel.update(inRecordId, data, connection);

            return { 
                success: true, 
                originalRecord,
                newData: data,
                quantityChanged: quantityDiff !== 0,
                quantityDiff
            };
        });
    },

    async cancelOutStock(outRecordId) {
        return await dbUtils.executeTransaction(async (connection) => {
            const outRecord = await OutRecordModel.findById(outRecordId, connection);
            if (!outRecord) {
                throw new Error('出库记录不存在');
            }

            const batchStock = await dbUtils.queryOne(
                'SELECT * FROM batch_stock WHERE product_id = ? AND batch_number = ?',
                [outRecord.product_id, outRecord.batch_number],
                connection
            );

            if (!batchStock) {
                throw new Error('批次库存不存在');
            }

            await dbUtils.update(
                'UPDATE batch_stock SET batch_out_quantity = batch_out_quantity - ?, batch_current_stock = batch_current_stock + ? WHERE id = ?',
                [outRecord.quantity, outRecord.quantity, batchStock.id],
                connection
            );

            await StockModel.updateStock(outRecord.product_id, outRecord.quantity, 0, connection);

            await OutRecordModel.delete(outRecordId, connection);

            return { success: true };
        });
    },

    async updateOutStock(outRecordId, data) {
        return await dbUtils.executeTransaction(async (connection) => {
            const originalRecord = await OutRecordModel.findById(outRecordId, connection);
            if (!originalRecord) {
                throw new Error('出库记录不存在');
            }

            if (data.batch_number !== undefined && data.batch_number !== null && data.batch_number !== originalRecord.batch_number) {
                throw new Error('不允许修改批号，请撤销后重新录入');
            }
            if (data.product_id !== undefined && data.product_id !== null && Number(data.product_id) !== Number(originalRecord.product_id)) {
                throw new Error('不允许修改商品，请撤销后重新录入');
            }

            if (data.quantity !== undefined && (!Number.isInteger(Number(data.quantity)) || Number(data.quantity) < 1)) {
                throw new Error('数量必须为正整数');
            }
            const nextQty = data.quantity !== undefined ? Number(data.quantity) : Number(originalRecord.quantity);
            const nextPrice = data.unit_price !== undefined && data.unit_price !== null && data.unit_price !== ''
                ? parseFloat(data.unit_price) : Number(originalRecord.unit_price || 0);
            if (data.total_amount === undefined || data.total_amount === null || data.total_amount === '') {
                data = { ...data, total_amount: parseFloat((nextQty * nextPrice).toFixed(2)) };
            }

            const quantityDiff = Number(data.quantity !== undefined ? data.quantity : originalRecord.quantity) - Number(originalRecord.quantity);

            if (quantityDiff !== 0) {
                if (quantityDiff > 0) {
                    const batchStock = await dbUtils.queryOne(
                        'SELECT * FROM batch_stock WHERE product_id = ? AND batch_number = ?',
                        [originalRecord.product_id, originalRecord.batch_number],
                        connection
                    );

                    if (!batchStock || batchStock.batch_current_stock < quantityDiff) {
                        throw new Error('批次库存不足，无法修改');
                    }

                    const stock = await StockModel.findByProductId(originalRecord.product_id, connection);
                    if (!stock || stock.current_stock < quantityDiff) {
                        throw new Error('总库存不足，无法修改');
                    }
                }

                const batchStock = await dbUtils.queryOne(
                    'SELECT * FROM batch_stock WHERE product_id = ? AND batch_number = ?',
                    [originalRecord.product_id, originalRecord.batch_number],
                    connection
                );

                if (batchStock) {
                    await dbUtils.update(
                        'UPDATE batch_stock SET batch_out_quantity = batch_out_quantity + ?, batch_current_stock = batch_current_stock - ? WHERE id = ?',
                        [quantityDiff, quantityDiff, batchStock.id],
                        connection
                    );
                }

                if (quantityDiff > 0) {
                    await StockModel.updateStock(originalRecord.product_id, 0, quantityDiff, connection);
                } else {
                    await StockModel.updateStock(originalRecord.product_id, Math.abs(quantityDiff), 0, connection);
                }
            }

            await OutRecordModel.update(outRecordId, data, connection);

            return { 
                success: true,
                originalRecord,
                newData: data,
                quantityChanged: quantityDiff !== 0,
                quantityDiff
            };
        });
    },

    // 清理所有数据（入库记录、出库记录、库存记录，但保留商品信息和备份记录）
    async clearAllData() {
        try {
            await dbUtils.executeTransaction(async (connection) => {
                await connection.execute('DELETE FROM in_records');
                await connection.execute('DELETE FROM out_records');
                await connection.execute('UPDATE products SET stock = 0');
                await connection.execute('DELETE FROM batch_stock');
                await connection.execute('UPDATE stock_inventory SET total_in_quantity = 0, total_out_quantity = 0, current_stock = 0, stock_status = \'out_of_stock\'');
            });
            return { success: true };
        } catch (error) {
            console.error('清理数据失败:', error);
            throw error;
        }
    },

    // 修改密码
    async changePassword(userId, currentPassword, newPassword) {
        if (!newPassword || String(newPassword).length < 6) {
            return { success: false, message: '新密码至少需要6位' };
        }

        const user = await dbUtils.queryOne('SELECT password FROM users WHERE id = ?', [userId]);
        if (!user) {
            return { success: false, message: '用户不存在' };
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return { success: false, message: '当前密码不正确' };
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await dbUtils.update(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedPassword, userId]
        );

        return { success: true };
    },

    // ===== Settings delegation =====
    getSettings: () => SettingsService.getSettings(),
    saveSettings: (s) => SettingsService.saveSettings(s),

    // ===== Backup delegation =====
    createBackup: (...args) => BackupService.createBackup(...args),
    cleanupOldAutoBackups: () => BackupService.cleanupOldAutoBackups(),
    getBackupList: () => BackupService.getBackupList(),
    syncBackupsFromFolder: () => BackupService.syncBackupsFromFolder(),
    getBackupById: (id) => BackupService.getBackupById(id),
    deleteBackup: (id) => BackupService.deleteBackup(id),
    restoreBackup: (id) => BackupService.restoreBackup(id),
    getAutoBackupConfig: () => BackupService.getAutoBackupConfig(),
    saveAutoBackupConfig: (config) => BackupService.saveAutoBackupConfig(config)
};

module.exports = InventoryService;
