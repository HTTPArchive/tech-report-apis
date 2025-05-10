const express = require('express');
const { listCWVTechData } = require('../controllers/cwvtechController');

const router = express.Router();

// GET /cwvtech endpoint
router.get('/', listCWVTechData);

module.exports = router;
