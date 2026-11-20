const bakiyeModel = require('../models/bakiyeModel');
const { kullaniciMesaji } = require('../yardimci/hata');

async function sayfa(req, res) {
  try {
    const kid = req.session.kullanici.id;
    const [bakiye, hareketler] = await Promise.all([
      bakiyeModel.guncelBakiye(kid),
      bakiyeModel.hareketler(kid),
    ]);
    res.render('bakiye', { bakiye, hareketler });
  } catch (err) {
    console.error(err);
    res.status(500).render('hata', { mesaj: 'Bakiye bilgisi yüklenemedi.' });
  }
}

async function yukle(req, res) {
  // "50,5" ve "50.5" ikisi de kabul edilir; geçersiz değer yordamın aralık hatasına düşer.
  const ham = String(req.body.tutar || '').replace(',', '.').trim();
  const tutar = ham !== '' && Number.isFinite(Number(ham)) ? Number(ham) : null;
  try {
    const r = await bakiyeModel.yukle(req.session.kullanici.id, tutar);
    req.session.mesaj = {
      tur: 'basari',
      metin: `Bakiye yüklendi. Güncel bakiye: ${Number(r.bakiye).toFixed(2)} TL.`,
    };
  } catch (err) {
    req.session.mesaj = { tur: 'hata', metin: kullaniciMesaji(err) };
  }
  res.redirect('/bakiye');
}

module.exports = { sayfa, yukle };