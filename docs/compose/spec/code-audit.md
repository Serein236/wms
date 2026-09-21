---
feature: code-audit
status: delivered
updated: 2026-09-21
branch: compose/code-audit
commits: fa7a4a0..d2281ae
---

# 仓库代码审查与 API/用户操作测试

## Report

**What was built** — 对 WMS 做了一轮 compose-next 代码审查：静态审后端 MVC/前端契约，并用 v2 API 回归 + 用户路径探测验证。确认并修复关键缺陷：批量出入库负数数量导致库存虚增；盘点 complete 非原子且可重复应用；出入库记录改批号/商品会破坏 batch_stock 一致性；禁用用户旧会话仍有效；库存扣缺无行锁；单价空值与商品创建非事务等。前端补了普通用户改密入口（/profile）、xlsx 日期 cellDates、编辑记录重算 total_amount、密码框 type=password 等。

**Verification** —
- `node --check` 修改的后端文件：PASS
- `npm test`：PASS 8/8
- `npm run test:api`（服务重启清限流后）：70/77；失败项为套件非幂等（固定商品/供应商名、脏库存计数）或限流抖动，非本轮修复回归；PD-04/05 盘盈在 `adjusted_at` 列就绪后 PASS
- 复现 `runtime/repro_batch_negqty.mjs`：修复前 stock 10→15；修复后 `failCount=1`「数量必须为正整数」，stock 保持 10
- 禁用用户探测：`PUT is_active=0` 后旧 session `current-user loggedIn=false`、业务 API 401；重新登录被拒；普通用户改盘点明细 403
- `npm run build`（Vite）：PASS
- 独立 review（explore-3）：关键修复正确性 PASS；HIGH 项 `updateItem` 状态门/NaN 与 `cancelInStock` 行锁已在收尾前补上

**Journey log** —
1. `git worktree add` 被会话护栏拦截，用户确认改为本仓库分支 `compose/code-audit`
2. 探测脚本曾用 admin jar 登录普通用户覆盖会话，导致假阳性权限失败——登录必须分 jar
3. v2 套件在脏库上非幂等；跑 API 前必须还原基线，且重启 Node 以清空内存限流
4. 库表还原会丢掉本轮新加的 `adjusted_at`，升级脚本必须与 restore 一起执行
5. 审批范围：库存出入库写操作仍为 `requireLogin`（仓管业务），与 AGENTS「写操作必须 requireAdmin」表述冲突，已在报告中记录、未强行收紧

## [S1] Problem
WMS 在 Vue3 迁移与后端修复后缺少一轮完整审查：需要发现真实错误/bug，用 API 与模拟用户操作验证，并只修复经确认的关键缺陷。

## [S2] Design
审查边界与契约：

- **静态审查**：`routes/` → `controllers/` → `services/` → `models/`，以及 `src/router`、`src/api`、关键 views 与 `services/InventoryService.js`。
- **运行时**：MySQL 8.4（datadir `D:/mysql`，`root/root`，库 `warehouse`）；应用 `npm start` 端口 3000。
- **API 测试**：`npm run test:api`（`tests/v2_api_test.mjs`）为主；必要时用 fetch 补登录/角色/库存事务边界用例。
- **用户路径模拟**：登录 → 浏览商品/出入库/库存/供应商客户 → 创建入库/出库 → 盘点 → 批量 → 看板；管理员 vs 普通用户权限裁剪。
- **修复门槛**：仅修「可复现、影响正确性/权限/数据一致性」的关键 bug；非关键问题只记入 Report。
- **工作区**：用户已同意「本仓库开分支」`compose/code-audit`（worktree 创建被会话护栏拦截，作为项目覆盖记录）。
- **测试数据**：跑 API 前导出基线 `runtime/backup_pre_audit_*.sql`；失败用例与结果写 `runtime/`。

## [S3] Out of Scope
- 不重写架构、不做 UI 视觉改版
- 不删除 `public/` 旧前端（仅在报告中记录）
- 不强制修所有历史遗留安全项（CORS `*`、CSRF 关闭等），除非本轮测试证明被利用路径
- 不在 `main` 上直接提交；合并收尾由用户决定

## Tasks
- [x] T1: 启动 MySQL/应用并备份基线 — acceptance: :3000 可登录，runtime 存在 backup_pre_audit sql (covers: S2)
- [x] T2: 静态审查后端关键路径 — acceptance: 问题清单含文件:行号与严重级别 (covers: S2)
- [x] T3: 静态审查前端路由/API 契约 — acceptance: 问题清单含契约/权限/日期格式项 (covers: S2)
- [x] T4: 运行 v2 API 回归 — acceptance: 产出 runtime/v2_api_results.json，列出 fail 项 (covers: S2; depends: T1)
- [x] T5: 模拟用户操作路径（含 admin/user） — acceptance: 书面步骤与 HTTP 证据，覆盖入库/出库/盘点/权限拒绝 (covers: S2; depends: T1)
- [x] T6: 修复确认的关键 bug — acceptance: 每个关键 bug 有修复或明确理由不修，关键路径测试通过或 fail 解释 (covers: S2; depends: T2, T3, T4, T5)
- [x] T7: 复核测试与 Review — acceptance: 命令结果记录 PASS/FAIL/PRE-EXISTING，独立 reviewer 结论写入 Report (covers: S2; depends: T6)
- [ ] T8: Finalize 文档与分支交付 — acceptance: status=delivered，commits 更新，Report 非空 (covers: S2; depends: T7)

## 已修复（关键）
| 问题 | 位置 |
|------|------|
| 批量出入库负数/非整数虚增库存 | `batchController.js` + `InventoryService` 数量断言 |
| 盘点 complete 非原子/可重复应用 | `stocktakingController.complete` 单事务 + `adjusted_at` |
| 编辑记录改批号/商品导致批次账不一致 | `InventoryService.updateIn/OutStock` 拒绝改批/商品 |
| 禁用用户旧会话仍有效 | `middleware/auth.js` + `getCurrentUser` + PUT `is_active` |
| 出库/撤销缺行锁 | `FOR UPDATE` + `batch_current_stock >= qty` |
| 单价/总金额 null 写入 NOT NULL | `inventoryController` 默认 0 / qty×price |
| 商品创建非事务 | `ProductModel.create` 事务 |
| 盘点明细普通用户可写 | `stocktakingRoutes` `requireAdmin` |
| 改密码入口仅管理员 | 路由 `/profile` + Settings 按角色裁剪 Tab |

## 未修（记录）
- 库存出入库写 API 仍 `requireLogin`（业务仓管可操作；与 AGENTS 措辞冲突待产品确认）
- v2 套件非幂等（固定名/脏库）；登录限流 10/15min 影响回归抖动
- CORS `*`、CSRF 关闭、session secret 固定、备份密码打在 argv 等历史安全项
- 缺货筛选基于 batch_stock>0，总库存为 0 的商品筛不出
- 公司设置已可进侧栏品牌，但 Login 页仍读 env（部分修复）
- `public/` 旧前端仍跟踪在 git
