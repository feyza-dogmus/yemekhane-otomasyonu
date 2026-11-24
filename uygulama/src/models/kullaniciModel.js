// Veri katmanı: kullanıcı sorguları.
// Giriş ve alerjen listesi REPLİKAdan, kullanıcının kendi alerjen seçimi KAYNAKTAN okunur
// (yeni kaydedilen seçim replikaya henüz ulaşmamış olabilir). Yazma kaynağa gider.
const { yazma, okuma } = require('../config/db');
const { KullaniciHatasi } = require('../yardimci/hata');

async function epostaIleBul(eposta) {
  const [satirlar] = await okuma.query(
    'SELECT id, ad, soyad, eposta, sifre_hash, rol, aktif FROM kullanicilar WHERE eposta = ?',
    [eposta]
  );
  return satirlar[0] || null;
}

async function alerjenListesi() {
  const [s] = await okuma.query('SELECT id, ad FROM alerjenler ORDER BY ad');
  return s;
}

async function kullaniciAlerjenleri(kullaniciId) {
  const [s] = await yazma.query(
    'SELECT alerjen_id FROM kullanici_alerjenleri WHERE kullanici_id = ?',
    [kullaniciId]
  );
  return s.map((r) => r.alerjen_id);
}

// Seçim bütünüyle değiştirilir: eskiler silinir, yeniler eklenir (tek transaction).
async function alerjenleriKaydet(kullaniciId, idler) {
  const baglanti = await yazma.getConnection();
  try {
    await baglanti.beginTransaction();
    await baglanti.query('DELETE FROM kullanici_alerjenleri WHERE kullanici_id = ?', [kullaniciId]);
    if (idler.length > 0) {
      await baglanti.query(
        'INSERT INTO kullanici_alerjenleri (kullanici_id, alerjen_id) VALUES ?',
        [idler.map((id) => [kullaniciId, id])]
      );
    }
    await baglanti.commit();
  } catch (err) {
    await baglanti.rollback();
    if (err.errno === 1452) throw new KullaniciHatasi('Seçilen alerjenlerden biri geçerli değil.');
    throw err;
  } finally {
    baglanti.release();
  }
}

module.exports = { epostaIleBul, alerjenListesi, kullaniciAlerjenleri, alerjenleriKaydet };