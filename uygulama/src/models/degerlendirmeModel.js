// Veri katmanı: değerlendirmeler.
// Liste REPLİKAdan okunur; "yalnızca kullanılmış menü" kontrolü ve yazma KAYNAKTA yapılır.
const { yazma, okuma } = require('../config/db');
const { KullaniciHatasi } = require('../yardimci/hata');

async function kullanilmisMenuler(kullaniciId) {
  const [s] = await okuma.query(
    `SELECT m.id AS menu_id, m.tarih, m.yemekhane_id, m.ogun_id,
            yh.ad AS yemekhane, o.ad AS ogun, r.kullanma_zamani,
            d.puan, d.yorum
       FROM rezervasyonlar r
       JOIN menuler m       ON m.id  = r.menu_id
       JOIN yemekhaneler yh ON yh.id = m.yemekhane_id
       JOIN ogunler o       ON o.id  = m.ogun_id
       LEFT JOIN degerlendirmeler d ON d.menu_id = m.id AND d.kullanici_id = r.kullanici_id
      WHERE r.kullanici_id = ? AND r.durum = 'kullanildi'
      ORDER BY m.tarih DESC, o.sira DESC`,
    [kullaniciId]
  );
  return s;
}

// Kişi başına menü başına tek oy: ikinci gönderim mevcut oyu günceller.
async function kaydet(kullaniciId, menuId, puan, yorum) {
  const [kullanildi] = await yazma.query(
    `SELECT 1 FROM rezervasyonlar
      WHERE kullanici_id = ? AND menu_id = ? AND durum = 'kullanildi'`,
    [kullaniciId, menuId]
  );
  if (kullanildi.length === 0) {
    throw new KullaniciHatasi('Yalnızca kullandığınız menüleri değerlendirebilirsiniz.');
  }
  await yazma.query(
    `INSERT INTO degerlendirmeler (kullanici_id, menu_id, puan, yorum)
     VALUES (?, ?, ?, ?) AS yeni
     ON DUPLICATE KEY UPDATE puan = yeni.puan, yorum = yeni.yorum`,
    [kullaniciId, menuId, puan, yorum]
  );
}

module.exports = { kullanilmisMenuler, kaydet };