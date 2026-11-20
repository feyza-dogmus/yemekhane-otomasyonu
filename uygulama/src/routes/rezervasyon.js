const express = require('express');
const { girisGerekli } = require('../middleware/oturum');
const rezervasyonController = require('../controllers/rezervasyonController');

const router = express.Router();

router.get('/rezervasyonlarim', girisGerekli, rezervasyonController.liste);
router.post('/rezervasyon/:id/iptal', girisGerekli, rezervasyonController.iptal);

module.exports = router;