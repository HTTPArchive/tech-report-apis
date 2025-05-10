const express = require('express');
const { listLighthouseData } = require('../controllers/lighthouseController');

const router = express.Router();

// GET /lighthouse endpoint
router.get('/', listLighthouseData);

module.exports = router;
