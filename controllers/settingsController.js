// controllers/settingsController.js
const SettingsService = require('../services/SettingsService');
const InventoryService = require('../services/InventoryService');
const logger = require('../utils/logger');

const settingsController = {
    /**
     * 公开站点信息（无需登录）：页脚公司名 / 备案号 / 备案链接
     * 仅供登录页与页脚展示使用，不暴露导出/备份等内部配置
     */
    async getPublicSettings(req, res) {
        try {
            const settings = await SettingsService.getSettings() || {};
            res.json({
                companyName: settings.companyName || '',
                icp: settings.icp || '',
                icpUrl: settings.icpUrl || ''
            });
        } catch (error) {
            console.error('获取公开设置错误:', error);
            res.status(500).json({ success: false, message: '获取设置失败' });
        }
    },

    async getSettings(req, res) {
        try {
            const settings = await SettingsService.getSettings();
            res.json(settings);
        } catch (error) {
            console.error('获取设置错误:', error);
            res.status(500).json({ success: false, message: '获取设置失败' });
        }
    },

    async saveSettings(req, res) {
        const username = req.session?.username;
        const userId = req.session?.userId;
        try {
            let settings = req.body;
            // 兼容前端 { settings: JSON.stringify(obj) } 的包裹形式
            if (settings && typeof settings.settings === 'string') {
                try {
                    settings = JSON.parse(settings.settings);
                } catch (e) {
                    return res.status(400).json({ success: false, message: '设置数据格式错误' });
                }
            } else if (settings && typeof settings.settings === 'object' && settings.settings !== null) {
                settings = settings.settings;
            }
            if (!settings || typeof settings !== 'object') {
                return res.status(400).json({ success: false, message: '无效的设置数据' });
            }
            // 白名单：导出/自动备份配置 + 公司信息（含备案号与备案链接）
            const allowedKeys = ['export', 'autoBackup', 'companyName', 'phone', 'address', 'icp', 'icpUrl'];
            const sanitized = {};
            for (const key of allowedKeys) {
                if (settings[key] !== undefined) {
                    sanitized[key] = settings[key];
                }
            }
            await SettingsService.saveSettings(sanitized);
            logger.settingsUpdated('settings', null, sanitized, username, userId);
            res.json({ success: true });
        } catch (error) {
            console.error('保存设置错误:', error);
            logger.error('保存设置失败', { operator: username, operatorId: userId, error: error.message });
            res.status(500).json({ success: false, message: '保存设置失败' });
        }
    },

    async changePassword(req, res) {
        const username = req.session?.username;
        const userId = req.session?.userId;
        if (!username || !userId) {
            return res.status(401).json({ success: false, message: '未登录' });
        }

        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: '当前密码和新密码不能为空' });
        }

        try {
            const result = await InventoryService.changePassword(userId, currentPassword, newPassword);
            if (result.success) {
                logger.passwordChanged(username, userId, true);
                res.json({ success: true, message: '密码修改成功' });
            } else {
                res.status(400).json({ success: false, message: result.message });
            }
        } catch (error) {
            console.error('修改密码错误:', error);
            logger.error('修改密码失败', { operator: username, operatorId: userId, error: error.message });
            res.status(500).json({ success: false, message: '修改密码失败' });
        }
    }
};

module.exports = settingsController;
