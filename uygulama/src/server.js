const path = require('path');
const express = require('express');

const app = express();
const PORT = 8000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: false }));

app.get('/', (req, res) => {
  res.render('ana');
});

app.use('/', require('./routes/sistem'));

app.listen(PORT, () => {
  console.log(`Uygulama ${PORT} portunda çalışıyor`);
});