'use strict';
/**
 * K35-6f — pelaajan harjoituskertymä: kooste TRIGGERILLÄ (ei laskentaa joka avauksella). Kaista: Tero.
 *   seurat/{sid}/pelaajat/{pid}/kooste/kertyma_{kausi} = { kausi, versio:1, viikot:{ 'YYYY-Www': viikkokori }, paivitetty }  — viikkokorit (lib/tm_harjoituskertyma.js: tmViikkoKori); sRPE-paikka (srpe: null) valmiina D197:lle.
 *   Triggerit: onWrite kalenteri/{ev}/lasnaolijat/{pid} (läsnäolo vahvistettu/muutettu) ja onWrite pelaajat/{pid}/kirjaukset/{pvm} (omatoiminen) → päivittää VAIN kyseisen viikon korin (≈ 10 tapahtumaa + 7 kirjausta).
 *   + onUpdate kalenteri/{eid} (K35-10): siirto toiseen viikkoon / peruminen / poisto päivittää vanhan ja uuden viikon korin läsnäolijoille (ei lasnaolijoita → ei lisälukuja).
 *   Callable haePelaajanKertyma({ seuraId, pelaajaId }): pelaaja (token) ja huoltaja (sama tunnistus kuin haePelaajanKalenteri: email_verified + huoltajaEmail + suostumus 'annettu'; pelaajaPoissa → hylkäys); henkilökunta lukee koosteen suoraan (Rules).
 *   Ei vertailua muihin pelaajiin: dokumentti ja vastaus sisältävät vain pelaajan omat luvut.
 */
const { normalisoiDocId } = require('./pelaajakirjautuminen');
const { huoltajaSyy } = require('./huoltaja_tunnistus');
const { tunnisteTyyppi } = require('./authz_paatos');
const { pelaajaPoissa } = require('./seuran_kooste');
const H = require('./tm_harjoituskertyma');

const PV = 86400000;
const _ms = (v) => (v && typeof v.toDate === 'function' ? v.toDate().getTime() : (typeof v === 'number' ? v : (v ? Date.parse(v) : null)));
const koosteId = (kausi) => 'kertyma_' + kausi;
function _evMuoto(id, d) { const a = _ms(d.alkaa), b = _ms(d.paattyy); return Object.assign({}, d, { id, _alkaaMs: a, _paattyyMs: b != null ? b : a }); }

async function _pohja(deps, sid, pid) {
  const seura = deps.db.collection('seurat').doc(sid), pSnap = await seura.collection('pelaajat').doc(pid).get();
  if (!pSnap || !pSnap.exists) return null;
  const jSnap = await seura.collection('joukkueet').get(), joukkueDocs = []; jSnap.forEach((d) => joukkueDocs.push({ id: d.id, nimi: (d.data() || {}).nimi }));
  return { seura, pelaaja: Object.assign({ id: pid }, pSnap.data() || {}), joukkueDocs };
}
async function _lasnaolot(seura, tapahtumat, pid) {
  const o = {};
  await Promise.all(tapahtumat.map(async (ev) => { const s = await seura.collection('kalenteri').doc(ev.id).collection('lasnaolijat').doc(pid).get(); if (s && s.exists) { const x = s.data() || {}; o[ev.id] = { tila: x.tila || null, syy: x.syy || '', saatavuus: x.saatavuus || null }; } }));
  return o;
}
async function _kirjaukset(deps, seura, pid, ma, su) {
  const snap = await seura.collection('pelaajat').doc(pid).collection('kirjaukset').where(deps.FieldPath.documentId(), '>=', ma).where(deps.FieldPath.documentId(), '<=', su).get(), a = [];
  snap.forEach((d) => a.push(Object.assign({ pvm: d.id }, d.data() || {}))); return a;
}
async function _tapahtumat(deps, seura, alkuMs, loppuMs) {
  const snap = await seura.collection('kalenteri').where('alkaa', '>=', deps.Timestamp.fromDate(new Date(alkuMs))).where('alkaa', '<=', deps.Timestamp.fromDate(new Date(loppuMs))).get(), a = [];
  snap.forEach((d) => a.push(_evMuoto(d.id, d.data() || {}))); return a;
}

