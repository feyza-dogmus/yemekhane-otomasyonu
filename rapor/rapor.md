# Yemekhane Otomasyonu – Dönem Ödevi Raporu

**Öğrenci:** Feyza Doğmuş · **No:** 241229085
**Aşama 2 için seçilen yol:** MVC (Node.js / Express + EJS)

---

## Aşama 1 · Altyapı

### 1.1 Servislerin durumu

```
docker compose up -d
docker compose ps -a
```

Dört servis `healthy`, `replica-setup` `Exited (0)` durumundadır.

![compose ps](ekran-goruntuleri/01-compose-ps-ilk.png)

Başlangıç sayfası `http://localhost:8080` adresinde açılmıştır.

![tarayıcı](ekran-goruntuleri/02-tarayici-8080.png)

### 1.2 Replikasyon durumu

```
docker compose exec mysql-replica mysql -uroot -pyemekhane_kok -e "SHOW REPLICA STATUS\G" | grep -E "Source_Host|Replica_IO_Running|Replica_SQL_Running"
```

`Replica_IO_Running: Yes` ve `Replica_SQL_Running: Yes`.

![replikasyon durumu](ekran-goruntuleri/08-replikasyon-durumu.png)

### 1.3 Kaynakta yazma, replikada okuma

Replikada kullanıcı 7'nin bakiyesi 355.00 idi. Kaynakta 100 TL yüklendi, replikada bakiye 455.00 oldu.

```
docker compose exec mysql-replica mysql -uyemekhane_app -pUyg_2026 yemekhane -e "SELECT id, bakiye FROM kullanicilar WHERE id = 7"
docker compose exec mysql-primary mysql -uyemekhane_app -pUyg_2026 yemekhane -e "CALL sp_bakiye_yukle(7, 100)"
docker compose exec mysql-replica mysql -uyemekhane_app -pUyg_2026 yemekhane -e "SELECT id, bakiye FROM kullanicilar WHERE id = 7"
```

![bakiye yükleme](ekran-goruntuleri/03-bakiye-yukleme-replikada.png)

### 1.4 Replikaya yazma denemesi reddedilir

```
docker compose exec mysql-replica mysql -uyemekhane_app -pUyg_2026 yemekhane -e "CALL sp_bakiye_yukle(7, 50)"
```

`ERROR 1290` döndü, bakiye 455.00 olarak kaldı.

![yazma reddi](ekran-goruntuleri/05-replika-yazma-reddi.png)

### 1.5 Replika durup başlayınca değişiklikleri yakalar

```
docker compose stop mysql-replica
docker compose exec mysql-primary mysql -uyemekhane_app -pUyg_2026 yemekhane -e "CALL sp_bakiye_yukle(7, 200)"
docker compose start mysql-replica
docker compose exec mysql-replica mysql -uyemekhane_app -pUyg_2026 yemekhane -e "SELECT id, bakiye FROM kullanicilar WHERE id = 7"
```

Replika kapalıyken kaynakta yapılan 200 TL yükleme, replika başlayınca yakalandı (bakiye 655.00).

![durdur başlat](ekran-goruntuleri/04-replika-durdur-baslat.png)

### 1.6 Redis

```
docker compose exec redis redis-cli ping
```

![redis pong](ekran-goruntuleri/06-redis-pong.png)

### 1.7 Son durum

Bu testlerden sonra tüm servisler hâlâ sağlıklıdır.

![son durum](ekran-goruntuleri/07-compose-ps-son.png)

---

## Aşama 2 · Uygulama (MVC)

**Seçilen yol:** MVC. Uygulama Node.js (Express) ile yazıldı, sayfalar EJS şablonlarıyla sunucuda üretiliyor. Apache `-D MVC` modunda çalışıyor: `/css/`, `/img/`, `/js/`, `/hata/` ve `/saglik.txt` Apache'den, geri kalan her şey `uygulama` servisinden (8000 portu) gelir. CSS dosyaları `frontend/css/` altındadır.

### 2.1 Katmanlı yapı

```
uygulama/src/
  routes/        yolları tanımlar, controller'a yönlendirir
  controllers/   isteği alır, doğrular, modeli çağırır, view'ı seçer (SQL yok)
  models/        tüm SQL ve stored procedure çağrıları burada
  views/         EJS şablonları (iş kuralı yok)
  config/db.js   iki bağlantı havuzu: yazma (kaynak) ve okuma (replika)
  middleware/    oturum ve rol kontrolü
  yardimci/      hata mesajı çevirisi, tarih işlevleri
```

### 2.2 Bir isteğin yolu: rezervasyon yapma

