const express = require('express');
const sistemController = require('../controllers/sistemController');

const router = express.Router();

router.get('/durum', sistemController.durum);

module.exports = router;