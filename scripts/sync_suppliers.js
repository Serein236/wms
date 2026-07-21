/**
 * 清空 suppliers 和 customers 表，重新从入库/出库记录中归纳
 * 用法: node scripts/sync_suppliers.js
 * 说明: 升级时执行一次，之后录入时会自动添加新供应商/客户
 */
const mysql = require('mysql2');

// ========== 请修改为你的数据库信息 ==========
const DB_HOST = 'localhost';
const DB_PORT = 3306;
const DB_USER = 'root';
const DB_PASSWORD = 'root';
const DB_NAME = 'warehouse';
// ============================================

const conn = mysql.createConnection({
    host: DB_HOST, port: DB_PORT, user: DB_USER,
    password: DB_PASSWORD, database: DB_NAME, charset: 'utf8mb4'
});

console.log(`连接数据库: ${DB_HOST}:${DB_PORT}/${DB_NAME}\n`);

async function sync() {
    // 1. 清空 suppliers 表
    await query('DELETE FROM suppliers');
    console.log('已清空 suppliers 表');

    // 2. 清空 customers 表
    await query('DELETE FROM customers');
    console.log('已清空 customers 表');

    // 3. 从入库记录提取供应商名称 → suppliers 表
    const inSources = await query(
        "SELECT DISTINCT source FROM in_records WHERE source IS NOT NULL AND source != ''"
    );
    console.log(`入库记录中发现 ${inSources.length} 个供应商名称`);

    let inserted = 0;
    for (const row of inSources) {
        await query('INSERT INTO suppliers (name) VALUES (?)', [row.source]);
        inserted++;
    }
    console.log(`供应商同步完成: ${inserted} 个\n`);

    // 4. 从出库记录提取客户名称 → customers 表
    const outDestinations = await query(
        "SELECT DISTINCT destination FROM out_records WHERE destination IS NOT NULL AND destination != ''"
    );
    console.log(`出库记录中发现 ${outDestinations.length} 个客户名称`);

    inserted = 0;
    for (const row of outDestinations) {
        await query('INSERT INTO customers (name) VALUES (?)', [row.destination]);
        inserted++;
    }
    console.log(`客户同步完成: ${inserted} 个\n`);

    // 5. 统计结果
    const supCount = await query('SELECT COUNT(*) as count FROM suppliers');
    const cusCount = await query('SELECT COUNT(*) as count FROM customers');
    console.log('同步完成！');
    console.log(`  供应商: ${supCount[0].count} 个`);
    console.log(`  客户: ${cusCount[0].count} 个`);

    conn.end();
}

function query(sql, params) {
    return new Promise((resolve, reject) => {
        conn.query(sql, params, (err, rows) => {
            if (err) reject(err); else resolve(rows);
        });
    });
}

sync().catch(err => {
    console.error('同步失败:', err.message);
    conn.end();
    process.exit(1);
});
