'use strict';
/**
 * K35-5 · TASO-ottelut kalenteriin (docs/CODE_BRIEF_35_KALENTERI.md; D181). Ajastettu synkka `kalenteriTasoSynkka` (europe-west1, Helsingin aika) + callable tasoHaeSeuranOttelut ajaa saman synkan.
 *
 * KOHDE: seurat/{sid}/kalenteri/taso_<match_id> — `tyyppi:'ottelu'`, `lahde:'taso'`, `lahde_id:'taso_<match_id>'`. Dokumenttitunniste on deterministinen → DEDUP (sama ottelu kahdelta joukkueelta / toistuva ajo = yksi dokumentti).
 * JOUKKUEYHDISTYS: seurat/{sid}/konfiguraatio/kalenterilahteet.taso.joukkueet = { <TASO team_id>: <joukkueen doc-id> }. Yhdistämättömiä joukkueita EI tuoda (kartta puuttuu/tyhjä → seuraa ei synkata).
 * D181 (lähteen omistajuus): luonnissa kirjoitetaan koko dokumentti; päivityksessä VAIN LAHTEEN_KENTAT (alkaa, paattyy, koko_paiva, paikka, paikka_id, tila) ja vain jos arvo muuttui → TM:n omat kentät (teema, md, muistiinpanot, pelaajaviesti, logistiikka, kokoonpano …) EI ylikirjoiteta.
 *   Lähde omistaa vain perumisen: tila → 'peruttu' kun TASO ilmoittaa perutuksi/siirretyksi TAI ottelu poistuu lähteestä (vain tulevat); ei poistoa (soft-delete jää TM:lle). Peruttu ottelu palautuu, jos TASO palauttaa sen.
 * ILMOITUKSET: muutos (alkaa/paikka/tila) laukaisee nykyisen notifKalenteriMuutos-triggerin (kalenteri_notif.muutosPaatos: tila 'peruttu' = peruutusilmoitus). Ei uutta ilmoituspolkua.
 * Ottelun kesto: TASO ei anna päättymisaikaa → oletus 90 min (KESTO_MIN). Aika Helsingin paikallisaikaa ('YYYY-MM-DD HH:MM[:SS]').
 */
const { helsinginHetki } = require('./helsinki_paiva');

const LAHTEEN_KENTAT = ['alkaa', 'paattyy', 'koko_paiva', 'paikka', 'paikka_id', 'tila'];   // peili lib/tm_kalenteri_malli.js LAHTEEN_KENTAT (vartija: tests k35_5)
const KESTO_MIN = 90, SYNKKA_KAYTTAJA = 'taso_synkka';
const PERUTTU_RE = /cancel|postpon|abandon|suspend|peruttu|siirretty|walkover/i;

function _aika(matchTime) {   // 'YYYY-MM-DD HH:MM[:SS]' | 'YYYY-MM-DDTHH:MM' → ms (Helsinki) | null
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(String(matchTime || '')); if (!m) return null;
  return helsinginHetki(+m[1], +m[2], +m[3], +m[4], +m[5]);
}
function _id(o) { return o && o.match_id != null && o.match_id !== '' ? String(o.match_id) : null; }

