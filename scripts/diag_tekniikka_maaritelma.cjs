#!/usr/bin/env node
/* diag_tekniikka_maaritelma.cjs — KUIVA, VAIN LUKU. docs/TEKNIIKKA_MAARITELMA.md:n luvut: nykyiset säännöt vs. jaettu määritelmä
 * (prototyyppi vain tässä tiedostossa — EI lib/-toteutusta). Ei kirjoituksia, tulosteessa ei nimiä.
 *
 * Ajo:
 *   node scripts/diag_tekniikka_maaritelma.cjs                      demo-fixturet (pilotti · kypsa · kuormitus), offline
 *   node scripts/diag_tekniikka_maaritelma.cjs kpv [--seura=sjk]    oikea data, VAIN .get() (gcloud ADC, EI SA-avainta)
 *   node scripts/diag_tekniikka_maaritelma.cjs sm [seura]           SM-tasojen jakauma (raakatuloksista normiIka:lla)
 *   node scripts/diag_tekniikka_maaritelma.cjs pvm [seura]          *_pvm-kenttien jakauma (K8; ilman seuraa kaikki seurat)
 *   ERO_TASOA=1 …                                                   vertailu: "pallo hidastaa" yhden tason erolla (oletus 2)
 *
 * Nykyiset säännöt: HUOMIO = joukkueen D2-ka < 3 (laskeJoukkuePoikkeamat); EHDOTUS = ≥ 2 pelaajaa TKI < 40 (VP_v25 TP_SIGNAALIT tki_alhainen).
 * Uusi (§2): ketju TKI → SM-tasot (ei sekuntirajaa), vanhuus 15 kk, joukkue ≥ 1/3 mitatuista (≥ 5) tai ≥ 1/2 pelaajista. */
'use strict';
const path = require('path');
const E = require('../lib/tm_eerikkila_normit.js');
const JK = require('../lib/tm_joukkue.js');
const DAY = 86400000;

/* ── lopullinen versio (Tero 10.10.2026): ketju TKI → SM-tasot, ei sekuntirajaa ── */
const ERO = process.env.ERO_TASOA ? +process.env.ERO_TASOA : 2;   // ERO_TASOA=1 → vertailu: "pallo hidastaa" yhden tason erolla
const RAJA = { tki: 40, vanhaKk: 15, osuus: 1 / 3, minMitattu: 5, puolet: 1 / 2, otosPieniAlle: 8, pallo1: 1, ero: ERO };

const ms = (t) => (t && t.toDate ? t.toDate().getTime() : (t ? Date.parse(t) : NaN));
/* kk-ikä: null = "päivä tuntematon" (puuttuva/tyhjä/virheellinen) — EI koskaan tuore */
const kk = (t, nyt) => { const m = ms(t); return isNaN(m) ? null : (nyt - m) / (30.44 * DAY); };
/* sukupuoli → 'M'/'N': 1) kenttä `sukupuoli` (M/P/N/T), 2) joukkuenimen tunnus (P14 / T14), muuten null (EI arvausta: eerikkilaTaso käyttäisi tyttöjen normia kaikelle muulle kuin 'M':lle).
   Datassa kenttä puuttuu usein (SJK 20 / 61, Sibbo 208 / 246, Pallo-Iirot 71 / 71). */
const spMN = (p) => { const k = E.normSukupuoliMN(p.sukupuoli); if (k) return k; const m = String(p.joukkue || '').match(/\b([PT])\s?\d/i); return m ? (m[1].toUpperCase() === 'T' ? 'N' : 'M') : null; };

/* SM-taso raakatuloksesta rekisteristä: ikä < 10 → ei tasoa; ikä ≥ 20 → avain 'M'/'N' (eerikkilaTaso leikkaisi hiljaa 10–19:ään). 0 = ei tasoa. */
function smTaso(arvo, testi, ika, sp) {
  const v = parseFloat(arvo);
  if (!isFinite(v) || ika == null || ika < 10 || !sp) return 0;
  return E.eerikkilaTaso(v, testi, ika >= 20 ? sp : ika, sp);
}

