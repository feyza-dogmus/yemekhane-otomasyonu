const express = require('express');
const { girisGerekli } = require('../middleware/oturum');
const degerlendirmeController = require('../controllers/degerlendirmeController');

const router = express.Router();

router.get('/degerlendirme', girisGerekli, degerlendirmeController.sayfa);
router.post('/degerlendirme', girisGerekli, degerlendirmeController.kaydet);

module.exports = router;