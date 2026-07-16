const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');
const { requireLogin, requireAdmin } = require('../middleware/auth');

router.use(requireLogin);

// 搜索供应商（用于入库表单自动完成）
router.get('/search', supplierController.list);

// 管理接口（需要管理员权限）
router.get('/', requireAdmin, supplierController.list);
router.get('/:id', requireAdmin, supplierController.get);
router.post('/', requireAdmin, supplierController.create);
router.put('/:id', requireAdmin, supplierController.update);
router.delete('/:id', requireAdmin, supplierController.delete);
router.post('/:id/toggle', requireAdmin, supplierController.toggleActive);

module.exports = router;
