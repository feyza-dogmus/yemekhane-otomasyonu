// Veri katmanı: rezervasyonlar.
// Para hareketi yapan işlemler KAYNAĞA gider ve stored procedure ile yapılır.
// Çağrıyı BEGIN/COMMIT içine almıyoruz: yordam kendi transaction'ını yönetir.
// Listeleme REPLİKAdan yapılır.
const { yazma, okuma } = require('../config/db');

async function yap(kullaniciId, menuId) {
  const [sonuc] = await yazma.query('CALL sp_rezervasyon_yap(?, ?)', [kullaniciId, menuId]);
  return sonuc[0][0]; // { rezervasyon_id, ucret, bakiye }
}

async function iptalEt(kullaniciId, rezervasyonId) {
  const [sonuc] = await yazma.query('CALL sp_rezervasyon_iptal(?, ?)', [kullaniciId, rezervasyonId]);
  return sonuc[0][0]; // { rezervasyon_id, iade, bakiye }
}

async function kullanicininRezervasyonlari(kullaniciId) {
  const [s] = await okuma.query(
    `SELECT r.id, r.durum, r.ucret, r.kullanma_zamani, r.iptal_zamani,
            m.id AS menu_id, m.tarih, yh.ad AS yemekhane, o.ad AS ogun,
            TIMESTAMP(m.tarih, o.son_saat) AS rezervasyon_son,
            (NOW() < TIMESTAMP(m.tarih, o.son_saat)) AS iptal_edilebilir
       FROM rezervasyonlar r
       JOIN menuler m       ON m.id  = r.menu_id
       JOIN yemekhaneler yh ON yh.id = m.yemekhane_id
       JOIN ogunler o       ON o.id  = m.ogun_id
      WHERE r.kullanici_id = ?
      ORDER BY m.tarih DESC, o.sira DESC
      LIMIT 100`,
    [kullaniciId]
  );
  return s;
}

module.exports = { yap, iptalEt, kullanicininRezervasyonlari };