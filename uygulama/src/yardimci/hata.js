// Stored procedure hatası (SQLSTATE 45000, kod 1644) Türkçe mesajıyla aynen döner.
// Diğer hatalar (ör. CHECK ihlali 3819) programlama hatasıdır, ham hali gösterilmez.
function kullaniciMesaji(err) {
  if (err && err.errno === 1644) return err.sqlMessage;
  console.error(err);
  return 'Beklenmeyen bir hata oluştu.';
}

module.exports = { kullaniciMesaji };