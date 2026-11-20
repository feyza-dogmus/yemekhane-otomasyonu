// İki ayrı bağlantı havuzu: yazma kaynağa, okuma replikaya gider.
const mysql = require('mysql2/promise');

const ortak = {
  port: Number(process.env.DB_PORT),
  database: process.env.DB_ADI,
  user: process.env.DB_KULLANICI,
  password: process.env.DB_SIFRE,
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true,
};

const yazma = mysql.createPool({ ...ortak, host: process.env.DB_YAZMA_HOST });
const okuma = mysql.createPool({ ...ortak, host: process.env.DB_OKUMA_HOST });

module.exports = { yazma, okuma };