/* Prototyyppi: ketju TKI → SM-tasot, mittarikohtainen vanhuus (15 kk). Vanha / päivä tuntematon ei luokittele (`vanhat`). */
function tekniikkaMittari(p, nyt) {
  const vanhat = [];
  if (p.tki_viimeisin != null) {
    const a = kk(p.tki_pvm, nyt);
    if (a == null) vanhat.push('TKI päivä tuntematon');
    else if (a >= RAJA.vanhaKk) vanhat.push('TKI');
    else return { mittari: 'TKI', arvo: p.tki_viimeisin, heikko: p.tki_viimeisin < RAJA.tki, syy: 'alle ikätason', vanhat };
  }
  if (p.sm_pallo_viimeisin != null) {
    const a = kk(p.tsi_pvm, nyt), sp = spMN(p);
    if (a == null) vanhat.push('SM päivä tuntematon');
    else if (a >= RAJA.vanhaKk) vanhat.push('SM-testi');
    else if (!sp) vanhat.push('sukupuoli puuttuu');                    // K17: ei SM-tasoa → "ei tekniikkadataa", syy diagnostiikassa
    else {
      const ika = E.normiIka(p.syntymaVuosi, p.tsi_pvm || null, p.joukkue), tp = smTaso(p.sm_pallo_viimeisin, 'sm_pallo', ika, sp), tj = smTaso(p.sm_juoksu_viimeisin, 'sm_juoksu', ika, sp);
      if (tp >= 1) {
        /* K15: SM-pallo = 1 on tekniikan kehityskohde vain, jos SM-juoksun taso ≥ 2. Molemmat 1 → "nopeus ja tekniikka samalla tasolla": ei kehityskohde, EI lasketa joukkueluokitukseen (§28: hitautta ei tehdä tekniikaksi). */
        if (tp === 1 && tj <= 1) return { mittari: 'SM', neutraali: true, huom: tj === 1 ? 'nopeus ja tekniikka samalla tasolla' : 'SM-juoksu puuttuu', arvo: tp, tj, heikko: false, vanhat };
        const a1 = tp === 1 && tj >= 2, a2 = !a1 && tj >= 1 && tp <= tj - RAJA.ero;
        return { mittari: 'SM', arvo: tp, tj, heikko: a1 || a2, syy: a1 ? 'alle ikätason' : 'pallo hidastaa suunnanmuutoksissa', vanhat };
      }
      vanhat.push('SM ilman tasoa (ikä ' + ika + ')');
    }
  }
  return { mittari: null, vanhat };
}
function ehdotettuLuokka(pelaajat, nyt) {
  const M = pelaajat.map((p) => tekniikkaMittari(p, nyt)), neutraaleja = M.filter((m) => m.neutraali).length, mit = M.filter((m) => m.mittari && !m.neutraali), heikot = mit.filter((m) => m.heikko), lahteet = {};
  mit.forEach((m) => { lahteet[m.mittari] = (lahteet[m.mittari] || 0) + 1; });
  const vanhoja = M.filter((m) => !m.mittari && m.vanhat.length).length, sukupuoliPuuttuu = M.filter((m) => !m.mittari && m.vanhat.includes('sukupuoli puuttuu')).length;
  const syyAlle = heikot.filter((m) => m.syy === 'alle ikätason').length, syyPallo = heikot.length - syyAlle;
  const kehityskohde = (mit.length >= RAJA.minMitattu && heikot.length / mit.length >= RAJA.osuus) || (pelaajat.length > 0 && heikot.length / pelaajat.length >= RAJA.puolet);
  return { yht: pelaajat.length, mitattu: mit.length, heikkoja: heikot.length, vanhoja, neutraaleja, sukupuoliPuuttuu, lahteet,
    luokka: kehityskohde ? 'KEHITYSKOHDE' : (mit.length >= RAJA.minMitattu ? 'ok' : (mit.length === 0 ? 'ei tekniikkadataa' : 'ei luokkaa (' + mit.length + ' mitattua)')),
    otosPieni: (kehityskohde || mit.length >= RAJA.minMitattu) && mit.length < RAJA.otosPieniAlle,
    syy: kehityskohde ? (syyAlle >= syyPallo ? 'alle ikätason' : 'pallo hidastaa suunnanmuutoksissa') : null, syyJako: { alle: syyAlle, pallo: syyPallo } };
}

