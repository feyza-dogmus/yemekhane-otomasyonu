// Veri katmanı: yönetici işlemleri.
// Listeler REPLİKAdan, menü yazma/düzenleme ve düzenlenecek menünün okunması KAYNAKTAN yapılır.
const { yazma, okuma } = require('../config/db');
const { KullaniciHatasi } = require('../yardimci/hata');

async function varsayilanAralik() {
  const [s] = await okuma.query(
    'SELECT CURDATE() - INTERVAL 7 DAY AS bas, CURDATE() + INTERVAL 30 DAY AS bit'
  );
  return s[0];
}

// Menü başına doluluk ve ortalama puan (hazır view'lar)
async function menuListesi(yemekhaneId, baslangic, bitis) {
  const parametre = [baslangic, bitis];
  let filtre = '';
  if (yemekhaneId) {
    filtre = 'AND d.yemekhane_id = ?';
    parametre.push(yemekhaneId);
  }
  const [s] = await okuma.query(
    `SELECT d.menu_id, d.tarih, d.yemekhane, d.ogun, d.kapasite, d.rezerve,
            d.bos_yer, d.doluluk_yuzde,
            m.ogrenci_fiyati, m.personel_fiyati,
            p.oy_sayisi, p.ortalama_puan
       FROM v_menu_doluluk d
       JOIN menuler m       ON m.id = d.menu_id
       JOIN v_menu_puan p   ON p.menu_id = d.menu_id
      WHERE d.tarih BETWEEN ? AND ? ${filtre}
      ORDER BY d.tarih DESC, d.yemekhane_id, d.ogun_id`,
    parametre
  );
  return s;
}

async function yemekSecenekleri() {
  const [s] = await okuma.query(
    `SELECT y.id, y.ad, y.kalori, k.ad AS kategori
       FROM yemekler y
       JOIN yemek_kategorileri k ON k.id = y.kategori_id
      ORDER BY k.sira, y.ad`
  );
  return s;
}

async function menuBul(menuId) {
  const [m] = await yazma.query(
    `SELECT m.id, m.tarih, m.yemekhane_id, yh.ad AS yemekhane,
            m.ogun_id, o.ad AS ogun, m.ogrenci_fiyati, m.personel_fiyati
       FROM menuler m
       JOIN yemekhaneler yh ON yh.id = m.yemekhane_id
       JOIN ogunler o       ON o.id  = m.ogun_id
      WHERE m.id = ?`,
    [menuId]
  );
  if (!m[0]) return null;
  const [y] = await yazma.query('SELECT yemek_id FROM menu_yemekleri WHERE menu_id = ?', [menuId]);
  return {
    id: m[0].id,
    tarih: m[0].tarih,
    yemekhaneId: m[0].yemekhane_id,
    yemekhane: m[0].yemekhane,
    ogunId: m[0].ogun_id,
    ogun: m[0].ogun,
    ogrenciFiyati: m[0].ogrenci_fiyati,
    personelFiyati: m[0].personel_fiyati,
    yemekIdler: y.map((r) => r.yemek_id),
  };
}

function hatayiCevir(err) {
  if (err.errno === 1062) {
    throw new KullaniciHatasi('Bu yemekhane, tarih ve öğün için zaten bir menü var.');
  }
  if (err.errno === 1452) {
    throw new KullaniciHatasi('Seçilen yemeklerden biri geçerli değil.');
  }
  throw err;
}

async function olustur(g) {
  const baglanti = await yazma.getConnection();
  try {
    await baglanti.beginTransaction();
    const [sonuc] = await baglanti.query(
      `INSERT INTO menuler (yemekhane_id, tarih, ogun_id, ogrenci_fiyati, personel_fiyati)
       VALUES (?, ?, ?, ?, ?)`,
      [g.yemekhaneId, g.tarih, g.ogunId, g.ogrenciFiyati, g.personelFiyati]
    );
    const menuId = sonuc.insertId;
    await baglanti.query(
      'INSERT INTO menu_yemekleri (menu_id, yemek_id) VALUES ?',
      [g.yemekIdler.map((id) => [menuId, id])]
    );
    await baglanti.commit();
    return menuId;
  } catch (err) {
    await baglanti.rollback();
    return hatayiCevir(err);
  } finally {
    baglanti.release();
  }
}

// Düzenleme: fiyatlar ve yemekler değişir. Yemekhane, tarih ve öğün sabittir
// (rezervasyonlar bu menüye bağlıdır). Önbellek anahtarı için kimliği döndürür.
async function guncelle(menuId, ogrenciFiyati, personelFiyati, yemekIdler) {
  const baglanti = await yazma.getConnection();
  try {
    await baglanti.beginTransaction();
    const [m] = await baglanti.query(
      'SELECT yemekhane_id, tarih, ogun_id FROM menuler WHERE id = ? FOR UPDATE',
      [menuId]
    );
    if (m.length === 0) throw new KullaniciHatasi('Menü bulunamadı.');
    await baglanti.query(
      `UPDATE menuler
          SET ogrenci_fiyati = ?, personel_fiyati = ?, guncelleme = NOW()
        WHERE id = ?`,
      [ogrenciFiyati, personelFiyati, menuId]
    );
    await baglanti.query('DELETE FROM menu_yemekleri WHERE menu_id = ?', [menuId]);
    await baglanti.query(
      'INSERT INTO menu_yemekleri (menu_id, yemek_id) VALUES ?',
      [yemekIdler.map((id) => [menuId, id])]
    );
    await baglanti.commit();
    return { yemekhaneId: m[0].yemekhane_id, tarih: m[0].tarih, ogunId: m[0].ogun_id };
  } catch (err) {
    await baglanti.rollback();
    return hatayiCevir(err);
  } finally {
    baglanti.release();
  }
}

module.exports = {
  varsayilanAralik, menuListesi, yemekSecenekleri, menuBul, olustur, guncelle,
};