Tarayıcıda "Rezervasyon yap" düğmesi `POST /rezervasyon` isteği gönderir. İstek Apache'den uygulamaya iletilir.

**1) Route** (`routes/menu.js`): yolu tanımlar, önce giriş kontrolünü çalıştırır.

```js
router.post('/rezervasyon', girisGerekli, menuController.rezervasyonYap);
```

**2) Controller** (`controllers/menuController.js`): girdiyi doğrular, modeli çağırır, sonucu kullanıcıya mesaj olarak taşır. Controller içinde SQL yoktur.

```js
async function rezervasyonYap(req, res) {
  const yemekhaneId = sayi(req.body.yemekhane, 1);
  const geri = `/haftalik?yemekhane=${yemekhaneId}`;
  const menuId = sayi(req.body.menu_id, null);
  if (!menuId) {
    req.session.mesaj = { tur: 'hata', metin: 'Geçersiz menü.' };
    return res.redirect(geri);
  }
  try {
    // Başarıda gösterilen bakiye KAYNAKTAN (yordamın cevabı) gelir, replikadan değil.
    const r = await rezervasyonModel.yap(req.session.kullanici.id, menuId);
    req.session.mesaj = {
      tur: 'basari',
      metin: `Rezervasyon yapıldı. Ücret: ${Number(r.ucret).toFixed(2)} TL, kalan bakiye: ${Number(r.bakiye).toFixed(2)} TL.`,
    };
  } catch (err) {
    req.session.mesaj = { tur: 'hata', metin: kullaniciMesaji(err) };
  }
  res.redirect(geri);
}
```

**3) Veri katmanı** (`models/rezervasyonModel.js`): işlemi **kaynağa** gönderir ve stored procedure'ü çağırır. Para hareketi SQL ile yeniden yazılmadı. Çağrı `BEGIN/COMMIT` içine alınmadı, çünkü yordam kendi transaction'ını yönetir.

```js
async function yap(kullaniciId, menuId) {
  const [sonuc] = await yazma.query('CALL sp_rezervasyon_yap(?, ?)', [kullaniciId, menuId]);
  return sonuc[0][0]; // { rezervasyon_id, ucret, bakiye }
}
```

**4) Yanıt:** controller sonucu oturumdaki tek seferlik mesaja koyar ve `/haftalik` sayfasına yönlendirir. Sayfa yüklenirken mesaj bir kez gösterilip silinir (`views/partials/ust.ejs`).

### 2.3 Okuma ve yazma ayrımı

| İşlem | Sunucu | Nasıl |
|---|---|---|
| Giriş (kullanıcıyı e-postayla bulma) | replika | `SELECT` |
| Günün menüsü | replika | `v_menu_detay` |
| Haftalık menü, doluluk | replika | `v_menu_doluluk` |
| Rezervasyon yapma | **kaynak** | `CALL sp_rezervasyon_yap` |
| Rezervasyonlarım listesi | replika | `SELECT` |
| Rezervasyon iptali | **kaynak** | `CALL sp_rezervasyon_iptal` |
| Hareket geçmişi | replika | `SELECT` |
| Güncel bakiye (Bakiye sayfası) | **kaynak** | `SELECT` (bilinçli istisna, bkz. 2.5) |
| Bakiye yükleme | **kaynak** | `CALL sp_bakiye_yukle` |
| Değerlendirme listesi | replika | `SELECT` |
| Değerlendirme kaydı ve "kullanılmış mı" kontrolü | **kaynak** | `SELECT` + `INSERT ... ON DUPLICATE KEY UPDATE` |
| Yönetim listesi (doluluk, ortalama puan) | replika | `v_menu_doluluk`, `v_menu_puan` |
| Menü oluşturma ve düzenleme | **kaynak** | transaction içinde `INSERT/UPDATE/DELETE` |
| Düzenlenecek menünün okunması | **kaynak** | form eski veriyi göstermesin diye |

### 2.4 Hata mesajlarının arayüze taşınması

Stored procedure'ler hata durumunda `SQLSTATE 45000` (MySQL kodu 1644) ve Türkçe mesaj döndürür. `yardimci/hata.js` bu mesajı **değiştirmeden** kullanıcıya iletir. CHECK kısıtı ihlali (3819) gibi diğer hatalar programlama hatası sayıldığı için kullanıcıya ham haliyle gösterilmez, günlüğe yazılır ve "Beklenmeyen bir hata oluştu." denir.

```js
function kullaniciMesaji(err) {
  if (err && err.kullaniciHatasi) return err.message;
  if (err && err.errno === 1644) return err.sqlMessage;
  console.error(err);
  return 'Beklenmeyen bir hata oluştu.';
}
```