/* Päivittää yhden viikon korin (iso = mikä tahansa viikon päivä 'YYYY-MM-DD').
   RAJATTU (projekti 06, mitattu 74–148 lukua/kutsu seuran koon mukana → nyt ≤ ~15, ei riipu seuran koosta): luetaan vain
   · pelaaja (1) + pelaajan OMAT joukkuedokumentit getAll:lla (ids = pelaaja.joukkueet[], totuus §7.18; legacy-nimi → kysely nimi == x),
   · pelaajan joukkueiden tapahtumat ikkunasta: joukkueet array-contains id · joukkue == id (tunniste vanhassa nimikentässä, ei joukkueet[]:ia) · joukkue == nimi (legacy), yhdistetty Mapilla doc-id:n mukaan; + pelaajat_id array-contains pid (poimitut/ryhmät),
   · läsnäolodokumentit VAIN tämän pelaajan tapahtumille getAll:lla (kuuluu pelaajalle + kategoria), + viikon kirjaukset.
   Kuuluminen ratkaistaan samalla libillä kuin ennen (tmKuuluuPelaajalle) → sama kooste. Poikkeus/puute → PALUU koko-seuran polkuun (paivitaViikkoKoko): kokoelmaindeksit puuttuvat (FAILED_PRECONDITION),
   joukkuetunniste ei ratkea pelaajan dokumenteilla (legacy-kanonisointi) tai tunniste sisältää '/'. Ei tunnettuja eroja (joukkue = id ilman joukkueet[]:ia katetaan omalla kyselyllä); jäljellä vain: kaksi samannimistä joukkuetta samassa seurassa. */
