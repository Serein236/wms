import { http } from './http'

export const authApi = {
  login(username, password) {
    return http.post('/api/auth/login', { username, password })
  },

  logout() {
    return http.post('/api/auth/logout')
  },

  currentUser() {
    return http.get('/api/auth/current-user')
  },

  checkAdmin() {
    return http.get('/api/auth/check-admin')
  },

  checkDefaultAdmin() {
    return http.get('/api/auth/check-default-admin')
  },

  // 用户管理 (admin)
  getUsers() {
    return http.get('/api/auth/users')
  },

  createUser(data) {
    return http.post('/api/auth/users', data)
  },

  updateUser(id, data) {
    return http.put(`/api/auth/users/${id}`, data)
  },

  deleteUser(id) {
    return http.delete(`/api/auth/users/${id}`)
  }
}
