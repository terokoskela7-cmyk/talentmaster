// Paikkamerkkidomainien esto (1.10.2026). Peili: lib/tm_paikkamerkki.js — listat pidettävä samoina
// (tests/paikkamerkki_esto.test.js tarkistaa). Tausta: paikkamerkkitilit (esim. vp.fcl@talentmaster.fi,
// huoltaja@example.com) siivottiin 1.10. (scripts/paikkamerkkitilit_siivous.js), mutta luoKayttaja ja
// haeOrLuoHuoltajaAuth loivat Auth-tilin mille tahansa osoitteelle. Domain tai sen aliverkkotunnus estetään.
const PAIKKAMERKKI_DOMAINIT = [
  'talentmaster.fi', 'talentmaster.local',
  'example.com', 'example.fi', 'example.test',
  'test.fi', 'seura.fi', 'email.fi', 'osoite.fi',
  'x.fi', 'y.fi', 'z.fi', 'b.fi', 'demo.kpv.fi',
];
function sahkopostinDomain(email) {
  const s = String(email == null ? '' : email).trim().toLowerCase();
  const i = s.lastIndexOf('@');
  return i < 0 ? '' : s.slice(i + 1);
}
function onPaikkamerkkiOsoite(email) {
  const d = sahkopostinDomain(email);
  return !!d && PAIKKAMERKKI_DOMAINIT.some((x) => d === x || d.endsWith('.' + x));
}
module.exports = { PAIKKAMERKKI_DOMAINIT, sahkopostinDomain, onPaikkamerkkiOsoite };
