// Redis bağlantısı: oturum deposu ve menü önbelleği bu istemciyi kullanır.
// Adres ortam değişkenlerinden gelir (docker-compose.yml: REDIS_HOST, REDIS_PORT).
const { createClient } = require('redis');

const istemci = createClient({
  url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
});

istemci.on('error', (err) => console.error('[redis] hata:', err.message));

async function baglan() {
  await istemci.connect();
  console.log('[redis] bağlandı');
}

module.exports = { istemci, baglan };