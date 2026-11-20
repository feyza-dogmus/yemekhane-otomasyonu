// '2026-11-21' -> '21 Kasım Cumartesi'
function trTarih(t) {
  return new Date(t + 'T00:00:00').toLocaleDateString('tr-TR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

module.exports = { trTarih };