const express = require('express');
const router = express.Router();
const multer = require('multer');
const importController = require('../controllers/importController');
const { requireLogin, requireAdmin } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(requireLogin);

router.post('/products', requireAdmin, upload.single('file'), importController.importProducts);
router.get('/template', requireAdmin, importController.getTemplate);

module.exports = router;
