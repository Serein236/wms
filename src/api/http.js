/**
 * 统一 fetch 封装
 * - 携带 session cookie (credentials: 'same-origin')
 * - 非 GET 的 /api 请求自动携带 CSRF token（登录后 session 轮换会失效，403 自动刷新重试一次）
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

// CSRF token 懒加载缓存（Promise 缓存，并发请求共享同一次获取）
let csrfTokenPromise = null

async function getCsrfToken() {
  if (!csrfTokenPromise) {
    csrfTokenPromise = fetch('/api/auth/csrf-token', { credentials: 'same-origin' })
      .then((r) => {
        if (!r.ok) throw new ApiError(r.status, '获取 CSRF token 失败')
        return r.json()
      })
      .then((d) => d.csrfToken)
      .catch((e) => {
        csrfTokenPromise = null
        throw e
      })
  }
  return csrfTokenPromise
}

// 登录/登出后 session 会轮换，必须丢弃旧 token
export function resetCsrfToken() {
  csrfTokenPromise = null
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

async function request(url, options = {}, retried = false) {
  const method = (options.method || 'GET').toUpperCase()

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  }
  // FormData 由浏览器自动带 boundary 的 Content-Type，不能手动设置
  if (options.body instanceof FormData) {
    delete headers['Content-Type']
  }
  // CSRF：非 GET 的 API 请求携带 token
  if (method !== 'GET' && method !== 'HEAD' && url.startsWith('/api/')) {
    headers['X-CSRF-Token'] = await getCsrfToken()
  }

  const res = await fetch(url, {
    credentials: 'same-origin',
    ...options,
    headers
  })

  if (res.status === 401) {
    handleSessionExpired()
    throw new ApiError(401, '登录已过期，请重新登录')
  }

  // 403 可能是登录/登出后 session 轮换导致 CSRF token 失效，刷新 token 重试一次
  if (res.status === 403 && !retried && method !== 'GET' && url.startsWith('/api/')) {
    resetCsrfToken()
    return request(url, options, true)
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
    // 会话过期：后端返回 JSON 错误体，不能当文件下载，统一走登录跳转
    if (res.status === 401) {
      handleSessionExpired()
      throw new ApiError(401, '登录已过期，请重新登录')
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new ApiError(res.status, err.message || `下载失败 (${res.status})`)
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
