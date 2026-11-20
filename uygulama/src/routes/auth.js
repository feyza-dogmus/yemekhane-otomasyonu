const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();

router.get('/giris', authController.girisFormu);
router.post('/giris', authController.girisYap);
router.post('/cikis', authController.cikisYap);

module.exports = router;