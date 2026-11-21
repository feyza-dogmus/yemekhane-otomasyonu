const path = require('path');
const express = require('express');
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const redis = require('./config/redis');
const { girisGerekli } = require('./middleware/oturum');
const { trTarih } = require('./yardimci/tarih');

const PORT = 8000;
const OTURUM_SURESI_MS = 30 * 60 * 1000; // 30 dakika

async function baslat() {
  await redis.baglan();

  const app = express();

  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  app.use(express.urlencoded({ extended: false }));

  // Oturum Redis'te tutulur: anahtar oturum:{token}, süre 30 dakika.
  // rolling: true -> her istekte süre yeniden 30 dakikaya çıkar.
  // Çıkışta session.destroy() anahtarı Redis'ten siler.
  app.use(session({
    store: new RedisStore({
      client: redis.istemci,
      prefix: 'oturum:',
      ttl: OTURUM_SURESI_MS / 1000,
    }),
    secret: process.env.OTURUM_SIRRI || 'yemekhane-ders-ortami',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: { httpOnly: true, maxAge: OTURUM_SURESI_MS },
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
}

baslat().catch((err) => {
  console.error('Uygulama başlatılamadı:', err);
  process.exit(1);
});