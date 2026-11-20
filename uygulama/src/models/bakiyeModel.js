// Veri katmanı: bakiye işlemleri.
// Güncel bakiye ve yükleme KAYNAKTAN, hareket geçmişi REPLİKAdan okunur.
const { yazma, okuma } = require('../config/db');

async function guncelBakiye(kullaniciId) {
  const [s] = await yazma.query('SELECT bakiye FROM kullanicilar WHERE id = ?', [kullaniciId]);
  return s[0] ? Number(s[0].bakiye) : 0;
}

async function hareketler(kullaniciId) {
  const [s] = await okuma.query(
    `SELECT id, tur, tutar, aciklama, olusturma
       FROM bakiye_hareketleri
      WHERE kullanici_id = ?
      ORDER BY olusturma DESC, id DESC
      LIMIT 50`,
    [kullaniciId]
  );
  return s;
}

async function yukle(kullaniciId, tutar) {
  const [sonuc] = await yazma.query('CALL sp_bakiye_yukle(?, ?)', [kullaniciId, tutar]);
  return sonuc[0][0]; // { hareket_id, bakiye }
}

module.exports = { guncelBakiye, hareketler, yukle };