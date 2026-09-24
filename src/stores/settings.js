import { defineStore } from 'pinia'
import { inventoryApi } from '@/api/inventory'

const STORAGE_KEY = 'warehouse_settings'

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    settings: loadFromStorage(),
    loaded: false,       // 完整设置（受保护接口 /api/settings）是否已加载
    publicLoaded: false  // 公开设置（/api/settings/public，登录页页脚用）是否已加载
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
        const res = await inventoryApi.getSettings()
        if (res) {
          // 统一格式 {success, data: <key-value 平铺对象>}
          const obj = res?.data || res
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
        const res = await inventoryApi.getPublicSettings()
        const data = res?.data
        if (data && typeof data === 'object') {
          this.settings = { ...this.settings, ...data }
          this.saveToStorage()
        }
        // 注意：不能置 loaded = true。公开接口只返回 companyName/icp/icpUrl，
        // 若置 true 会让 AppLayout 跳过登录后的完整加载，导致 address/phone/export
        // 等字段缺失（出库单导出会丢公司地址、电话），故只用独立的 publicLoaded 标记。
        this.publicLoaded = true
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
