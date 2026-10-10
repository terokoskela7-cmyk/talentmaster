#!/usr/bin/env node
/* diag_yksi_totuus.cjs — KUIVA, VAIN LUKU (.get()), ei nimiä tulosteessa. "Yksi totuus näkymissä" -diagnoosi, osa 1 (testipäivät ja kaudet).
 *   A. Per seura: TK-tulosdokumentit (pelaajat/{pid}/testitulokset) kausittain ja päivän lähteen mukaan; pikakenttäparien (tki/hh/tsi) päivän lähde.
 *   B. Valitut joukkueet: pelaajittain indeksillä tki_viimeisin, tki_pvm, päivän lähde, tm_tekniikka-tila + vanhuus-/päivättömyysjako.
 * Päivän lähde: oikea | kaudesta johdettu (ankkuri 09-01 / 01-20 / 01-15 + tulosdokumentin kausi, ei testauspvm_teksti:ä) |
 *   varapäivä (Wallsport 2026-01-20 tai PDF: testauspvm = tuontipäivä) | tyhjä | ei tulosdokumenttia (esim. pikakirjaus/recalc/tapahtumapohja).
 * Ajo (Tero, gcloud ADC — ei SA-avainta):
 *   node scripts/diag_yksi_totuus.cjs [--seurat=kpv,sjk] [--joukkueet=kpv_u13,<P12-id>]    ilman --joukkueet: tulostaa joukkuelistan (id, nimi, pelaajia) ja ottaa kpv_u13 + P12-nimiset */
'use strict';
const path = require('path');
const TK = require('../lib/tm_tekniikka.js');
const JK = require('../lib/tm_joukkue.js');
const arg = (n, d) => { const a = process.argv.find((x) => x.indexOf('--' + n + '=') === 0); return a ? a.split('=')[1] : d; };
const DAY = 86400000, NYT = Date.now();
const ms = (t) => (t && t.toDate ? t.toDate().getTime() : (t ? Date.parse(t) : NaN));
const iso = (t) => { const m = ms(t); if (!isNaN(m)) return new Date(m).toISOString().slice(0, 10); const s = String(t == null ? '' : t); return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null; };
const ANKKURIT = ['09-01', '01-20', '01-15'], kausiTeksti = (s) => /(kev[aä]t|syksy|talvi)/i.test(String(s || ''));
const inc = (o, k) => { o[k] = (o[k] || 0) + 1; };

/* päivän lähde pelaajan tulosdokumenttien (tulokset: [{id, ...data}]) perusteella */
function lahde(pvmRaw, tulokset) {
  const p = iso(pvmRaw);
  if (!p) return (pvmRaw == null || String(pvmRaw).trim() === '') ? 'tyhjä' : 'päivä ei jäsenny';
  const d = tulokset.filter((t) => iso(t.testauspvm) === p);
  if (!d.length) return ANKKURIT.indexOf(p.slice(5)) >= 0 ? 'ei tulosdokumenttia (ankkurin näköinen päivä)' : 'ei tulosdokumenttia';
  if (d.some((t) => t.lahde === 'palloliitto_pdf' && t.tuotu && iso(t.tuotu) === p)) return 'varapäivä (PDF: tuontipäivä)';
  if (d.some((t) => t.testauspvm_teksti && kausiTeksti(t.testauspvm_teksti))) return 'kaudesta johdettu (TestiPvm-sarakkeessa kausiteksti)';
  if (d.some((t) => t.kausi && !t.testauspvm_teksti && ANKKURIT.indexOf(p.slice(5)) >= 0)) return 'kaudesta johdettu (kausi-pudotusvalikko)';
  if (d.some((t) => t.testauspvm_teksti)) return p === '2026-01-20' ? 'varapäivä (Wallsport, ei-jäsentyvä TestiPvm)' : 'oikea (teksti ei kausi)';
  return d.some((t) => t.lahde === 'tapahtumapohja') ? 'oikea (tapahtumapohja)' : 'oikea';
}

/* pelkkä kentän arvon muoto: puuttuu | kausiteksti | ISO-päivä (ankkurin näköinen / muu) */
function muoto(v) { if (v == null || String(v).trim() === '') return 'puuttuu'; const i = iso(v); if (!i) return kausiTeksti(v) ? 'kausiteksti' : 'ei jäsenny'; return ANKKURIT.indexOf(i.slice(5)) >= 0 ? 'ISO, ankkurin näköinen (09-01/01-20/01-15)' : 'ISO, oikea päivä'; }

