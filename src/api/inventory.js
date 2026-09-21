import { http, extractData, extractPagination } from './http'

export const inventoryApi = {
  // ── 出入库操作 ──
  createIn(data) {
    return http.post('/api/in', data)
  },

  createOut(data) {
    return http.post('/api/out', data)
  },

  // ── 入库记录 ──
  getInRecords(params) {
    return http.get('/api/in-records', params)
  },

  updateInRecord(id, data) {
    return http.put(`/api/in-records/${id}`, data)
  },

  cancelInRecord(id) {
    return http.delete(`/api/in-records/${id}/cancel`)
  },

  // ── 出库记录 ──
  getOutRecords(params) {
    return http.get('/api/out-records', params)
  },

  updateOutRecord(id, data) {
    return http.put(`/api/out-records/${id}`, data)
  },

  cancelOutRecord(id) {
    return http.delete(`/api/out-records/${id}/cancel`)
  },

  getOutRecordById(id) {
    return http.get(`/api/out-records/${id}`)
  },

  // ── 库存 ──
  getStock(params) {
    return http.get('/api/stock', params)
  },

  getStockByProduct(productId) {
    return http.get(`/api/query/${productId}`)
  },

  // ── 出入库方式 ──
  getStockMethods(params) {
    return http.get('/api/stock-methods', params)
  },

  getStockMethodsAdmin() {
    return http.get('/api/stock-methods-admin')
  },

  createStockMethod(data) {
    return http.post('/api/stock-methods-admin', data)
  },

  updateStockMethod(id, data) {
    return http.put(`/api/stock-methods-admin/${id}`, data)
  },

  deleteStockMethod(id) {
    return http.delete(`/api/stock-methods-admin/${id}`)
  },

  // ── 批次库存 ──
  getProductBatches(productId) {
    return http.get(`/api/product-batches/${productId}`)
  },

  getAllBatches() {
    return http.get('/api/product-batches')
  },

  // ── 设置 ──
  getSettings() {
    return http.get('/api/settings')
  },

  saveSettings(data) {
    return http.post('/api/settings', data)
  },

  // ── 清理 ──
  cleanup() {
    return http.post('/api/cleanup')
  },

  /**
   * 获取入库记录 — 标准化格式
   */
  async getInRecordsNormalized(params) {
    const res = await this.getInRecords(params)
    return { data: extractData(res), pagination: extractPagination(res) }
  },

  /**
   * 获取出库记录 — 标准化格式
   */
  async getOutRecordsNormalized(params) {
    const res = await this.getOutRecords(params)
    return { data: extractData(res), pagination: extractPagination(res) }
  },

  /**
   * 获取库存 — 兼容裸数组
   */
  async getStockNormalized(params) {
    const res = await this.getStock(params)
    return extractData(res)
  },

  /**
   * 获取出入库方式 — 兼容裸数组；可传 { type: 'in' | 'out' }
   */
  async getStockMethodsNormalized(params) {
    const res = await this.getStockMethods(params)
    return extractData(res)
  }
}
