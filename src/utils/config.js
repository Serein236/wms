/**
 * 前端配置 — 替代旧 public/js/config.js
 * 提供默认值 + 环境变量注入，避免 gitignore 陷阱
 */

export const config = {
  companyName: import.meta.env.VITE_COMPANY_NAME || '仓库管理系统',
  address: import.meta.env.VITE_COMPANY_ADDRESS || '',
  phone: import.meta.env.VITE_COMPANY_PHONE || '',
  icp: import.meta.env.VITE_ICP || '',
  icpUrl: import.meta.env.VITE_ICP_URL || ''
}

export default config
