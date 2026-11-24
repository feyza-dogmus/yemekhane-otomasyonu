// Veri katmanı: menü okumaları REPLİKAdan yapılır.
// Günlük menü Redis'te önbelleğe alınır (bkz. onbellek/menuOnbellek.js).
const { okuma } = require('../config/db');
const menuOnbellek = require('../onbellek/menuOnbellek');

async function yemekhaneler() {
  const [s] = await okuma.query('SELECT id, ad FROM yemekhaneler ORDER BY id');
  return s;
}

async function ogunler() {
  const [s] = await okuma.query('SELECT id, ad FROM ogunler ORDER BY sira');
  return s;
}

async function bugun() {
  const [s] = await okuma.query('SELECT CURDATE() AS bugun');
  return s[0].bugun;
}

async function menuyuVeritabanindanOku(yemekhaneId, tarih, ogunId) {
  const [yemekler] = await okuma.query(
    `SELECT menu_id, yemekhane, ogun, rezervasyon_son, ogrenci_fiyati, personel_fiyati,
            yemek, kategori, kalori, vejetaryen, alerjenler
       FROM v_menu_detay
      WHERE yemekhane_id = ? AND tarih = ? AND ogun_id = ?
      ORDER BY kategori_sira, yemek`,
    [yemekhaneId, tarih, ogunId]
  );
  if (yemekler.length === 0) return null;
  const ilk = yemekler[0];
  return {
    menuId: ilk.menu_id,
    yemekhane: ilk.yemekhane,
    ogun: ilk.ogun,
    rezervasyonSon: ilk.rezervasyon_son,
    ogrenciFiyati: ilk.ogrenci_fiyati,
    personelFiyati: ilk.personel_fiyati,
    yemekler,
    toplamKalori: yemekler.reduce((t, y) => t + y.kalori, 0),
  };
}

// Önce Redis'e bakılır (isabet), yoksa replikadan okunup Redis'e yazılır (kaçırma).
// Önbellekteki menü role bağlı değildir: iki fiyat da saklanır, kullanıcıya uygun olanı
// controller seçer.
async function gunlukMenu(yemekhaneId, tarih, ogunId) {
  const k = menuOnbellek.anahtar(yemekhaneId, tarih, ogunId);
  const onbellekte = await menuOnbellek.al(k);
  if (onbellekte) {
    console.log(`[önbellek] İSABET ${k} (Redis'ten geldi)`);
    return onbellekte;
  }
  console.log(`[önbellek] KAÇIRMA ${k} (veritabanından, replika)`);
  const menu = await menuyuVeritabanindanOku(yemekhaneId, tarih, ogunId);
  if (menu) await menuOnbellek.yaz(k, tarih, menu);
  return menu;
}

// Bugünden başlayarak 7 gün: doluluk, rolüne göre fiyat, yarım porsiyon fiyatı
// (oranı olmayan öğünde NULL), kullanıcının rezervasyon durumu.
async function haftalikMenu(yemekhaneId, kullaniciId, rol) {
  const [s] = await okuma.query(
    `SELECT d.menu_id, d.tarih, d.ogun_id, d.ogun, d.bos_yer, d.rezervasyon_son,
            (NOW() >= d.rezervasyon_son) AS suresi_doldu,
            IF(? = 'ogrenci', m.ogrenci_fiyati, m.personel_fiyati) AS fiyat,
            ROUND(IF(? = 'ogrenci', m.ogrenci_fiyati, m.personel_fiyati)
                  * o.yarim_porsiyon_orani, 2) AS yarim_fiyat,
            r.durum AS rezervasyon_durumu
       FROM v_menu_doluluk d
       JOIN menuler m ON m.id = d.menu_id
       JOIN ogunler o ON o.id = d.ogun_id
       LEFT JOIN rezervasyonlar r ON r.menu_id = d.menu_id AND r.kullanici_id = ?
      WHERE d.yemekhane_id = ?
        AND d.tarih BETWEEN CURDATE() AND CURDATE() + INTERVAL 6 DAY
      ORDER BY d.tarih, d.ogun_id`,
    [rol, rol, kullaniciId, yemekhaneId]
  );
  return s;
}

module.exports = { yemekhaneler, ogunler, bugun, gunlukMenu, haftalikMenu };