/* Nykyiset säännöt samoilla pelaajilla */
function nykyinen(pelaajat, ika, spTP) {
  const pk = E.laskeJoukkuePoikkeamat(pelaajat, ika, spTP === 'T' ? 'N' : 'M');
  const t = pk.find((x) => x.tyyppi === 'alle_normin' && x.osaAlue === 'tekniikka');
  const tki40 = pelaajat.filter((p) => p.tki_viimeisin != null && p.tki_viimeisin < 40).length;
  return { huomio: t ? 'KYLLÄ (D2-ka ' + t.arvo + ', ' + t.vakavuus + ')' : 'ei', ehdotus: tki40 >= 2 ? 'KYLLÄ (' + tki40 + ' pelaajaa TKI<40)' : 'ei (' + tki40 + ')', huomioB: !!t, ehdotusB: tki40 >= 2 };
}
const ikaSp = (nimi) => { const s = String(nimi || ''), a = s.match(/\b[PTU]?\s?(\d{1,2})\b/i) || s.match(/(\d{1,2})/), b = s.match(/\b([PT])\s?\d/i); return { ika: a ? parseInt(a[1] || a[0], 10) : null, sp: b && b[1].toUpperCase() === 'T' ? 'T' : 'P' }; };

function raportti(nimi, pelaajat, joukkueDocs, nyt) {
  const per = {}; joukkueDocs.forEach((d) => { per[d.id] = []; });
  pelaajat.forEach((p) => JK.tmPelaajanJoukkueet(p, joukkueDocs).forEach((id) => { if (per[id]) per[id].push(p); }));
  const rivit = joukkueDocs.map((d) => { const pp = per[d.id], is = ikaSp(d.nimi), n = nykyinen(pp, is.ika, is.sp), u = ehdotettuLuokka(pp, nyt); return { joukkue: d.nimi, pelaajia: pp.length, n, u }; }).filter((r) => r.pelaajia > 0);
  const yht = { joukkueita: rivit.length, huomioNyt: rivit.filter((r) => r.n.huomioB).length, ehdotusNyt: rivit.filter((r) => r.n.ehdotusB).length,
    uusiKehityskohde: rivit.filter((r) => r.u.luokka === 'KEHITYSKOHDE').length, ok: rivit.filter((r) => r.u.luokka === 'ok').length,
    eiLuokkaa: rivit.filter((r) => /^ei /.test(r.u.luokka)).length, joistaEiMitattuaLainkaan: rivit.filter((r) => r.u.luokka === 'ei tekniikkadataa').length, otosPieni: rivit.filter((r) => r.u.otosPieni).length };
  console.log('\n══ ' + nimi + ' ══');
  console.log('joukkue'.padEnd(34) + 'pel.'.padEnd(5) + 'HUOMIO nyt'.padEnd(26) + 'EHDOTUS nyt'.padEnd(26) + 'UUSI: mitattu/heikkoja/vanhoja → luokka [lähteet] syy');
  rivit.forEach((r) => console.log(String(r.joukkue).slice(0, 33).padEnd(34) + String(r.pelaajia).padEnd(5) + r.n.huomio.padEnd(26) + r.n.ehdotus.padEnd(26) + r.u.mitattu + '/' + r.u.heikkoja + '/' + r.u.vanhoja + ' → ' + r.u.luokka + (r.u.otosPieni ? ' [otos pieni]' : '') + (r.u.neutraaleja ? ' [' + r.u.neutraaleja + ' nopeus=tekniikka]' : '') + (r.u.sukupuoliPuuttuu ? ' [' + r.u.sukupuoliPuuttuu + ' sukupuoli puuttuu]' : '') + ' ' + JSON.stringify(r.u.lahteet) + (r.u.syy ? ' · ' + r.u.syy + ' ' + JSON.stringify(r.u.syyJako) : '')));
  console.log('YHTEENSÄ ' + JSON.stringify(yht));
  return yht;
}

