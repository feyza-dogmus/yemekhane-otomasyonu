// Veri katmanı: para hareketi yapan işlemler KAYNAĞA gider ve stored procedure ile yapılır.
// Çağrıyı BEGIN/COMMIT içine almıyoruz: yordam kendi transaction'ını yönetir.
const { yazma } = require('../config/db');

async function yap(kullaniciId, menuId) {
  const [sonuc] = await yazma.query('CALL sp_rezervasyon_yap(?, ?)', [kullaniciId, menuId]);
  return sonuc[0][0]; // { rezervasyon_id, ucret, bakiye }
}

module.exports = { yap };