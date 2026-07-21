const fs = require('fs');
const mysql = require('mysql2');

const sql = fs.readFileSync('D:/wms/sql/update_v3.4.sql', 'utf8');
const conn = mysql.createConnection({host:'localhost',user:'root',password:'root',database:'warehouse',multipleStatements:true,charset:'utf8mb4'});

conn.query(sql, (err, results) => {
    if (err) {
        console.error('Error:', err.message.substring(0, 200));
    } else {
        console.log('SQL executed successfully');
        if (Array.isArray(results)) {
            results.forEach(r => {
                if (r && r.message) console.log('  ' + r.message);
                if (r && r.info) console.log('  ' + r.info);
            });
        }
    }
    conn.end();
});