async function kpv() {
  if (require.main !== module) throw new Error('käsittelee tuotantodataa — aja suoraan');
  const admin = require(path.join(__dirname, '..', 'functions', 'node_modules', 'firebase-admin'));
  admin.initializeApp({ projectId: 'talentmaster-pilot' });
  const db = admin.firestore(), seura = (process.argv.find((a) => a.indexOf('--seura=') === 0) || '--seura=kpv').split('=')[1];
  const [ps, js] = await Promise.all([db.collection('seurat').doc(seura).collection('pelaajat').get(), db.collection('seurat').doc(seura).collection('joukkueet').get()]);
  const KENTAT = ['joukkueet', 'joukkue', 'syntymaVuosi', 'sukupuoli', 'tki_viimeisin', 'tki_pvm', 'tsi_viimeisin', 'tsi_pvm', 'sm_juoksu_viimeisin', 'sm_juoksu_taso', 'hh_viimeisin', 'hh_pvm', 'hh_taso', 'd1_taso', 'd2_taso', 'd2_lahde', 'd2_pvm', 'sm_pallo_viimeisin', 'sm_pallo_taso', 'tki_merkki'];
  const pelaajat = ps.docs.map((d) => { const x = d.data(), o = { id: d.id }; KENTAT.forEach((k) => { if (x[k] !== undefined) o[k] = x[k]; }); return o; });   // vain mittarikentät — ei nimiä
  const docs = js.docs.map((d) => ({ id: d.id, nimi: d.data().nimi || d.id }));
  console.log('seura ' + seura + ': ' + pelaajat.length + ' pelaajaa, ' + docs.length + ' joukkuetta (vain luku)');
  const tilasto = {}; pelaajat.forEach((p) => { const m = tekniikkaMittari(p, Date.now()); const k = m.mittari ? m.mittari : (m.vanhat.length ? 'ei tuoretta (' + m.vanhat[0] + ')' : 'ei mittausta'); tilasto[k] = (tilasto[k] || 0) + 1; });
  console.log('pelaajia mittarin mukaan: ' + JSON.stringify(tilasto));
  const d2l = {}; pelaajat.forEach((p) => { if (p.d2_taso != null) { const k = p.d2_lahde || '(ei lähdettä)'; d2l[k] = (d2l[k] || 0) + 1; } });
  console.log('d2_taso lähteen mukaan: ' + JSON.stringify(d2l) + ' · sm_juoksu/sm_pallo_taso: ' + pelaajat.filter((p) => p.sm_pallo_taso != null).length + ' pelaajalla');
  const syyt = {}; let mitattu = 0; pelaajat.forEach((p) => { const m = tekniikkaMittari(p, Date.now()); if (m.neutraali) { syyt[m.huom] = (syyt[m.huom] || 0) + 1; return; } if (!m.mittari) { const k = m.vanhat.length ? 'ei dataa: ' + m.vanhat[0] : 'ei dataa: ei mittausta'; syyt[k] = (syyt[k] || 0) + 1; return; } mitattu++; const k = m.heikko ? m.syy : 'ok'; syyt[k] = (syyt[k] || 0) + 1; });
  console.log('PELAAJAT (luokituksessa mitattu ' + mitattu + '/' + pelaajat.length + '; neutraali ja ei-dataa erikseen): ' + JSON.stringify(syyt));
  raportti(seura.toUpperCase() + ' (oikea data)', pelaajat, docs, Date.now());
}


/* ── K8: miten *_pvm-kentät ovat jakautuneet (vain luku, ei nimiä): node scripts/diag_tekniikka_maaritelma.cjs pvm [seura] ── */
async function pvmTarkistus() {
  if (require.main !== module) throw new Error('käsittelee tuotantodataa — aja suoraan');
  const admin = require(path.join(__dirname, '..', 'functions', 'node_modules', 'firebase-admin'));
  admin.initializeApp({ projectId: 'talentmaster-pilot' });
  const db = admin.firestore(), valittu = process.argv[3];
  const seurat = valittu ? [valittu] : (await db.collection('seurat').get()).docs.map((d) => d.id);
  const KENTAT = [['tki_viimeisin', 'tki_pvm'], ['hh_viimeisin', 'hh_pvm'], ['tsi_viimeisin', 'tsi_pvm']];
  for (const sid of seurat) {
    const ps = await db.collection('seurat').doc(sid).collection('pelaajat').get();
    if (!ps.size) continue;
    console.log('\n── ' + sid + ' (' + ps.size + ' pelaajaa)');
    KENTAT.forEach(([arvoK, pvmK]) => {
      const arvolla = ps.docs.map((d) => d.data()).filter((x) => x[arvoK] != null), hist = {};
      let tyhja = 0; arvolla.forEach((x) => { const d = x[pvmK]; if (d == null || String(d).trim() === '') { tyhja++; return; } const k = String(ms(d) ? new Date(ms(d)).toISOString().slice(0, 10) : d); hist[k] = (hist[k] || 0) + 1; });
      if (!arvolla.length) return;
      const top = Object.entries(hist).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, n]) => k + ':' + n).join(' ');
      const recalc = pvmK === 'tsi_pvm' ? arvolla.filter((x) => x.tsi_recalc).length : null;
      console.log('  ' + pvmK.padEnd(8) + 'arvoja ' + String(arvolla.length).padEnd(4) + 'ilman päivää ' + String(tyhja).padEnd(3) + 'eri päiviä ' + String(Object.keys(hist).length).padEnd(3) + 'yleisimmät ' + top + (recalc != null ? ' · recalc-kirjoittamia ' + recalc : '') + (hist['2026-01-20'] ? ' · WALLSPORT-VARAPÄIVÄ 2026-01-20: ' + hist['2026-01-20'] : ''));
    });
  }
}

