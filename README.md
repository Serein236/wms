# 仓库管理系统

一个基于 Node.js + Express + MySQL 的仓库进销存管理系统，支持商品管理、出入库操作、库存查询、供应商/客户管理、数据可视化、批量操作、库存盘点等功能。

[![License](https://img.shields.io/badge/License-MulanPSL--2.0-blue.svg)](http://license.coscl.org.cn/MulanPSL2)

## 功能特性

### 核心功能
- **商品管理**：添加商品、查看商品列表、库存预警、条码管理
- **入库管理**：采购入库、退货入库、调拨入库、生产入库、盘点入库、其他入库
- **出库管理**：销售出库、调拨出库、报损出库、样品出库、盘点出库、其他出库
- **库存管理**：库存列表、库存查询（按批次展示余量与效期状态）、按状态筛选
- **供应商管理**：新增/编辑/删除/启用-禁用供应商，从入库记录自动提取
- **客户管理**：新增/编辑/删除客户，从出库记录自动提取
- **批量操作**：批量入库、批量出库，支持 Excel/CSV 文件导入，逐行返回成功/失败明细
- **库存盘点**：创建盘点单、逐项录入实盘数，盘盈自动生成 `PANDIAN-<盘点单ID>` 批次入库、盘亏按近效期 FIFO 逐批出库，批次库存与总库存事务一致
- **数据看板**：KPI 卡片、月度趋势、库存状态分布、TOP 10 商品
- **数据导入**：Excel/CSV 批量导入商品数据
- **条码扫描**：入库/出库页面支持条码扫描（QuaggaJS）
- **记录导出**：支持 Excel 格式导出，带格式销售出库单

### 系统特性
- **用户认证**：基于 Session 的登录/登出机制，区分管理员（admin）与普通用户（user）角色
- **角色权限隔离**：后端写操作统一 `requireAdmin` 校验；前端按角色裁剪菜单、首页快捷入口与按钮，并通过路由守卫拦截普通用户越权访问管理页
- **用户管理**：管理员可新增、删除、启用/禁用用户，编辑用户密码；当前登录管理员自身只读，防止自锁
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

3. **配置（全站唯一配置文件）**
```bash
# 复制配置模板
cp config/config.example.js config/config.js

# 编辑 config/config.js 修改数据库连接、会话与 CSRF 密钥
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
├── config/                 # 全站唯一配置
│   ├── config.js           # 配置文件（gitignore，端口/数据库/会话/CSRF）
│   └── config.example.js   # 配置模板
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
├── __tests__/              # Jest 单元测试
├── tests/                  # API 集成 / 回归测试脚本（对运行中的服务发真实 HTTP 请求）
│   ├── api_test.js         # v1 全量 API 测试（108 例）
│   └── v2_api_test.mjs     # v2 回归 API 测试（77 例，含 xlsx 导入与盘点端到端）
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
- `GET /api/stock` - 库存列表（基于批次，仅返回余量大于 0 的批次，支持分页）
- `GET /api/query/:productId` - 商品批次库存与入/出库历史明细
- `GET /api/product-batches/:id` - 商品各批次余量（出库选批次用）
- `GET /api/stock-methods?type=in|out` - 获取出入库方式（登录可用）
- `GET/POST/PUT/DELETE /api/stock-methods-admin` - 出入库方式管理（管理员）

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
- 页面访问权限控制：后端写操作 `requireAdmin` 校验 + 前端路由守卫/菜单/按钮三级隔离
- SQL 注入防护（使用参数化查询）
- XSS 防护：Vue 文本插值默认转义，商品名等用户输入不被作为 HTML 执行
- 登录限流（基于 IP，失败次数过多临时锁定）
- 反向代理支持（trust proxy）

## 测试

项目包含三类测试：

| 类型 | 命令 | 说明 |
|------|------|------|
| Jest 单元测试 | `npm test` | `__tests__/` 下的 `*.test.js` |
| 覆盖率 | `npm run test:coverage` | 输出覆盖率报告到 `coverage/`（已 gitignore） |
| v2 API 回归 | `npm run test:api` | `tests/v2_api_test.mjs`，77 个用例 |
| v1 API 全量 | `npm run test:api:v1` | `tests/api_test.js`，108 个用例 |

运行 API 集成测试的前置条件：

1. MySQL 已启动并导入 `sql/store.sql`（回归测试建议先还原到干净基线库）。
2. 已复制 `config/config.example.js` 为 `config/config.js` 并配置连接。
3. 后端服务正在运行：`npm start`（默认 `http://localhost:3000`）。
4. 默认管理员账号 `admin / admin` 可用。

测试脚本使用 Node 全局 `fetch` 维护匿名 / 管理员 / 普通用户三套会话 Cookie，覆盖认证鉴权、商品、出入库、库存与批次、批量、盘点端到端、Excel 导入、供应商/客户、设置、备份与看板，并对响应状态码、响应体与数据库副作用逐项断言。浏览器真实操作回归（登录、菜单/按钮权限、表单、弹窗、图表、文件上传下载等）的用例与结论维护在测试用例在线表格中。

> 测试运行产生的结果 JSON、临时 xlsx、日志与数据库转储统一放在 `runtime/`，已在 `.gitignore` 中忽略；`tests/` 下只保留可复跑的测试脚本。

## 更新记录

### v2.0（当前版本）

围绕两轮全量测试（API 自动化 + 浏览器真实操作）完成缺陷修复与权限/体验增强。

**阻断与严重缺陷修复**

- 出入库方式下拉为空导致出入库不可用（前后端契约对齐，入库/出库各 6 种方式，含盘点入/出库）。
- 商品编辑页 404、商品详情/条码路由顺序问题。
- 库存列表/库存查询因字段名不匹配整表空白、库存预警失效。
- 库存盘点全流程不可用：实盘数无法保存、盘盈完成 500；重写完成逻辑，盘盈经 `InventoryService` 建立 `PANDIAN-<id>` 批次（过期日 9999-12-31、单价 0），盘亏按近效期 FIFO 逐批出库，保证 `batch_stock` 与 `stock_inventory` 事务一致。
- 批量出入库请求/后端契约不匹配、缺省单价为 `null` 撞非空约束。
- 商品 Excel 导入 0 成功（`product_code` 无默认值），前端不再“假成功”，如实展示成功/跳过/失败与首条错误。
- 修改密码前后端字段不匹配导致恒失败。
- 权限越权收敛：写操作与管理列表统一 `requireAdmin`，前端补菜单/路由/按钮三级角色隔离。
- `csrf-token` 接口 500、供应商“启用”复选框不回显。

**回归阶段补充修复**

- 供应商禁用后管理员列表搜索不到（管理列表改为含禁用项，联想搜索仍只返回启用项）。
- 首页 KPI 今日入库/今日出库/库存预警恒为 0（后端补返回字段）。
- 库存历史明细“批次库存”与系统设置备份列表的日期显示原始 ISO 串，统一改为本地格式化。
- 出入库方式前端故障降级数组补齐“盘点入/出库”。

**增强**

- 新增用户管理页（`src/views/settings/UserListView.vue`），当前管理员只读保护。
- 危险操作二次确认、重复提交防护、必填与超量出库前端拦截、金额/日期格式化统一。
- 出库记录客户列正确显示 `destination`；首页与看板 KPI、趋势、热销榜数据对齐。
- 新增 `tests/` API 回归测试集与本测试说明。

## 贡献指南

欢迎提交 Issue 和 Pull Request。

## 许可证

本项目采用 [木兰宽松许可证 第2版（MulanPSL-2.0）](http://license.coscl.org.cn/MulanPSL2) 开源许可。

木兰宽松许可证是一个中英文双语、 permissive 类型的开源许可证，具有与 Apache-2.0 类似的兼容性，但更便于中国开发者理解和使用。
