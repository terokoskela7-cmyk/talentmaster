'use strict';
/**
 * K35-5 · TASO-ottelut kalenteriin (docs/CODE_BRIEF_35_KALENTERI.md; D181). Ajastettu synkka `kalenteriTasoSynkka` (europe-west1, Helsingin aika) + callable tasoHaeSeuranOttelut ajaa saman synkan.
 *
 * KOHDE: seurat/{sid}/kalenteri/taso_<match_id> — `tyyppi:'ottelu'`, `lahde:'taso'`, `lahde_id:'taso_<match_id>'`. Dokumenttitunniste on deterministinen → DEDUP (sama ottelu kahdelta joukkueelta / toistuva ajo = yksi dokumentti).
 * JOUKKUEYHDISTYS: seurat/{sid}/konfiguraatio/kalenterilahteet.taso.joukkueet = { <TASO team_id>: <joukkueen doc-id> }. Yhdistämättömiä joukkueita EI tuoda (kartta puuttuu/tyhjä → seuraa ei synkata).
 * D181 (lähteen omistajuus): luonnissa kirjoitetaan koko dokumentti; päivityksessä VAIN LAHTEEN_KENTAT (alkaa, paattyy, koko_paiva, paikka, paikka_id, tila) ja vain jos arvo muuttui → TM:n omat kentät (teema, md, muistiinpanot, pelaajaviesti, logistiikka, kokoonpano …) EI ylikirjoiteta.
 *   Lähde omistaa vain perumisen: tila → 'peruttu' kun TASO ilmoittaa perutuksi/siirretyksi TAI ottelu poistuu lähteestä (vain tulevat); ei poistoa (soft-delete jää TM:lle). Peruttu ottelu palautuu, jos TASO palauttaa sen.
 * ILMOITUKSET: muutos (alkaa/paikka/tila) laukaisee nykyisen notifKalenteriMuutos-triggerin (kalenteri_notif.muutosPaatos: tila 'peruttu' = peruutusilmoitus). Ei uutta ilmoituspolkua.
 * Ottelun kesto: TASO ei anna päättymisaikaa → oletus 90 min (KESTO_MIN); aika Helsingin paikallisaikaa (date + time). time puuttuu → koko päivä.
 * Haku (docs/integraatiot/TASO_API.md): getMatches(team_id, start_date = tänään − 30 pv, end_date = tänään + 180 pv), kausi = kalenterivuosi. Perutuksi merkitään vain TÄMÄN IKKUNAN tulevat ottelut jotka puuttuvat vastauksesta.
 */
const { helsinginHetki } = require('./helsinki_paiva');
const TASO = require('./taso_api');

const LAHTEEN_KENTAT = ['alkaa', 'paattyy', 'koko_paiva', 'paikka', 'paikka_id', 'tila'];   // peili lib/tm_kalenteri_malli.js LAHTEEN_KENTAT (vartija: tests k35_5)
const KESTO_MIN = 90, SYNKKA_KAYTTAJA = 'taso_synkka';

/* TASO-ottelu → { id, lahde (lähteen kentät: alkaa/paattyy ms + koko_paiva + paikka + tila), omat (joukkue-id:t), vastustaja, nimi } | null (ei id/päivää tai ei yhdistettyä joukkuetta).
   Kentät TASO-dokumentaation mukaan (taso_api.otteluKentat): date + time, team_A (koti) / team_B (vieras). time puuttuu/tyhjä → KOKO PÄIVÄ. kartta: { tasoTeamId: joukkueDocId }; nimet: { joukkueDocId: nimi }. */
