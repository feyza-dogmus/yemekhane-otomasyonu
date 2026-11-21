const degerlendirmeModel = require('../models/degerlendirmeModel');
const { KullaniciHatasi, kullaniciMesaji } = require('../yardimci/hata');

async function sayfa(req, res) {
  try {
    const menuler = await degerlendirmeModel.kullanilmisMenuler(req.session.kullanici.id);
    res.render('degerlendirme', { menuler });
  } catch (err) {
    console.error(err);
    res.status(500).render('hata', { mesaj: 'Menüler yüklenemedi.' });
  }
}

async function kaydet(req, res) {
  const menuId = Number(req.body.menu_id);
  const puan = Number(req.body.puan);
  const yorum = String(req.body.yorum || '').trim();
  try {
    if (!Number.isInteger(menuId) || menuId <= 0) throw new KullaniciHatasi('Geçersiz menü.');
    if (!Number.isInteger(puan) || puan < 1 || puan > 5) {
      throw new KullaniciHatasi('Puan 1 ile 5 arasında olmalıdır.');
    }
    if (yorum.length > 500) throw new KullaniciHatasi('Yorum en fazla 500 karakter olabilir.');
    await degerlendirmeModel.kaydet(req.session.kullanici.id, menuId, puan, yorum || null);
    req.session.mesaj = { tur: 'basari', metin: 'Değerlendirmeniz kaydedildi.' };
  } catch (err) {
    req.session.mesaj = { tur: 'hata', metin: kullaniciMesaji(err) };
  }
  res.redirect('/degerlendirme');
}

module.exports = { sayfa, kaydet };