// services/BackupService.js
const dbUtils = require('../utils/dbUtils');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// 导入数据库配置获取连接信息
let dbConfigObj = null;
try {
    const dbModule = require('../config/databases');
    dbConfigObj = dbModule.dbConfig || null;
} catch (e) {
    console.error('加载数据库配置失败:', e);
}

// 定位 MySQL 客户端可执行文件（mysqldump / mysql）
// Windows 本地开发时 MySQL 常被解压到非 PATH 目录，需要自动探测
function findMySqlBin(name) {
    const exeName = process.platform === 'win32' ? `${name}.exe` : name;

    // 1. 优先 PATH / 环境变量显式指定
    const envKey = name === 'mysqldump' ? 'MYSQLDUMP_PATH' : 'MYSQL_PATH';
    if (process.env[envKey] && fsSync.existsSync(process.env[envKey])) {
        return process.env[envKey];
    }

    // 2. 尝试直接调用（PATH 中已有）
    try {
        const cmd = process.platform === 'win32' ? 'where' : 'which';
        const result = require('child_process').execSync(`${cmd} ${name}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
        const found = result.trim().split(/\r?\n/)[0];
        if (found && fsSync.existsSync(found)) return found;
    } catch (e) {
        // ignore
    }

    // 3. 常见 Windows 安装路径探测（自动扫描盘符下的 mysql-* 目录）
    if (process.platform === 'win32') {
        const drives = ['C:', 'D:', 'E:', 'F:', 'G:', 'H:'];
        const programDirs = [
            'Program Files\\MySQL',
            'Program Files (x86)\\MySQL'
        ];

        for (const drive of drives) {
            // 3.1 解压版：D:\mysql-x.x.x\bin
            try {
                const entries = fsSync.readdirSync(path.join(drive, '\\'));
                for (const entry of entries) {
                    const fullDir = path.join(drive, entry);
                    const stat = fsSync.statSync(fullDir);
                    if (stat.isDirectory() && /^mysql-\d+\.\d+(\.\d+)?$/i.test(entry)) {
                        const binDir = path.join(fullDir, 'bin');
                        const exePath = path.join(binDir, exeName);
                        if (fsSync.existsSync(exePath)) return exePath;
                    }
                }
            } catch (e) {
                // ignore access errors
            }

            // 3.2 安装版：Program Files\MySQL\MySQL Server x.x\bin
            for (const programDir of programDirs) {
                const base = path.join(drive, programDir);
                try {
                    if (!fsSync.existsSync(base)) continue;
                    const entries = fsSync.readdirSync(base);
                    for (const entry of entries) {
                        const fullDir = path.join(base, entry);
                        const stat = fsSync.statSync(fullDir);
                        if (stat.isDirectory() && /^MySQL Server/i.test(entry)) {
                            const exePath = path.join(fullDir, 'bin', exeName);
                            if (fsSync.existsSync(exePath)) return exePath;
                        }
                    }
                } catch (e) {
                    // ignore
                }
            }
        }
    }

    // 4. 兜底：返回原始命令名，让 spawn 抛出更清晰的 ENOENT
    return name;
}

// 获取北京时间（UTC+8）的格式化时间字符串
function getBeijingTimestamp() {
    const now = new Date();
    const beijingTime = now.toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai' });
    return beijingTime.replace(/[:.]/g, '-').slice(0, 19);
}

const BackupService = {
    // 创建备份
    // backupType: 'manual' | 'auto' | 'pre_delete'
    async createBackup(createdBy, backupType = 'manual') {
        const backupDir = path.join(process.cwd(), 'backup');
        const timestamp = getBeijingTimestamp();

        let fileNamePrefix;
        switch (backupType) {
            case 'auto':
                fileNamePrefix = 'warehouse_auto_backup';
                break;
            case 'pre_delete':
                fileNamePrefix = 'warehouse_pre_delete_backup';
                break;
            case 'manual':
            default:
                fileNamePrefix = 'warehouse_manual_backup';
                break;
        }
        const fileName = `${fileNamePrefix}_${timestamp}.sql`;
        const filePath = path.join(backupDir, fileName);

        if (!fsSync.existsSync(backupDir)) {
            fsSync.mkdirSync(backupDir, { recursive: true });
        }

        let dbHost = 'localhost';
        let dbUser = 'root';
        let dbPassword = '';
        let dbName = 'warehouse';

        if (dbConfigObj) {
            dbHost = dbConfigObj.host || dbHost;
            dbUser = dbConfigObj.user || dbUser;
            dbPassword = dbConfigObj.password || dbPassword;
            dbName = dbConfigObj.database || dbName;
        }

        const mysqldumpArgs = ['-h', dbHost, '-u', dbUser];
        if (dbPassword) {
            mysqldumpArgs.push(`-p${dbPassword}`);
        }
        mysqldumpArgs.push(dbName);

        try {
            const { spawn } = require('child_process');
            const mysqldumpPath = findMySqlBin('mysqldump');
            await new Promise((resolve, reject) => {
                const child = spawn(mysqldumpPath, mysqldumpArgs, { shell: false });
                const writeStream = fsSync.createWriteStream(filePath);
                child.stdout.pipe(writeStream);
                child.stderr.on('data', (data) => {});
                child.on('close', (code) => {
                    if (code === 0) resolve();
                    else reject(new Error(`mysqldump exited with code ${code}`));
                });
                child.on('error', reject);
            });

            const stats = fsSync.statSync(filePath);
            const fileSize = (stats.size / 1024 / 1024).toFixed(2);

            const beijingTimeStr = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai' });

            await dbUtils.insert(
                'INSERT INTO backups (file_name, file_path, file_size, created_by, created_at, backup_type) VALUES (?, ?, ?, ?, ?, ?)',
                [fileName, filePath, fileSize, createdBy, beijingTimeStr, backupType]
            );

            if (backupType === 'auto') {
                await this.cleanupOldAutoBackups();
            }

            return { success: true, fileName, fileSize };
        } catch (error) {
            if (fsSync.existsSync(filePath)) {
                fsSync.unlinkSync(filePath);
            }
            throw new Error(`备份失败: ${error.message}`);
        }
    },

    // 清理旧的自动备份（保留数量由配置决定）
    async cleanupOldAutoBackups() {
        try {
            const { getSettings } = require('./SettingsService');
            const settings = await getSettings();
            const config = settings?.autoBackup;

            if (!config || !config.enabled || !config.retention) {
                return;
            }

            const retentionCount = parseInt(config.retention);
            if (isNaN(retentionCount) || retentionCount < 1) {
                return;
            }

            const autoBackups = await dbUtils.query(
                'SELECT id, file_name, file_path FROM backups WHERE backup_type = ? ORDER BY created_at DESC',
                ['auto']
            );

            if (autoBackups.length > retentionCount) {
                const backupsToDelete = autoBackups.slice(retentionCount);
                for (const backup of backupsToDelete) {
                    if (fsSync.existsSync(backup.file_path)) {
                        fsSync.unlinkSync(backup.file_path);
                    }
                    await dbUtils.delete('DELETE FROM backups WHERE id = ?', [backup.id]);
                }
            }
        } catch (error) {
            console.error('清理旧自动备份失败:', error);
        }
    },

    // 获取备份列表
    async getBackupList() {
        try {
            await this.syncBackupsFromFolder();

            const backups = await dbUtils.query(
                'SELECT id, file_name, file_size, created_by, created_at, backup_type FROM backups ORDER BY created_at DESC'
            );
            return backups || [];
        } catch (error) {
            console.error('获取备份列表失败:', error);
            return [];
        }
    },

    // 扫描备份文件夹，同步文件到数据库
    async syncBackupsFromFolder() {
        try {
            const backupDir = path.join(process.cwd(), 'backup');

            if (!fsSync.existsSync(backupDir)) {
                return;
            }

            const files = fsSync.readdirSync(backupDir).filter(f => f.endsWith('.sql'));

            const existingBackups = await dbUtils.query('SELECT file_name FROM backups');
            const existingFileNames = new Set(existingBackups.map(b => b.file_name));

            for (const fileName of files) {
                if (!existingFileNames.has(fileName)) {
                    const filePath = path.join(backupDir, fileName);
                    const stats = fsSync.statSync(filePath);
                    const fileSize = (stats.size / 1024 / 1024).toFixed(2);

                    let createdAtStr;
                    let backupType = 'manual';

                    const manualMatch = fileName.match(/warehouse_manual_backup_(\d{4}-\d{2}-\d{2})T(\d{2}-\d{2}-\d{2})/);
                    const autoMatch = fileName.match(/warehouse_auto_backup_(\d{4}-\d{2}-\d{2})T(\d{2}-\d{2}-\d{2})/);
                    const preDeleteMatch = fileName.match(/warehouse_pre_delete_backup_(\d{4}-\d{2}-\d{2})T(\d{2}-\d{2}-\d{2})/);

                    if (manualMatch) {
                        backupType = 'manual';
                        const datePart = manualMatch[1];
                        const timePart = manualMatch[2].replace(/-/g, ':');
                        createdAtStr = `${datePart} ${timePart}`;
                    } else if (autoMatch) {
                        backupType = 'auto';
                        const datePart = autoMatch[1];
                        const timePart = autoMatch[2].replace(/-/g, ':');
                        createdAtStr = `${datePart} ${timePart}`;
                    } else if (preDeleteMatch) {
                        backupType = 'pre_delete';
                        const datePart = preDeleteMatch[1];
                        const timePart = preDeleteMatch[2].replace(/-/g, ':');
                        createdAtStr = `${datePart} ${timePart}`;
                    } else {
                        const oldMatch = fileName.match(/warehouse_backup_(\d{4}-\d{2}-\d{2})T(\d{2}-\d{2}-\d{2})/);
                        if (oldMatch) {
                            backupType = 'manual';
                            const datePart = oldMatch[1];
                            const timePart = oldMatch[2].replace(/-/g, ':');
                            createdAtStr = `${datePart} ${timePart}`;
                        } else {
                            const mtime = new Date(stats.mtime);
                            const beijingMtime = new Date(mtime.getTime() + (8 * 60 * 60 * 1000));
                            createdAtStr = beijingMtime.toISOString().replace('T', ' ').slice(0, 19);
                        }
                    }

                    await dbUtils.insert(
                        'INSERT INTO backups (file_name, file_path, file_size, created_by, created_at, backup_type) VALUES (?, ?, ?, ?, ?, ?)',
                        [fileName, filePath, fileSize, '扫描同步', createdAtStr, backupType]
                    );
                }
            }

            for (const backup of existingBackups) {
                const filePath = path.join(backupDir, backup.file_name);
                if (!fsSync.existsSync(filePath)) {
                    await dbUtils.delete('DELETE FROM backups WHERE file_name = ?', [backup.file_name]);
                }
            }
        } catch (error) {
            console.error('同步备份文件夹失败:', error);
        }
    },

    // 根据ID获取备份
    async getBackupById(id) {
        return await dbUtils.queryOne('SELECT * FROM backups WHERE id = ?', [id]);
    },

    // 删除备份
    async deleteBackup(id) {
        const backup = await this.getBackupById(id);
        if (!backup) {
            throw new Error('备份不存在');
        }

        if (fsSync.existsSync(backup.file_path)) {
            fsSync.unlinkSync(backup.file_path);
        }

        await dbUtils.delete('DELETE FROM backups WHERE id = ?', [id]);
        return { success: true };
    },

    // 恢复备份
    async restoreBackup(id) {
        const backup = await this.getBackupById(id);
        if (!backup) {
            throw new Error('备份不存在');
        }

        if (!fsSync.existsSync(backup.file_path)) {
            throw new Error('备份文件不存在');
        }

        let dbHost = 'localhost';
        let dbUser = 'root';
        let dbPassword = '';
        let dbName = 'warehouse';

        if (dbConfigObj) {
            dbHost = dbConfigObj.host || dbHost;
            dbUser = dbConfigObj.user || dbUser;
            dbPassword = dbConfigObj.password || dbPassword;
            dbName = dbConfigObj.database || dbName;
        }

        const mysqlArgs = ['-h', dbHost, '-u', dbUser, dbName];
        if (dbPassword) {
            mysqlArgs.push(`-p${dbPassword}`);
        }
        const { spawn } = require('child_process');
        const mysqlPath = findMySqlBin('mysql');
        await new Promise((resolve, reject) => {
            const child = spawn(mysqlPath, mysqlArgs, { shell: false });
            const readStream = fsSync.createReadStream(backup.file_path);
            readStream.pipe(child.stdin);
            child.stdin.on('end', () => {});
            child.stderr.on('data', () => {});
            child.on('close', (code) => {
                if (code === 0) resolve();
                else reject(new Error(`mysql exited with code ${code}`));
            });
            child.on('error', reject);
        });
        return { success: true };
    },

    // 获取自动备份配置
    async getAutoBackupConfig() {
        try {
            const { getSettings } = require('./SettingsService');
            const settings = await getSettings();
            return settings?.autoBackup || { enabled: false, retention: 5 };
        } catch (error) {
            console.error('获取自动备份配置失败:', error);
            return { enabled: false, retention: 5 };
        }
    },

    // 保存自动备份配置
    async saveAutoBackupConfig(config) {
        try {
            const { getSettings, saveSettings } = require('./SettingsService');
            const settings = await getSettings() || {};
            settings.autoBackup = config;
            return await saveSettings(settings);
        } catch (error) {
            console.error('保存自动备份配置失败:', error);
            throw error;
        }
    }
};

module.exports = BackupService;
