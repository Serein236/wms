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
- 本项目没有测试套件、代码检查或类型检查工具。通过启动服务器并手动测试 API/界面来验证更改。

## 架构

- **入口文件**: `store.js`
- **分层 MVC**: `routes/` → `controllers/` → `services/` → `models/` → `utils/dbUtils.js`
- **数据库**: MySQL 8.0+，通过 `mysql2` 连接池配置在 `config/databases.js`（已 gitignore）。所有查询都通过 `dbUtils` 包装 `promisePool` 执行。
- **认证**: 基于 Session（`express-session`）。`middleware/auth.js` 导出 `requireLogin`、`checkLoggedIn`、`requireAdmin`。管理员专用路由使用 `requireAdmin`。
- **前端**: 纯 HTML + Bootstrap 5 + 原生 JS，位于 `public/` 目录。无构建步骤。
- **API 文档**: Swagger UI 在 `/api-docs`，JSON 规范在 `/api-docs.json`（从 `routes/` 和 `controllers/` 中的 JSDoc 注释生成）。
- **日志**: 写入 `logs/` 目录（由 `utils/logger.js` 自动创建）。
- **备份**: MySQL 导出文件存储在 `backup/`（已 gitignore）。

## 注意事项

- `config/databases.js` 已 gitignore — 运行前务必从 `config/databases.example.js` 复制并配置
- `config/session.js` 使用 `crypto.randomBytes` 生成随机密钥，支持 `SESSION_SECRET` 环境变量覆盖
- `store.js` 端口 3000 硬编码，不支持环境变量覆盖
- 库存操作（`services/InventoryService.js`）使用 `dbUtils.executeTransaction` — 不要绕过事务包装器进行库存变更
- `public/js/config.js` 已 gitignore（页脚/备案配置）
- Swagger JSDoc 注释位于 `routes/*.js` 和 `controllers/*.js`

## 项目结构

```
config/          数据库配置（gitignore）、Session 配置
controllers/     路由处理器（认证、商品、库存、日志）
middleware/      认证中间件（requireLogin、requireAdmin）
models/          数据库查询层（Product、User、InRecord、OutRecord、Stock、StockMethod）
public/          静态前端资源（HTML + CSS + JS，无构建）
routes/          Express 路由 → 控制器
services/        业务逻辑（InventoryService 是主要的服务）
sql/             数据库建表脚本（store.sql）
utils/           工具函数（dbUtils 查询封装、dataUtils、logger）
```

## API 路由

| 前缀 | 路由文件 | 认证要求 |
|--------|-------------|------|
| `/api/auth` | `authRoutes.js` | 视情况而定 |
| `/api/products` | `productRoutes.js` | 需登录 |
| `/api`（出入库/设置/备份） | `inventoryRoutes.js` | 需登录 |
| `/api/logs` | `logRoutes.js` | 需登录 |

## 数据库

建表脚本位于 `sql/store.sql`（v3.2，2026-04-13）。核心表：`products`、`in_records`、`out_records`、`stock_methods`、`batch_stock`、`users`、`settings`、`backups`。全部使用 `utf8mb4` 字符集。
