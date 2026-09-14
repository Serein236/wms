import { http } from './http'

export const batchApi = {
  batchIn(data) {
    return http.post('/api/batch/in', data)
  },

  batchOut(data) {
    return http.post('/api/batch/out', data)
  },

  getTemplate() {
    return http.download('/api/batch/template')
  }
}
