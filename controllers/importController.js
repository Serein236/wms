const XLSX = require('xlsx');
const dbUtils = require('../utils/dbUtils');
const logger = require('../utils/logger');
const ProductModel = require('../models/ProductModel');

const importController = {
    async importProducts(req, res) {
        if (!req.file) {
            return res.status(400).json({ success: false, message: '请上传文件' });
        }

        try {
            const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(sheet);

            if (!data.length) {
                return res.status(400).json({ success: false, message: '文件中没有数据' });
            }

            const requiredFields = ['name'];
            const missingFields = requiredFields.filter(f => !data[0].hasOwnProperty(f));
            if (missingFields.length) {
                return res.status(400).json({ success: false, message: `缺少必填列: ${missingFields.join(', ')}` });
            }

            let imported = 0, skipped = 0, errors = [];
            for (let i = 0; i < data.length; i++) {
                const row = data[i];
                const name = String(row.name || '').trim();
                if (!name) { skipped++; continue; }

                try {
                    const existing = await dbUtils.queryOne('SELECT id FROM products WHERE name = ?', [name]);
                    if (existing) { skipped++; continue; }

                    // 统一走 ProductModel.create：自动生成唯一 product_code（NOT NULL），
                    // 并初始化 stock_inventory，避免裸 INSERT 缺列导致整行失败
                    await ProductModel.create({
                        name,
                        spec: row.spec ? String(row.spec).trim() : '',
                        unit: row.unit ? String(row.unit).trim() : '',
                        packing_spec: row.packing_spec ? String(row.packing_spec).trim() : '',
                        retail_price: row.retail_price != null && row.retail_price !== '' ? parseFloat(row.retail_price) : null,
                        barcode: row.barcode ? String(row.barcode).trim() : null,
                        manufacturer: row.manufacturer ? String(row.manufacturer).trim() : null,
                        warning_quantity: row.warning_quantity ? parseInt(row.warning_quantity) : 10,
                        danger_quantity: row.danger_quantity ? parseInt(row.danger_quantity) : 5
                    });

                    imported++;
                } catch (err) {
                    errors.push(`第${i + 2}行: ${err.message}`);
                }
            }

            logger.info('批量导入商品', { operator: req.session.username, operatorId: req.session.userId, imported, skipped, errorCount: errors.length });
            res.json({ success: true, data: { imported, skipped, errors: errors.slice(0, 10), total: data.length } });
        } catch (error) {
            console.error('导入商品错误:', error);
            res.status(500).json({ success: false, message: '导入失败' });
        }
    },

    async getTemplate(req, res) {
        const template = [
            { name: '商品名称*', spec: '规格', unit: '单位', retail_price: '零售价', warning_quantity: '预警数量', danger_quantity: '危险数量' },
            { name: '示例商品A', spec: '500ml', unit: '瓶', retail_price: 29.99, warning_quantity: 10, danger_quantity: 5 }
        ];
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(template);
        XLSX.utils.book_append_sheet(wb, ws, '商品导入模板');
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Disposition', 'attachment; filename=product_import_template.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    }
};

module.exports = importController;