const KOKO = 'koko';
const _indeksipuute = (e) => !!e && (e.code === 9 || e.code === 'failed-precondition' || /FAILED_PRECONDITION|requires an index/i.test(String((e && e.message) || '')));
async function _pohjaRajattu(deps, sid, pid) {
  const seura = deps.db.collection('seurat').doc(sid), pSnap = await seura.collection('pelaajat').doc(pid).get();
  if (!pSnap || !pSnap.exists) return null;
  const pelaaja = Object.assign({ id: pid }, pSnap.data() || {}), jRef = seura.collection('joukkueet');
  const ids = (Array.isArray(pelaaja.joukkueet) ? pelaaja.joukkueet : []).filter((x) => x != null && x !== '').map(String), joukkueDocs = [], puuttuu = [];
  if (ids.some((x) => x.indexOf('/') >= 0)) return KOKO;
  if (ids.length) { const snaps = await deps.db.getAll.apply(deps.db, ids.map((id) => jRef.doc(id))); ids.forEach((id, i) => { if (snaps[i] && snaps[i].exists) joukkueDocs.push({ id, nimi: (snaps[i].data() || {}).nimi }); else puuttuu.push(id); }); }
  else { const n = pelaaja.joukkue != null ? pelaaja.joukkue : pelaaja.joukkueNimi; if (n != null && n !== '') puuttuu.push(String(n)); }
  for (const x of puuttuu) { const q = await jRef.where('nimi', '==', x).get(); if (!q.docs || !q.docs.length) return KOKO; q.forEach((d) => joukkueDocs.push({ id: d.id, nimi: (d.data() || {}).nimi })); }
  return { seura, pelaaja, joukkueDocs };
}
async function _tapahtumatRajattu(deps, seura, pelaaja, joukkueDocs, alkuMs, loppuMs) {
  const A = deps.Timestamp.fromDate(new Date(alkuMs)), B = deps.Timestamp.fromDate(new Date(loppuMs)), kal = seura.collection('kalenteri');
  const hae = (kentta, op, arvo) => kal.where(kentta, op, arvo).where('alkaa', '>=', A).where('alkaa', '<=', B).get();
  const kyselyt = []; joukkueDocs.forEach((j) => { kyselyt.push(hae('joukkueet', 'array-contains', j.id)); kyselyt.push(hae('joukkue', '==', j.id)); if (j.nimi && j.nimi !== j.id) kyselyt.push(hae('joukkue', '==', j.nimi)); });   // id joukkueet[]:ssä · id vanhassa nimikentässä ilman joukkueet[]:ia · legacy-nimi
  kyselyt.push(hae('pelaajat_id', 'array-contains', pelaaja.id));
  const kartta = new Map(); (await Promise.all(kyselyt)).forEach((snap) => snap.forEach((d) => kartta.set(d.id, _evMuoto(d.id, d.data() || {}))));
  return Array.from(kartta.values());
}
async function _lasnaolotRajattu(deps, seura, pid, tapahtumat, pelaaja, joukkueDocs) {
  const KP = require('./tm_kalenteri_pelaajalle'), omat = tapahtumat.filter((ev) => H.tmKertymaKategoria(ev) && KP.tmKuuluuPelaajalle(ev, pelaaja, joukkueDocs)), o = {};
  if (!omat.length) return o;
  const snaps = await deps.db.getAll.apply(deps.db, omat.map((ev) => seura.collection('kalenteri').doc(ev.id).collection('lasnaolijat').doc(pid)));
  snaps.forEach((sn, i) => { if (sn && sn.exists) { const x = sn.data() || {}; o[omat[i].id] = { tila: x.tila || null, syy: x.syy || '', saatavuus: x.saatavuus || null }; } });
  return o;
}
async function paivitaViikko(deps, sid, pid, iso, nyt) {
  const r = H.tmKertymaVkRajat(iso); if (!r) return null;
  const pr = await _pohjaRajattu(deps, sid, pid); if (pr === null) return null;
  if (pr !== KOKO) {
    try {
      const alku = Date.parse(r.ma + 'T00:00:00Z') - PV, loppu = Date.parse(r.su + 'T00:00:00Z') + 2 * PV;
      const tap = await _tapahtumatRajattu(deps, pr.seura, pr.pelaaja, pr.joukkueDocs, alku, loppu), las = await _lasnaolotRajattu(deps, pr.seura, pid, tap, pr.pelaaja, pr.joukkueDocs), kir = await _kirjaukset(deps, pr.seura, pid, r.ma, r.su);
      const kori = H.tmKertymaKorit({ tapahtumat: tap, lasnaolot: las, kirjaukset: kir, pelaaja: pr.pelaaja, joukkueDocs: pr.joukkueDocs, nyt })[r.avain] || H.tmViikkoKori({ nyt });
      await _kirjoitaKori(deps, pr.seura, pid, r, kori); return kori;
    } catch (e) { if (!_indeksipuute(e)) throw e; console.warn('[kertyma] rajattu haku vaatii indeksin — paluu koko-seuran polkuun:', e && e.message); }
  }
  return paivitaViikkoKoko(deps, sid, pid, iso, nyt);
}
async function _kirjoitaKori(deps, seura, pid, r, kori) {
  await seura.collection('pelaajat').doc(pid).collection('kooste').doc(koosteId(H.tmKertymaKausiAvain(r.ma))).set({ kausi: H.tmKertymaKausiAvain(r.ma), versio: 1, viikot: { [r.avain]: kori }, paivitetty: deps.palvelinAika() }, { merge: true });
}
/* ALKUPERÄINEN (K35-6f) koko-seuran polku: varapolku + pariteetin referenssi (testit vertaavat rajattua tähän). Lukee koko joukkuekokoelman, seuran viikon tapahtumat ja läsnäolot jokaiselle. */
async function paivitaViikkoKoko(deps, sid, pid, iso, nyt) {
  const r = H.tmKertymaVkRajat(iso); if (!r) return null; const p = await _pohja(deps, sid, pid); if (!p) return null;
  const alku = Date.parse(r.ma + 'T00:00:00Z') - PV, loppu = Date.parse(r.su + 'T00:00:00Z') + 2 * PV;   // ±1 vrk marginaali (Helsingin vs UTC); lib rajaa viikon Helsingin päivällä
  const tap = await _tapahtumat(deps, p.seura, alku, loppu), las = await _lasnaolot(p.seura, tap, pid), kir = await _kirjaukset(deps, p.seura, pid, r.ma, r.su);
  const kori = H.tmKertymaKorit({ tapahtumat: tap, lasnaolot: las, kirjaukset: kir, pelaaja: p.pelaaja, joukkueDocs: p.joukkueDocs, nyt })[r.avain] || H.tmViikkoKori({ nyt });
  await _kirjoitaKori(deps, p.seura, pid, r, kori);
  return kori;
}
/* Koko kauden täyttö (backfill): korvaa dokumentin. */
async function taytaPelaaja(deps, sid, pid, nyt, kirjoita) {
  const p = await _pohja(deps, sid, pid); if (!p) return null;
  const paiva = H.tmKertymaPaiva(nyt), kausi = H.tmKertymaKausiAvain(paiva), alku = H.tmKertymaKausiAlku(paiva), loppuIso = (+kausi.slice(0, 4) + 1) + '-07-31';
  const tap = await _tapahtumat(deps, p.seura, Date.parse(alku + 'T00:00:00Z') - PV, Date.parse(loppuIso + 'T00:00:00Z') + 2 * PV);
  const las = await _lasnaolot(p.seura, tap.filter((e) => H.tmKertymaKategoria(e)), pid), kir = await _kirjaukset(deps, p.seura, pid, alku, loppuIso);
  const korit = H.tmKertymaKorit({ tapahtumat: tap, lasnaolot: las, kirjaukset: kir, pelaaja: p.pelaaja, joukkueDocs: p.joukkueDocs, nyt });
  if (kirjoita) await p.seura.collection('pelaajat').doc(pid).collection('kooste').doc(koosteId(kausi)).set({ kausi, versio: 1, viikot: korit, paivitetty: deps.palvelinAika() });
  return { kausi, viikkoja: Object.keys(korit).length, korit };
}