Denenen örnekler: "Bakiye yetersiz." (bakiyesi 12,50 TL olan Ayşe), "Yükleme tutarı 10 ile 1000 TL arasında olmalıdır.", "Bu menü için rezervasyon süresi doldu.".

### 2.5 Replikasyon gecikmesi

MySQL replikasyonu **eşzamanlıdır değil, eşzamansızdır**: kaynağa yazılan değişiklik replikaya kısa bir gecikmeyle ulaşır. Bu gecikme çoğu zaman milisaniyeler sürer, ama garanti edilmez. Kullanıcı rezervasyon yaptıktan hemen sonra bakiyesini replikadan okuyabilseydik, replika değişikliği henüz almamışsa **eski ve yanlış** bakiyeyi görürdü. Para söz konusu olduğu için bu kabul edilemez.

Bu yüzden rezervasyondan hemen sonra gösterilen bakiye, stored procedure'ün kaynaktan döndürdüğü cevaptan alınır (`r.bakiye`). Aynı nedenle Bakiye sayfasındaki güncel bakiye de kaynaktan okunur. Listeler (menü, hareket geçmişi, yönetim raporları) ise replikadan okunur, çünkü saniyelik bir gecikme bu ekranlarda zarar vermez. Replikanın kaynağa yetiştiğini Aşama 1'de durdurup başlatma testiyle gösterdik.

### 2.6 Ekranlar

**Sistem durumu** (yazma bağlantısı `salt okunur: 0`, okuma bağlantısı `salt okunur: 1`):

![durum](ekran-goruntuleri/asama2-r01-durum.png)

**1. Giriş ve çıkış** (e-posta + şifre, bcrypt doğrulaması):

![giris](ekran-goruntuleri/asama2-r02-giris-bos.png)
![yanlis sifre](ekran-goruntuleri/asama2-r03-yanlis-sifre.png)
![basarili giris](ekran-goruntuleri/asama2-r04-basarili-giris.png)

**2. Günün menüsü** (yemekhane ve öğün seçimi, toplam kalori, vejetaryen ve alerjen bilgisi):

![gunun menusu](ekran-goruntuleri/asama2-r05-gunun-menusu.png)

**3. Haftalık menü ve rezervasyon** (boş yer, role göre fiyat, son saat geçince pasif düğme):

![haftalik](ekran-goruntuleri/asama2-r06-haftalik-menu.png)
![rezervasyon basarili](ekran-goruntuleri/asama2-r07-rezervasyon-basarili.png)
![bakiye yetersiz](ekran-goruntuleri/asama2-r08-bakiye-yetersiz.png)

**4. Rezervasyonlarım** (aktif, kullanıldı, iptal; süresi dolmamışsa iptal):

![rezervasyonlarim](ekran-goruntuleri/asama2-r09-rezervasyonlarim.png)
![iptal](ekran-goruntuleri/asama2-r10-iptal-basarili.png)

**5. Bakiye** (güncel bakiye, hareket geçmişi, yükleme):

![bakiye](ekran-goruntuleri/asama2-r11-bakiye.png)
![yukleme hata](ekran-goruntuleri/asama2-r12-yukleme-hata.png)

**6. Değerlendirme** (kullanılmış menüye 1-5 puan ve yorum):

![degerlendirme](ekran-goruntuleri/asama2-r13-degerlendirme.png)

**7. Yönetici paneli** (menü oluşturma ve düzenleme, doluluk ve ortalama puan):

![yonetim](ekran-goruntuleri/asama2-r14-yonetim-liste.png)
![yeni menu](ekran-goruntuleri/asama2-r15-yeni-menu-hata.png)

Yönetici olmayan kullanıcı `/yonetim` adresini açarsa 403 sayfası görür:

![403](ekran-goruntuleri/asama2-r16-403.png)

### 2.7 Telefon uyumu (393 px)

Arayüz mobil önce yazılmış `temel.css` ve `uygulama.css` ile çalışır. 600 px altında üst menü satırlara bölünür, düğmeler en az 44 px yüksekliktedir, filtre formları alt alta dizilir ve geniş tablolar kendi kutusu içinde kayar, sayfa yana kaymaz.

![telefon haftalik](ekran-goruntuleri/asama2-r17-telefon-haftalik.png)
![telefon rezervasyonlarim](ekran-goruntuleri/asama2-r18-telefon-rezervasyonlarim.png)
![telefon bakiye](ekran-goruntuleri/asama2-r19-telefon-bakiye.png)