const express = require('express');
const rateLimit = require('express-rate-limit');
const controller = require('../controllers/excelController');
const { excelUploadMiddleware } = require('../middleware/validation');

const router = express.Router();

// Uploads are heavy — max 10 per minute per IP
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many uploads. Please wait a minute and try again.' } },
});

router.post('/upload', uploadLimiter, excelUploadMiddleware, controller.upload);
router.get('/active', controller.getActive);
router.get('/history', controller.getHistory);

module.exports = router;
