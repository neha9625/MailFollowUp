const express = require('express');
const controller = require('../controllers/emailLogController');
const { validateLogQuery } = require('../middleware/validation');

const router = express.Router();

router.get('/', validateLogQuery, controller.list);
router.get('/:id', controller.getOne);

module.exports = router;
