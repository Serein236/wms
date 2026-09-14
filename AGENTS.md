# 代理指南

## 快速开始

```bash
npm install
# 复制并配置数据库凭据：
#   config/databases.example.js -> config/databases.js
# 使用以下脚本初始化数据库：sql/store.sql
# 前端构建（生成 dist/，Express 从该目录提供 SPA）：
npm run build
npm start  # http://localhost:3000
```

## 常用命令

- `npm start` — 运行 `node store.js`（端口 3000，提供 API + dist/ 静态 SPA）
- `npm run dev` — 启动 Vite 开发服务器（端口 5173，`/api` 代理到 localhost:3000，需同时运行 `npm start`）
- `npm run build` — 生产构建到 `dist/`（Vite 8 + Rolldown，无 build 时后端无页面可服务）
- `npm test` — 运行 Jest 测试
- `npm run test:coverage` — 运行测试并生成覆盖率报告
- `node scripts/sync_suppliers.js` — 从出入库记录同步供应商和客户到数据库

## 架构

- **入口文件**: `store.js`
- **分层 MVC**: `routes/` → `controllers/` → `services/` → `models/` → `utils/dbUtils.js`
- **数据库**: MySQL 8.0+，通过 `mysql2` 连接池配置在 `config/databases.js`（已 gitignore）。所有查询都通过 `dbUtils` 包装 `promisePool` 执行。
- **认证**: 基于 Session（`express-session`），session 密钥固定为 `warehouse-system-session-secret-2026`。`middleware/auth.js` 导出 `requireLogin`、`checkLoggedIn`、`requireAdmin`。
- **前端**: Vue 3 SPA（Composition API + `<script setup>`）+ Vite 8 构建，源码在 `src/`。技术栈：Vue Router（全部路由懒加载）、Pinia（auth/settings store）、Bootstrap 5（npm 引入 + CSS 变量定制主题）、Chart.js 与 xlsx 按需动态 import。`public/` 目录为旧版多页前端，已不再被 Express 服务，仅作参考保留。
- **后端服务 SPA**: `store.js` 通过 `express.static('dist')` 提供构建产物，SPA History Fallback 正则为 `/^\/(?!api|api-docs).*/`（排除 API 与 Swagger 路径，静态资源后缀直接 next）
- **环境变量**: 前端页脚/备案配置在 `.env`（已 gitignore），通过 `import.meta.env.VITE_*` 读取（替代旧的 `public/js/config.js`）
- **CSRF**: 已禁用（前端不发送 CSRF token），`middleware/csrf.js` 中跳过所有 `/api/` 路径。
- **API 文档**: Swagger UI 在 `/api-docs`
- **日志**: 写入 `logs/` 目录（由 `utils/logger.js` 自动创建）
- **备份**: MySQL 导出文件存储在 `backup/`（已 gitignore）

## 项目结构

```
config/          数据库配置（gitignore）、Session 配置
controllers/     路由处理器（认证、商品、库存、供应商、客户、仪表板、批量、盘点、导入、备份、设置）
dist/            前端构建产物（gitignore，npm run build 生成）
middleware/      认证中间件（requireLogin、requireAdmin）、CSRF（已禁用）、限流
models/          数据库查询层（Product、User、InRecord、OutRecord、Stock、StockMethod、Supplier）
public/          旧版多页前端（HTML + 原生 JS，已废弃，Express 不再服务，仅参考保留）
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
vite.config.mjs  Vite 配置（必须是 .mjs，因后端为 CommonJS；publicDir: false 防止旧 public/ 混入 dist/）
__tests__/       Jest 测试
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

## 注意事项

- `config/databases.js` 已 gitignore — 运行前务必从 `config/databases.example.js` 复制并配置
- `.env` 已 gitignore（前端页脚/备案配置 VITE_COMPANY_NAME/VITE_ICP/VITE_ICP_URL），本地需手动创建
- `config/session.js` session 密钥已固定为字符串，不再随机生成（随机生成会导致重启后 session 失效）
- 前端 API 请求统一走 `src/api/`（fetch + `credentials: 'same-origin'`），不要在组件里手写 fetch
- `vite.config.mjs` 不要改回 `.js`（后端 package.json 无 `"type": "module"`，.js 会按 CJS 解析报 ESM 警告）
- `publicDir: false` 必须保留 — 否则旧 `public/` 的 21 个 HTML 会复制进 dist/ 与 SPA 冲突
- 修改前端源码后必须 `npm run build` 才会生效于生产（Express 只服务 `dist/`）；开发时用 `npm run dev`（5173 端口热更新）
- 新增页面：在 `src/views/` 建组件 → `src/router/index.js` 加懒加载路由 → 侧边栏 `src/components/layout/` 加导航项
- Chart.js（dashboard）和 xlsx（批量导入）为动态 import 懒加载，不要改为静态导入（会增大主包）
- 库存操作（`services/InventoryService.js`）使用 `dbUtils.executeTransaction` — 不要绕过事务包装器进行库存变更
- 入库记录创建时会自动将供应商名称同步到 suppliers 表
- 出库记录创建时会自动将客户名称同步到 customers 表
- CSRF 中间件已禁用（`store.js` 中注释掉了），前端不发送 CSRF token
- 中文编码：所有源码文件必须保存为 UTF-8 编码
- 供应商和客户数据分别存储在 `suppliers` 和 `customers` 表中，不要混用
- `inventoryRoutes.js` 中已移除旧的 `/customers` 路由，客户管理使用独立的 `customerRoutes.js`
- 后端 API 返回格式不统一（有的是裸数组，有的是 `{success, data, pagination}`），`src/api/` 已做兼容层，新接口封装时注意两种格式都要处理
