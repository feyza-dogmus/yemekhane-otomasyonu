function girisGerekli(req, res, next) {
  if (!req.session.kullanici) return res.redirect('/giris');
  next();
}

function yoneticiGerekli(req, res, next) {
  if (!req.session.kullanici) return res.redirect('/giris');
  if (req.session.kullanici.rol !== 'yonetici') {
    return res.status(403).render('hata', { mesaj: 'Bu sayfaya erişim yetkiniz yok.' });
  }
  next();
}

module.exports = { girisGerekli, yoneticiGerekli };