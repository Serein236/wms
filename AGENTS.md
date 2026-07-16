# 代理指南

## 快速开始

```bash
npm install
# 复制并配置数据库凭据：
#   config/databases.example.js -> config/databases.js
# 使用以下脚本初始化数据库：sql/store.sql
npm start  # http://localhost:3000
```

## 常用命令

- `npm start` — 运行 `node store.js`（端口 3000）
- `npm test` — 运行 Jest 测试
- `npm run test:coverage` — 运行测试并生成覆盖率报告
- `node scripts/sync_suppliers.js` — 从出入库记录同步供应商到 suppliers 表（升级时执行一次）

## 架构

- **入口文件**: `store.js`
- **分层 MVC**: `routes/` → `controllers/` → `services/` → `models/` → `utils/dbUtils.js`
- **数据库**: MySQL 8.0+，通过 `mysql2` 连接池配置在 `config/databases.js`（已 gitignore）。所有查询都通过 `dbUtils` 包装 `promisePool` 执行。
- **认证**: 基于 Session（`express-session`），session 密钥固定为 `warehouse-system-session-secret-2026`。`middleware/auth.js` 导出 `requireLogin`、`checkLoggedIn`、`requireAdmin`。
- **前端**: 纯 HTML + Bootstrap 5 + 原生 JS，位于 `public/` 目录。无构建步骤。
- **CSRF**: 已禁用（前端不发送 CSRF token），`middleware/csrf.js` 中跳过所有 `/api/` 路径。
- **API 文档**: Swagger UI 在 `/api-docs`
- **日志**: 写入 `logs/` 目录（由 `utils/logger.js` 自动创建）
- **备份**: MySQL 导出文件存储在 `backup/`（已 gitignore）

## 项目结构

```
config/          数据库配置（gitignore）、Session 配置
controllers/     路由处理器（认证、商品、库存、日志、供应商、仪表板、批量、盘点、导入）
middleware/      认证中间件（requireLogin、requireAdmin）、CSRF（已禁用）、限流
models/          数据库查询层（Product、User、InRecord、OutRecord、Stock、StockMethod、Supplier）
public/          静态前端资源（HTML + CSS + JS，无构建）
routes/          Express 路由 → 控制器
services/        业务逻辑（InventoryService、BackupService、SettingsService）
sql/             数据库建表脚本（store.sql v3.3、update_v3.3.sql 升级脚本）
scripts/         工具脚本（sync_suppliers.js 供应商同步）
utils/           工具函数（dbUtils 查询封装、pagination 分页、dataUtils、logger）
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
| `/api/dashboard` | `dashboardRoutes.js` | 需登录 |
| `/api/batch` | `batchRoutes.js` | 需登录 |
| `/api/stocktaking` | `stocktakingRoutes.js` | 需登录 |
| `/api/import` | `importRoutes.js` | 需登录（管理员） |

## 数据库

建表脚本位于 `sql/store.sql`（v3.3，2026-07-16）。核心表：`products`、`in_records`、`out_records`、`stock_methods`、`batch_stock`、`stock_inventory`、`users`、`settings`、`backups`、`suppliers`、`stocktaking`、`stocktaking_items`、`system_settings`。全部使用 `utf8mb4` 字符集。

升级脚本 `sql/update_v3.3.sql` 从 v3.2 升级到 v3.3，新增 suppliers、stocktaking、stocktaking_items 表。

## 注意事项

- `config/databases.js` 已 gitignore — 运行前务必从 `config/databases.example.js` 复制并配置
- `public/js/config.js` 已 gitignore（页脚/备案配置），需从 `config.example.js` 复制
- `config/session.js` session 密钥已固定为字符串，不再随机生成（随机生成会导致重启后 session 失效）
- `store.js` 中 `express.static('public')` 必须在 protected pages 路由之后注册，否则静态文件会绕过认证中间件
- 库存操作（`services/InventoryService.js`）使用 `dbUtils.executeTransaction` — 不要绕过事务包装器进行库存变更
- 入库/出库记录创建时会自动将供应商/客户名称同步到 suppliers 表
- CSRF 中间件已禁用（`store.js` 中注释掉了），前端不发送 CSRF token
- 前端 JS 的 `catch` 块中不应包含 `window.location.href = 'login.html'`（会导致任何 JS 错误都跳转登录页）
- `public/js/pagination.js` 提供分页工具 `PaginationHelper`，多个页面依赖它
- `public/js/records_common.js` 提供入库/出库记录页面的公共函数
- 出库单导出使用 ExcelJS（CDN 加载），需要浏览器支持
- 中文编码：所有 HTML 文件必须保存为 UTF-8 编码，PowerShell 的 `Set-Content` 会破坏编码，务必用 Node.js 的 `fs.writeFileSync` 写入
