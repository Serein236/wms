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
        const data = await authApi.currentUser()
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
      const data = await authApi.login(username, password)
      if (data.success === false) {
        throw new Error(data.message || '登录失败')
      }
      // 登录后 session 轮换，旧 CSRF token 失效，强制下次请求重新获取
      resetCsrfToken()
      this.loggedIn = true
      this.user = username
      this.role = data.role || 'user'
      return data
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
