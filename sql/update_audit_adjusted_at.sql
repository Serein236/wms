-- code-audit: stocktaking_items 幂等标记
ALTER TABLE `stocktaking_items`
  ADD COLUMN `adjusted_at` timestamp NULL DEFAULT NULL COMMENT '库存调整应用时间（幂等标记）' AFTER `counted_by`;