function tasoOttelu(o, kartta, nimet) {
  const k = TASO.otteluKentat(o); if (!k) return null;
  const tiimit = [k.koti.id, k.vieras.id, o._taso_team_id != null ? String(o._taso_team_id) : ''].filter(Boolean), omat = [];
  tiimit.forEach((t) => { const j = kartta && kartta[t]; if (j && omat.indexOf(String(j)) < 0) omat.push(String(j)); });
  if (!omat.length) return null;   // yhdistämätön joukkue → ei tuoda
  const [y, m, d] = k.pvm.split('-').map(Number), kokoPaiva = !k.kello, a = kokoPaiva ? helsinginHetki(y, m, d, 0, 0) : helsinginHetki(y, m, d, +k.kello.slice(0, 2), +k.kello.slice(3, 5)), p = kokoPaiva ? helsinginHetki(y, m, d, 23, 59) : a + KESTO_MIN * 60000;
  const omaKoti = !!(kartta && kartta[k.koti.id]), omaVieras = !!(kartta && kartta[k.vieras.id]), vastustaja = omaKoti && !omaVieras ? k.vieras.nimi : (omaVieras && !omaKoti ? k.koti.nimi : '');
  return { id: 'taso_' + k.id, matchId: k.id, omat, nimet: omat.map((j) => (nimet && nimet[j]) || j), vastustaja, nimi: (k.koti.nimi || k.vieras.nimi) ? k.koti.nimi + ' – ' + k.vieras.nimi : 'Ottelu',
    lahde: { alkaa: a, paattyy: p, koko_paiva: kokoPaiva, paikka: k.paikka, paikka_id: null, tila: TASO.PERUTTU_RE.test(k.status) ? 'peruttu' : 'suunniteltu' } };
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

/* Synkkasuunnitelma. ottelut = TASO-ottelut (raaka), olemassa = { docId: data } (lahde == 'taso'), kartta/nimet, nyt (ms), ikkuna ({ loppuMs } hakuikkuna; perutus vain sen sisällä). → { luo:[{id, ottelu}], paivita:[{id, kentat}], peru:[{id}], ohitettu:n } */
function suunnitteleSynkka(ottelut, olemassa, kartta, nimet, nyt, ikkuna) {
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
    if (ol.lahde === 'taso' && ol.tila !== 'peruttu' && ol.poistettu !== true && a != null && a > nyt && (!ikkuna || a <= ikkuna.loppuMs)) tulos.peru.push({ id });   // vain hakuikkunan tulevat ottelut: ikkunan ulkopuolista ei voi päätellä puuttuvaksi
  });
  return tulos;
}

function uusiDokumentti(t, fv, ts) {   // luonti: koko dokumentti (TM:n kentät oletusarvoilla; ei muistiinpanot-kenttää — Rules)
  const l = t.lahde;
  return { nimi: t.nimi, tyyppi: 'ottelu', alkaa: ts.fromMillis(l.alkaa), paattyy: ts.fromMillis(l.paattyy), koko_paiva: !!l.koko_paiva, joukkue: t.omat[0], joukkue_nimi: t.nimet[0], joukkueet: t.omat.slice(), kohde: { tyyppi: 'joukkue' }, nakyvyys: 'kaikki',
    osallistujat_uid: [], pelaajat_id: [], paikka: l.paikka, paikka_id: null, vastustaja: t.vastustaja || '', testitapahtuma_id: null, myclub_event_id: null, taso_ottelu_id: t.matchId, toistuvuus: null, toistuvuus_sarja_id: null,
    luoja_uid: SYNKKA_KAYTTAJA, luotu: fv.serverTimestamp(), paivitetty: fv.serverTimestamp(), muokkaaja_uid: null, tila: l.tila, poistettu: false, poistettu_uid: null, poistettu_pvm: null,
    pelaajaviesti: null, lahde: 'taso', lahde_id: t.id, viimeisin_synkka: fv.serverTimestamp(), mentoroitava_uid: null, mentoroitava_nimi: null };
}

