// '2026-11-21' -> '21 Kasım Cumartesi'
function trTarih(t) {
  return new Date(t + 'T00:00:00').toLocaleDateString('tr-TR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

// 'YYYY-AA-GG' biçiminde ve takvimde gerçekten var olan bir tarih mi?
function gecerliTarih(t) {
  if (typeof t !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(t)) return false;
  const d = new Date(t + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === t;
}

module.exports = { trTarih, gecerliTarih };