// Veri katmanı: menü okumaları REPLİKAdan yapılır.
const { okuma } = require('../config/db');

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

// Tek menü: yemekler kategori sırasıyla, toplam kaloriyi burada toplarız.
async function gunlukMenu(yemekhaneId, tarih, ogunId, rol) {
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
    fiyat: rol === 'ogrenci' ? ilk.ogrenci_fiyati : ilk.personel_fiyati,
    yemekler,
    toplamKalori: yemekler.reduce((t, y) => t + y.kalori, 0),
  };
}

// Bugünden başlayarak 7 gün: doluluk, rolüne göre fiyat, kullanıcının rezervasyon durumu.
async function haftalikMenu(yemekhaneId, kullaniciId, rol) {
  const [s] = await okuma.query(
    `SELECT d.menu_id, d.tarih, d.ogun_id, d.ogun, d.bos_yer, d.rezervasyon_son,
            (NOW() >= d.rezervasyon_son) AS suresi_doldu,
            IF(? = 'ogrenci', m.ogrenci_fiyati, m.personel_fiyati) AS fiyat,
            r.durum AS rezervasyon_durumu
       FROM v_menu_doluluk d
       JOIN menuler m ON m.id = d.menu_id
       LEFT JOIN rezervasyonlar r ON r.menu_id = d.menu_id AND r.kullanici_id = ?
      WHERE d.yemekhane_id = ?
        AND d.tarih BETWEEN CURDATE() AND CURDATE() + INTERVAL 6 DAY
      ORDER BY d.tarih, d.ogun_id`,
    [rol, kullaniciId, yemekhaneId]
  );
  return s;
}

module.exports = { yemekhaneler, ogunler, bugun, gunlukMenu, haftalikMenu };