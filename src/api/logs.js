import { http, extractData } from './http'

export const logsApi = {
  list(params) {
    return http.get('/api/logs', params)
  },

  getRaw(params) {
    return http.get('/api/logs/raw', params)
  },

  getDates() {
    return http.get('/api/logs/dates')
  },

  async listNormalized(params) {
    const res = await this.list(params)
    return extractData(res)
  }
}
