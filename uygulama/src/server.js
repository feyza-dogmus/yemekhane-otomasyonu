const path = require('path');
const express = require('express');
const session = require('express-session');
const { girisGerekli } = require('./middleware/oturum');

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

// Tüm şablonlarda giriş yapmış kullanıcı kullanılabilir
app.use((req, res, next) => {
  res.locals.kullanici = req.session.kullanici || null;
  next();
});

app.get('/', girisGerekli, (req, res) => {
  res.render('ana');
});

app.use('/', require('./routes/auth'));
app.use('/', require('./routes/sistem'));

app.listen(PORT, () => {
  console.log(`Uygulama ${PORT} portunda çalışıyor`);
});