# 代理指南

## 快速开始

```bash
npm install
# 复制并配置全站唯一配置文件：
#   config/config.example.js -> config/config.js（数据库/会话/CSRF 密钥都在这一个文件）
# 使用以下脚本初始化数据库：sql/store.sql
# 前端构建（生成 dist/，Express 从该目录提供 SPA）：
npm run build
npm start  # http://localhost:3000
```

## 常用命令

- `npm start` — 运行 `node store.js`（端口 3000，提供 API + dist/ 静态 SPA）
- `npm run dev` — 启动 Vite 开发服务器（端口 5173，`/api` 代理到 localhost:3000，需同时运行 `npm start`）
- `npm run build` — 生产构建到 `dist/`（Vite 8 + Rolldown，无 build 时后端无页面可服务）
- `npm test` — 运行 Jest 单元测试（`__tests__/`，匹配 `*.test.js`）
- `npm run test:coverage` — 运行测试并生成覆盖率报告
- `npm run test:api` — 运行 v2 API 回归（`tests/v2_api_test.mjs`，77 例，对运行中的 :3000 发真实 HTTP）；`npm run test:api:v1` 运行 v1 全量（`tests/api_test.js`，108 例）
- `node scripts/sync_suppliers.js` — 从出入库记录同步供应商和客户到数据库

> 跑 API 回归前置：MySQL 已导入 `sql/store.sql`（建议先还原干净基线）、`config/config.js` 已配置、`npm start` 在 :3000 运行、`admin/admin` 可登录。脚本在脏库上非幂等，重跑前先还原基线。

## 架构

- **入口文件**: `store.js`
- **分层 MVC**: `routes/` → `controllers/` → `services/` → `models/` → `utils/dbUtils.js`
- **配置**: 全站唯一配置文件 `config/config.js`（已 gitignore，从 `config/config.example.js` 复制）集中管理端口、数据库（mysql2 连接池，在 `utils/dbUtils.js` 创建）、会话与 CSRF 密钥；支持同名环境变量覆盖。所有查询都通过 `dbUtils` 包装 `promisePool` 执行。
- **认证**: 基于 Session（`express-session`），session 密钥来自 `config/config.js` 的 `sessionSecret`。`middleware/auth.js` 导出 `requireLogin`、`checkLoggedIn`、`requireAdmin`。角色仅 `admin` / `user`；`GET /api/auth/current-user` 返回 `{success, data: {loggedIn, username, role}}`（前端路由守卫依赖 data.role，勿删该字段）。写操作与管理列表必须 `requireAdmin`；前端在 `src/router/index.js` 守卫、`AppLayout.vue` 菜单、各页面按钮三处做角色裁剪，改权限时前后端同时收口。登录失败返回 HTTP 200 + `{success:false}`（非 401），登录限流 15 分钟 10 次/IP。
- **前端**: Vue 3 SPA（Composition API + `<script setup>`）+ Vite 8 构建，源码在 `src/`。技术栈：Vue Router（全部路由懒加载）、Pinia（auth/settings store）、Bootstrap 5（npm 引入 + CSS 变量定制主题）、Chart.js 与 xlsx 按需动态 import。旧版多页前端 `public/` 已整体删除，前端只有 `src/` Vue SPA。
- **后端服务 SPA**: `store.js` 通过 `express.static('dist')` 提供构建产物，SPA History Fallback 正则为 `/^\/(?!api|api-docs).*/`（排除 API 与 Swagger 路径，静态资源后缀直接 next）
- **页脚/备案配置**: 存数据库 `settings` 表，设置页保存后实时生效；登录页走公开接口 `GET /api/settings/public`（无需认证），页内走 `GET /api/settings`（需登录）。不再使用 `.env` / VITE_* 变量
- **CSRF**: 已启用（doubleCsrf，`store.js` 对 `/api` 挂载；token 走 `GET /api/auth/csrf-token`，前端 `src/api/http.js` 非 GET 请求自动携带 `X-CSRF-Token` 并在 403 时刷新重试一次；登录/登出/current-user 等在 `middleware/csrf.js` 的 `skipCsrfProtection` 中按 `req.originalUrl` 豁免）。⚠️ 不要改用 `ignoredPaths`——csrf-csrf 4.x 不支持该选项，会被静默忽略，导致登录接口必然 403/500。本地跑 `tests/` API 回归脚本必须设 `CSRF_DISABLED=true` 再启动服务，否则写请求全部 403。
- **API 文档**: Swagger UI 在 `/api-docs`
- **日志**: 写入 `logs/` 目录（由 `utils/logger.js` 自动创建）
- **备份**: MySQL 导出文件存储在 `backup/`（已 gitignore）

