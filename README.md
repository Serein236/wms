# 仓库管理系统

一个基于 Node.js + Express + MySQL 的仓库进销存管理系统，支持商品管理、出入库操作、库存查询、供应商/客户管理、数据可视化、批量操作、库存盘点等功能。

[![License](https://img.shields.io/badge/License-MulanPSL--2.0-blue.svg)](http://license.coscl.org.cn/MulanPSL2)

## 功能特性

### 核心功能
- **商品管理**：添加商品、查看商品列表、库存预警、条码管理
- **入库管理**：采购入库、退货入库、调拨入库、生产入库、其他入库
- **出库管理**：销售出库、调拨出库、报损出库、样品出库、其他出库
- **库存管理**：库存列表、库存查询、按状态筛选
- **供应商管理**：新增/编辑/删除供应商，从入库记录自动提取
- **客户管理**：新增/编辑/删除客户，从出库记录自动提取
- **批量操作**：批量入库、批量出库，支持 Excel/CSV 文件导入
- **库存盘点**：创建盘点单、盘点流程、库存自动调整
- **数据看板**：KPI 卡片、月度趋势、库存状态分布、TOP 10 商品
- **数据导入**：Excel/CSV 批量导入商品数据
- **条码扫描**：入库/出库页面支持条码扫描（QuaggaJS）
- **记录导出**：支持 Excel 格式导出，带格式销售出库单

### 系统特性
- **用户认证**：基于 Session 的登录/登出机制，支持管理员和普通用户角色
- **用户管理**：管理员可新增、删除、启用/禁用用户，编辑用户密码
- **数据备份**：手动备份、自动备份、清理前自动备份，支持备份恢复
- **自动完成**：供应商、客户名称模糊搜索，支持键盘导航
- **智能表单**：重复提交防护、必填字段验证、自动计算金额
- **响应式设计**：基于 Bootstrap 5 的侧边栏导航界面
- **系统设置**：导出配置、密码修改、数据管理、用户管理

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | Node.js, Express |
| 数据库 | MySQL 8.0+ |
| 前端 | Vue 3（Composition API）, Vue Router, Pinia |
| 构建 | Vite 8 |
| UI | Bootstrap 5（npm 引入 + CSS 变量定制主题） |
| 图表 | Chart.js（按需懒加载） |
| 导出 | xlsx / ExcelJS |
| 条码 | QuaggaJS |

## 快速开始

### 环境要求
- Node.js 20.19+（推荐 22 LTS，Vite 8 构建要求）
- MySQL 8.0+

### 安装步骤

1. **克隆项目**
```bash
git clone https://github.com/Serein236/wms.git
cd wms
```

2. **安装依赖**
```bash
npm install
```

3. **配置数据库**
```bash
# 复制配置文件
cp config/databases.example.js config/databases.js

# 编辑 config/databases.js 修改数据库连接信息
```

4. **初始化数据库**
```bash
# 创建数据库
mysql -u root -proot -e "CREATE DATABASE IF NOT EXISTS warehouse CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 导入表结构和初始数据
mysql -u root -proot warehouse < sql/store.sql
```

5. **构建前端**
```bash
npm run build
```

6. **启动服务**
```bash
npm start
```

7. **访问系统**
打开浏览器访问 `http://localhost:3000`，默认账号：
- 用户名：`admin`
- 密码：`admin`（首次登录后请修改）

### 开发模式（可选）

前后端同时运行，前端热更新：

```bash
# 终端 1：启动后端 API（端口 3000）
npm start

# 终端 2：启动 Vite 开发服务器（端口 5173，/api 自动代理到 3000）
npm run dev
```

访问 `http://localhost:5173` 进行开发调试。

## 项目结构

```
wms/
├── config/                 # 配置文件
│   ├── databases.js        # 数据库配置（gitignore）
│   ├── databases.example.js # 数据库配置模板
│   └── session.js          # Session 配置
├── controllers/            # 控制器
│   ├── authController.js   # 认证相关
│   ├── inventoryController.js  # 出入库管理
│   ├── productController.js    # 商品管理
│   ├── supplierController.js   # 供应商管理
│   ├── customerController.js   # 客户管理
│   ├── dashboardController.js  # 数据看板
│   ├── batchController.js      # 批量操作
│   ├── stocktakingController.js # 库存盘点
│   ├── importController.js     # 数据导入
│   ├── backupController.js     # 数据备份
│   └── settingsController.js   # 系统设置
├── middleware/             # 中间件
│   ├── auth.js             # 登录验证
│   ├── csrf.js             # CSRF 保护（已禁用）
│   └── rateLimiter.js      # 限流
├── models/                 # 数据模型
│   ├── InRecordModel.js    # 入库记录
│   ├── OutRecordModel.js   # 出库记录
│   ├── ProductModel.js     # 商品
│   ├── StockModel.js       # 库存
│   ├── UserModel.js        # 用户
│   ├── SupplierModel.js    # 供应商
│   └── ...
├── public/                 # 旧版多页前端（已废弃，仅参考保留）
├── src/                    # Vue 3 SPA 源码
│   ├── api/                # API 请求封装
│   ├── assets/             # 全局样式（设计令牌 + Bootstrap 主题覆盖）
│   ├── components/         # 通用组件（common/、layout/）
│   ├── composables/        # 组合式函数
│   ├── router/             # 路由定义（全部懒加载）
│   ├── stores/             # Pinia store（auth、settings）
│   ├── views/              # 页面组件
│   ├── App.vue             # 根组件
│   └── main.js             # 前端入口
├── routes/                 # 路由
│   ├── authRoutes.js
│   ├── inventoryRoutes.js
│   ├── productRoutes.js
│   ├── supplierRoutes.js
│   ├── customerRoutes.js
│   ├── dashboardRoutes.js
│   ├── batchRoutes.js
│   ├── stocktakingRoutes.js
│   └── importRoutes.js
├── services/               # 业务逻辑层
│   ├── InventoryService.js
│   ├── BackupService.js
│   └── SettingsService.js
├── scripts/                # 工具脚本
│   └── sync_suppliers.js   # 供应商/客户同步
├── sql/                    # 数据库脚本
│   ├── store.sql           # 完整建表脚本（v3.4）
│   ├── update_v3.3.sql     # 升级脚本 v3.2 → v3.3
│   └── update_v3.4.sql     # 升级脚本 v3.3 → v3.4
├── utils/                  # 工具函数
│   ├── dbUtils.js          # 数据库查询封装
│   ├── pagination.js       # 分页工具
│   ├── dataUtils.js        # 日期工具
│   └── logger.js           # 日志工具
├── __tests__/              # 测试文件
├── store.js                # 后端入口文件
├── vite.config.mjs         # Vite 配置（构建 src/ → dist/）
├── package.json
├── Dockerfile
├── docker-compose.yml
├── AGENTS.md               # AI 代理指南
└── LICENSE                 # 木兰许可证
```

## 主要页面（Vue Router SPA 路由）

| 页面 | 路径 | 功能 |
|------|------|------|
| 登录 | `/login` | 用户认证 |
| 首页 | `/home` | 系统概览、快捷入口（`/` 自动重定向） |
| 商品管理 | `/products` | 查看、编辑商品 |
| 新增/编辑商品 | `/products/new`、`/products/:id/edit` | 商品表单 |
| 新增入库 | `/stock/in` | 办理入库 |
| 新增出库 | `/stock/out` | 办理出库 |
| 入库记录 | `/stock/in-records` | 查看入库历史 |
| 出库记录 | `/stock/out-records` | 查看、导出出库单 |
| 批量管理 | `/batch`（入库/出库双标签） | 批量出入库、Excel 导入 |
| 库存列表 | `/stock` | 库存总览 |
| 库存查询 | `/stock/query` | 按条件查询 |
| 供应商管理 | `/suppliers` | 查看、编辑供应商 |
| 客户管理 | `/customers` | 查看、编辑客户 |
| 看板大屏 | `/dashboard` | 数据可视化 |
| 库存盘点 | `/stocktaking` | 盘点管理 |
| 数据导入 | `/import` | Excel/CSV 导入 |
| 系统设置 | `/settings` | 公司信息、密码修改、数据备份、出入库方式 |

## API 接口

> 📚 **交互式 API 文档**: 启动服务器后访问 <http://localhost:3000/api-docs> 查看完整的 Swagger/OpenAPI 文档

### 认证
- `POST /api/auth/login` - 登录
- `POST /api/auth/logout` - 登出
- `GET /api/auth/current-user` - 获取当前用户
- `GET /api/auth/check-admin` - 检查是否为管理员
- `GET /api/auth/users` - 获取用户列表（管理员）
- `POST /api/auth/users` - 创建用户（管理员）
- `PUT /api/auth/users/:id` - 修改用户密码（管理员）
- `DELETE /api/auth/users/:id` - 删除用户（管理员）
- `POST /api/auth/users/:id/toggle` - 启用/禁用用户（管理员）

### 商品
- `GET /api/products` - 商品列表（支持分页和搜索 `?query=`）
- `GET /api/products/barcode/:barcode` - 按条码查询商品
- `POST /api/products` - 添加商品
- `PUT /api/products/:id` - 更新商品
- `DELETE /api/products/:id` - 删除商品

### 入库
- `POST /api/in` - 入库
- `GET /api/in-records` - 入库记录（支持分页、月份筛选 `?month=`）

### 出库
- `POST /api/out` - 出库
- `GET /api/out-records` - 出库记录（支持分页、月份筛选 `?month=`）

### 批量操作
- `POST /api/batch/in` - 批量入库
- `POST /api/batch/out` - 批量出库
- `GET /api/batch/template` - 下载批量导入模板

### 库存
- `GET /api/stock` - 库存列表（支持分页）
- `GET /api/stock-methods?type=in|out` - 获取出入库方式

### 供应商
- `GET /api/suppliers` - 供应商列表（需管理员）
- `GET /api/suppliers/search?query=` - 供应商搜索
- `GET /api/suppliers/:id` - 供应商详情
- `POST /api/suppliers` - 新增供应商（管理员）
- `PUT /api/suppliers/:id` - 更新供应商（管理员）
- `DELETE /api/suppliers/:id` - 删除供应商（管理员）
- `POST /api/suppliers/:id/toggle` - 启用/禁用供应商（管理员）

### 客户
- `GET /api/customers` - 客户列表（支持分页和搜索 `?query=`）
- `GET /api/customers/search?query=` - 客户搜索
- `GET /api/customers/:id` - 客户详情
- `POST /api/customers` - 新增客户（管理员）
- `PUT /api/customers/:id` - 更新客户（管理员）
- `DELETE /api/customers/:id` - 删除客户（管理员）

### 数据看板
- `GET /api/dashboard/kpi` - KPI 数据
- `GET /api/dashboard/trend?months=6` - 月度趋势
- `GET /api/dashboard/top-products?limit=10` - 库存 TOP 10
- `GET /api/dashboard/stock-status` - 库存状态分布

### 库存盘点
- `GET /api/stocktaking` - 盘点单列表
- `GET /api/stocktaking/:id` - 盘点单详情
- `POST /api/stocktaking` - 创建盘点单（管理员）
- `POST /api/stocktaking/:id/start` - 开始盘点（管理员）
- `PUT /api/stocktaking/:id/items/:itemId` - 更新盘点项
- `POST /api/stocktaking/:id/complete` - 完成盘点（管理员）
- `POST /api/stocktaking/:id/cancel` - 取消盘点（管理员）

### 数据导入
- `POST /api/import/products` - 导入商品（Excel/CSV）
- `GET /api/import/template` - 下载导入模板

### 系统设置
- `GET /api/settings` - 获取系统设置
- `PUT /api/settings` - 更新系统设置
- `POST /api/change-password` - 修改密码

### 数据备份
- `GET /api/backups` - 获取备份列表
- `POST /api/backups` - 创建手动备份
- `POST /api/backups/:id/restore` - 恢复备份
- `DELETE /api/backups/:id` - 删除备份
- `POST /api/cleanup` - 清理数据（自动创建删除前备份）

## 数据库表结构

| 表名 | 说明 |
|------|------|
| `users` | 用户表 |
| `products` | 商品表（含条码、装箱规格、生产厂家） |
| `in_records` | 入库记录 |
| `out_records` | 出库记录 |
| `stock_methods` | 出入库方式 |
| `batch_stock` | 批次库存 |
| `stock_inventory` | 总库存 |
| `suppliers` | 供应商表 |
| `customers` | 客户表 |
| `stocktaking` | 盘点单 |
| `stocktaking_items` | 盘点明细 |
| `settings` | 系统设置 |
| `system_settings` | 系统设置（JSON） |
| `backups` | 备份记录 |

## 数据库升级

项目提供增量升级脚本：

```bash
# 从 v3.2 升级到 v3.3（新增供应商、盘点表）
mysql -u root -proot warehouse < sql/update_v3.3.sql

# 从 v3.3 升级到 v3.4（新增客户表）
mysql -u root -proot warehouse < sql/update_v3.4.sql

# 同步供应商/客户数据
node scripts/sync_suppliers.js
```

## 导出功能

支持两种导出格式：

1. **Excel 导出**（推荐）：使用 ExcelJS 库，支持单元格合并、样式、边框
2. **CSV 导出**：备用方案，纯文本格式

导出文件命名规则：`销售出库单_YYYYMMDD.xlsx`

## Docker 部署

```bash
# 构建并启动
docker-compose up -d

# 或单独构建
docker build -t warehouse-system .
docker run -p 3000:3000 warehouse-system
```

## 安全特性

- 密码使用 bcryptjs 加密存储
- Session 会话管理（固定密钥）
- 页面访问权限控制
- SQL 注入防护（使用参数化查询）
- XSS 基础防护
- 反向代理支持（trust proxy）

## 贡献指南

欢迎提交 Issue 和 Pull Request。

## 许可证

本项目采用 [木兰宽松许可证 第2版（MulanPSL-2.0）](http://license.coscl.org.cn/MulanPSL2) 开源许可。

木兰宽松许可证是一个中英文双语、 permissive 类型的开源许可证，具有与 Apache-2.0 类似的兼容性，但更便于中国开发者理解和使用。
