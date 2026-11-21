const path = require('path');
const express = require('express');
const session = require('express-session');
const { girisGerekli } = require('./middleware/oturum');
const { trTarih } = require('./yardimci/tarih');

const app = express();
const PORT = 8000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: false }));

// Oturum şimdilik bellekte tutulur. Aşama 3'te Redis'e taşınacak.
app.use(session({
  secret: process.env.OTURUM_SIRRI || 'yemekhane-ders-ortami',
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: { httpOnly: true, maxAge: 30 * 60 * 1000 },
}));

// Tüm şablonlarda kullanılabilen değerler. "bildirim" bir kez gösterilip silinir.
app.use((req, res, next) => {
  res.locals.kullanici = req.session.kullanici || null;
  res.locals.bildirim = req.session.mesaj || null;
  delete req.session.mesaj;
  res.locals.trTarih = trTarih;
  next();
});

app.get('/', girisGerekli, (req, res) => res.redirect('/menu'));

app.use('/', require('./routes/auth'));
app.use('/', require('./routes/sistem'));
app.use('/', require('./routes/menu'));
app.use('/', require('./routes/rezervasyon'));
app.use('/', require('./routes/bakiye'));
app.use('/', require('./routes/degerlendirme'));
app.use('/', require('./routes/yonetim'));

app.listen(PORT, () => {
  console.log(`Uygulama ${PORT} portunda çalışıyor`);
});