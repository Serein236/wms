/**
 * 从入库记录和出库记录中提取供应商/客户名称，同步到 suppliers 表
 * 用法: node scripts/sync_suppliers.js
 * 说明: 升级时执行一次，之后录入出入库会自动添加新供应商
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
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    charset: 'utf8mb4'
});

console.log(`连接数据库: ${DB_HOST}:${DB_PORT}/${DB_NAME}\n`);

async function sync() {
    console.log('开始同步供应商/客户名称...\n');

    // 1. 从入库记录提取供应商名称
    const inSources = await query(`
        SELECT DISTINCT source FROM in_records
        WHERE source IS NOT NULL AND source != ''
    `);
    console.log(`入库记录中发现 ${inSources.length} 个供应商名称`);

    // 2. 从出库记录提取客户名称
    const outDestinations = await query(`
        SELECT DISTINCT destination FROM out_records
        WHERE destination IS NOT NULL AND destination != ''
    `);
    console.log(`出库记录中发现 ${outDestinations.length} 个客户名称`);

    // 3. 合并去重
    const allNames = [...new Set([
        ...inSources.map(r => r.source),
        ...outDestinations.map(r => r.destination)
    ])];
    console.log(`合并去重后共 ${allNames.length} 个名称\n`);

    // 4. 插入 suppliers 表（跳过已存在的）
    let inserted = 0;
    let skipped = 0;

    for (const name of allNames) {
        try {
            const result = await query(
                'INSERT IGNORE INTO suppliers (name) VALUES (?)',
                [name]
            );
            if (result.affectedRows > 0) {
                inserted++;
                console.log(`  + 新增: ${name}`);
            } else {
                skipped++;
            }
        } catch (err) {
            console.error(`  x 失败: ${name} - ${err.message}`);
        }
    }

    // 5. 统计结果
    const total = await query('SELECT COUNT(*) as count FROM suppliers');
    console.log(`\n同步完成！`);
    console.log(`  新增: ${inserted} 个`);
    console.log(`  跳过(已存在): ${skipped} 个`);
    console.log(`  供应商总数: ${total[0].count} 个`);

    conn.end();
}

function query(sql, params = []) {
    return new Promise((resolve, reject) => {
        conn.query(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

sync().catch(err => {
    console.error('同步失败:', err.message);
    conn.end();
    process.exit(1);
});
