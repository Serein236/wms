import { http } from './http'

export const importApi = {
  importProducts(formData) {
    return http.upload('/api/import/products', formData)
  },

  getTemplate() {
    return http.download('/api/import/template')
  }
}
