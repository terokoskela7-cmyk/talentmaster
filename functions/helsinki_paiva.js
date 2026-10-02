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

module.exports = { huomisenRajat, helsinginKeskiyo, siirtyma, AIKAVYOHYKE };