/* Yhden seuran synkka. deps: { db, FieldValue, Timestamp }. ottelut haettu jo (TASO). → { luotu, paivitetty, peruttu, ohitettu } */
async function synkkaaSeura(deps, seuraId, ottelut, nyt, ikkuna) {
  const { db, FieldValue, Timestamp } = deps, seura = db.collection('seurat').doc(seuraId);
  const cfg = await seura.collection('konfiguraatio').doc('kalenterilahteet').get(), taso = (cfg.exists && (cfg.data() || {}).taso) || {}, kartta = taso.joukkueet && typeof taso.joukkueet === 'object' ? taso.joukkueet : {};
  if (!Object.keys(kartta).length) return { luotu: 0, paivitetty: 0, peruttu: 0, ohitettu: (ottelut || []).length, ei_karttaa: true };
  const jSnap = await seura.collection('joukkueet').get(), nimet = {}; jSnap.forEach((d) => { nimet[d.id] = (d.data() || {}).nimi || d.id; });
  const kal = seura.collection('kalenteri'), snap = await kal.where('lahde', '==', 'taso').get(), olemassa = {}; snap.forEach((d) => { olemassa[d.id] = d.data() || {}; });
  const s = suunnitteleSynkka(ottelut, olemassa, kartta, nimet, nyt, ikkuna), ops = [];
  s.luo.forEach((x) => ops.push([kal.doc(x.id), 'set', uusiDokumentti(x.ottelu, FieldValue, Timestamp)]));
  s.paivita.forEach((x) => { const d = {}; Object.keys(x.kentat).forEach((k) => { d[k] = (k === 'alkaa' || k === 'paattyy') ? Timestamp.fromMillis(x.kentat[k]) : x.kentat[k]; }); d.viimeisin_synkka = FieldValue.serverTimestamp(); d.paivitetty = FieldValue.serverTimestamp(); d.muokkaaja_uid = SYNKKA_KAYTTAJA; ops.push([kal.doc(x.id), 'update', d]); });
  s.peru.forEach((x) => ops.push([kal.doc(x.id), 'update', { tila: 'peruttu', viimeisin_synkka: FieldValue.serverTimestamp(), paivitetty: FieldValue.serverTimestamp(), muokkaaja_uid: SYNKKA_KAYTTAJA }]));
  for (let i = 0; i < ops.length; i += 400) { const b = db.batch(); ops.slice(i, i + 400).forEach(([ref, op, d]) => (op === 'set' ? b.set(ref, d) : b.update(ref, d))); await b.commit(); }
  return { luotu: s.luo.length, paivitetty: s.paivita.length, peruttu: s.peru.length, ohitettu: s.ohitettu };
}

/* TASO-haku: joukkueittain getMatches(team_id, start_date, end_date) (EI season_id:tä); vain yhdistetyt joukkueet; jokaiseen otteluun liitetään _taso_team_id. tasoHae(endpoint, params, apiKey) injektoidaan. */
async function haeOttelut(tasoHae, apiKey, kartta, ikkuna) {
  let ottelut = [];
  for (const teamId of Object.keys(kartta || {})) {
    try { const r = await tasoHae('getMatches', { team_id: teamId, start_date: ikkuna.start_date, end_date: ikkuna.end_date }, apiKey); ottelut = ottelut.concat((r.matches || []).map((o) => Object.assign({}, o, { _taso_team_id: teamId }))); await new Promise((res) => setTimeout(res, 150)); }
    catch (e) { console.warn('[TASO kalenteri] joukkue ' + teamId + ' epäonnistui:', e.message); throw e; }   // virhe → koko ajo keskeytyy (ei peruta otteluita puutteellisesta hausta)
  }
  return ottelut;
}
const kausiTunniste = TASO.kausiTunniste;

async function ajaSeura(deps, seuraId, nyt) {   // lukee seura-dokin avaimet + kartan, hakee, synkkaa; palauttaa tuloksen tai null (ei avaimia/karttaa)
  const { db, tasoHae } = deps, sd = await db.collection('seurat').doc(seuraId).get(), s = sd.data() || {}, avain = deps.tasoAvain ? await deps.tasoAvain(db, seuraId, s) : s.taso_api_key;   // deps.tasoAvain = server-only avain (salaiset/integraatiot; turvallisuus-PR)
  if (!avain || !s.taso_club_id) return null;
  const cfg = await db.collection('seurat').doc(seuraId).collection('konfiguraatio').doc('kalenterilahteet').get(), kartta = (cfg.exists && ((cfg.data() || {}).taso || {}).joukkueet) || {};
  if (!Object.keys(kartta).length) return null;
  const ikkuna = TASO.hakuIkkuna(nyt), ottelut = await haeOttelut(tasoHae, avain, kartta, ikkuna);
  return synkkaaSeura(deps, seuraId, ottelut, nyt, ikkuna);
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
