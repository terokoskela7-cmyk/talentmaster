// Paikkamerkkidomainien esto (1.10.2026) — selaimen peili functions/paikkamerkki.js:stä. Listat pidettävä
// samoina (tests/paikkamerkki_esto.test.js). Käyttö: Seura-sivun Excel-tuonti + pelaajan lisäys/muokkaus.
var PAIKKAMERKKI_DOMAINIT = [
  'talentmaster.fi', 'talentmaster.local',
  'example.com', 'example.fi', 'example.test',
  'test.fi', 'seura.fi', 'email.fi', 'osoite.fi',
  'x.fi', 'y.fi', 'z.fi', 'b.fi', 'demo.kpv.fi',
];
var PAIKKAMERKKI_SYY = 'Esimerkkiosoite – korvaa huoltajan oikealla sähköpostilla';
function tmSahkopostinDomain(email) {
  var s = String(email == null ? '' : email).trim().toLowerCase();
  var i = s.lastIndexOf('@');
  return i < 0 ? '' : s.slice(i + 1);
}
function tmOnPaikkamerkkiOsoite(email) {
  var d = tmSahkopostinDomain(email);
  return !!d && PAIKKAMERKKI_DOMAINIT.some(function (x) { return d === x || d.slice(-(x.length + 1)) === '.' + x; });
}
if (typeof window !== 'undefined') {
  window.tmOnPaikkamerkkiOsoite = tmOnPaikkamerkkiOsoite;
  window.PAIKKAMERKKI_SYY = PAIKKAMERKKI_SYY;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PAIKKAMERKKI_DOMAINIT: PAIKKAMERKKI_DOMAINIT, PAIKKAMERKKI_SYY: PAIKKAMERKKI_SYY, tmSahkopostinDomain: tmSahkopostinDomain, tmOnPaikkamerkkiOsoite: tmOnPaikkamerkkiOsoite };
}
