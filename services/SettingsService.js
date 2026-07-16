// services/SettingsService.js
const dbUtils = require('../utils/dbUtils');

const SettingsService = {
    // 获取设置
    async getSettings() {
        try {
            const rows = await dbUtils.query('SELECT setting_key, setting_value FROM settings');
            if (!rows || rows.length === 0) {
                return null;
            }
            const result = {};
            for (const row of rows) {
                try {
                    result[row.setting_key] = JSON.parse(row.setting_value);
                } catch (e) {
                    result[row.setting_key] = row.setting_value;
                }
            }
            return result;
        } catch (error) {
            console.error('获取设置失败:', error);
            return null;
        }
    },

    // 保存设置
    async saveSettings(settings) {
        try {
            for (const [key, value] of Object.entries(settings)) {
                const valueJson = JSON.stringify(value);
                const existing = await dbUtils.queryOne('SELECT id FROM settings WHERE setting_key = ?', [key]);

                if (existing) {
                    await dbUtils.update(
                        'UPDATE settings SET setting_value = ?, updated_at = NOW() WHERE setting_key = ?',
                        [valueJson, key]
                    );
                } else {
                    await dbUtils.insert(
                        'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)',
                        [key, valueJson]
                    );
                }
            }
            return { success: true };
        } catch (error) {
            console.error('保存设置失败:', error);
            throw error;
        }
    }
};

module.exports = SettingsService;
