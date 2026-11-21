// Uygulamanın kendi doğrulama hataları: mesajı kullanıcıya olduğu gibi gösterilir.
class KullaniciHatasi extends Error {
  constructor(mesaj) {
    super(mesaj);
    this.kullaniciHatasi = true;
  }
}

// Stored procedure hatası (SQLSTATE 45000, kod 1644) Türkçe mesajıyla aynen döner.
// Diğer hatalar (ör. CHECK ihlali 3819) programlama hatasıdır, ham hali gösterilmez.
function kullaniciMesaji(err) {
  if (err && err.kullaniciHatasi) return err.message;
  if (err && err.errno === 1644) return err.sqlMessage;
  console.error(err);
  return 'Beklenmeyen bir hata oluştu.';
}

module.exports = { KullaniciHatasi, kullaniciMesaji };