async function main() {
  const admin = require(path.join(__dirname, '..', 'functions', 'node_modules', 'firebase-admin'));
  admin.initializeApp({ projectId: 'talentmaster-pilot' });
  const db = admin.firestore();
  const seurat = arg('seurat') ? arg('seurat').split(',') : (await db.collection('seurat').get()).docs.map((d) => d.id);
  const valitut = arg('joukkueet') ? arg('joukkueet').split(',') : null;
  for (const sid of seurat) {
    const [ps, js] = await Promise.all([db.collection('seurat').doc(sid).collection('pelaajat').get(), db.collection('seurat').doc(sid).collection('joukkueet').get()]);
    if (!ps.size) continue;
    const joukkueDocs = js.docs.map((d) => ({ id: d.id, nimi: d.data().nimi || d.id }));
    const pelaajat = ps.docs.map((d) => Object.assign({ id: d.id }, d.data()));
    /* tulosdokumentit (vain päivä-/kausikentät, ei nimiä) */
    const tul = {};
    for (let i = 0; i < pelaajat.length; i += 25) {
      await Promise.all(pelaajat.slice(i, i + 25).map(async (p) => {
        const s = await db.collection('seurat').doc(sid).collection('pelaajat').doc(p.id).collection('testitulokset').get();
        tul[p.id] = s.docs.map((d) => { const x = d.data(); return { id: d.id, testauspvm: x.testauspvm, testauspvm_teksti: x.testauspvm_teksti, kausi: x.kausi, lahde: x.lahde, tuotu: x.tuotu, tki: x.tki, protokolla: x.protokolla }; });
      }));
    }
    /* tapahtumapohjaiset tulokset (testitapahtumat/{id}/tulokset/{pelaajaId}) — EI pelaajan testitulokset-alikokoelmassa (Excel_Tuonti tapahtuma-moodi, Testaus_v9) */
    const evs = await db.collection('seurat').doc(sid).collection('testitapahtumat').get();
    let evTulosDocs = 0;
    for (const ev of evs.docs) {
      const e = ev.data(), rs = await ev.ref.collection('tulokset').get();
      rs.docs.forEach((r) => { const x = r.data(), pid = x.pelaajaId || r.id; (tul[pid] = tul[pid] || []).push({ id: 'tapahtuma:' + ev.id, testauspvm: x.testauspvm || e.pvm, kausi: x.kausi || e.kausi, lahde: 'tapahtumapohja', tki: x.tki, protokolla: x.protokolla || e.protokolla }); evTulosDocs++; });
    }
    console.log('\n════ ' + sid + ': ' + pelaajat.length + ' pelaajaa, ' + joukkueDocs.length + ' joukkuetta · testitapahtumia ' + evs.size + ' (tulosdokumentteja ' + evTulosDocs + ') · pelaajan omia testitulokset-dokumentteja ' + pelaajat.reduce((a, p) => a + tul[p.id].filter((t) => t.lahde !== 'tapahtumapohja').length, 0));
    /* A1 · TK-tulosdokumentit kausittain × päivän lähde */
    const tkDocs = [];
    pelaajat.forEach((p) => tul[p.id].forEach((t) => { if (t.tki != null || /tekniikka|tk/i.test(String(t.id) + ' ' + String(t.protokolla || ''))) tkDocs.push({ t, kaikki: tul[p.id] }); }));
    const kaus = {};
    tkDocs.forEach(({ t, kaikki }) => { const k = (t.kausi || (iso(t.testauspvm) || '?').slice(0, 4) + ' (ei kausikenttää)'); const l = lahde(t.testauspvm, kaikki); (kaus[k] = kaus[k] || {}); inc(kaus[k], l); });
    console.log('TK-tulosdokumentit: ' + tkDocs.length + ' · kausi → päivän lähde');
    Object.keys(kaus).sort().forEach((k) => console.log('   ' + k.padEnd(28) + JSON.stringify(kaus[k])));
    /* A2 · pikakenttäparit */
    [['tki_viimeisin', 'tki_pvm'], ['hh_viimeisin', 'hh_pvm'], ['sm_pallo_viimeisin', 'tsi_pvm'], ['d2_taso', 'd2_pvm'], ['d1_taso', 'd1_pvm']].forEach(([a, b]) => {
      const m = {}; let n = 0; pelaajat.forEach((p) => { if (p[a] == null) return; n++; inc(m, lahde(p[b], tul[p.id])); });
      if (n) console.log('  ' + a.padEnd(20) + n + ' arvoa · ' + b + ' lähde: ' + JSON.stringify(m));
    });
    [['sm_pallo_viimeisin', 'tsi_pvm'], ['d2_taso', 'd2_pvm'], ['d1_taso', 'd1_pvm'], ['hh_viimeisin', 'hh_pvm'], ['tki_viimeisin', 'tki_pvm']].forEach(([a, b]) => {
      const m = {}; let n = 0; pelaajat.forEach((p) => { if (p[a] == null) return; n++; inc(m, muoto(p[b])); });
      if (n) console.log('  muoto ' + b.padEnd(8) + '(' + a + ' ' + n + ' arvoa): ' + JSON.stringify(m));
    });
    const lahteet = {}; pelaajat.forEach((p) => { if (p.d2_taso != null) inc(lahteet, 'd2_lahde=' + (p.d2_lahde || '—')); if (p.d1_taso != null) inc(lahteet, 'd1_lahde=' + (p.d1_lahde || '—')); if (p.tsi_recalc) inc(lahteet, 'tsi_recalc'); if (p.d2_taso_recalc) inc(lahteet, 'd2_taso_recalc'); });
    if (Object.keys(lahteet).length) console.log('  kenttien lähdemerkit: ' + JSON.stringify(lahteet));
    /* B · joukkueet */
    if (!valitut) console.log('joukkueet: ' + joukkueDocs.map((j) => j.id + '=' + j.nimi + '(' + pelaajat.filter((p) => JK.tmPelaajanJoukkueet(p, joukkueDocs).indexOf(j.id) >= 0).length + ')').join(' · '));
    const ids = (valitut || (sid === 'kpv' ? ['kpv_u13'].concat(joukkueDocs.filter((j) => /(^|\W)P12(\W|$)/i.test(j.nimi)).map((j) => j.id)) : [])).filter((id) => joukkueDocs.some((j) => j.id === id));
    ids.forEach((jid) => {
      const jd = joukkueDocs.find((j) => j.id === jid), jas = pelaajat.filter((p) => JK.tmPelaajanJoukkueet(p, joukkueDocs).indexOf(jid) >= 0);
      const L = TK.tmTekniikkaJoukkueLuokka(jas, NYT, { joukkueNimi: jd.nimi });
      console.log('\n── joukkue ' + jid + ' (' + jd.nimi + '): ' + jas.length + ' pelaajaa · lib: mitattu ' + L.mitattu + '/' + L.yht + ', neutraali ' + L.neutraaleja + ', vajaa ' + L.vajaita + ', ei dataa ' + L.eiDataa + ', vanhoja ' + L.vanhoja + ', päivä tuntematon ' + L.paivaTuntematon + ', kehityskohteita ' + L.kehityskohteita + ' → ' + L.luokka);
      const syyt = {}, lah = {};
      jas.forEach((p, i) => {
        const m = TK.tmTekniikkaMittari(p, NYT, { joukkueNimi: jd.nimi }), l = lahde(p.tki_pvm, tul[p.id]);
        inc(lah, l); inc(syyt, m.mitattu ? 'mitattu (' + m.mittari + ')' : (m.tila === 'neutraali' ? 'neutraali §28' : (m.eiDataaSyy || m.huom || m.tila)));
        console.log('  #' + String(i + 1).padStart(2) + ' tki ' + String(p.tki_viimeisin == null ? '—' : p.tki_viimeisin).padEnd(4) + ' tki_pvm ' + String(iso(p.tki_pvm) || '—').padEnd(11) + String(l).padEnd(46) + 'lib: ' + String(m.tila).padEnd(9) + (m.eiDataaSyy ? m.eiDataaSyy : '') + ' | d2_taso ' + (p.d2_taso == null ? '—' : p.d2_taso) + ' (' + (p.d2_lahde || '—') + ', ' + (iso(p.d2_pvm) || '—') + ') · tsi_pvm ' + (iso(p.tsi_pvm) || '—') + ' · hh_pvm ' + (iso(p.hh_pvm) || '—'));
      });
      console.log('  yhteenveto lib-tila: ' + JSON.stringify(syyt) + ' · tki_pvm-lähde: ' + JSON.stringify(lah));
      console.log('  Master-D2 (tallennettu d2_taso ≠ null): ' + jas.filter((p) => p.d2_taso != null).length + '/' + jas.length + ' vs lib mitattu ' + L.mitattu + '/' + L.yht);
    });
  }
}
if (require.main === module) main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
module.exports = { lahde, muoto };
