const sistemModel = require('../models/sistemModel');

async function durum(req, res) {
  try {
    const yazma = await sistemModel.yazmaDurumu();
    const okuma = await sistemModel.okumaDurumu();
    res.render('durum', { yazma, okuma, hata: null });
  } catch (err) {
    console.error(err);
    res.status(500).render('durum', { yazma: null, okuma: null, hata: 'Veritabanına bağlanılamadı.' });
  }
}

module.exports = { durum };