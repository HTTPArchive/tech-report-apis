const express = require('express');
const { listPageWeightData } = require('../controllers/pageWeightController');

const router = express.Router();

// GET /page-weight endpoint
router.get('/', listPageWeightData);

module.exports = router;
