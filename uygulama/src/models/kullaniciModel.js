// Veri katmanı: kullanıcı sorguları (SQL yalnızca burada).
const { okuma } = require('../config/db');

async function epostaIleBul(eposta) {
  const [satirlar] = await okuma.query(
    'SELECT id, ad, soyad, eposta, sifre_hash, rol, aktif FROM kullanicilar WHERE eposta = ?',
    [eposta]
  );
  return satirlar[0] || null;
}

module.exports = { epostaIleBul };