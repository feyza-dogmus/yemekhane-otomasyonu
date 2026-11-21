const express = require('express');
const { yoneticiGerekli } = require('../middleware/oturum');
const yonetimController = require('../controllers/yonetimController');

const router = express.Router();

// /yonetim ve altındaki her yol yalnızca yöneticiye açıktır
router.use('/yonetim', yoneticiGerekli);

router.get('/yonetim', yonetimController.liste);
router.get('/yonetim/menu/yeni', yonetimController.yeniForm);
router.post('/yonetim/menu', yonetimController.olustur);
router.get('/yonetim/menu/:id/duzenle', yonetimController.duzenleForm);
router.post('/yonetim/menu/:id', yonetimController.guncelle);

module.exports = router;