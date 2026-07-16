const express = require('express');
const router = express.Router();
const batchController = require('../controllers/batchController');
const { requireLogin } = require('../middleware/auth');

router.use(requireLogin);

router.post('/in', batchController.batchInStock);
router.post('/out', batchController.batchOutStock);

module.exports = router;
