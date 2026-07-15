const { promisePool } = require('../config/databases');

const dbUtils = {
    /**
     * 执行查询
     * @param {string} sql SQL语句
     * @param {Array} params 参数数组
     * @returns {Promise<Array>} 查询结果
     */
    async query(sql, params = [], connection = null) {
        const executor = connection || promisePool;
        const [rows] = await executor.query(sql, params);
        return rows;
    },

    /**
     * 执行单行查询
     * @param {string} sql SQL语句
     * @param {Array} params 参数数组
     * @returns {Promise<Object|null>} 单行结果
     */
    async queryOne(sql, params = [], connection = null) {
        const executor = connection || promisePool;
        const [rows] = await executor.query(sql, params);
        return rows[0] || null;
    },

    /**
     * 执行插入操作
     * @param {string} sql SQL语句
     * @param {Array} params 参数数组
     * @returns {Promise<Object>} 插入结果
     */
    async insert(sql, params = [], connection = null) {
        const executor = connection || promisePool;
        const [result] = await executor.query(sql, params);
        return result;
    },

    /**
     * 执行更新操作
     * @param {string} sql SQL语句
     * @param {Array} params 参数数组
     * @returns {Promise<Object>} 更新结果
     */
    async update(sql, params = [], connection = null) {
        const executor = connection || promisePool;
        const [result] = await executor.query(sql, params);
        return result;
    },

    /**
     * 执行删除操作
     * @param {string} sql SQL语句
     * @param {Array} params 参数数组
     * @returns {Promise<Object>} 删除结果
     */
    async delete(sql, params = [], connection = null) {
        const executor = connection || promisePool;
        const [result] = await executor.query(sql, params);
        return result;
    },

    /**
     * 开始事务
     * @returns {Promise<void>}
     */
    async beginTransaction() {
        return await promisePool.beginTransaction();
    },

    /**
     * 提交事务
     * @returns {Promise<void>}
     */
    async commit() {
        return await promisePool.commit();
    },

    /**
     * 回滚事务
     * @returns {Promise<void>}
     */
    async rollback() {
        return await promisePool.rollback();
    },

    /**
     * 安全执行事务
     * @param {Function} transactionFn 事务函数
     * @returns {Promise<any>} 事务结果
     */
    async executeTransaction(transactionFn) {
        const connection = await promisePool.getConnection();
        try {
            await connection.beginTransaction();
            const result = await transactionFn(connection);
            await connection.commit();
            return result;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
};

module.exports = dbUtils;