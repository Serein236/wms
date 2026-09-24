import { defineStore } from 'pinia'
import { authApi } from '@/api/auth'
import { resetCsrfToken } from '@/api/http'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    loggedIn: false,
    role: 'user',
    initialized: false
  }),

  actions: {
    async init() {
      try {
        const res = await authApi.currentUser()
        const data = res?.data || res || {}
        this.loggedIn = !!data.loggedIn
        this.user = data.username || null
        this.role = data.role || 'user'
      } catch (e) {
        this.clearSession()
      } finally {
        this.initialized = true
      }
    },

    async login(username, password) {
      const res = await authApi.login(username, password)
      if (res && res.success === false) {
        throw new Error(res.message || '登录失败')
      }
      // 登录后 session 轮换，旧 CSRF token 失效，强制下次请求重新获取
      resetCsrfToken()
      this.loggedIn = true
      this.user = username
      this.role = res?.data?.role || 'user'
      return res
    },

    async logout() {
      try {
        await authApi.logout()
      } catch (e) {
        // 忽略登出请求错误
      }
      resetCsrfToken()
      this.clearSession()
    },

    clearSession() {
      this.loggedIn = false
      this.user = null
      this.role = 'user'
    }
  }
})