/* TASO-ottelu → { id, lahde (lähteen kentät: alkaa/paattyy ms + paikka + tila), omat (joukkue-id:t), vastustaja, nimi } | null (ei id/aikaa tai ei yhdistettyä joukkuetta). kartta: { tasoTeamId: joukkueDocId }; nimet: { joukkueDocId: nimi }. */
function tasoOttelu(o, kartta, nimet) {
  const id = _id(o), a = _aika(o && o.match_time); if (!id || a == null) return null;
  const koti = o.home_team_id != null ? String(o.home_team_id) : '', vieras = o.away_team_id != null ? String(o.away_team_id) : '', tiimit = [koti, vieras, o._taso_team_id != null ? String(o._taso_team_id) : ''].filter(Boolean);
  const omat = []; tiimit.forEach((t) => { const j = kartta && kartta[t]; if (j && omat.indexOf(String(j)) < 0) omat.push(String(j)); });
  if (!omat.length) return null;   // yhdistämätön joukkue → ei tuoda
  const kotiNimi = o.home_team_name || '', vierasNimi = o.away_team_name || '', omaKoti = !!(kartta && kartta[koti]), omaVieras = !!(kartta && kartta[vieras]);
  const vastustaja = omaKoti && !omaVieras ? vierasNimi : (omaVieras && !omaKoti ? kotiNimi : '');
  return { id: 'taso_' + id, matchId: id, omat, nimet: omat.map((j) => (nimet && nimet[j]) || j), vastustaja, nimi: (kotiNimi || vierasNimi) ? kotiNimi + ' – ' + vierasNimi : 'Ottelu',
    lahde: { alkaa: a, paattyy: a + KESTO_MIN * 60000, koko_paiva: false, paikka: o.venue_name || null, paikka_id: null, tila: PERUTTU_RE.test(String(o.status || o.match_status || '')) ? 'peruttu' : 'suunniteltu' } };
}

function _ms(x) { if (x == null) return null; if (typeof x === 'number') return x; if (typeof x.toMillis === 'function') return x.toMillis(); if (x instanceof Date) return x.getTime(); return null; }
function _sama(a, b) { const x = _ms(a), y = _ms(b); if (x != null || y != null) return x === y; return (a == null ? null : a) === (b == null ? null : b); }

/* Muuttuneet lähdekentät (D181): vain LAHTEEN_KENTAT; tila vain 'peruttu' ↔ 'suunniteltu' (lähde omistaa perumisen ja sen palautuksen; muita tiloja ei kosketa). Arvot: alkaa/paattyy ms. */
function lahdePaivitys(nykyinen, lahde) {
  const p = {};
  LAHTEEN_KENTAT.forEach((k) => {
    if (!Object.prototype.hasOwnProperty.call(lahde, k)) return;
    if (k === 'tila') { const nyt = nykyinen && nykyinen.tila, uusi = lahde.tila; if (uusi === 'peruttu' && nyt !== 'peruttu') p.tila = 'peruttu'; else if (uusi === 'suunniteltu' && nyt === 'peruttu') p.tila = 'suunniteltu'; return; }
    if (!nykyinen || !_sama(nykyinen[k], lahde[k])) p[k] = lahde[k];
  });
  return p;
}

/* Synkkasuunnitelma. ottelut = TASO-ottelut (raaka), olemassa = { docId: data } (lahde == 'taso'), kartta/nimet, nyt (ms). → { luo:[{id, ottelu}], paivita:[{id, kentat}], peru:[{id}], ohitettu:n } */
function suunnitteleSynkka(ottelut, olemassa, kartta, nimet, nyt) {
  const tulos = { luo: [], paivita: [], peru: [], ohitettu: 0 }, nahty = new Map();
  (ottelut || []).forEach((o) => {
    const t = tasoOttelu(o, kartta, nimet); if (!t) { tulos.ohitettu++; return; }
    const ed = nahty.get(t.id);
    if (ed) { t.omat.forEach((j) => { if (ed.omat.indexOf(j) < 0) { ed.omat.push(j); ed.nimet.push((nimet && nimet[j]) || j); } }); if (!ed.vastustaja && t.vastustaja) ed.vastustaja = t.vastustaja; return; }   // DEDUP: sama ottelu usealta joukkueelta → yksi dokumentti, kaikki omat joukkueet
    nahty.set(t.id, t);
  });
  nahty.forEach((t, id) => {
    const ol = olemassa && olemassa[id];
    if (!ol) { tulos.luo.push({ id, ottelu: t }); return; }
    const k = lahdePaivitys(ol, t.lahde); if (Object.keys(k).length) tulos.paivita.push({ id, kentat: k });
  });
  Object.keys(olemassa || {}).forEach((id) => {   // poistui lähteestä → peruttu (vain tulevat, ei jo peruttuja)
    if (nahty.has(id)) return; const ol = olemassa[id] || {}, a = _ms(ol.alkaa);
    if (ol.lahde === 'taso' && ol.tila !== 'peruttu' && ol.poistettu !== true && a != null && a > nyt) tulos.peru.push({ id });
  });
  return tulos;
}

