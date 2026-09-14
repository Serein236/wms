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
        if (data && data.settings) {
          this.settings = typeof data.settings === 'string'
            ? JSON.parse(data.settings)
            : data.settings
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
