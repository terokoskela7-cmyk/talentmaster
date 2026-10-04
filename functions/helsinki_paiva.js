'use strict';
/**
 * Europe/Helsinki-päivärajat palvelimella. Cloud Functions -ajoympäristön aikavyöhyke on UTC, joten
 * `new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, …)` on UTC-päivä (ei Helsingin).
 * Puhtaat funktiot, ei Firebase-riippuvuuksia.
 */
const AIKAVYOHYKE = 'Europe/Helsinki';

function _osat(ms) {
  const f = new Intl.DateTimeFormat('en-GB', {
    timeZone: AIKAVYOHYKE, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  });
  const o = {};
  f.formatToParts(new Date(ms)).forEach((p) => { if (p.type !== 'literal') o[p.type] = Number(p.value); });
  return o;
}

// Helsingin aikavyöhykkeen siirtymä UTC:hen nähden hetkellä ms (EET +2h / EEST +3h), millisekunteina.
function siirtyma(ms) {
  const o = _osat(ms);
  return Date.UTC(o.year, o.month - 1, o.day, o.hour, o.minute, o.second) - Math.floor(ms / 1000) * 1000;
}

// Helsingin keskiyö (00:00:00) annetulle kalenteripäivälle → UTC-hetki (ms).
function helsinginKeskiyo(vuosi, kk, pv) {
  const utcKeskiyo = Date.UTC(vuosi, kk - 1, pv);
  let t = utcKeskiyo - siirtyma(utcKeskiyo);
  t = utcKeskiyo - siirtyma(t);   // toinen kierros: siirtymä itse keskiyön hetkellä (DST-raja)
  return t;
}

/**
 * "Huominen" Helsingin ajassa → { alku, loppu } (Date): huomisen 00:00:00 … 23:59:59 Helsingin aikaa.
 * @param {Date} [nyt]
 */
function huomisenRajat(nyt) {
  const o = _osat((nyt || new Date()).getTime());
  const huomenna = new Date(Date.UTC(o.year, o.month - 1, o.day + 1));
  const ylihuomenna = new Date(Date.UTC(o.year, o.month - 1, o.day + 2));
  const alku = helsinginKeskiyo(huomenna.getUTCFullYear(), huomenna.getUTCMonth() + 1, huomenna.getUTCDate());
  const seur = helsinginKeskiyo(ylihuomenna.getUTCFullYear(), ylihuomenna.getUTCMonth() + 1, ylihuomenna.getUTCDate());
  return { alku: new Date(alku), loppu: new Date(seur - 1000) };
}

/** Kellonaika Helsingin aikaa muodossa 'HH:MM' (sama erotin kuin viesteissä aiemmin). Ajoympäristön TZ ei vaikuta. */
function kelloHelsinki(date) {
  const o = _osat(date.getTime());
  return String(o.hour).padStart(2, '0') + ':' + String(o.minute).padStart(2, '0');
}

function _ts(v) {   // Firestore Timestamp | Date | ISO-merkkijono | ms → Date | null
  if (v == null || v === '') return null;
  const d = (typeof v.toDate === 'function') ? v.toDate() : (v instanceof Date ? v : new Date(v));
  return (d && !isNaN(d.getTime())) ? d : null;
}

/** Helsingin päivän viimeinen millisekunti (23:59:59.999) hetkelle d. */
function paivanLoppuHelsinki(d) {
  const o = _osat(d.getTime());
  const huom = new Date(Date.UTC(o.year, o.month - 1, o.day + 1));
  return new Date(helsinginKeskiyo(huom.getUTCFullYear(), huom.getUTCMonth() + 1, huom.getUTCDate()) - 1);
}

/**
 * Onko tapahtumalla kellonaika? Ei: koko_paiva · alkaa Helsingin keskiyössä eikä (pidempää) päättymistä
 * (Master tallentaa tyhjän ajan 00:00:na). Peilaa clientin lib/tm_kalenteri_ilmoitus.js tmEvOnKellonaika (paikallinen = Helsinki).
 */
function onKellonaika(ev) {
  if (!ev || ev.koko_paiva === true) return false;
  const a = _ts(ev.alkaa); if (!a) return false;
  const p = _ts(ev.paattyy);
  const o = _osat(a.getTime());
  const keskiyo = a.getTime() === helsinginKeskiyo(o.year, o.month, o.day);
  if (keskiyo && (!p || p.getTime() <= a.getTime())) return false;
  return true;
}

/**
 * Tapahtuman päättymishetki (Date) | null. paattyy; kellonajaton → Helsingin päivän loppu (monipäiväisessä paattyy-päivän);
 * kellonaika mutta ei kelvollista päättymistä → alkuhetki. Vartijat vertaavat TÄHÄN, eivät alkuun (muuten koko päivän
 * tapahtuma ja kesken oleva katosivat ilmoituksista alkuhetkellä).
 */
function tapahtumaPaattyy(ev) {
  const a = _ts(ev && ev.alkaa); if (!a) return null;
  const p = _ts(ev.paattyy);
  const pidempi = (p && p.getTime() > a.getTime()) ? p : null;
  if (!onKellonaika(ev)) return paivanLoppuHelsinki(pidempi || a);
  return pidempi || a;
}

module.exports = { kelloHelsinki, huomisenRajat, helsinginKeskiyo, siirtyma, AIKAVYOHYKE, paivanLoppuHelsinki, onKellonaika, tapahtumaPaattyy };