## 项目结构

```
config/          全站唯一配置 config.js（gitignore）+ 模板 config.example.js
controllers/     路由处理器（认证、商品、库存、供应商、客户、仪表板、批量、盘点、导入、备份、设置）
dist/            前端构建产物（gitignore，npm run build 生成）
middleware/      认证中间件（requireLogin、requireAdmin）、CSRF（已启用）、限流
models/          数据库查询层（Product、User、InRecord、OutRecord、Stock、StockMethod、Supplier）
routes/          Express 路由 → 控制器
services/        业务逻辑（InventoryService、BackupService、SettingsService）
src/             Vue 3 SPA 源码
  api/           API 请求封装（auth/products/inventory/suppliers/customers/dashboard/stocktaking/import/settings）
  styles/         全局样式（tokens.css 设计令牌 + base/layout/components/overrides 主题覆盖）
  components/    通用组件（common/、layout/ 侧边栏与顶栏）
  composables/   组合式函数（usePagination、useDebounce 等）
  router/        路由定义（全部懒加载 + 路由守卫）
  stores/        Pinia store（auth、settings）
  views/         页面组件（products/、inventory/、stock/、parties/、dashboard/、stocktaking/、import/、settings/）
sql/             数据库建表脚本（store.sql v3.4、update_v3.3.sql、update_v3.4.sql 升级脚本）
scripts/         工具脚本（sync_suppliers.js 供应商/客户同步）
utils/           工具函数（dbUtils 查询封装、pagination 分页、dataUtils、logger）
tests/           API 集成/回归脚本（api_test.js v1、v2_api_test.mjs v2），随仓库提交
runtime/         测试运行目录（服务日志、临时 xlsx、结果 JSON、DB 转储，gitignore，勿提交）
vite.config.mjs  Vite 配置（必须是 .mjs，因后端为 CommonJS）
__tests__/       Jest 单元测试
```

## API 路由

| 前缀 | 路由文件 | 认证要求 |
|--------|-------------|------|
| `/api/auth` | `authRoutes.js` | 视情况而定 |
| `/api/products` | `productRoutes.js` | 需登录 |
| `/api`（出入库/设置/备份） | `inventoryRoutes.js` | 需登录 |
| `/api/logs` | `logRoutes.js` | 需登录 |
| `/api/suppliers` | `supplierRoutes.js` | 需登录（搜索无需管理员，管理需管理员） |
| `/api/customers` | `customerRoutes.js` | 需登录（搜索无需管理员，管理需管理员） |
| `/api/dashboard` | `dashboardRoutes.js` | 需登录 |
| `/api/batch` | `batchRoutes.js` | 需登录 |
| `/api/stocktaking` | `stocktakingRoutes.js` | 需登录 |
| `/api/import` | `importRoutes.js` | 需登录（管理员） |

## 数据库

建表脚本位于 `sql/store.sql`（v3.4，2026-07-21）。核心表：`products`、`in_records`、`out_records`、`stock_methods`、`batch_stock`、`stock_inventory`、`users`、`settings`、`backups`、`suppliers`、`customers`、`stocktaking`、`stocktaking_items`、`system_settings`。全部使用 `utf8mb4` 字符集。

升级脚本：
- `sql/update_v3.3.sql` — v3.2 → v3.3，新增 suppliers、stocktaking、stocktaking_items 表
- `sql/update_v3.4.sql` — v3.3 → v3.4，新增 customers 表