function uusiDokumentti(t, fv, ts) {   // luonti: koko dokumentti (TM:n kentät oletusarvoilla; ei muistiinpanot-kenttää — Rules)
  const l = t.lahde;
  return { nimi: t.nimi, tyyppi: 'ottelu', alkaa: ts.fromMillis(l.alkaa), paattyy: ts.fromMillis(l.paattyy), koko_paiva: false, joukkue: t.omat[0], joukkue_nimi: t.nimet[0], joukkueet: t.omat.slice(), kohde: { tyyppi: 'joukkue' }, nakyvyys: 'kaikki',
    osallistujat_uid: [], pelaajat_id: [], paikka: l.paikka, paikka_id: null, vastustaja: t.vastustaja || '', testitapahtuma_id: null, myclub_event_id: null, taso_ottelu_id: t.matchId, toistuvuus: null, toistuvuus_sarja_id: null,
    luoja_uid: SYNKKA_KAYTTAJA, luotu: fv.serverTimestamp(), paivitetty: fv.serverTimestamp(), muokkaaja_uid: null, tila: l.tila, poistettu: false, poistettu_uid: null, poistettu_pvm: null,
    pelaajaviesti: null, lahde: 'taso', lahde_id: t.id, viimeisin_synkka: fv.serverTimestamp(), mentoroitava_uid: null, mentoroitava_nimi: null };
}

/* Yhden seuran synkka. deps: { db, FieldValue, Timestamp }. ottelut haettu jo (TASO). → { luotu, paivitetty, peruttu, ohitettu } */
async function synkkaaSeura(deps, seuraId, ottelut, nyt) {
  const { db, FieldValue, Timestamp } = deps, seura = db.collection('seurat').doc(seuraId);
  const cfg = await seura.collection('konfiguraatio').doc('kalenterilahteet').get(), taso = (cfg.exists && (cfg.data() || {}).taso) || {}, kartta = taso.joukkueet && typeof taso.joukkueet === 'object' ? taso.joukkueet : {};
  if (!Object.keys(kartta).length) return { luotu: 0, paivitetty: 0, peruttu: 0, ohitettu: (ottelut || []).length, ei_karttaa: true };
  const jSnap = await seura.collection('joukkueet').get(), nimet = {}; jSnap.forEach((d) => { nimet[d.id] = (d.data() || {}).nimi || d.id; });
  const kal = seura.collection('kalenteri'), snap = await kal.where('lahde', '==', 'taso').get(), olemassa = {}; snap.forEach((d) => { olemassa[d.id] = d.data() || {}; });
  const s = suunnitteleSynkka(ottelut, olemassa, kartta, nimet, nyt), ops = [];
  s.luo.forEach((x) => ops.push([kal.doc(x.id), 'set', uusiDokumentti(x.ottelu, FieldValue, Timestamp)]));
  s.paivita.forEach((x) => { const d = {}; Object.keys(x.kentat).forEach((k) => { d[k] = (k === 'alkaa' || k === 'paattyy') ? Timestamp.fromMillis(x.kentat[k]) : x.kentat[k]; }); d.viimeisin_synkka = FieldValue.serverTimestamp(); d.paivitetty = FieldValue.serverTimestamp(); d.muokkaaja_uid = SYNKKA_KAYTTAJA; ops.push([kal.doc(x.id), 'update', d]); });
  s.peru.forEach((x) => ops.push([kal.doc(x.id), 'update', { tila: 'peruttu', viimeisin_synkka: FieldValue.serverTimestamp(), paivitetty: FieldValue.serverTimestamp(), muokkaaja_uid: SYNKKA_KAYTTAJA }]));
  for (let i = 0; i < ops.length; i += 400) { const b = db.batch(); ops.slice(i, i + 400).forEach(([ref, op, d]) => (op === 'set' ? b.set(ref, d) : b.update(ref, d))); await b.commit(); }
  return { luotu: s.luo.length, paivitetty: s.paivita.length, peruttu: s.peru.length, ohitettu: s.ohitettu };
}

