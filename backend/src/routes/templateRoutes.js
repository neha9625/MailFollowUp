const express = require('express');
const controller = require('../controllers/templateController');
const {
  validateTemplateParams,
  validateTemplateUpdate,
} = require('../middleware/validation');

const router = express.Router();

router.get('/', controller.getAll);
router.get('/:type/:day', validateTemplateParams, controller.getOne);
router.put('/:type/:day', validateTemplateParams, validateTemplateUpdate, controller.update);

module.exports = router;
