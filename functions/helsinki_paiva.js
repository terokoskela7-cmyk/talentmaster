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


// Helsingin kellonaika (v, kk 1–12, pv, h, min) → UTC-hetki (ms). Kaksi kierrosta kuten helsinginKeskiyo (DST-raja: su 25.10.2026 klo 04 kello siirtyy taaksepäin → "keskiyö + 21 h" olisi väärin).
function helsinginHetki(vuosi, kk, pv, h, min) {
  const utc = Date.UTC(vuosi, kk - 1, pv, h || 0, min || 0);
  let t = utc - siirtyma(utc);
  t = utc - siirtyma(t);
  return t;
}

const PAIVA_MS = 86400000;
const _p2 = (n) => String(n).padStart(2, '0');
const _iso = (d) => d.getUTCFullYear() + '-' + _p2(d.getUTCMonth() + 1) + '-' + _p2(d.getUTCDate());

/**
 * ISO-viikko Helsingin ajassa (ma–su) hetkelle ms. Tunniste 'vvvv-Www' (ISO-viikkovuosi).
 * Palauttaa { vuosi, vk, tunniste, maanantaiIso, sunnuntaiIso, alkuMs (ma 00:00 Helsinki), loppuMs (seuraava ma 00:00), su21Ms (su klo 21:00 Helsinki) }.
 */
function viikonRajat(ms) {
  const o = _osat(ms);
  const pv = new Date(Date.UTC(o.year, o.month - 1, o.day));
  const dow = (pv.getUTCDay() + 6) % 7;   // ma = 0
  const ma = new Date(pv.getTime() - dow * PAIVA_MS), su = new Date(ma.getTime() + 6 * PAIVA_MS), seurMa = new Date(ma.getTime() + 7 * PAIVA_MS);
  const to = new Date(ma.getTime() + 3 * PAIVA_MS);   // viikon torstai määrää ISO-vuoden
  const isoVuosi = to.getUTCFullYear();
  const tammi4 = new Date(Date.UTC(isoVuosi, 0, 4)), tammi4dow = (tammi4.getUTCDay() + 6) % 7;
  const vk1To = new Date(tammi4.getTime() - tammi4dow * PAIVA_MS + 3 * PAIVA_MS);
  const vk = Math.round((to.getTime() - vk1To.getTime()) / (7 * PAIVA_MS)) + 1;
  return {
    vuosi: isoVuosi, vk, tunniste: isoVuosi + '-W' + _p2(vk), maanantaiIso: _iso(ma), sunnuntaiIso: _iso(su),
    alkuMs: helsinginKeskiyo(ma.getUTCFullYear(), ma.getUTCMonth() + 1, ma.getUTCDate()),
    loppuMs: helsinginKeskiyo(seurMa.getUTCFullYear(), seurMa.getUTCMonth() + 1, seurMa.getUTCDate()),
    su21Ms: helsinginHetki(su.getUTCFullYear(), su.getUTCMonth() + 1, su.getUTCDate(), 21, 0),
  };
}

/** Helsingin kalenterivuosi hetkelle ms (ikälaskenta). */
function helsinginVuosi(ms) { return _osat(ms).year; }

/** Viikkotunniste 'vvvv-Www' → viikonRajat (null jos virheellinen). */
function viikkoTunnisteesta(tunniste) {
  const m = /^(\d{4})-W(\d{2})$/.exec(String(tunniste || '')); if (!m) return null;
  const tammi4 = new Date(Date.UTC(+m[1], 0, 4)), dow = (tammi4.getUTCDay() + 6) % 7;
  const ma1 = tammi4.getTime() - dow * PAIVA_MS;
  const torstai = ma1 + ((+m[2] - 1) * 7 + 3) * PAIVA_MS;
  const r = viikonRajat(helsinginHetki(new Date(torstai).getUTCFullYear(), new Date(torstai).getUTCMonth() + 1, new Date(torstai).getUTCDate(), 12, 0));
  return r.tunniste === tunniste ? r : null;
}

module.exports = { helsinginVuosi, helsinginHetki, viikonRajat, viikkoTunnisteesta, kelloHelsinki, huomisenRajat, helsinginKeskiyo, siirtyma, AIKAVYOHYKE, paivanLoppuHelsinki, onKellonaika, tapahtumaPaattyy };