/* TASO-haku (sama reitti kuin paivitaSeuranOttelut: getClub → joukkueittain getMatches); jokaiseen otteluun liitetään _taso_team_id. tasoHae(endpoint, params, apiKey) injektoidaan. */
async function haeOttelut(tasoHae, apiKey, clubId, kausi, kartta) {
  let ottelut = [];
  const tiimit = Object.keys(kartta || {});
  for (const teamId of tiimit) {   // vain yhdistetyt joukkueet haetaan (ei koko seuran kaikkia sarjoja)
    try { const r = await tasoHae('getMatches', { team_id: teamId, season_id: kausi }, apiKey); ottelut = ottelut.concat((r.matches || []).map((o) => Object.assign({}, o, { _taso_team_id: teamId }))); await new Promise((res) => setTimeout(res, 150)); }
    catch (e) { console.warn('[TASO kalenteri] joukkue ' + teamId + ' epäonnistui:', e.message); throw e; }   // virhe → koko ajo keskeytyy (ei peruta otteluita puutteellisesta hausta)
  }
  return ottelut;
}
function kausiTunniste(nyt) { const d = nyt || new Date(), v = d.getFullYear(); return d.getMonth() < 7 ? (v - 1) + '-' + v : v + '-' + (v + 1); }

async function ajaSeura(deps, seuraId, nyt) {   // lukee seura-dokin avaimet + kartan, hakee, synkkaa; palauttaa tuloksen tai null (ei avaimia/karttaa)
  const { db, tasoHae } = deps, sd = await db.collection('seurat').doc(seuraId).get(), s = sd.data() || {}, avain = deps.tasoAvain ? await deps.tasoAvain(db, seuraId, s) : s.taso_api_key;   // deps.tasoAvain = server-only avain (salaiset/integraatiot; turvallisuus-PR)
  if (!avain || !s.taso_club_id) return null;
  const cfg = await db.collection('seurat').doc(seuraId).collection('konfiguraatio').doc('kalenterilahteet').get(), kartta = (cfg.exists && ((cfg.data() || {}).taso || {}).joukkueet) || {};
  if (!Object.keys(kartta).length) return null;
  const ottelut = await haeOttelut(tasoHae, avain, s.taso_club_id, kausiTunniste(new Date(nyt)), kartta);
  return synkkaaSeura(deps, seuraId, ottelut, nyt);
}

/* Trigger-tehdas (index.js injektoi): ajastettu synkka joka 3. tunti (Helsinki). Yhden seuran virhe ei kaada muita. */
function luo(deps) {
  const { functions, db } = deps;
  const kalenteriTasoSynkka = functions.region('europe-west1').pubsub.schedule('15 */3 * * *').timeZone('Europe/Helsinki').onRun(async () => {
    const seurat = await db.collection('seurat').where('taso_club_id', '!=', '').get().catch(() => ({ docs: [] }));
    for (const s of seurat.docs) { try { const r = await ajaSeura(deps, s.id, Date.now()); if (r) console.log('[kalenteriTasoSynkka] ' + s.id, JSON.stringify(r)); } catch (e) { console.error('[kalenteriTasoSynkka] ' + s.id + ':', e.message); } }
    return null;
  });
  return { kalenteriTasoSynkka };
}
module.exports = { LAHTEEN_KENTAT, KESTO_MIN, tasoOttelu, lahdePaivitys, suunnitteleSynkka, uusiDokumentti, synkkaaSeura, haeOttelut, kausiTunniste, ajaSeura, luo };
