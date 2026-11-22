// Menü önbelleği (Redis).
// Anahtar: menu:{yemekhane_id}:{tarih}:{ogun_id}
// Süre: menünün tarihindeki gün bitene kadar.
// Yönetici menüyü değiştirince anahtar silinir.
// Redis'e ulaşılamazsa uygulama çalışmaya devam eder: istek veritabanından cevaplanır.
const { istemci } = require('../config/redis');

function anahtar(yemekhaneId, tarih, ogunId) {
  return `menu:${yemekhaneId}:${tarih}:${ogunId}`;
}

// Türkiye saati sabit UTC+03:00'dır. Hesap sunucunun saat dilimine bağlı kalmasın
// diye farkı açıkça yazıyoruz. Geçmiş bir günün menüsü için sonuç 0 veya negatif çıkar.
function gunSonunaKalanSaniye(tarih) {
  const bitis = new Date(`${tarih}T23:59:59+03:00`);
  return Math.floor((bitis.getTime() - Date.now()) / 1000) + 1;
}

async function al(k) {
  try {
    const ham = await istemci.get(k);
    return ham ? JSON.parse(ham) : null;
  } catch (err) {
    console.error('[önbellek] okunamadı:', err.message);
    return null;
  }
}

async function yaz(k, tarih, menu) {
  const sure = gunSonunaKalanSaniye(tarih);
  if (sure <= 0) return; // geçmiş günün menüsü saklanmaz
  try {
    await istemci.set(k, JSON.stringify(menu), { EX: sure });
  } catch (err) {
    console.error('[önbellek] yazılamadı:', err.message);
  }
}

async function sil(k) {
  try {
    await istemci.del(k);
    console.log(`[önbellek] SİLİNDİ ${k}`);
  } catch (err) {
    console.error('[önbellek] silinemedi:', err.message);
  }
}

// Menü değiştiğinde çağrılır. Hemen silinir, 3 saniye sonra bir kez daha silinir:
// replika değişikliği henüz almamışsa araya giren bir okuma eski menüyü
// tekrar önbelleğe yazmış olabilir.
async function gecersizKil(yemekhaneId, tarih, ogunId) {
  const k = anahtar(yemekhaneId, tarih, ogunId);
  await sil(k);
  setTimeout(() => sil(k), 3000);
}

module.exports = { anahtar, al, yaz, sil, gecersizKil };