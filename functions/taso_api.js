'use strict';
/**
 * TASO API (Palloliiton tulospalvelu, Torneopal) — YKSI paikka osoitteelle, haulle, kaudelle, hakuikkunalle ja kenttämuodolle. Käyttäjät: functions/index.js (vanha paivitaSeuranOttelut), functions/kalenteri_taso.js (K35-5),
 * scripts/yhdista_taso_joukkueet.js. Dokumentaatio: docs/integraatiot/TASO_API.md.
 *   · Osoite: https://spl.torneopal.net/taso/rest  (EI .fi)
 *   · Kausi: jalkapallon season_id = kalenterivuosi ("2026") — ei "2025-2026"
 *   · getMatches EI ota season_id:tä: haetaan team_id + start_date + end_date (tänään − 30 pv … tänään + 180 pv)
 *   · Ottelun kentät: match_id, date (YYYY-MM-DD), time (HH:MM[:SS], puuttuva/tyhjä = koko päivä), team_A_id/team_A_name (koti), team_B_id/team_B_name (vieras), venue_name, status
 *   · Perutuksi: Canceled, Suspended, Abandoned (PERUTTU_RE; Reschedule EI ole peruttu)
 */
const https = require('https');
const { helsinginHetki, helsinginVuosi } = require('./helsinki_paiva');

const TASO_BASE = 'https://spl.torneopal.net/taso/rest';
const HAKU_TAAKSE_PV = 30, HAKU_ETEEN_PV = 180;
const PERUTTU_RE = /cancel|postpon|abandon|suspend|peruttu|siirretty|walkover/i;   // Canceled | Suspended | Abandoned (+ suomi/muut); "Reschedule" ei täsmää

function tasoHae(endpoint, params, apiKey) {
  const qs = new URLSearchParams(Object.assign({ api_key: apiKey }, params)).toString(), url = TASO_BASE + '/' + endpoint + '?' + qs;
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = ''; res.on('data', (c) => { data += c; });
      res.on('end', () => { try { const p = JSON.parse(data); if (p.error) reject(new Error('TASO API virhe: ' + p.error)); else resolve(p); } catch (e) { reject(new Error('TASO vastaus ei ole JSON: ' + data.substring(0, 200))); } });
    }).on('error', reject);
  });
}

const _p2 = (n) => String(n).padStart(2, '0');
function _paivaHelsinki(ms) { const f = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Helsinki', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms)); return f; }   // 'YYYY-MM-DD'
function _siirraPaivia(iso, pv) { const [y, m, d] = iso.split('-').map(Number), u = new Date(Date.UTC(y, m - 1, d + pv)); return u.getUTCFullYear() + '-' + _p2(u.getUTCMonth() + 1) + '-' + _p2(u.getUTCDate()); }
/** Kausi = Helsingin kalenterivuosi merkkijonona ("2026"). */
function kausiTunniste(nyt) { return String(helsinginVuosi(nyt == null ? Date.now() : +nyt)); }
/** Hakuikkuna getMatches:lle: { start_date, end_date (YYYY-MM-DD), alkuMs (start 00:00 Helsinki), loppuMs (end 23:59:59.999) }. nyt = ms. */
function hakuIkkuna(nyt) {
  const t = _paivaHelsinki(nyt == null ? Date.now() : +nyt), start = _siirraPaivia(t, -HAKU_TAAKSE_PV), end = _siirraPaivia(t, HAKU_ETEEN_PV), p = (s) => s.split('-').map(Number);
  return { start_date: start, end_date: end, alkuMs: helsinginHetki(...p(start), 0, 0), loppuMs: helsinginHetki(...p(end), 23, 59) + 59999 };
}
/** Raaka TASO-ottelu → { id, pvm, kello|null, koti:{id,nimi}, vieras:{id,nimi}, paikka, status } | null (ei match_id:tä tai kelvollista date-kenttää). */
function otteluKentat(o) {
  if (!o || o.match_id == null || o.match_id === '') return null;
  const pvm = /^(\d{4}-\d{2}-\d{2})/.exec(String(o.date || '')); if (!pvm) return null;
  const k = /^(\d{1,2}):(\d{2})/.exec(String(o.time == null ? '' : o.time).trim());
  return { id: String(o.match_id), pvm: pvm[1], kello: k ? _p2(+k[1]) + ':' + k[2] : null, koti: { id: o.team_A_id != null ? String(o.team_A_id) : '', nimi: o.team_A_name || '' }, vieras: { id: o.team_B_id != null ? String(o.team_B_id) : '', nimi: o.team_B_name || '' }, paikka: o.venue_name || null, status: String(o.status || '') };
}
module.exports = { TASO_BASE, HAKU_TAAKSE_PV, HAKU_ETEEN_PV, PERUTTU_RE, tasoHae, kausiTunniste, hakuIkkuna, otteluKentat };
