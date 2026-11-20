const express = require('express');
const { girisGerekli } = require('../middleware/oturum');
const menuController = require('../controllers/menuController');

const router = express.Router();

router.get('/menu', girisGerekli, menuController.gunluk);
router.get('/haftalik', girisGerekli, menuController.haftalik);
router.post('/rezervasyon', girisGerekli, menuController.rezervasyonYap);

module.exports = router;