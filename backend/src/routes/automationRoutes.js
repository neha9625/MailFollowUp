const express = require('express');
const rateLimit = require('express-rate-limit');
const controller = require('../controllers/automationController');

const router = express.Router();

// Automation touches the whole mailbox — max 4 runs per minute per IP
const runLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 4,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Automation is already being triggered frequently. Please wait a minute.' },
  },
});

router.post('/run', runLimiter, controller.run);

module.exports = router;
