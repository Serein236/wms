import { http, extractData } from './http'

export const productsApi = {
  list(params) {
    return http.get('/api/products', params)
  },

  getById(id) {
    return http.get(`/api/products/${id}`)
  },

  create(data) {
    return http.post('/api/products', data)
  },

  update(id, data) {
    return http.put(`/api/products/${id}`, data)
  },

  delete(id) {
    return http.delete(`/api/products/${id}`)
  },

  getByBarcode(barcode) {
    return http.get(`/api/products/barcode/${barcode}`)
  },

  /**
   * 获取商品列表 — 兼容裸数组返回格式
   */
  async listNormalized(params) {
    const res = await this.list(params)
    return extractData(res)
  }
}
