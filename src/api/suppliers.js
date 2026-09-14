import { http, extractData, extractPagination } from './http'

export const suppliersApi = {
  list(params) {
    return http.get('/api/suppliers', params)
  },

  search(keyword) {
    return http.get('/api/suppliers/search', { keyword })
  },

  getById(id) {
    return http.get(`/api/suppliers/${id}`)
  },

  create(data) {
    return http.post('/api/suppliers', data)
  },

  update(id, data) {
    return http.put(`/api/suppliers/${id}`, data)
  },

  delete(id) {
    return http.delete(`/api/suppliers/${id}`)
  },

  toggle(id) {
    return http.post(`/api/suppliers/${id}/toggle`)
  },

  async listNormalized(params) {
    const res = await this.list(params)
    return { data: extractData(res), pagination: extractPagination(res) }
  },

  async searchNormalized(keyword) {
    const res = await this.search(keyword)
    return extractData(res)
  }
}
