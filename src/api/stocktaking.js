import { http, extractData } from './http'

export const stocktakingApi = {
  list() {
    return http.get('/api/stocktaking')
  },

  getById(id) {
    return http.get(`/api/stocktaking/${id}`)
  },

  create(data) {
    return http.post('/api/stocktaking', data)
  },

  start(id) {
    return http.post(`/api/stocktaking/${id}/start`)
  },

  updateItem(id, itemId, data) {
    return http.put(`/api/stocktaking/${id}/items/${itemId}`, data)
  },

  complete(id) {
    return http.post(`/api/stocktaking/${id}/complete`)
  },

  cancel(id) {
    return http.post(`/api/stocktaking/${id}/cancel`)
  },

  async listNormalized() {
    const res = await this.list()
    return extractData(res)
  }
}
