'use strict';
/**
 * Sähköpostipohjien turvallisuus: HTML-escape, otsikon puhdistus, kutsulinkin validointi.
 * Puhtaat funktiot (ei Firebase-riippuvuuksia) → testattavissa offline.
 */

// & < > " ' → entiteetit. Käytä KAIKKIIN interpoloituihin arvoihin, myös href-attribuutteihin.
function esc(arvo) {
  if (arvo === null || arvo === undefined) return '';
  return String(arvo)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// subject / fromName: ei rivinvaihtoja (header-injektio), pituusraja.
function otsikkoPuhdas(arvo, maxPituus) {
  return String(arvo === null || arvo === undefined ? '' : arvo)
    .replace(/[\r\n\u2028\u2029]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxPituus || 120);
}

const KUTSU_SIVU = 'TalentMaster_Rekisterointi_Suostumus.html';
// Ainoat parametrit, jotka suostumussivu lukee ja Seura-sivu lähettää (#714: suostumusAnnettu).
const KUTSU_PARAMETRIT = ['seuraId', 'seura', 'joukkue', 'etunimi', 'sukunimi', 'hEmail',
  'palloid', 'sporttiid', 'pelaajaId', 'suostumusAnnettu', 'kutsuId'];
const KUTSU_ARVO_MAX = 200;

// Hyväksytty origin: oma tuotanto-origin, Firebase Hosting -domainit, vanha Pages (cutover-aika).
function sallittuOrigin(u, baseUrl) {
  let baseOrigin = null;
  try { baseOrigin = new URL(baseUrl).origin; } catch (e) { /* ohita */ }
  if (u.protocol !== 'https:') return false;
  if (u.origin === baseOrigin) return true;
  return /^(?:[a-z0-9-]+\.)(?:web\.app|firebaseapp\.com)$/i.test(u.hostname)
    || u.hostname === 'terokoskela7-cmyk.github.io';
}

/**
 * Selaimen antama kutsulinkki → palvelimen rakentama linkki (baseUrl + sivu + sallitut parametrit).
 * Heittää Erroria (viesti 'linkki_hylatty') jos linkki ei ole hyväksytyllä originilla / sivulla.
 */
function rakennaKutsuLinkki(raaka, baseUrl) {
  let u;
  try { u = new URL(String(raaka)); } catch (e) { throw new Error('linkki_hylatty'); }
  if (!sallittuOrigin(u, baseUrl)) throw new Error('linkki_hylatty');
  if (!u.pathname.endsWith('/' + KUTSU_SIVU)) throw new Error('linkki_hylatty');
  const out = new URLSearchParams();
  for (const avain of KUTSU_PARAMETRIT) {
    const v = u.searchParams.get(avain);
    if (v !== null && v !== '') out.set(avain, v.slice(0, KUTSU_ARVO_MAX));
  }
  return String(baseUrl).replace(/\/+$/, '') + '/' + KUTSU_SIVU + (out.toString() ? '?' + out.toString() : '');
}

module.exports = { esc, otsikkoPuhdas, rakennaKutsuLinkki, KUTSU_PARAMETRIT };