/* ── SM-tasojen jakauma (vain luku): node scripts/diag_tekniikka_maaritelma.cjs sm sjk ── */
async function smJakauma(seura) {
  if (require.main !== module) throw new Error('käsittelee tuotantodataa — aja suoraan');
  const admin = require(path.join(__dirname, '..', 'functions', 'node_modules', 'firebase-admin'));
  admin.initializeApp({ projectId: 'talentmaster-pilot' });
  const ps = await admin.firestore().collection('seurat').doc(seura).collection('pelaajat').get();
  const R = ps.docs.map((d) => d.data()).filter((x) => x.sm_pallo_viimeisin != null).map((x) => {
    const sp = spMN(x), ika = E.normiIka(x.syntymaVuosi, x.tsi_pvm || null, x.joukkue);
    return { ika, sp, tp: smTaso(x.sm_pallo_viimeisin, 'sm_pallo', ika, sp), tj: smTaso(x.sm_juoksu_viimeisin, 'sm_juoksu', ika, sp), tallPallo: x.sm_pallo_taso, tallJuoksu: x.sm_juoksu_taso };
  });
  console.log('seura ' + seura + ': SM-pallo-tulos ' + R.length + ' pelaajalla');
  const hist = (f) => { const h = {}; R.forEach((r) => { const k = f(r); h[k] = (h[k] || 0) + 1; }); return Object.keys(h).sort().reduce((o, k) => (o[k] = h[k], o), {}); };
  console.log('SM-pallon taso (laskettu nyt):  ' + JSON.stringify(hist((r) => r.tp)));
  console.log('SM-juoksun taso (laskettu nyt): ' + JSON.stringify(hist((r) => r.tj)));
  console.log('ero pallo − juoksu (tasoa):     ' + JSON.stringify(hist((r) => (r.tp && r.tj ? r.tp - r.tj : 'ei paria'))));
  const ris = {}; R.forEach((r) => { const k = 'pallo ' + r.tp + ' / juoksu ' + r.tj; ris[k] = (ris[k] || 0) + 1; });
  console.log('pallo × juoksu (taso/taso):     ' + JSON.stringify(Object.keys(ris).sort().reduce((o, k) => (o[k] = ris[k], o), {})));
  const p1 = R.filter((r) => r.tp === 1);
  console.log('pallo = 1: ' + p1.length + ' pelaajaa, joista juoksu = 1: ' + p1.filter((r) => r.tj === 1).length + ', juoksu ≤ 2: ' + p1.filter((r) => r.tj <= 2).length + ', juoksu ≥ 3: ' + p1.filter((r) => r.tj >= 3).length);
  const eri = R.filter((r) => (r.tallPallo != null && r.tallPallo !== r.tp) || (r.tallJuoksu != null && r.tallJuoksu !== r.tj)).length;
  console.log('tallennettu sm_*_taso eroaa nyt lasketusta: ' + eri + ' / ' + R.filter((r) => r.tallPallo != null || r.tallJuoksu != null).length + ' (K11: joukkuenimen ikä vs normiIka)');
  console.log('ikäjakauma: ' + JSON.stringify(hist((r) => r.ika + (r.sp === 'M' ? 'P' : 'T'))));
}

if (process.argv[2] === 'pvm') pvmTarkistus().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
else if (process.argv[2] === 'sm') smJakauma(process.argv[3] || 'sjk').then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
else if (process.argv[2] === 'kpv') kpv().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
else {
  const F = require('../tests/helpers/vp_fixture.cjs'), nyt = Date.UTC(2026, 9, 10, 12);
  ['pilotti', 'kypsa', 'kuormitus'].forEach((n) => { const d = F.lataa(n, nyt); raportti('fixture ' + n, d.pelaajat, d.joukkueDocs, nyt); });
}
module.exports = { RAJA, tekniikkaMittari, ehdotettuLuokka };
