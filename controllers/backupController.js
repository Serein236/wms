// controllers/backupController.js
const BackupService = require('../services/BackupService');
const logger = require('../utils/logger');

const backupController = {
    async createBackup(req, res) {
        const username = req.session?.username;
        const userId = req.session?.userId;
        try {
            const result = await BackupService.createBackup(username, 'manual');
            logger.backupCreated(result.fileName, result.fileSize, 'manual', username, userId);
            res.json(result);
        } catch (error) {
            console.error('创建备份错误:', error);
            logger.error('创建备份失败', { operator: username, operatorId: userId, error: error.message });
            res.status(500).json({ success: false, message: error.message || '创建备份失败' });
        }
    },

    async getBackupList(req, res) {
        const username = req.session?.username;
        const userId = req.session?.userId;
        try {
            const backups = await BackupService.getBackupList();
            res.json(backups);
        } catch (error) {
            console.error('获取备份列表错误:', error);
            logger.error('获取备份列表失败', { operator: username, operatorId: userId, error: error.message });
            res.status(500).json({ success: false, message: '获取备份列表失败' });
        }
    },

    async downloadBackup(req, res) {
        const { id } = req.params;
        const username = req.session?.username;
        const userId = req.session?.userId;
        try {
            const backup = await BackupService.getBackupById(id);
            if (!backup) {
                return res.status(404).json({ success: false, message: '备份文件不存在' });
            }
            logger.info('下载备份', { operator: username, operatorId: userId, target: backup.file_name, description: '下载备份文件' });
            res.download(backup.file_path, backup.file_name);
        } catch (error) {
            console.error('下载备份错误:', error);
            logger.error('下载备份失败', { operator: username, operatorId: userId, backupId: id, error: error.message });
            res.status(500).json({ success: false, message: '下载备份失败' });
        }
    },

    async deleteBackup(req, res) {
        const { id } = req.params;
        const username = req.session?.username;
        const userId = req.session?.userId;
        try {
            const backup = await BackupService.getBackupById(id);
            await BackupService.deleteBackup(id);
            logger.backupDeleted(backup?.file_name || `ID:${id}`, username, userId);
            res.json({ success: true });
        } catch (error) {
            console.error('删除备份错误:', error);
            logger.error('删除备份失败', { operator: username, operatorId: userId, backupId: id, error: error.message });
            res.status(500).json({ success: false, message: error.message || '删除备份失败' });
        }
    },

    async restoreBackup(req, res) {
        const { id } = req.params;
        const username = req.session?.username;
        const userId = req.session?.userId;
        try {
            const backup = await BackupService.getBackupById(id);
            await BackupService.restoreBackup(id);
            logger.backupRestored(backup?.file_name || `ID:${id}`, username, userId);
            res.json({ success: true, message: '数据恢复成功' });
        } catch (error) {
            console.error('恢复备份错误:', error);
            logger.error('恢复备份失败', { operator: username, operatorId: userId, backupId: id, error: error.message });
            res.status(500).json({ success: false, message: error.message || '恢复备份失败' });
        }
    },

    async saveAutoBackupConfig(req, res) {
        const username = req.session?.username;
        const userId = req.session?.userId;
        try {
            const config = req.body;
            await BackupService.saveAutoBackupConfig(config);
            logger.settingsUpdated('autoBackup', null, config, username, userId);
            res.json({ success: true });
        } catch (error) {
            console.error('保存自动备份配置错误:', error);
            logger.error('保存自动备份配置失败', { operator: username, operatorId: userId, error: error.message });
            res.status(500).json({ success: false, message: '保存自动备份配置失败' });
        }
    }
};

module.exports = backupController;
