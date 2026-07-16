// config/databases.example.js
// 复制此文件为 databases.js 并修改数据库配置
const mysql = require('mysql2');

// 数据库配置 - 请根据实际情况修改
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'your_username',
    password: process.env.DB_PASSWORD || 'your_password',
    database: process.env.DB_NAME || 'your_database_name',
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// 创建数据库连接池
const pool = mysql.createPool(dbConfig);

// 创建promise版本的连接池
const promisePool = pool.promise();

// 测试连接
pool.getConnection((err, connection) => {
    if (err) {
        console.error('数据库连接失败:', err);
        return;
    }
    console.log('数据库连接成功');
    connection.release();
});

module.exports = { pool, promisePool, dbConfig };
