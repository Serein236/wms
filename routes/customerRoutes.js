const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { requireLogin, requireAdmin } = require('../middleware/auth');

router.use(requireLogin);

router.get('/search', customerController.search);
router.get('/', customerController.list);
router.get('/:id', customerController.get);
router.post('/', requireAdmin, customerController.create);
router.put('/:id', requireAdmin, customerController.update);
router.delete('/:id', requireAdmin, customerController.delete);

module.exports = router;
