import { http, extractData, extractPagination } from './http'

export const customersApi = {
  list(params) {
    return http.get('/api/customers', params)
  },

  search(keyword) {
    return http.get('/api/customers/search', { query: keyword })
  },

  getById(id) {
    return http.get(`/api/customers/${id}`)
  },

  create(data) {
    return http.post('/api/customers', data)
  },

  update(id, data) {
    return http.put(`/api/customers/${id}`, data)
  },

  delete(id) {
    return http.delete(`/api/customers/${id}`)
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
