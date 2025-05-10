const express = require('express');
const { listRanks } = require('../controllers/ranksController');

const router = express.Router();

// GET /ranks endpoint
router.get('/', listRanks);

module.exports = router;
