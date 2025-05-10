const express = require('express');
const { listTechnologies } = require('../controllers/technologiesController');

const router = express.Router();

// GET /technologies endpoint
router.get('/', listTechnologies);

module.exports = router;