关键数据约定：
- `stock_methods` 共 12 种：入库 6（采购/退货/调拨/生产/其他/盘点入库），出库 6（销售/调拨/报损/样品/其他/盘点出库）。`GET /api/stock-methods?type=in|out` 登录可用返回字符串数组；管理走 `/api/stock-methods-admin`（admin）。前端 `StockInView/StockOutView` 的 catch 降级数组也必须包含盘点入/出库，改方式时三处同步。
- 库存报表 `/api/stock` 基于 `batch_stock`（仅 `batch_current_stock>0`）；总库存以 `stock_inventory` 为准，二者必须在同一事务内同步。
- 盘点完成（`stocktakingController.complete`）：盘盈调 `InventoryService.inStock` 建批号 `PANDIAN-<盘点单ID>`（过期日 9999-12-31、单价 0），盘亏按近效期 FIFO 逐批 `outStock`（每批一条“盘点出库”）；不得只改 `stock_inventory` 而漏 `batch_stock`。录入项 `actual_stock` 必须为非负整数，否则 400。
- 日期序列化：`/api/query/:productId` 的 `batchStock.production_date/expiration_date` 与 `/api/backups` 的 `created_at` 是 JS Date → JSON 的 ISO 串，前端必须用 `@/utils/formatters` 的 `formatDate()` 渲染，不可直接 `{{ }}` 输出 ISO。
- 首页/看板 KPI：`dashboardController.getKPI` 返回含 `todayIn`/`todayOut`/`lowStock`，`HomeView.vue` 依赖这三个字段。
- 供应商：`SupplierModel.searchAll` 含禁用项（管理员管理列表/分页用），`search` 仅返回启用项（入库单联想、`GET /suppliers/search` 用）；客户无启用/禁用概念。
- 批量出入库 `/api/batch/in|out`：item 的 `unit_price` 缺省按 0、`total_amount` 缺省按 数量×单价，不可把 null 写入 NOT NULL 列；返回 `{success, data: {successCount, failCount, errors}}`，前端需如实展示部分成功。

## 注意事项

- `config/config.js` 已 gitignore — 运行前务必从 `config/config.example.js` 复制并配置（数据库/会话/CSRF 全在这一个文件）
- `config/session.js` 本地开发用固定兜底密钥（避免重启后 session 失效）；生产环境（NODE_ENV=production）必须设置 SESSION_SECRET 环境变量否则拒绝启动，HTTPS 部署时设置 COOKIE_SECURE=true
- 前端 API 请求统一走 `src/api/`（fetch + `credentials: 'same-origin'`），不要在组件里手写 fetch
- `vite.config.mjs` 不要改回 `.js`（后端 package.json 无 `"type": "module"`，.js 会按 CJS 解析报 ESM 警告）
- 修改前端源码后必须 `npm run build` 才会生效于生产（Express 只服务 `dist/`）；开发时用 `npm run dev`（5173 端口热更新）
- 新增页面：在 `src/views/` 建组件 → `src/router/index.js` 加懒加载路由 → 侧边栏 `src/components/layout/` 加导航项
- Chart.js（dashboard）和 xlsx（批量导入）为动态 import 懒加载，不要改为静态导入（会增大主包）
- 库存操作（`services/InventoryService.js`）使用 `dbUtils.executeTransaction` — 不要绕过事务包装器进行库存变更
- 入库记录创建时会自动将供应商名称同步到 suppliers 表
- 出库记录创建时会自动将客户名称同步到 customers 表
- CSRF 中间件已默认启用（见"架构"节）；跑 API 回归前设 `CSRF_DISABLED=true`
- 生产环境（NODE_ENV=production）必须设置 SESSION_SECRET、CSRF_SECRET、DB_PASSWORD 环境变量，缺失则拒绝启动；HTTPS 部署时设 COOKIE_SECURE=true；/api-docs 在生产环境仅管理员可见
- 中文编码：所有源码文件必须保存为 UTF-8 编码
- 供应商和客户数据分别存储在 `suppliers` 和 `customers` 表中，不要混用
- `inventoryRoutes.js` 中已移除旧的 `/customers` 路由，客户管理使用独立的 `customerRoutes.js`
- 后端 API 返回格式已统一：成功 `{ success: true, data: <业务数据>, message?: string, pagination?: {page,pageSize,total,totalPages} }`，失败 `{ success: false, message }`。所有业务数据（数组/对象/计数）一律放 `data`，不要在顶层挂业务字段；新增接口必须遵守。前端 `src/api/http.js` 的 `extractData()` 与各视图的 `res?.data || res` 兼容读取均已适配
- 前端日期、金额展示统一走 `@/utils/formatters`（`formatDate(date, withTime=false)` 能处理 ISO 与 9999 远期批次、`formatMoney`），不要在组件里手写 toISOString/toFixed
- 测试脚本只放 `tests/`（随仓库提交）；测试结果 `*_results.json`、临时 xlsx、服务日志、数据库基线转储 `backup_pre_*.sql` 等放 `runtime/` 或根目录并已 gitignore，禁止提交；改后端先 `node --check` 再重启，改前端必须 `npm run build`
