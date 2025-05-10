const express = require('express');
const { listCategories } = require('../controllers/categoriesController');

const router = express.Router();

// GET /categories endpoint
router.get('/', listCategories);

module.exports = router;
