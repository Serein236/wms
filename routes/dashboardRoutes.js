const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { requireLogin } = require('../middleware/auth');

router.use(requireLogin);

router.get('/kpi', dashboardController.getKPI);
router.get('/trend', dashboardController.getMonthlyTrend);
router.get('/top-products', dashboardController.getTopProducts);
router.get('/stock-status', dashboardController.getStockStatus);

module.exports = router;
