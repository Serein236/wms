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

const InventoryService = {
    // connection 可选：传入外部事务连接时并入该事务（如盘点完成需整体原子提交），
    // 不传时自建事务，行为与原来一致
    async inStock(data, connection = null) {
        const exec = async (conn) => {
            const record = await InRecordModel.create(data, conn);

            const existingBatch = await dbUtils.queryOne(
                'SELECT * FROM batch_stock WHERE product_id = ? AND batch_number = ?',
                [data.product_id, data.batch_number],
                conn
            );

            if (existingBatch) {
                await dbUtils.update(
                    'UPDATE batch_stock SET batch_in_quantity = batch_in_quantity + ?, batch_current_stock = batch_current_stock + ? WHERE id = ?',
                    [data.quantity, data.quantity, existingBatch.id],
                    conn
                );
            } else {
                await dbUtils.insert(
                    'INSERT INTO batch_stock (product_id, batch_number, production_date, expiration_date, batch_in_quantity, batch_out_quantity, batch_current_stock, batch_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    [data.product_id, data.batch_number, data.production_date, data.expiration_date, data.quantity, 0, data.quantity, 'normal'],
                    conn
                );
            }

            await StockModel.updateStock(data.product_id, data.quantity, 0, conn);

            return record;
        };
        if (connection) return await exec(connection);
        return await dbUtils.executeTransaction(exec);
    },

    async outStock(data, connection = null) {
        const exec = async (conn) => {
            const batchStock = await dbUtils.queryOne(
                'SELECT * FROM batch_stock WHERE product_id = ? AND batch_number = ?',
                [data.product_id, data.batch_number],
                conn
            );

            if (!batchStock || batchStock.batch_current_stock < data.quantity) {
                throw new Error('批次库存不足');
            }

            const stock = await StockModel.findByProductId(data.product_id, conn);
            if (!stock || stock.current_stock < data.quantity) {
                throw new Error('总库存不足');
            }

            const record = await OutRecordModel.create(data, conn);

            await dbUtils.update(
                'UPDATE batch_stock SET batch_out_quantity = batch_out_quantity + ?, batch_current_stock = batch_current_stock - ? WHERE id = ?',
                [data.quantity, data.quantity, batchStock.id],
                conn
            );

            await StockModel.updateStock(data.product_id, 0, data.quantity, conn);

            return record;
        };
        if (connection) return await exec(connection);
        return await dbUtils.executeTransaction(exec);
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
                'SELECT * FROM batch_stock WHERE product_id = ? AND batch_number = ?',
                [inRecord.product_id, inRecord.batch_number],
                connection
            );

            if (!batchStock || batchStock.batch_current_stock < inRecord.quantity) {
                throw new Error('批次库存不足，无法撤销');
            }

            const stock = await StockModel.findByProductId(inRecord.product_id, connection);
            if (!stock || stock.current_stock < inRecord.quantity) {
                throw new Error('总库存不足，无法撤销');
            }

            await dbUtils.update(
                'UPDATE batch_stock SET batch_in_quantity = batch_in_quantity - ?, batch_current_stock = batch_current_stock - ? WHERE id = ?',
                [inRecord.quantity, inRecord.quantity, batchStock.id],
                connection
            );

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

            // 批次号与商品不允许修改：库存差额始终按原批次调整，
            // 若允许改批次/商品会导致记录与批次账永久错位。如需更换请撤销后重新录入。
            if (data.batch_number !== undefined && data.batch_number !== originalRecord.batch_number) {
                throw new Error('不允许修改批次号，如需更换批次请撤销原记录后重新录入');
            }
            if (data.product_id !== undefined && Number(data.product_id) !== originalRecord.product_id) {
                throw new Error('不允许修改商品，请撤销原记录后重新录入');
            }

            // 数量校验：缺 quantity 或传入 0/负数/非整数时拒绝，
            // 避免 NaN 进入 SQL 或把库存调成负值
            if (data.quantity !== undefined && (!Number.isInteger(Number(data.quantity)) || Number(data.quantity) <= 0)) {
                throw new Error('数量必须为正整数');
            }

            // 合计金额联动：调用方改了数量或单价但未显式给 total_amount 时，
            // 按 数量×单价 重算（缺省值取原记录），避免合计与明细不一致
            if (data.total_amount === undefined && (data.quantity !== undefined || data.unit_price !== undefined)) {
                const newQuantity = data.quantity !== undefined ? data.quantity : originalRecord.quantity;
                const newUnitPrice = data.unit_price !== undefined ? data.unit_price : originalRecord.unit_price;
                data.total_amount = parseFloat((Number(newQuantity) * Number(newUnitPrice)).toFixed(2));
            }

            const quantityDiff = data.quantity - originalRecord.quantity;

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

            // 批次号与商品不允许修改：库存差额始终按原批次调整，
            // 若允许改批次/商品会导致记录与批次账永久错位。如需更换请撤销后重新录入。
            if (data.batch_number !== undefined && data.batch_number !== originalRecord.batch_number) {
                throw new Error('不允许修改批次号，如需更换批次请撤销原记录后重新录入');
            }
            if (data.product_id !== undefined && Number(data.product_id) !== originalRecord.product_id) {
                throw new Error('不允许修改商品，请撤销原记录后重新录入');
            }

            // 数量校验：缺 quantity 或传入 0/负数/非整数时拒绝，
            // 避免 NaN 进入 SQL 或把库存调成负值
            if (data.quantity !== undefined && (!Number.isInteger(Number(data.quantity)) || Number(data.quantity) <= 0)) {
                throw new Error('数量必须为正整数');
            }

            // 合计金额联动：调用方改了数量或单价但未显式给 total_amount 时，
            // 按 数量×单价 重算（缺省值取原记录），避免合计与明细不一致
            if (data.total_amount === undefined && (data.quantity !== undefined || data.unit_price !== undefined)) {
                const newQuantity = data.quantity !== undefined ? data.quantity : originalRecord.quantity;
                const newUnitPrice = data.unit_price !== undefined ? data.unit_price : originalRecord.unit_price;
                data.total_amount = parseFloat((Number(newQuantity) * Number(newUnitPrice)).toFixed(2));
            }

            const quantityDiff = data.quantity - originalRecord.quantity;

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
