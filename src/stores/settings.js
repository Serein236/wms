import { defineStore } from 'pinia'
import { inventoryApi } from '@/api/inventory'

const STORAGE_KEY = 'warehouse_settings'

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    settings: loadFromStorage(),
    loaded: false
  }),

  getters: {
    companyName: (state) => state.settings?.companyName || '仓库管理系统',
    icp: (state) => state.settings?.icp || '',
    icpUrl: (state) => state.settings?.icpUrl || '',
    exportConfig: (state) => ({
      companyName: state.settings?.companyName || '',
      address: state.settings?.address || '',
      phone: state.settings?.phone || ''
    })
  },

  actions: {
    async load() {
      try {
        const data = await inventoryApi.getSettings()
        if (data) {
          // 后端返回 key-value 平铺对象；兼容 { settings: ... } 包裹
          let obj = data
          if (data.settings) {
            obj = typeof data.settings === 'string'
              ? JSON.parse(data.settings)
              : data.settings
          }
          if (obj && typeof obj === 'object') {
            this.settings = { ...this.settings, ...obj }
            this.saveToStorage()
          }
        }
        this.loaded = true
      } catch (e) {
        // 加载失败时使用 localStorage 中的缓存
      }
    },

    /**
     * 加载公开站点信息（登录页页脚使用，无需认证）
     * 仅合并展示字段，不触碰 export/autoBackup 等内部配置
     */
    async loadPublic() {
      try {
        const data = await inventoryApi.getPublicSettings()
        if (data && typeof data === 'object') {
          this.settings = { ...this.settings, ...data }
          this.saveToStorage()
        }
        this.loaded = true
      } catch (e) {
        // 加载失败时使用 localStorage 中的缓存
      }
    },

    async save(settings) {
      this.settings = { ...this.settings, ...settings }
      this.saveToStorage()
      await inventoryApi.saveSettings({ settings: JSON.stringify(this.settings) })
    },

    saveToStorage() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings))
      } catch (e) { /* ignore */ }
    },

    updateLocal(key, value) {
      this.settings[key] = value
      this.saveToStorage()
    }
  }
})

function loadFromStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : {}
  } catch (e) {
    return {}
  }
}
