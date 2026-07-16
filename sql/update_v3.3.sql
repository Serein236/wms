/*
 仓库管理系统数据库更新脚本
 从 v3.2 升级到 v3.3
 日期: 2026-07-16
 说明: 新增供应商管理、库存盘点功能所需表
*/

SET NAMES utf8mb4;

-- ----------------------------
-- 1. 新增供应商表
-- ----------------------------
CREATE TABLE IF NOT EXISTS `suppliers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '供应商名称',
  `contact_person` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '联系人',
  `phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '联系电话',
  `email` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '邮箱',
  `address` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '地址',
  `remark` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '备注',
  `is_active` tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否启用: 1-启用, 0-禁用',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_supplier_name`(`name` ASC) USING BTREE,
  INDEX `idx_is_active`(`is_active` ASC) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- 从入库记录中提取已有供应商名称
INSERT IGNORE INTO `suppliers` (name)
SELECT DISTINCT source FROM in_records WHERE source IS NOT NULL AND source != '';

-- 从出库记录中提取已有客户名称（也存入suppliers表作为共用列表）
INSERT IGNORE INTO `suppliers` (name)
SELECT DISTINCT destination FROM out_records WHERE destination IS NOT NULL AND destination != '';

-- ----------------------------
-- 2. 新增库存盘点表
-- ----------------------------
CREATE TABLE IF NOT EXISTS `stocktaking` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL COMMENT '盘点名称',
  `status` enum('draft','in_progress','completed','cancelled') DEFAULT 'draft' COMMENT '盘点状态: draft-草稿, in_progress-进行中, completed-已完成, cancelled-已取消',
  `created_by` int DEFAULT NULL COMMENT '创建人ID',
  `started_at` timestamp NULL DEFAULT NULL COMMENT '开始时间',
  `completed_at` timestamp NULL DEFAULT NULL COMMENT '完成时间',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE = InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------
-- 3. 新增库存盘点明细表
-- ----------------------------
CREATE TABLE IF NOT EXISTS `stocktaking_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `stocktaking_id` int NOT NULL COMMENT '盘点单ID',
  `product_id` int NOT NULL COMMENT '商品ID',
  `system_stock` int DEFAULT 0 COMMENT '系统库存',
  `actual_stock` int DEFAULT NULL COMMENT '实际库存（盘点时填写）',
  `difference` int DEFAULT 0 COMMENT '差异（实际-系统）',
  `remark` text DEFAULT NULL COMMENT '备注',
  `counted_at` timestamp NULL DEFAULT NULL COMMENT '盘点时间',
  `counted_by` int DEFAULT NULL COMMENT '盘点人ID',
  PRIMARY KEY (`id`),
  KEY `fk_st_stocktaking` (`stocktaking_id`),
  KEY `fk_st_product` (`product_id`),
  CONSTRAINT `fk_st_stocktaking` FOREIGN KEY (`stocktaking_id`) REFERENCES `stocktaking` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_st_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE = InnoDB DEFAULT CHARSET=utf8mb4;

-- 完成提示
SELECT '数据库已从 v3.2 升级到 v3.3' AS message;
SELECT CONCAT('新增供应商: ', COUNT(*)) AS info FROM suppliers;
SELECT '新增表: stocktaking, stocktaking_items' AS info;
