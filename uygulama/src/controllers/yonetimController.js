const menuModel = require('../models/menuModel');
const yonetimModel = require('../models/yonetimModel');
const { KullaniciHatasi, kullaniciMesaji } = require('../yardimci/hata');
const { gecerliTarih } = require('../yardimci/tarih');
const menuOnbellek = require('../onbellek/menuOnbellek');
function tamSayi(deger) {
  const n = Number(deger);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function fiyat(ham) {
  const metin = String(ham || '').replace(',', '.').trim();
  const n = Number(metin);
  if (metin === '' || !Number.isFinite(n) || n < 0 || n > 9999.99) return null;
  return Math.round(n * 100) / 100;
}

function yemekIdleri(ham) {
  const idler = [].concat(ham || []).map(Number).filter((n) => Number.isInteger(n) && n > 0);
  return [...new Set(idler)];
}

function kategoriyeGoreGrupla(yemekler) {
  const harita = new Map();
  yemekler.forEach((y) => {
    if (!harita.has(y.kategori)) harita.set(y.kategori, []);
    harita.get(y.kategori).push(y);
  });
  return [...harita].map(([kategori, liste]) => ({ kategori, yemekler: liste }));
}

async function formVerileri() {
  const [yemekhaneler, ogunler, yemekler] = await Promise.all([
    menuModel.yemekhaneler(), menuModel.ogunler(), yonetimModel.yemekSecenekleri(),
  ]);
  return { yemekhaneler, ogunler, gruplar: kategoriyeGoreGrupla(yemekler) };
}

async function formuGoster(res, durum, yeni, menu, hata) {
  try {
    const v = await formVerileri();
    res.status(durum).render('yonetim_menu_form', { ...v, yeni, menu, hata });
  } catch (err) {
    console.error(err);
    res.status(500).render('hata', { mesaj: 'Form yüklenemedi.' });
  }
}

async function liste(req, res) {
  try {
    const aralik = await yonetimModel.varsayilanAralik();
    const yemekhaneId = tamSayi(req.query.yemekhane);
    const baslangic = gecerliTarih(req.query.baslangic) ? req.query.baslangic : aralik.bas;
    const bitis = gecerliTarih(req.query.bitis) ? req.query.bitis : aralik.bit;
    const [yemekhaneler, menuler] = await Promise.all([
      menuModel.yemekhaneler(),
      yonetimModel.menuListesi(yemekhaneId, baslangic, bitis),
    ]);
    res.render('yonetim', { yemekhaneler, yemekhaneId, baslangic, bitis, menuler });
  } catch (err) {
    console.error(err);
    res.status(500).render('hata', { mesaj: 'Yönetim paneli yüklenemedi.' });
  }
}

async function yeniForm(req, res) {
  try {
    const bugun = await menuModel.bugun();
    await formuGoster(res, 200, true, {
      yemekhaneId: 1, tarih: bugun, ogunId: 2,
      ogrenciFiyati: '', personelFiyati: '', yemekIdler: [],
    }, null);
  } catch (err) {
    console.error(err);
    res.status(500).render('hata', { mesaj: 'Form yüklenemedi.' });
  }
}

async function olustur(req, res) {
  const girdi = {
    yemekhaneId: tamSayi(req.body.yemekhane),
    tarih: req.body.tarih,
    ogunId: tamSayi(req.body.ogun),
    ogrenciFiyati: fiyat(req.body.ogrenci_fiyati),
    personelFiyati: fiyat(req.body.personel_fiyati),
    yemekIdler: yemekIdleri(req.body.yemek),
  };
  try {
    if (!girdi.yemekhaneId || !girdi.ogunId) throw new KullaniciHatasi('Yemekhane ve öğün seçmelisiniz.');
    if (!gecerliTarih(girdi.tarih)) throw new KullaniciHatasi('Geçerli bir tarih girin.');
    if (girdi.ogrenciFiyati === null || girdi.personelFiyati === null) {
      throw new KullaniciHatasi('Fiyatlar 0 ile 9999,99 TL arasında olmalıdır.');
    }
    if (girdi.yemekIdler.length === 0) throw new KullaniciHatasi('En az bir yemek seçmelisiniz.');
    await yonetimModel.olustur(girdi);
    await menuOnbellek.gecersizKil(girdi.yemekhaneId, girdi.tarih, girdi.ogunId);
    req.session.mesaj = { tur: 'basari', metin: 'Menü oluşturuldu.' };
    return res.redirect('/yonetim');
  } catch (err) {
    return formuGoster(res, 400, true, {
      yemekhaneId: girdi.yemekhaneId || 1,
      tarih: girdi.tarih || '',
      ogunId: girdi.ogunId || 2,
      ogrenciFiyati: req.body.ogrenci_fiyati || '',
      personelFiyati: req.body.personel_fiyati || '',
      yemekIdler: girdi.yemekIdler,
    }, kullaniciMesaji(err));
  }
}

async function duzenleForm(req, res) {
  try {
    const id = tamSayi(req.params.id);
    const menu = id ? await yonetimModel.menuBul(id) : null;
    if (!menu) return res.status(404).render('hata', { mesaj: 'Menü bulunamadı.' });
    return formuGoster(res, 200, false, menu, null);
  } catch (err) {
    console.error(err);
    return res.status(500).render('hata', { mesaj: 'Menü yüklenemedi.' });
  }
}

async function guncelle(req, res) {
  const id = tamSayi(req.params.id);
  const ogrenciFiyati = fiyat(req.body.ogrenci_fiyati);
  const personelFiyati = fiyat(req.body.personel_fiyati);
  const yemekIdler = yemekIdleri(req.body.yemek);
  try {
    if (!id) throw new KullaniciHatasi('Menü bulunamadı.');
    if (ogrenciFiyati === null || personelFiyati === null) {
      throw new KullaniciHatasi('Fiyatlar 0 ile 9999,99 TL arasında olmalıdır.');
    }
    if (yemekIdler.length === 0) throw new KullaniciHatasi('En az bir yemek seçmelisiniz.');
        const degisen = await yonetimModel.guncelle(id, ogrenciFiyati, personelFiyati, yemekIdler);
    // Menü değişti: eski önbellek kaydı silinir (menu:{yemekhane_id}:{tarih}:{ogun_id}).
    await menuOnbellek.gecersizKil(degisen.yemekhaneId, degisen.tarih, degisen.ogunId);req.session.mesaj = { tur: 'basari', metin: 'Menü güncellendi.' };
    return res.redirect('/yonetim');
  } catch (err) {
    const menu = id ? await yonetimModel.menuBul(id).catch(() => null) : null;
    if (!menu) return res.status(404).render('hata', { mesaj: kullaniciMesaji(err) });
    return formuGoster(res, 400, false, {
      ...menu,
      ogrenciFiyati: req.body.ogrenci_fiyati || '',
      personelFiyati: req.body.personel_fiyati || '',
      yemekIdler,
    }, kullaniciMesaji(err));
  }
}

module.exports = { liste, yeniForm, olustur, duzenleForm, guncelle };