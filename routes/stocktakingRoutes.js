const express = require('express');
const router = express.Router();
const stocktakingController = require('../controllers/stocktakingController');
const { requireLogin, requireAdmin } = require('../middleware/auth');

router.use(requireLogin);

router.get('/', stocktakingController.list);
router.get('/:id', stocktakingController.get);
router.post('/', requireAdmin, stocktakingController.create);
router.post('/:id/start', requireAdmin, stocktakingController.start);
router.put('/:id/items/:itemId', stocktakingController.updateItem);
router.post('/:id/complete', requireAdmin, stocktakingController.complete);
router.post('/:id/cancel', requireAdmin, stocktakingController.cancel);

module.exports = router;
