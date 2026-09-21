---
feature: code-audit
status: in-progress
updated: 2026-09-21
branch: compose/code-audit
commits: fa7a4a0..fa7a4a0
---

# 仓库代码审查与 API/用户路径测试

## Report

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
- [ ] T1: 启动 MySQL/应用并备份基线 — acceptance: :3000 可登录，runtime 存在 backup_pre_audit sql (covers: S2)
- [ ] T2: 静态审查后端关键路径 — acceptance: 问题清单含文件:行号与严重级别 (covers: S2)
- [ ] T3: 静态审查前端路由/API 契约 — acceptance: 问题清单含契约/权限/日期格式项 (covers: S2)
- [ ] T4: 运行 v2 API 回归 — acceptance: 产出 runtime/v2_api_results.json，列出 fail 项 (covers: S2; depends: T1)
- [ ] T5: 模拟用户操作路径（含 admin/user） — acceptance: 书面步骤与 HTTP 证据，覆盖入库/出库/盘点/权限拒绝 (covers: S2; depends: T1)
- [ ] T6: 修复确认的关键 bug — acceptance: 每个关键 bug 有修复或明确理由不修，关键路径测试通过或 fail 解释 (covers: S2; depends: T2, T3, T4, T5)
- [ ] T7: 复核测试与 Review — acceptance: 命令结果记录 PASS/FAIL/PRE-EXISTING，独立 reviewer 结论写入 Report (covers: S2; depends: T6)
- [ ] T8: Finalize 文档与分支交付 — acceptance: status=delivered，commits 更新，Report 非空 (covers: S2; depends: T7)
