-- ============================================================
-- 修复脚本：创建缺失的 stock_methods 表并补全出入库方式数据
-- 项目：WMS 仓库管理系统 (database=wms)
-- 背景：stock_methods 表被误删（foreign_key_checks=0），导致
--       in_records / out_records 上的外键 fk_*_stock_method_name
--       成为悬空引用，/api/stock-methods、/api/stock-methods-admin
--       及看板等接口 500。
-- 安全约束：
--   1. 不删除、不清空任何现有数据
--   2. 不执行 store.sql（store.sql 含 DROP TABLE 会清空数据）
--   3. 使用 CREATE TABLE IF NOT EXISTS + INSERT IGNORE，可重复执行
-- ============================================================

SET NAMES utf8mb4;
-- 建表/插数期间临时关闭外键检查，避免悬空外键在补全前触发校验
SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------
-- 1. 创建 stock_methods 表（结构与 sql/store.sql 完全一致）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `stock_methods` (
  `id` int NOT NULL AUTO_INCREMENT,
  `type` enum('in','out') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'in:入库, out:出库',
  `method_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '方式名称',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_method_name_type`(`method_name` ASC, `type` ASC) USING BTREE,
  UNIQUE INDEX `uk_method_name`(`method_name` ASC) USING BTREE,
  INDEX `idx_type`(`type` ASC) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ------------------------------------------------------------
-- 2. 补入 in_records 中实际已使用的入库方式（归类为 type='in'）
--    动态从现有数据读取，确保所有外键引用都有对应父行
-- ------------------------------------------------------------
INSERT IGNORE INTO `stock_methods` (`type`, `method_name`)
SELECT DISTINCT 'in', `stock_method_name`
FROM `in_records`
WHERE `stock_method_name` IS NOT NULL AND `stock_method_name` <> '';

-- ------------------------------------------------------------
-- 3. 补入 out_records 中实际已使用的出库方式（归类为 type='out'）
-- ------------------------------------------------------------
INSERT IGNORE INTO `stock_methods` (`type`, `method_name`)
SELECT DISTINCT 'out', `stock_method_name`
FROM `out_records`
WHERE `stock_method_name` IS NOT NULL AND `stock_method_name` <> '';

-- ------------------------------------------------------------
-- 4. 补充 store.sql 中的默认常用出入库方式（INSERT IGNORE 去重）
-- ------------------------------------------------------------
INSERT IGNORE INTO `stock_methods` (`type`, `method_name`) VALUES
('in',  '采购入库'),
('in',  '退货入库'),
('in',  '调拨入库'),
('in',  '生产入库'),
('in',  '其他入库'),
('out', '销售出库'),
('out', '调拨出库'),
('out', '报损出库'),
('out', '样品出库'),
('out', '其他出库');

-- 重新开启外键检查；此时所有被引用的 method_name 均已存在，校验通过
SET FOREIGN_KEY_CHECKS = 1;
