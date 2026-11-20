const rezervasyonModel = require('../models/rezervasyonModel');
const { kullaniciMesaji } = require('../yardimci/hata');

async function liste(req, res) {
  try {
    const rezervasyonlar = await rezervasyonModel.kullanicininRezervasyonlari(req.session.kullanici.id);
    res.render('rezervasyonlarim', { rezervasyonlar });
  } catch (err) {
    console.error(err);
    res.status(500).render('hata', { mesaj: 'Rezervasyonlar yüklenemedi.' });
  }
}

async function iptal(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    req.session.mesaj = { tur: 'hata', metin: 'Rezervasyon bulunamadı.' };
    return res.redirect('/rezervasyonlarim');
  }
  try {
    const r = await rezervasyonModel.iptalEt(req.session.kullanici.id, id);
    req.session.mesaj = {
      tur: 'basari',
      metin: `Rezervasyon iptal edildi. İade: ${Number(r.iade).toFixed(2)} TL, kalan bakiye: ${Number(r.bakiye).toFixed(2)} TL.`,
    };
  } catch (err) {
    req.session.mesaj = { tur: 'hata', metin: kullaniciMesaji(err) };
  }
  res.redirect('/rezervasyonlarim');
}

module.exports = { liste, iptal };