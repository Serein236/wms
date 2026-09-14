import { http, extractData } from './http'

export const dashboardApi = {
  getKpi() {
    return http.get('/api/dashboard/kpi')
  },

  getTrend(params) {
    return http.get('/api/dashboard/trend', params)
  },

  getTopProducts(params) {
    return http.get('/api/dashboard/top-products', params)
  },

  getStockStatus() {
    return http.get('/api/dashboard/stock-status')
  },

  async getKpiNormalized() {
    const res = await this.getKpi()
    return extractData(res)
  }
}
