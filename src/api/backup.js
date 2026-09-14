import { http } from './http'

export const backupApi = {
  createBackup() {
    return http.post('/api/backup')
  },

  listBackups() {
    return http.get('/api/backups')
  },

  downloadBackup(id) {
    return http.download(`/api/backups/${id}/download`)
  },

  deleteBackup(id) {
    return http.delete(`/api/backups/${id}`)
  },

  restoreBackup(id) {
    return http.post(`/api/backups/${id}/restore`)
  },

  saveAutoBackupConfig(data) {
    return http.post('/api/auto-backup-config', data)
  },

  changePassword(data) {
    return http.post('/api/change-password', data)
  }
}
