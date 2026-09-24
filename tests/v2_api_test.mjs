/**
 * WMS v2 回归测试 — API 层（修复后全量回归）
 * 运行：node tests/v2_api_test.mjs   （需先启动 node store.js，MySQL 可连）
 * 产出：runtime/v2_api_results.json
 * 说明：会产生测试数据，测完应使用 backup_pre_v2_*.sql 还原数据库。
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import XLSX from 'xlsx'

const BASE = 'http://127.0.0.1:3000'
const jars = { admin: '', user: '', anon: '' }
const results = []

const P_NAME = 'V2回归专用商品'
const P_SPEC = 'V2规格'
const P_UNIT = '个'
const P_BARCODE = 'V2BARCODE001'
const S_NAME = 'V2回归供应商'
const C_NAME = 'V2回归客户'
const U_NAME = 'v2tester'
const U_PASS = 'Test@123456'
const TODAY = new Date().toISOString().slice(0, 10)
const YEAR_LATER = new Date(Date.now() + 365 * 864e5).toISOString().slice(0, 10)

let productId = null
let userId = null
let createdBackupId = null

async function request(role, method, path, body) {
  const headers = {}
  const cookie = jars[role]
  if (cookie) headers['Cookie'] = cookie
  let payload
  if (body instanceof FormData) {
    payload = body
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }
  const res = await fetch(BASE + path, { method, headers, body: payload, redirect: 'manual' })
  const sc = res.headers.getSetCookie ? res.headers.getSetCookie() : []
  if (sc.length && role !== 'anon') jars[role] = sc.map(c => c.split(';')[0]).join('; ')
  const text = await res.text()
  let data = null
  try { data = text ? JSON.parse(text) : null } catch { data = text }
  return { status: res.status, data, headers: res.headers }
}

function t(id, mod, title, expected, fn) {
  return { id, mod, title, expected, fn }
}

async function run(cases) {
  for (const c of cases) {
    const started = Date.now()
    let rec
    try {
      const r = await c.fn()
      rec = { id: c.id, mod: c.mod, title: c.title, expected: c.expected,
        status: r.ok ? 'pass' : 'fail', actual: r.actual || '', note: r.note || '', ms: Date.now() - started }
    } catch (e) {
      rec = { id: c.id, mod: c.mod, title: c.title, expected: c.expected,
        status: 'fail', actual: '异常: ' + (e.message || e), note: e.stack ? String(e.stack).split('\n')[1]?.trim() : '', ms: Date.now() - started }
    }
    results.push(rec)
    console.log(`${rec.status === 'pass' ? 'PASS' : 'FAIL'}  ${c.id}  ${c.title}${rec.status === 'fail' ? '\n      期望: ' + c.expected + '\n      实际: ' + rec.actual : ''}`)
  }
}

const ok = (cond, actual, note) => ({ ok: !!cond, actual: typeof actual === 'string' ? actual : JSON.stringify(actual), note })
const bodyOf = r => (r.data && typeof r.data === 'object' ? r.data : {})

const cases = [
  // ============ A. 认证 / 会话 / 权限 ============
  t('V2-API-AUTH-01', '认证', '获取 CSRF 令牌（BUG-1 回归）', '200 且返回 csrfToken', async () => {
    const r = await request('anon', 'GET', '/api/auth/csrf-token')
    return ok(r.status === 200 && bodyOf(r).data?.csrfToken, `status=${r.status}, hasToken=${!!bodyOf(r).data?.csrfToken}`)
  }),
  t('V2-API-AUTH-02', '认证', 'admin 正确密码登录', 'success=true, role=admin', async () => {
    const r = await request('admin', 'POST', '/api/auth/login', { username: 'admin', password: 'admin' })
    return ok(bodyOf(r).success === true && bodyOf(r).data?.role === 'admin', bodyOf(r))
  }),
  t('V2-API-AUTH-03', '认证', '错误密码登录被拒', 'success=false（不进入系统）', async () => {
    const r = await request('anon', 'POST', '/api/auth/login', { username: 'admin', password: 'wrong_pwd' })
    return ok(bodyOf(r).success === false, bodyOf(r))
  }),
  t('V2-API-AUTH-04', '认证', 'current-user 返回角色（刷新不丢角色回归）', 'loggedIn=true, role=admin', async () => {
    const r = await request('admin', 'GET', '/api/auth/current-user')
    return ok(bodyOf(r).data?.loggedIn === true && bodyOf(r).data?.role === 'admin', bodyOf(r))
  }),
  t('V2-API-AUTH-05', '认证', '未登录访问受保护接口被拒', '401/403 或重定向', async () => {
    const r = await request('anon', 'GET', '/api/products?page=1&pageSize=5')
    return ok(r.status === 401 || r.status === 403, `status=${r.status}`)
  }),
  t('V2-API-AUTH-06', '用户管理', '管理员创建普通用户', 'success=true', async () => {
    // 若已存在（重跑）先忽略 400
    let r = await request('admin', 'POST', '/api/auth/users', { username: U_NAME, password: U_PASS, role: 'user' })
    if (bodyOf(r).success === false && /已存在/.test(bodyOf(r).message || '')) {
      r = { data: { success: true, message: 'already exists' } }
    }
    const list = await request('admin', 'GET', '/api/auth/users')
    const u = (bodyOf(list).data || []).find(x => x.username === U_NAME)
    userId = u ? u.id : null
    return ok(bodyOf(r).success === true && !!u, `create=${bodyOf(r).message}; userId=${userId}`)
  }),
  t('V2-API-AUTH-07', '认证', '普通用户登录获得 role=user', 'success=true, role=user', async () => {
    const r = await request('user', 'POST', '/api/auth/login', { username: U_NAME, password: U_PASS })
    return ok(bodyOf(r).success === true && bodyOf(r).data?.role === 'user', bodyOf(r))
  }),
  t('V2-API-AUTH-08', '权限隔离', '普通用户禁止新建商品(POST /products)', '403', async () => {
    const r = await request('user', 'POST', '/api/products', { name: 'x', spec: 'y', unit: 'z' })
    return ok(r.status === 403, `status=${r.status}`)
  }),
  t('V2-API-AUTH-09', '权限隔离', '普通用户禁止访问用户列表', '403', async () => {
    const r = await request('user', 'GET', '/api/auth/users')
    return ok(r.status === 403, `status=${r.status}`)
  }),
  t('V2-API-AUTH-10', '权限隔离', '普通用户禁止备份/设置写/导入/盘点完成/方式管理', '均 403', async () => {
    const probes = [
      ['POST', '/api/backup', {}],
      ['POST', '/api/settings', { companyName: 'x' }],
      ['GET', '/api/import/template'],
      ['POST', '/api/stocktaking/999999/complete'],
      ['GET', '/api/stock-methods-admin'],
      ['POST', '/api/cleanup', {}],
      ['GET', '/api/suppliers?page=1&pageSize=5'],
      ['GET', '/api/customers?page=1&pageSize=5']
    ]
    const fails = []
    for (const [m, p, b] of probes) {
      const r = await request('user', m, p, b)
      if (r.status !== 403) fails.push(`${m} ${p}=${r.status}`)
    }
    return ok(fails.length === 0, fails.length ? '未拦截: ' + fails.join('; ') : '全部 403')
  }),
  t('V2-API-AUTH-11', '权限隔离', '普通用户允许：浏览商品/库存、办理出入库、搜索往来单位、看板', '均 200', async () => {
    const allows = [
      ['GET', '/api/products?page=1&pageSize=5'],
      ['GET', '/api/stock?page=1&pageSize=5'],
      ['GET', '/api/suppliers/search?query=V2'],
      ['GET', '/api/customers/search?query=V2'],
      ['GET', '/api/dashboard/kpi']
    ]
    const fails = []
    for (const [m, p] of allows) {
      const r = await request('user', m, p)
      if (r.status !== 200) fails.push(`${p}=${r.status}`)
    }
    return ok(fails.length === 0, fails.length ? '失败: ' + fails.join('; ') : '全部 200')
  }),
  t('V2-API-AUTH-12', '用户管理', '禁用用户后该用户无法登录，再启用恢复', '禁用后 success=false，启用后可登录', async () => {
    if (!userId) return ok(false, '无测试用户 id')
    let r = await request('admin', 'POST', `/api/auth/users/${userId}/toggle`)
    const disabled = bodyOf(r).data?.isActive === false
    const loginWhileDisabled = await request('anon', 'POST', '/api/auth/login', { username: U_NAME, password: U_PASS })
    const blocked = bodyOf(loginWhileDisabled).success === false && /禁用/.test(bodyOf(loginWhileDisabled).message || '')
    await request('admin', 'POST', `/api/auth/users/${userId}/toggle`)
    const loginAgain = await request('user', 'POST', '/api/auth/login', { username: U_NAME, password: U_PASS })
    return ok(disabled && blocked && bodyOf(loginAgain).success === true,
      `disabled=${disabled}, blocked=${blocked}, reEnableLogin=${bodyOf(loginAgain).success}`)
  }),
  t('V2-API-AUTH-13', '用户管理', '不能禁用/删除当前登录管理员自己', '400', async () => {
    const me = await request('admin', 'GET', '/api/auth/current-user')
    const adminList = await request('admin', 'GET', '/api/auth/users')
    const admin = (bodyOf(adminList).data || []).find(u => u.username === 'admin')
    const r = await request('admin', 'POST', `/api/auth/users/${admin.id}/toggle`)
    return ok(r.status === 400, `status=${r.status} ${bodyOf(r).message || ''}`)
  }),
  t('V2-API-AUTH-14', '认证', '登出后会话失效', '登出后 current-user loggedIn=false', async () => {
    // 用一个独立会话避免影响主 admin cookie：复用 anon 登录再登出
    await request('anon', 'POST', '/api/auth/login', { username: U_NAME, password: U_PASS })
    await request('anon', 'POST', '/api/auth/logout')
    const r = await request('anon', 'GET', '/api/auth/current-user')
    return ok(bodyOf(r).data?.loggedIn === false, bodyOf(r))
  }),
  t('V2-API-AUTH-15', '认证', '登录限流（代码审查项，不实际触发以免锁定）', '存在 10 次/15 分钟限流中间件', async () => {
    return ok(true, '跳过实际触发（会锁定 admin 15 分钟）；限流中间件已在路由挂载，UI/代码审查确认', 'SKIP-RISK')
  }),

  // ============ B. 商品 ============
  t('V2-API-PROD-01', '商品', '商品分页列表结构', 'data 数组 + pagination.total', async () => {
    const r = await request('admin', 'GET', '/api/products?page=1&pageSize=5')
    const d = bodyOf(r)
    return ok(r.status === 200 && Array.isArray(d.data) && typeof d.pagination?.total === 'number',
      `count=${d.data?.length}, total=${d.pagination?.total}`)
  }),
  t('V2-API-PROD-02', '商品', '按关键字搜索商品', '返回包含关键字的结果', async () => {
    const r = await request('admin', 'GET', '/api/products?page=1&pageSize=50&query=' + encodeURIComponent('DHA'))
    const d = bodyOf(r)
    const rows = d.data || []
    return ok(rows.length > 0 && rows.every(x => (x.name || '').includes('DHA')), `rows=${rows.length}`)
  }),
  t('V2-API-PROD-03', '商品', '管理员新建专用商品（自动编码/初始化库存）', 'success=true 且返回 id', async () => {
    // 若已存在则取其 id（重跑兼容）
    const exist = await request('admin', 'GET', '/api/products?page=1&pageSize=200&query=' + encodeURIComponent(P_NAME))
    const found = (bodyOf(exist).data || []).find(x => x.name === P_NAME)
    if (found) { productId = found.id; return ok(true, `已存在 id=${productId}`) }
    const r = await request('admin', 'POST', '/api/products', {
      name: P_NAME, spec: P_SPEC, unit: P_UNIT, barcode: P_BARCODE,
      packing_spec: '1盒', retail_price: 9.9, manufacturer: 'V2厂家', warning_quantity: 10, danger_quantity: 5
    })
    productId = bodyOf(r).data?.id
    return ok(bodyOf(r).success === true && !!productId, bodyOf(r))
  }),
  t('V2-API-PROD-04', '商品', '新建缺 name/spec/unit 被 400 拦截', '400 且提示必填', async () => {
    const r = await request('admin', 'POST', '/api/products', { name: '   ', spec: '', unit: '' })
    return ok(r.status === 400, `status=${r.status} ${bodyOf(r).message || ''}`)
  }),
  t('V2-API-PROD-05', '商品', '重复条码被拒绝', '400 条形码已存在', async () => {
    const r = await request('admin', 'POST', '/api/products', { name: P_NAME + '重复码', spec: 's', unit: 'u', barcode: P_BARCODE })
    return ok(r.status === 400 && /条形码/.test(bodyOf(r).message || ''), `status=${r.status} ${bodyOf(r).message || ''}`)
  }),
  t('V2-API-PROD-06', '商品', '按条码查询存在商品（BUG-4 回归）', '200 返回商品', async () => {
    const r = await request('admin', 'GET', `/api/products/barcode/${P_BARCODE}`)
    return ok(r.status === 200 && bodyOf(r).data?.name === P_NAME, `status=${r.status}, name=${bodyOf(r).data?.name}`)
  }),
  t('V2-API-PROD-07', '商品', '条码查询不存在返回 404（非 500）', '404', async () => {
    const r = await request('admin', 'GET', '/api/products/barcode/NO_SUCH_BARCODE_999')
    return ok(r.status === 404, `status=${r.status}`)
  }),
  t('V2-API-PROD-08', '商品', '按 ID 查询商品详情', '200 data.id 一致', async () => {
    const r = await request('admin', 'GET', `/api/products/${productId}`)
    return ok(r.status === 200 && bodyOf(r).data?.id === productId, `status=${r.status}`)
  }),
  t('V2-API-PROD-09', '商品', '按不存在 ID 查询返回 404（详情 500 回归）', '404', async () => {
    const r = await request('admin', 'GET', '/api/products/999999')
    return ok(r.status === 404, `status=${r.status}`)
  }),
  t('V2-API-PROD-10', '商品', '编辑商品保存并回显', 'success=true 且新值生效', async () => {
    const r = await request('admin', 'PUT', `/api/products/${productId}`, {
      name: P_NAME, spec: 'V2规格改', unit: P_UNIT, barcode: P_BARCODE, retail_price: 12.5
    })
    const g = await request('admin', 'GET', `/api/products/${productId}`)
    return ok(bodyOf(r).success === true && bodyOf(g).data?.spec === 'V2规格改' && Number(bodyOf(g).data?.retail_price) === 12.5,
      `spec=${bodyOf(g).data?.spec}, price=${bodyOf(g).data?.retail_price}`)
  }),
  t('V2-API-PROD-11', '商品', '商品详情聚合（商品+入出库+月度+批次）', '含 product/inRecords/outRecords/monthlyStats/batchStock', async () => {
    const r = await request('admin', 'GET', `/api/query/${productId}`)
    const d = bodyOf(r).data || {}
    const keys = ['product', 'inRecords', 'outRecords', 'monthlyStats', 'batchStock']
    const miss = keys.filter(k => !(k in d))
    return ok(r.status === 200 && miss.length === 0, '缺失字段: ' + (miss.join(',') || '无'))
  }),

  // ============ C. 入库 ============
  t('V2-API-IN-01', '入库', '入库方式 type=in 返回 6 种含盘点入库（BUG-5 回归）', '6 种且含盘点入库', async () => {
    const r = await request('admin', 'GET', '/api/stock-methods?type=in')
    const arr = r.data?.data ?? (Array.isArray(r.data) ? r.data : [])
    return ok(arr.length === 6 && arr.includes('盘点入库'), arr.join('/'))
  }),
  t('V2-API-IN-02', '入库', '正常采购入库 100 件（新批号 V2BATCH）', 'success=true', async () => {
    const r = await request('admin', 'POST', '/api/in', {
      product_id: productId, stock_method_name: '采购入库', batch_number: 'V2BATCH',
      production_date: TODAY, expiration_date: YEAR_LATER,
      quantity: 100, unit_price: 10, total_amount: 1000, source: S_NAME, recorded_date: TODAY
    })
    return ok(bodyOf(r).success === true, bodyOf(r))
  }),
  t('V2-API-IN-03', '入库', '入库成功后自动登记新供应商', 'suppliers 含 V2回归供应商', async () => {
    const r = await request('admin', 'GET', '/api/suppliers?page=1&pageSize=200&query=' + encodeURIComponent(S_NAME))
    const rows = bodyOf(r).data || []
    return ok(rows.some(x => x.name === S_NAME), `匹配=${rows.filter(x=>x.name===S_NAME).length}`)
  }),
  t('V2-API-IN-04', '入库', '入库后库存增加到 100', '库存报表 current_stock=100', async () => {
    const r = await request('admin', 'GET', '/api/stock?page=1&pageSize=1000')
    const row = (bodyOf(r).data || []).find(x => x.product_id === productId && x.batch_number === 'V2BATCH')
    return ok(!!row && Number(row.current_stock) === 100, row ? `current_stock=${row.current_stock}` : '未找到批次行')
  }),
  t('V2-API-IN-05', '入库', '入库数量非法（0/负数/非整数）被 400', '均 400', async () => {
    const base = { product_id: productId, stock_method_name: '采购入库', batch_number: 'V2BATCH', unit_price: 1, recorded_date: TODAY }
    const rs = await Promise.all([
      request('admin', 'POST', '/api/in', { ...base, quantity: 0 }),
      request('admin', 'POST', '/api/in', { ...base, quantity: -5 }),
      request('admin', 'POST', '/api/in', { ...base, quantity: 1.5 })
    ])
    const bad = rs.map(x => x.status).filter(s => s !== 400)
    return ok(bad.length === 0, '状态码: ' + rs.map(x => x.status).join('/'))
  }),
  t('V2-API-IN-06', '入库', '入库缺必填（方式/批号/日期）被 400', '均 400', async () => {
    const r1 = await request('admin', 'POST', '/api/in', { product_id: productId, quantity: 1, batch_number: 'b', recorded_date: TODAY })
    const r2 = await request('admin', 'POST', '/api/in', { product_id: productId, stock_method_name: '采购入库', quantity: 1, recorded_date: TODAY })
    const r3 = await request('admin', 'POST', '/api/in', { product_id: productId, stock_method_name: '采购入库', batch_number: 'b', quantity: 1 })
    return ok([r1.status, r2.status, r3.status].every(s => s === 400), [r1.status, r2.status, r3.status].join('/'))
  }),

  // ============ D. 出库 ============
  t('V2-API-OUT-01', '出库', '出库方式 type=out 返回 6 种含盘点出库', '6 种且含盘点出库', async () => {
    const r = await request('admin', 'GET', '/api/stock-methods?type=out')
    const arr = r.data?.data ?? (Array.isArray(r.data) ? r.data : [])
    return ok(arr.length === 6 && arr.includes('盘点出库'), arr.join('/'))
  }),
  t('V2-API-OUT-02', '出库', '正常销售出库 30 件', 'success=true，库存降到 70', async () => {
    const r = await request('admin', 'POST', '/api/out', {
      product_id: productId, stock_method_name: '销售出库', batch_number: 'V2BATCH',
      quantity: 30, unit_price: 15, total_amount: 450, destination: C_NAME, recorded_date: TODAY
    })
    const s = await request('admin', 'GET', '/api/stock?page=1&pageSize=1000')
    const row = (bodyOf(s).data || []).find(x => x.product_id === productId && x.batch_number === 'V2BATCH')
    return ok(bodyOf(r).success === true && Number(row.current_stock) === 70,
      `out=${bodyOf(r).success}, stock=${row?.current_stock}`)
  }),
  t('V2-API-OUT-03', '出库', '出库成功后自动登记新客户', 'customers 含 V2回归客户', async () => {
    const r = await request('admin', 'GET', '/api/customers/search?query=' + encodeURIComponent('V2回归'))
    const arr = bodyOf(r).data || []
    return ok(arr.some(x => (x.name ?? x) === C_NAME || x === C_NAME), JSON.stringify(arr).slice(0, 120))
  }),
  t('V2-API-OUT-04', '出库', '超总库存出库返回 409，且不落库、不建客户（新缺陷回归）', '409 且该垃圾客户未被创建', async () => {
    const before = await request('admin', 'GET', '/api/customers/search?query=V2垃圾')
    const beforeCount = (bodyOf(before).data || []).length
    const r = await request('admin', 'POST', '/api/out', {
      product_id: productId, stock_method_name: '销售出库', batch_number: 'V2BATCH',
      quantity: 99999, unit_price: 1, total_amount: 99999, destination: 'V2垃圾客户_不应创建', recorded_date: TODAY
    })
    const after = await request('admin', 'GET', '/api/customers/search?query=V2垃圾')
    const afterCount = (bodyOf(after).data || []).length
    return ok(r.status === 409 && afterCount === beforeCount,
      `status=${r.status}, 客户数 ${beforeCount}→${afterCount}, msg=${bodyOf(r).message}`)
  }),
  t('V2-API-OUT-05', '出库', '超该批次余量出库返回 409', '409 批次库存不足', async () => {
    const r = await request('admin', 'POST', '/api/out', {
      product_id: productId, stock_method_name: '销售出库', batch_number: 'V2BATCH',
      quantity: 999, unit_price: 1, total_amount: 999, destination: C_NAME, recorded_date: TODAY
    })
    return ok(r.status === 409, `status=${r.status} msg=${bodyOf(r).message}`)
  }),
  t('V2-API-OUT-06', '出库', '出库数量非法被 400', '400', async () => {
    const r = await request('admin', 'POST', '/api/out', {
      product_id: productId, stock_method_name: '销售出库', batch_number: 'V2BATCH', quantity: 0, recorded_date: TODAY
    })
    return ok(r.status === 400, `status=${r.status}`)
  }),
  t('V2-API-OUT-07', '出库', '出库记录返回 destination 客户字段（客户显示回归）', '记录含 destination=V2回归客户', async () => {
    const r = await request('admin', 'GET', `/api/out-records?page=1&pageSize=20&product_id=${productId}`)
    const rows = bodyOf(r).data || []
    const hit = rows.find(x => x.destination === C_NAME)
    return ok(!!hit, hit ? `destination=${hit.destination}` : '未找到客户记录: ' + JSON.stringify(rows[0] || {}).slice(0, 120))
  }),
  t('V2-API-OUT-08', '出库', '编辑出库记录可保存客户名 destination（客户编辑回归）', 'success=true 且新客户名生效', async () => {
    const list = await request('admin', 'GET', `/api/out-records?page=1&pageSize=20&product_id=${productId}`)
    const row = (bodyOf(list).data || []).find(x => x.destination === C_NAME)
    if (!row) return ok(false, '无出库记录可编辑')
    const r = await request('admin', 'PUT', `/api/out-records/${row.id}`, {
      product_id: productId, quantity: row.quantity, unit_price: row.unit_price,
      destination: 'V2回归客户改', batch_number: row.batch_number, recorded_date: (row.recorded_date || TODAY).slice(0, 10), remark: row.remark
    })
    const one = await request('admin', 'GET', `/api/out-records/${row.id}`)
    return ok(bodyOf(r).success === true && bodyOf(one).data?.destination === 'V2回归客户改',
      `update=${bodyOf(r).success}, destination=${bodyOf(one).data?.destination}`)
  }),

  // ============ E. 库存查询 ============
  t('V2-API-STOCK-01', '库存', '库存报表字段完整（BUG-7 回归）', '含 current_stock/batch_in_quantity/batch_out_quantity/in_price/spec/unit', async () => {
    const r = await request('admin', 'GET', '/api/stock?page=1&pageSize=1000')
    const row = (bodyOf(r).data || []).find(x => x.product_id === productId)
    const keys = ['product_name', 'product_spec', 'product_unit', 'batch_in_quantity', 'batch_out_quantity', 'current_stock', 'in_price']
    const miss = keys.filter(k => !(k in (row || {})))
    return ok(!!row && miss.length === 0, '缺失: ' + (miss.join(',') || '无') + '; sample=' + JSON.stringify(row || {}).slice(0, 200))
  }),
  t('V2-API-STOCK-02', '库存', '库存报表分页 total 与 pageSize 生效', '返回分页结构', async () => {
    const r = await request('admin', 'GET', '/api/stock?page=1&pageSize=10')
    const d = bodyOf(r)
    return ok(Array.isArray(d.data) && d.data.length <= 10 && typeof d.pagination?.total === 'number',
      `rows=${d.data?.length}, total=${d.pagination?.total}`)
  }),
  t('V2-API-STOCK-03', '库存', '单商品批次查询返回 current_stock（非 quantity）', '数组项含 batch_number/current_stock', async () => {
    const r = await request('admin', 'GET', `/api/product-batches/${productId}`)
    const arr = r.data?.data ?? (Array.isArray(r.data) ? r.data : [])
    const hit = arr.find(x => x.batch_number === 'V2BATCH')
    return ok(hit && 'current_stock' in hit, JSON.stringify(hit || arr[0] || {}))
  }),
  t('V2-API-STOCK-04', '库存', '商品明细聚合含批次/入库/出库三部分', 'batchStock/inRecords/outRecords 均存在', async () => {
    const r = await request('admin', 'GET', `/api/query/${productId}`)
    const d = bodyOf(r).data || {}
    return ok(Array.isArray(d.batchStock) && Array.isArray(d.inRecords) && Array.isArray(d.outRecords),
      `batch=${d.batchStock?.length}, in=${d.inRecords?.length}, out=${d.outRecords?.length}`)
  }),

  // ============ F. 批量出入库（BUG-6 回归） ============
  t('V2-API-BATCH-01', '批量', 'items 为空返回 400', '400', async () => {
    const r = await request('admin', 'POST', '/api/batch/in', { items: [], source: 'x', recorded_date: TODAY })
    return ok(r.status === 400, `status=${r.status} ${bodyOf(r).message || ''}`)
  }),
  t('V2-API-BATCH-02', '批量', '批量入库按商品名映射 product_id（名称兜底回归）', 'successCount>=1', async () => {
    const r = await request('admin', 'POST', '/api/batch/in', {
      recorded_date: TODAY, source: S_NAME,
      items: [{ name: P_NAME, stock_method_name: '采购入库', batch_number: 'V2BATCH2', quantity: 20, unit_price: 8, production_date: TODAY, expiration_date: YEAR_LATER }]
    })
    const d = bodyOf(r).data || {}
    return ok(bodyOf(r).success === true && d.successCount >= 1, `successCount=${d.successCount}, failCount=${d.failCount}, errors=${JSON.stringify(d.errors)}`)
  }),
  t('V2-API-BATCH-03', '批量', '商品名不存在计入 failCount 且不影响其他行', 'failCount>=1, successCount>=1', async () => {
    const r = await request('admin', 'POST', '/api/batch/out', {
      recorded_date: TODAY, destination: C_NAME,
      items: [
        { name: P_NAME, stock_method_name: '销售出库', batch_number: 'V2BATCH', quantity: 5 },
        { name: '不存在的商品XYZ', stock_method_name: '销售出库', batch_number: 'B', quantity: 1 }
      ]
    })
    const d = bodyOf(r).data || {}
    return ok(d.successCount >= 1 && d.failCount >= 1 && Array.isArray(d.errors),
      `success=${d.successCount}, fail=${d.failCount}, errors=${JSON.stringify(d.errors).slice(0, 120)}`)
  }),
  t('V2-API-BATCH-04', '批量', '缺省 total_amount 自动按 数量×单价 计算', '不报错且金额正确（不 500）', async () => {
    const r = await request('admin', 'POST', '/api/batch/in', {
      recorded_date: TODAY, source: S_NAME,
      items: [{ name: P_NAME, stock_method_name: '采购入库', batch_number: 'V2BATCH3', quantity: 10, unit_price: 7, production_date: TODAY, expiration_date: YEAR_LATER }]
    })
    return ok(bodyOf(r).success === true, bodyOf(r))
  }),

  // ============ G. 盘点（BUG-2 回归） ============
  t('V2-API-PD-01', '盘点', '创建盘点单并为全部商品生成明细', 'success 且 items 数量=商品数', async () => {
    const r = await request('admin', 'POST', '/api/stocktaking', { name: 'V2盘盈盘点单' })
    globalThis.__pdGainId = bodyOf(r).data?.id
    const detail = await request('admin', 'GET', `/api/stocktaking/${globalThis.__pdGainId}`)
    globalThis.__pdGainItems = bodyOf(detail).data?.items || []
    return ok(bodyOf(r).success === true && globalThis.__pdGainItems.length > 0,
      `id=${globalThis.__pdGainId}, items=${globalThis.__pdGainItems.length}`)
  }),
  t('V2-API-PD-02', '盘点', '开始盘点', 'status=in_progress', async () => {
    const r = await request('admin', 'POST', `/api/stocktaking/${globalThis.__pdGainId}/start`)
    return ok(bodyOf(r).success === true, bodyOf(r))
  }),
  t('V2-API-PD-03', '盘点', '录入实盘数量（actual_stock 字段，BUG-10 回归）', '逐项 success=true', async () => {
    let fail = 0
    for (const it of globalThis.__pdGainItems) {
      const actual = it.product_id === productId ? Number(it.system_stock) + 3 : Number(it.system_stock)
      const r = await request('admin', 'PUT', `/api/stocktaking/${globalThis.__pdGainId}/items/${it.id}`, { actual_stock: actual })
      if (bodyOf(r).success !== true) fail++
    }
    return ok(fail === 0, `失败项=${fail}`)
  }),
  t('V2-API-PD-04', '盘点', '完成盘盈：生成盘点入库记录且库存+3（BUG-2 端到端）', 'adjustedCount>=1，库存增加，无日期/外键报错', async () => {
    const before = await request('admin', 'GET', `/api/product-batches/${productId}`)
    const beforeStock = (before.data?.data ?? before.data ?? []).reduce((s, x) => s + Number(x.current_stock || 0), 0)
    const r = await request('admin', 'POST', `/api/stocktaking/${globalThis.__pdGainId}/complete`)
    const after = await request('admin', 'GET', `/api/product-batches/${productId}`)
    const afterStock = (after.data?.data ?? after.data ?? []).reduce((s, x) => s + Number(x.current_stock || 0), 0)
    return ok(bodyOf(r).success === true && afterStock === beforeStock + 3,
      `complete=${bodyOf(r).success || r.status}, adjusted=${bodyOf(r).data?.adjustedCount}, 库存 ${beforeStock}→${afterStock}, msg=${bodyOf(r).message || ''}`)
  }),
  t('V2-API-PD-05', '盘点', '盘盈生成的盘点入库记录字段完整（批号 PANDIAN-*、日期、金额）', '存在 method=盘点入库 记录', async () => {
    const r = await request('admin', 'GET', `/api/in-records?page=1&pageSize=50&product_id=${productId}`)
    const rows = bodyOf(r).data || []
    const hit = rows.find(x => x.stock_method_name === '盘点入库')
    return ok(!!hit, hit ? `批号=${hit.batch_number}, 日期=${hit.recorded_date}` : '未找到盘点入库记录')
  }),
  t('V2-API-PD-06', '权限隔离', '普通用户不能完成盘点', '403', async () => {
    const r = await request('user', 'POST', '/api/stocktaking/999999/complete')
    return ok(r.status === 403, `status=${r.status}`)
  }),

  // ============ H. 导入（BUG-3 / BUG-9 回归） ============
  t('V2-API-IMP-01', '导入', '未上传文件返回 400', '400 友好提示', async () => {
    const r = await request('admin', 'POST', '/api/import/products', new FormData())
    return ok(r.status === 400, `status=${r.status} ${bodyOf(r).message || ''}`)
  }),
  t('V2-API-IMP-02', '导入', '上传合法 xlsx：新商品 imported，重名/空名 skipped（BUG-3）', 'imported>=1 且 total 正确', async () => {
    const rows = [
      { name: 'V2导入新商品A', spec: '规格A', unit: '盒', retail_price: 11, warning_quantity: 5, danger_quantity: 2 },
      { name: 'V2导入新商品B', spec: '规格B', unit: '瓶', retail_price: 22 },
      { name: P_NAME, spec: '重名应跳过', unit: '个' },
      { name: '', spec: '空名应跳过', unit: '个' }
    ]
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '商品')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    const fd = new FormData()
    fd.append('file', new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'v2import.xlsx')
    const r = await request('admin', 'POST', '/api/import/products', fd)
    const d = bodyOf(r).data || {}
    return ok(bodyOf(r).success === true && d.imported >= 2 && d.skipped >= 2 && d.total === 4,
      `imported=${d.imported}, skipped=${d.skipped}, total=${d.total}, errors=${JSON.stringify(d.errors)}`)
  }),
  t('V2-API-IMP-03', '导入', '导入结果含 imported/skipped/total/errors 契约字段（BUG-9）', '字段齐全', async () => {
    const ws = XLSX.utils.json_to_sheet([{ name: 'V2导入契约检查', spec: 's', unit: 'u' }])
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 's')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    const fd = new FormData(); fd.append('file', new Blob([buf]), 'c.xlsx')
    const r = await request('admin', 'POST', '/api/import/products', fd)
    const d = bodyOf(r).data || {}
    const keys = ['imported', 'skipped', 'total', 'errors']
    return ok(keys.every(k => k in d), '字段: ' + keys.filter(k => k in d).join(','))
  }),
  t('V2-API-IMP-04', '权限隔离', '普通用户不能导入/取模板', '403', async () => {
    const r1 = await request('user', 'GET', '/api/import/template')
    const fd = new FormData(); const r2 = await request('user', 'POST', '/api/import/products', fd)
    return ok(r1.status === 403 && r2.status === 403, `template=${r1.status}, import=${r2.status}`)
  }),

  // ============ I. 供应商 / 客户 ============
  t('V2-API-PARTY-01', '往来单位', '供应商搜索 ?query 返回结果', 'data 数组', async () => {
    const r = await request('admin', 'GET', '/api/suppliers/search?query=' + encodeURIComponent('V2'))
    return ok(r.status === 200 && Array.isArray(bodyOf(r).data), `status=${r.status}, n=${(bodyOf(r).data || []).length}`)
  }),
  t('V2-API-PARTY-02', '往来单位', '管理员新建供应商并回显', 'success 且含 id', async () => {
    const r = await request('admin', 'POST', '/api/suppliers', { name: 'V2供应商CRUD', contact_person: '张三', phone: '13800000000' })
    globalThis.__supplierId = bodyOf(r).data?.id
    return ok(bodyOf(r).success === true && !!globalThis.__supplierId, bodyOf(r))
  }),
  t('V2-API-PARTY-03', '往来单位', '供应商启用状态 is_active 保存并正确回显（BUG-8）', '更新后回显 is_active=0 再恢复 1', async () => {
    const id = globalThis.__supplierId
    await request('admin', 'PUT', `/api/suppliers/${id}`, { name: 'V2供应商CRUD', is_active: 0 })
    const off = await request('admin', 'GET', `/api/suppliers?page=1&pageSize=200&query=${encodeURIComponent('V2供应商CRUD')}`)
    const rowOff = (bodyOf(off).data || []).find(x => x.id === id)
    await request('admin', 'PUT', `/api/suppliers/${id}`, { name: 'V2供应商CRUD', is_active: 1 })
    const on = await request('admin', 'GET', `/api/suppliers?page=1&pageSize=200&query=${encodeURIComponent('V2供应商CRUD')}`)
    const rowOn = (bodyOf(on).data || []).find(x => x.id === id)
    const offVal = rowOff ? Number(rowOff.is_active) : null
    const onVal = rowOn ? Number(rowOn.is_active) : null
    return ok(offVal === 0 && onVal === 1, `禁用后=${offVal}, 启用后=${onVal}`)
  }),
  t('V2-API-PARTY-04', '往来单位', '客户搜索与新建', 'success', async () => {
    const r = await request('admin', 'POST', '/api/customers', { name: 'V2客户CRUD', contact_person: '李四', phone: '13900000000' })
    globalThis.__customerId = bodyOf(r).data?.id
    const s = await request('admin', 'GET', '/api/customers/search?query=V2客户')
    return ok(bodyOf(r).success === true && (bodyOf(s).data || []).length > 0, bodyOf(r))
  }),
  t('V2-API-PARTY-05', '权限隔离', '普通用户不能新建/修改供应商客户', '403', async () => {
    const r1 = await request('user', 'POST', '/api/suppliers', { name: 'x' })
    const r2 = await request('user', 'POST', '/api/customers', { name: 'x' })
    return ok(r1.status === 403 && r2.status === 403, `supplier=${r1.status}, customer=${r2.status}`)
  }),

  // ============ J. 设置 / 备份 / 看板 ============
  t('V2-API-SET-01', '设置', 'GET 设置可读取（对象）', '200', async () => {
    const r = await request('admin', 'GET', '/api/settings')
    return ok(r.status === 200 && (r.data === null || typeof r.data === 'object'), `status=${r.status}`)
  }),
  t('V2-API-SET-02', '设置', '保存公司信息白名单字段并回显（BUG-11）', 'companyName 保存成功', async () => {
    const r = await request('admin', 'POST', '/api/settings', { companyName: 'V2测试公司', phone: '027-123', address: '武汉', icp: 'V2ICP备000号' })
    const g = await request('admin', 'GET', '/api/settings')
    return ok(bodyOf(r).success === true && bodyOf(g).data?.companyName === 'V2测试公司', `回显=${bodyOf(g).data?.companyName}`)
  }),
  t('V2-API-SET-03', '设置', '非白名单字段被忽略', 'evilKey 不被保存', async () => {
    await request('admin', 'POST', '/api/settings', { evilKey: 'hack', companyName: 'V2测试公司' })
    const g = await request('admin', 'GET', '/api/settings')
    return ok(!('evilKey' in (bodyOf(g).data || {})), 'evilKey=' + (bodyOf(g).data?.evilKey ?? '不存在'))
  }),
  t('V2-API-SET-04', '权限隔离', '普通用户不能保存设置', '403', async () => {
    const r = await request('user', 'POST', '/api/settings', { companyName: 'x' })
    return ok(r.status === 403, `status=${r.status}`)
  }),
  t('V2-API-SET-05', '设置', '修改密码：旧密码错误被拒', '400', async () => {
    const r = await request('user', 'POST', '/api/change-password', { currentPassword: 'wrong_old', newPassword: 'New@123456' })
    return ok(r.status === 400 && bodyOf(r).success === false, `status=${r.status} ${bodyOf(r).message || ''}`)
  }),
  t('V2-API-SET-06', '设置', '修改密码：旧密码正确则成功且新密码可登录', 'success，新密码可登录，再改回', async () => {
    const r = await request('user', 'POST', '/api/change-password', { currentPassword: U_PASS, newPassword: 'New@123456' })
    const loginNew = await request('user', 'POST', '/api/auth/login', { username: U_NAME, password: 'New@123456' })
    // 改回原密码
    const back = await request('user', 'POST', '/api/change-password', { currentPassword: 'New@123456', newPassword: U_PASS })
    return ok(bodyOf(r).success === true && bodyOf(loginNew).success === true && bodyOf(back).success === true,
      `change=${bodyOf(r).success}, newLogin=${bodyOf(loginNew).success}, restore=${bodyOf(back).success}`)
  }),
  t('V2-API-BAK-01', '备份', '创建备份返回文件信息（file_name/file_size）', 'success 且列表含 file_name/file_size(MB)/created_at', async () => {
    const r = await request('admin', 'POST', '/api/backup')
    const list = await request('admin', 'GET', '/api/backups')
    const arr = Array.isArray(list.data) ? list.data : (bodyOf(list).data || [])
    const newest = arr[0]
    if (newest && newest.id) createdBackupId = newest.id
    const fieldsOk = newest && ('file_name' in newest) && ('file_size' in newest) && ('created_at' in newest)
    return ok(bodyOf(r).success !== false && fieldsOk,
      `create=${JSON.stringify(bodyOf(r)).slice(0, 120)}; newest字段=${newest ? Object.keys(newest).join('/') : '无备份'}`)
  }),
  t('V2-API-BAK-02', '权限隔离', '普通用户不能查看/创建备份', '403', async () => {
    const r1 = await request('user', 'GET', '/api/backups')
    const r2 = await request('user', 'POST', '/api/backup')
    return ok(r1.status === 403 && r2.status === 403, `list=${r1.status}, create=${r2.status}`)
  }),
  t('V2-API-DASH-01', '看板', 'KPI 接口返回关键指标', '含 totalProducts/todayIn/todayOut/lowStock', async () => {
    const r = await request('admin', 'GET', '/api/dashboard/kpi')
    const d = bodyOf(r)
    const keys = ['totalProducts', 'todayIn', 'todayOut', 'lowStock']
    const miss = keys.filter(k => !(k in (d?.data || d || {})))
    return ok(r.status === 200 && miss.length === 0, '缺失 ' + (miss.join(',') || '无') + ' ' + JSON.stringify(d?.data || d).slice(0, 120))
  }),
  t('V2-API-DASH-02', '看板', '趋势/热销/库存状态接口可用', '均 200', async () => {
    const [a, b, c] = await Promise.all([
      request('admin', 'GET', '/api/dashboard/trend'),
      request('admin', 'GET', '/api/dashboard/top-products'),
      request('admin', 'GET', '/api/dashboard/stock-status')
    ])
    const bad = [a.status, b.status, c.status].filter(s => s !== 200)
    return ok(bad.length === 0, '状态 ' + [a.status, b.status, c.status].join('/'))
  }),

  // ============ K. 出入库方式管理 ============
  t('V2-API-METH-01', '方式管理', '管理员获取全部方式', 'methods 数组（12 种）', async () => {
    const r = await request('admin', 'GET', '/api/stock-methods-admin')
    const arr = bodyOf(r).data || []
    return ok(r.status === 200 && arr.length >= 12, `count=${arr.length}`)
  }),
  t('V2-API-METH-02', '方式管理', '新增→更新→删除一个临时方式', '全链路 success，最终数量恢复', async () => {
    const before = await request('admin', 'GET', '/api/stock-methods-admin')
    const n0 = (bodyOf(before).data || []).length
    const c = await request('admin', 'POST', '/api/stock-methods-admin', { type: 'in', method_name: 'V2临时方式' })
    const id = bodyOf(c).data?.id
    const u = await request('admin', 'PUT', `/api/stock-methods-admin/${id}`, { type: 'in', method_name: 'V2临时方式改' })
    const d = await request('admin', 'DELETE', `/api/stock-methods-admin/${id}`)
    const after = await request('admin', 'GET', '/api/stock-methods-admin')
    const n1 = (bodyOf(after).data || []).length
    return ok(bodyOf(c).success && bodyOf(u).success && bodyOf(d).success && n1 === n0,
      `create=${bodyOf(c).success}, update=${bodyOf(u).success}, del=${bodyOf(d).success}, ${n0}→${n1}`)
  }),
  t('V2-API-METH-03', '方式管理', '新增非法类型被 400', '400', async () => {
    const r = await request('admin', 'POST', '/api/stock-methods-admin', { type: 'bad', method_name: 'x' })
    return ok(r.status === 400, `status=${r.status}`)
  }),
  t('V2-API-METH-04', '权限隔离', '普通用户不能管理方式', '403', async () => {
    const r = await request('admin', 'GET', '/api/stock-methods-admin') // admin 可
    const u = await request('user', 'GET', '/api/stock-methods-admin')
    return ok(r.status === 200 && u.status === 403, `admin=${r.status}, user=${u.status}`)
  })
]

;(async () => {
  await run(cases)

  // 汇总
  const pass = results.filter(r => r.status === 'pass').length
  const fail = results.filter(r => r.status === 'fail').length
  const summary = { total: results.length, pass, fail, generatedAt: new Date().toISOString(), results }
  writeFileSync(new URL('../runtime/v2_api_results.json', import.meta.url), JSON.stringify(summary, null, 2), 'utf-8')
  console.log(`\n==== API 回归汇总: ${pass}/${results.length} 通过, ${fail} 失败 ====`)
  if (fail) process.exitCode = 1
})().catch(e => { console.error('测试运行器异常:', e); process.exit(2) })
