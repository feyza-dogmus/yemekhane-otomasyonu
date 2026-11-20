// Veri katmanı: SQL yalnızca models klasöründe bulunur.
const { yazma, okuma } = require('../config/db');

async function yazmaDurumu() {
  const [satirlar] = await yazma.query('SELECT @@hostname AS sunucu, @@read_only AS salt_okunur');
  return satirlar[0];
}

async function okumaDurumu() {
  const [satirlar] = await okuma.query('SELECT @@hostname AS sunucu, @@read_only AS salt_okunur');
  return satirlar[0];
}

module.exports = { yazmaDurumu, okumaDurumu };