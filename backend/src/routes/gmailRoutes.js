const express = require('express');
const controller = require('../controllers/gmailController');

const router = express.Router();

router.get('/connect', controller.connect);     // 302 → Google consent screen
router.get('/callback', controller.callback);   // Google redirects back here
router.get('/status', controller.getStatus);
router.post('/disconnect', controller.disconnect);

module.exports = router;
