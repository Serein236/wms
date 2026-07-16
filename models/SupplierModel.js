const dbUtils = require('../utils/dbUtils');

const SupplierModel = {
    async findAll(activeOnly = false) {
        let sql = 'SELECT * FROM suppliers';
        if (activeOnly) sql += ' WHERE is_active = 1';
        sql += ' ORDER BY name ASC';
        return await dbUtils.query(sql);
    },

    async findById(id) {
        return await dbUtils.queryOne('SELECT * FROM suppliers WHERE id = ?', [id]);
    },

    async findByName(name) {
        return await dbUtils.queryOne('SELECT * FROM suppliers WHERE name = ?', [name]);
    },

    async search(query) {
        if (!query || query.length < 1) {
            return await this.findAll(true);
        }
        return await dbUtils.query(
            'SELECT * FROM suppliers WHERE is_active = 1 AND name LIKE ? ORDER BY name ASC',
            [`%${query}%`]
        );
    },

    async create(data) {
        const { name, contact_person, phone, email, address, remark } = data;
        const result = await dbUtils.insert(
            'INSERT INTO suppliers (name, contact_person, phone, email, address, remark) VALUES (?, ?, ?, ?, ?, ?)',
            [name, contact_person || null, phone || null, email || null, address || null, remark || null]
        );
        return { id: result.insertId, ...data };
    },

    async update(id, data) {
        const fields = [];
        const values = [];
        for (const [key, value] of Object.entries(data)) {
            if (['name', 'contact_person', 'phone', 'email', 'address', 'remark', 'is_active'].includes(key) && value !== undefined) {
                fields.push(`${key} = ?`);
                values.push(value);
            }
        }
        if (fields.length === 0) return null;
        values.push(id);
        return await dbUtils.update(`UPDATE suppliers SET ${fields.join(', ')} WHERE id = ?`, values);
    },

    async delete(id) {
        return await dbUtils.delete('DELETE FROM suppliers WHERE id = ?', [id]);
    },

    async toggleActive(id) {
        const supplier = await this.findById(id);
        if (!supplier) throw new Error('供应商不存在');
        const newStatus = !supplier.is_active;
        await dbUtils.update('UPDATE suppliers SET is_active = ? WHERE id = ?', [newStatus, id]);
        return newStatus;
    },

    async count() {
        const result = await dbUtils.queryOne('SELECT COUNT(*) as count FROM suppliers');
        return result.count;
    },

    async countActive() {
        const result = await dbUtils.queryOne('SELECT COUNT(*) as count FROM suppliers WHERE is_active = 1');
        return result.count;
    }
};

module.exports = SupplierModel;
