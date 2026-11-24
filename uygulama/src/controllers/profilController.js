const kullaniciModel = require('../models/kullaniciModel');
const { kullaniciMesaji } = require('../yardimci/hata');

async function sayfa(req, res) {
  try {
    const [alerjenler, secili] = await Promise.all([
      kullaniciModel.alerjenListesi(),
      kullaniciModel.kullaniciAlerjenleri(req.session.kullanici.id),
    ]);
    res.render('profil', { alerjenler, secili });
  } catch (err) {
    console.error(err);
    res.status(500).render('hata', { mesaj: 'Profil yüklenemedi.' });
  }
}

async function alerjenleriKaydet(req, res) {
  const idler = [...new Set(
    [].concat(req.body.alerjen || []).map(Number).filter((n) => Number.isInteger(n) && n > 0)
  )];
  try {
    await kullaniciModel.alerjenleriKaydet(req.session.kullanici.id, idler);
    req.session.mesaj = {
      tur: 'basari',
      metin: idler.length > 0
        ? `Alerjenleriniz kaydedildi (${idler.length} seçim).`
        : 'Alerjen seçimleriniz temizlendi.',
    };
  } catch (err) {
    req.session.mesaj = { tur: 'hata', metin: kullaniciMesaji(err) };
  }
  res.redirect('/profil');
}

module.exports = { sayfa, alerjenleriKaydet };