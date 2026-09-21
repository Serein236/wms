/**
 * 统一 fetch 封装
 * - 携带 session cookie (credentials: 'same-origin')
 * - 401 自动跳转登录
 * - 响应格式容错（裸数组 vs {success, data}）
 */

export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
}

function buildQuery(url, params) {
  if (!params) return url
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.append(key, value)
    }
  }
  const qs = search.toString()
  return qs ? `${url}?${qs}` : url
}

async function request(url, options = {}) {
  const res = await fetch(url, {
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  })

  if (res.status === 401) {
    handleSessionExpired()
    throw new ApiError(401, '登录已过期，请重新登录')
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new ApiError(res.status, err.message || err.error || `请求失败 (${res.status})`)
  }

  const text = await res.text()
  return text ? JSON.parse(text) : null
}

/**
 * 会话过期统一处理 — 清掉本地登录态并跳转登录页
 * （auth.init() 用的 /api/auth/current-user 恒返回 200，不会误触发此逻辑）
 */
function handleSessionExpired() {
  try {
    localStorage.removeItem('warehouse_auth')
  } catch (e) { /* ignore */ }

  // 避免在登录页重复跳转
  if (window.location.pathname === '/login') return

  const redirect = encodeURIComponent(
    window.location.pathname + window.location.search
  )
  window.location.assign(`/login?redirect=${redirect}`)
}

export const http = {
  get(url, params) {
    return request(buildQuery(url, params))
  },

  post(url, body) {
    return request(url, {
      method: 'POST',
      body: JSON.stringify(body)
    })
  },

  put(url, body) {
    return request(url, {
      method: 'PUT',
      body: JSON.stringify(body)
    })
  },

  delete(url) {
    return request(url, { method: 'DELETE' })
  },

  upload(url, formData) {
    return request(url, {
      method: 'POST',
      body: formData,
      headers: {}
    })
  },

  async download(url, params) {
    const res = await fetch(buildQuery(url, params), {
      credentials: 'same-origin'
    })
    if (!res.ok) {
      throw new ApiError(res.status, `下载失败 (${res.status})`)
    }
    return res
  }
}

/**
 * 响应数据提取 — 兼容裸数组和 {success, data} 两种格式
 */
export function extractData(response) {
  if (Array.isArray(response)) return response
  if (response && typeof response === 'object') {
    if (response.success === false) {
      throw new ApiError(400, response.message || '操作失败')
    }
    return response.data !== undefined ? response.data : response
  }
  return response
}

/**
 * 提取分页信息
 */
export function extractPagination(response) {
  if (response && response.pagination) {
    return response.pagination
  }
  return { page: 1, pageSize: 20, total: 0 }
}
