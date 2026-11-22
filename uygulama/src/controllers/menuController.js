const menuModel = require('../models/menuModel');
const rezervasyonModel = require('../models/rezervasyonModel');
const { kullaniciMesaji } = require('../yardimci/hata');

const TARIH = /^\d{4}-\d{2}-\d{2}$/;

function sayi(deger, varsayilan) {
  const n = Number(deger);
  return Number.isInteger(n) && n > 0 ? n : varsayilan;
}

async function gunluk(req, res) {
  try {
    const [yemekhaneler, ogunler, bugun] = await Promise.all([
      menuModel.yemekhaneler(), menuModel.ogunler(), menuModel.bugun(),
    ]);
    const yemekhaneId = sayi(req.query.yemekhane, 1);
    const ogunId = sayi(req.query.ogun, 2);
    const tarih = TARIH.test(req.query.tarih || '') ? req.query.tarih : bugun;
    const menu = await menuModel.gunlukMenu(yemekhaneId, tarih, ogunId);
    if (menu) {
      // Önbellekteki menü role bağlı değildir; kullanıcının fiyatı burada seçilir.
      menu.fiyat = req.session.kullanici.rol === 'ogrenci' ? menu.ogrenciFiyati : menu.personelFiyati;
    }    res.render('menu', { yemekhaneler, ogunler, yemekhaneId, ogunId, tarih, menu });
  } catch (err) {
    console.error(err);
    res.status(500).render('hata', { mesaj: 'Menü yüklenemedi.' });
  }
}

async function haftalik(req, res) {
  try {
    const k = req.session.kullanici;
    const yemekhaneler = await menuModel.yemekhaneler();
    const yemekhaneId = sayi(req.query.yemekhane, 1);
    const menuler = await menuModel.haftalikMenu(yemekhaneId, k.id, k.rol);
    const gunler = {};
    menuler.forEach((m) => { (gunler[m.tarih] ||= []).push(m); });
    res.render('haftalik', { yemekhaneler, yemekhaneId, gunler });
  } catch (err) {
    console.error(err);
    res.status(500).render('hata', { mesaj: 'Haftalık menü yüklenemedi.' });
  }
}

async function rezervasyonYap(req, res) {
  const yemekhaneId = sayi(req.body.yemekhane, 1);
  const geri = `/haftalik?yemekhane=${yemekhaneId}`;
  const menuId = sayi(req.body.menu_id, null);
  if (!menuId) {
    req.session.mesaj = { tur: 'hata', metin: 'Geçersiz menü.' };
    return res.redirect(geri);
  }
  try {
    // Başarıda gösterilen bakiye KAYNAKTAN (yordamın cevabı) gelir, replikadan değil.
    const r = await rezervasyonModel.yap(req.session.kullanici.id, menuId);
    req.session.mesaj = {
      tur: 'basari',
      metin: `Rezervasyon yapıldı. Ücret: ${Number(r.ucret).toFixed(2)} TL, kalan bakiye: ${Number(r.bakiye).toFixed(2)} TL.`,
    };
  } catch (err) {
    req.session.mesaj = { tur: 'hata', metin: kullaniciMesaji(err) };
  }
  res.redirect(geri);
}

module.exports = { gunluk, haftalik, rezervasyonYap };