const bcrypt = require('bcryptjs');
const kullaniciModel = require('../models/kullaniciModel');

function girisFormu(req, res) {
  if (req.session.kullanici) return res.redirect('/');
  res.render('giris', { hata: null, eposta: '' });
}

async function girisYap(req, res) {
  const eposta = (req.body.eposta || '').trim();
  const sifre = req.body.sifre || '';
  try {
    const k = await kullaniciModel.epostaIleBul(eposta);
    const dogru = k ? await bcrypt.compare(sifre, k.sifre_hash) : false;
    if (!dogru) {
      return res.status(401).render('giris', { hata: 'E-posta veya şifre hatalı.', eposta });
    }
    if (!k.aktif) {
      return res.status(403).render('giris', { hata: 'Hesabınız pasif durumda.', eposta });
    }
    req.session.regenerate((err) => {
      if (err) {
        console.error(err);
        return res.status(500).render('giris', { hata: 'Giriş yapılamadı.', eposta });
      }
      req.session.kullanici = { id: k.id, ad: k.ad, soyad: k.soyad, rol: k.rol };
      res.redirect('/');
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('giris', { hata: 'Giriş yapılamadı, daha sonra tekrar deneyin.', eposta });
  }
}

function cikisYap(req, res) {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.redirect('/giris');
  });
}

module.exports = { girisFormu, girisYap, cikisYap };