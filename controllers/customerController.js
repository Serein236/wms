const dbUtils = require('../utils/dbUtils');
const { parsePagination, addPagination, buildPaginationResponse } = require('../utils/pagination');

const customerController = {
    async list(req, res) {
        try {
            const { query, page, pageSize } = req.query;
            const pagination = parsePagination({ page, pageSize }, { defaultPageSize: 50 });

            let customers;
            let total;
            if (query && query.length >= 1) {
                customers = await dbUtils.query(
                    'SELECT * FROM customers WHERE name LIKE ? ORDER BY name ASC',
                    ['%' + query + '%']
                );
                total = customers.length;
                customers = customers.slice(pagination.offset, pagination.offset + pagination.limit);
            } else {
                const countResult = await dbUtils.queryOne('SELECT COUNT(*) as count FROM customers');
                total = countResult.count;
                customers = await dbUtils.query(addPagination('SELECT * FROM customers ORDER BY name ASC', pagination));
            }

            res.json({ success: true, data: customers, pagination: buildPaginationResponse(total, pagination) });
        } catch (error) {
            console.error('获取客户列表错误:', error);
            res.status(500).json({ success: false, message: '获取客户列表失败' });
        }
    },

    async get(req, res) {
        try {
            const customer = await dbUtils.queryOne('SELECT * FROM customers WHERE id = ?', [req.params.id]);
            if (!customer) return res.status(404).json({ success: false, message: '客户不存在' });
            res.json({ success: true, data: customer });
        } catch (error) {
            res.status(500).json({ success: false, message: '获取客户失败' });
        }
    },

    async create(req, res) {
        const { name } = req.body;
        if (!name) return res.status(400).json({ success: false, message: '客户名称不能为空' });
        try {
            const existing = await dbUtils.queryOne('SELECT id FROM customers WHERE name = ?', [name]);
            if (existing) return res.status(400).json({ success: false, message: '客户名称已存在' });

            const { contact_person, phone, email, address, remark } = req.body;
            const result = await dbUtils.insert(
                'INSERT INTO customers (name, contact_person, phone, email, address, remark) VALUES (?, ?, ?, ?, ?, ?)',
                [name, contact_person || null, phone || null, email || null, address || null, remark || null]
            );
            res.json({ success: true, data: { id: result.insertId, ...req.body } });
        } catch (error) {
            console.error('创建客户错误:', error);
            res.status(500).json({ success: false, message: '创建客户失败' });
        }
    },

    async update(req, res) {
        try {
            const customer = await dbUtils.queryOne('SELECT * FROM customers WHERE id = ?', [req.params.id]);
            if (!customer) return res.status(404).json({ success: false, message: '客户不存在' });

            if (req.body.name && req.body.name !== customer.name) {
                const existing = await dbUtils.queryOne('SELECT id FROM customers WHERE name = ?', [req.body.name]);
                if (existing) return res.status(400).json({ success: false, message: '客户名称已存在' });
            }

            const fields = [];
            const values = [];
            for (const [key, value] of Object.entries(req.body)) {
                if (['name', 'contact_person', 'phone', 'email', 'address', 'remark', 'is_active'].includes(key) && value !== undefined) {
                    fields.push(key + ' = ?');
                    values.push(value);
                }
            }
            if (fields.length === 0) return res.json({ success: true, message: '无更新' });
            values.push(req.params.id);
            await dbUtils.update('UPDATE customers SET ' + fields.join(', ') + ' WHERE id = ?', values);
            res.json({ success: true, message: '更新成功' });
        } catch (error) {
            console.error('更新客户错误:', error);
            res.status(500).json({ success: false, message: '更新客户失败' });
        }
    },

    async delete(req, res) {
        try {
            await dbUtils.delete('DELETE FROM customers WHERE id = ?', [req.params.id]);
            res.json({ success: true, message: '删除成功' });
        } catch (error) {
            res.status(500).json({ success: false, message: '删除客户失败' });
        }
    },

    async search(req, res) {
        try {
            const { query } = req.query;
            if (!query || query.length < 1) {
                return res.json({ success: true, data: [] });
            }
            const customers = await dbUtils.query(
                'SELECT * FROM customers WHERE name LIKE ? ORDER BY name ASC',
                ['%' + query + '%']
            );
            res.json({ success: true, data: customers });
        } catch (error) {
            res.status(500).json({ success: false, message: '搜索客户失败' });
        }
    }
};

module.exports = customerController;
