/* migraatio_selitys.js — migraatioskriptien yhteinen --selita-apuri (lukeva; ei firebase-adminia, ei kirjoituksia).
 * Selitysrivi kertoo, MIKSI skripti kopioisi: seura + kenttä-/lehtipolku + syy + arvon tyyppi kummassakin lähteessä. Ei arvoja, ei pelaaja-id:itä; id-näköiset map-avaimet peitetään.
 * Käyttäjät: migroi_sisainen_henkilokunta.js · migroi_sisainen_s4.js · migroi_sisainen_jaksofokus.js · migroi_idp_pelaaja.js
 */
'use strict';

/* Arvon tyyppi (ei arvoa): puuttuu · null · Timestamp · kenttäoperaatio (sentinel) · taulukko · tyhjä map · map · typeof. */
const tyyppi = (v) => {
  if (v === undefined) return 'puuttuu'; if (v === null) return 'null'; if (Array.isArray(v)) return v.length ? 'taulukko' : 'tyhjä taulukko';
  if (typeof v === 'object') {
    const n = (v.constructor && v.constructor.name) || '';
    if (typeof v.toDate === 'function' || n === 'Timestamp') return 'Timestamp'; if (/Field.?Value|Transform|Sentinel/.test(n) || (typeof v.isEqual === 'function' && !Object.keys(v).length)) return 'kenttäoperaatio(' + n + ')';   // serverTimestamp/increment/poisto-sentinel
    if (n && n !== 'Object') return n; return Object.keys(v).length ? 'map' : 'tyhjä map';
  }
  return typeof v;
};
const turvaAvain = (k) => (/^[A-Za-z0-9_-]{16,}$/.test(k) && /\d/.test(k)) ? '<id>' : k;   // id-näköiset map-avaimet (uid tms.) peitetään

const kanon = (x) => JSON.stringify(x, (k, v) => (v && typeof v === 'object' && !Array.isArray(v)) ? Object.keys(v).sort().reduce((o, a) => { o[a] = v[a]; return o; }, {}) : v);
const onKartta = (x) => !!x && typeof x === 'object' && !Array.isArray(x) && tyyppi(x) !== 'Timestamp';

/* Koko arvon korvauksen selitys (esim. idp tavoitteet-taulukko): eroavat lehtipolut tyyppeineen. → [{ polku, a, b }] (enintään max) */
function erot(a, b, polku, out, max) {
  out = out || []; max = max || 20; if (out.length >= max) return out;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) out.push({ polku: polku + '.length', a: 'taulukko(' + a.length + ')', b: 'taulukko(' + b.length + ')' });
    for (let i = 0; i < Math.min(a.length, b.length) && out.length < max; i++) erot(a[i], b[i], polku + '[' + i + ']', out, max);
  } else if (onKartta(a) && onKartta(b)) {
    Array.from(new Set(Object.keys(a).concat(Object.keys(b)))).sort().forEach((k) => { if (out.length < max) erot(a[k], b[k], polku + '.' + turvaAvain(k), out, max); });
  } else if (kanon(a) !== kanon(b)) out.push({ polku, a: tyyppi(a), b: tyyppi(b) });
  return out;
}

/* Yksi selitysrivi — sama muoto kaikissa skripteissä. nimiA/nimiB = lähteiden nimet (esim. 'pelaajadokumentissa' / 'sisainen'). */
const rivi = (sid, x, nimiA, nimiB) => '  [' + sid + '] SELITYS ' + x.polku + ' · ' + x.syy + ' · tyyppi ' + nimiA + ': ' + x.a + ' · ' + nimiB + ': ' + x.b;

module.exports = { tyyppi, turvaAvain, erot, rivi };
