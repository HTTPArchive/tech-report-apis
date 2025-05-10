const express = require('express');
const { listGeos } = require('../controllers/geosController');

const router = express.Router();

// GET /geos endpoint
router.get('/', listGeos);

module.exports = router;