function luoLasnaoloKasittelija(deps) {
  const nytF = deps.nyt || (() => Date.now());
  return async function kertymaLasnaolijaOnWrite(change, context) {
    const { sid, eid, pid } = context.params, ev = await deps.db.collection('seurat').doc(sid).collection('kalenteri').doc(eid).get();
    if (!ev || !ev.exists) return null; const d = ev.data() || {}, a = _ms(d.alkaa); if (a == null || !H.tmKertymaKategoria(Object.assign({ id: eid }, d))) return null;
    return paivitaViikko(deps, sid, pid, H.tmKertymaPaiva(a), nytF());
  };
}
function luoKirjausKasittelija(deps) {
  const nytF = deps.nyt || (() => Date.now());
  return async function kertymaKirjausOnWrite(change, context) { const { sid, pid, pvm } = context.params; return /^\d{4}-\d{2}-\d{2}$/.test(pvm) ? paivitaViikko(deps, sid, pid, pvm, nytF()) : null; };
}

/* Siirto/peruminen/poisto: onUpdate kalenteri/{eid} — jos alkaa-viikko muuttuu TAI tila → peruttu/peruutettu TAI poistettu → true, ja tapahtumalla on lasnaolijat-dokeja,
   päivitetään vanha ja uusi viikko jokaiselle lasnaolijat-pelaajalle. Ei lasnaolijoita (tulevat tapahtumat) → ei lisälukuja eikä kirjoituksia. */
function luoTapahtumaMuutosKasittelija(deps) {
  const nytF = deps.nyt || (() => Date.now()), peruttu = (d) => d.tila === 'peruttu' || d.tila === 'peruutettu', viikko = (d) => { const a = _ms(d.alkaa); return a == null ? null : H.tmKertymaVkRajat(H.tmKertymaPaiva(a)); };
  return async function kertymaTapahtumaOnUpdate(change, context) {
    const { sid, eid } = context.params, e = change.before.data() || {}, u = change.after.data() || {};
    const vanha = viikko(e), uusi = viikko(u), siirto = !!(vanha && uusi && vanha.avain !== uusi.avain), poistui = (!peruttu(e) && peruttu(u)) || (e.poistettu !== true && u.poistettu === true);
    if (!siirto && !poistui) return null;
    const snap = await deps.db.collection('seurat').doc(sid).collection('kalenteri').doc(eid).collection('lasnaolijat').get(), pidt = []; snap.forEach((d) => pidt.push(d.id));
    if (!pidt.length) return null;
    const paivat = [vanha, uusi].filter(Boolean).map((r) => r.ma).filter((v, i, a) => a.indexOf(v) === i);
    for (const pid of pidt) for (const pv of paivat) await paivitaViikko(deps, sid, pid, pv, nytF());
    return { pelaajia: pidt.length, viikkoja: paivat.length };
  };
}

function luoKertymaKasittelija(deps) {
  const { db, HttpsError } = deps, nytF = deps.nyt || (() => Date.now()), torju = () => new HttpsError('permission-denied', 'Ei oikeutta tämän pelaajan kertymään.');
  return async function haePelaajanKertyma(data, context) {
    if (!context || !context.auth) throw new HttpsError('unauthenticated', 'Kirjautuminen vaaditaan.');
    const seuraId = normalisoiDocId(data && data.seuraId), pelaajaId = normalisoiDocId(data && data.pelaajaId);
    if (!seuraId || !pelaajaId) throw new HttpsError('invalid-argument', 'seuraId ja pelaajaId pakollisia.');
    const tyyppi = tunnisteTyyppi(context.auth), token = context.auth.token || {};
    if (tyyppi === 'pelaaja') { if (token.pelaajaSeuraId !== seuraId || token.pelaajaId !== pelaajaId) throw torju(); }
    else if (tyyppi !== 'kayttaja') throw torju();
    const seura = db.collection('seurat').doc(seuraId), pSnap = await seura.collection('pelaajat').doc(pelaajaId).get();
    if (!pSnap || !pSnap.exists) throw torju(); const p = pSnap.data() || {};
    if (pelaajaPoissa(p)) throw torju();
    if (tyyppi === 'kayttaja' && huoltajaSyy(token, p, { vaadiSuostumus: true })) throw torju();   // henkilökunta (ei huoltajaEmail-täsmäystä) hylätään samalla
    const nyt = nytF(), kausi = H.tmKertymaKausiAvain(H.tmKertymaPaiva(nyt)), k = await seura.collection('pelaajat').doc(pelaajaId).collection('kooste').doc(koosteId(kausi)).get();
    return { kertyma: H.tmKertymaKoreista(k && k.exists ? (k.data() || {}).viikot : {}, nyt), laskettu: new Date(nyt).toISOString() };
  };
}
module.exports = { paivitaViikko, paivitaViikkoKoko, taytaPelaaja, luoTapahtumaMuutosKasittelija, luoLasnaoloKasittelija, luoKirjausKasittelija, luoKertymaKasittelija, koosteId };
