const express = require('express');
const { girisGerekli } = require('../middleware/oturum');
const profilController = require('../controllers/profilController');

const router = express.Router();

router.get('/profil', girisGerekli, profilController.sayfa);
router.post('/profil/alerjenler', girisGerekli, profilController.alerjenleriKaydet);

module.exports = router;