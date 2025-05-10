const express = require('express');
const { listAdoptionData } = require('../controllers/adoptionController');

const router = express.Router();

// GET /adoption endpoint
router.get('/', listAdoptionData);

module.exports = router;
