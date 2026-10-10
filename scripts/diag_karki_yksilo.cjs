#!/usr/bin/env node
/* diag_karki_yksilo.cjs — KUIVA, VAIN LUKU. Kartoitus: "Kärkipelaajien taso alle ikätason" (huomio, talenttiydin) vs. "Yksilöllinen ohjelma" (ehdotus hh_taso_alhainen).
 * Lasketaan NYKYISILLÄ säännöillä joukkueittain (ei nimiä): lib/tm_eerikkila_normit.js laskeJoukkuePoikkeamat (talenttiydin, alle_normin/fyysiset, hajonta, laskeva)
 * ja VP_v25 TP_SIGNAALIT hh_taso_alhainen (≥ 2 pelaajaa hh_taso < 2.5) / suunta_lasku.
 * Ajo:  node scripts/diag_karki_yksilo.cjs              fixturet (pilotti · kypsa · kuormitus)
 *       node scripts/diag_karki_yksilo.cjs seura kpv|sjk  oikea data, VAIN .get() (gcloud ADC), tulosteessa vain joukkueen nimi ja lukumäärät */
'use strict';
const path = require('path');
const E = require('../lib/tm_eerikkila_normit.js'), JK = require('../lib/tm_joukkue.js');
const ikaSp = (nimi) => { const s = String(nimi || ''), a = s.match(/\b[PTU]?\s?(\d{1,2})\b/i) || s.match(/(\d{1,2})/), b = s.match(/\b([PT])\s?\d/i); return { ika: a ? parseInt(a[1] || a[0], 10) : null, sp: b && b[1].toUpperCase() === 'T' ? 'N' : 'M' }; };
function raportti(nimi, pelaajat, docs) {
  const per = {}; docs.forEach((d) => { per[d.id] = []; });
  pelaajat.forEach((p) => JK.tmPelaajanJoukkueet(p, docs).forEach((id) => { if (per[id]) per[id].push(p); }));
  const rivit = docs.map((d) => {
    const pp = per[d.id]; if (!pp.length) return null; const is = ikaSp(d.nimi), pk = E.laskeJoukkuePoikkeamat(pp, is.ika, is.sp);
    const lkm = (f) => pp.filter(f).length;
    const tal = pk.find((x) => x.tyyppi === 'talenttiydin'), fys = pk.filter((x) => x.tyyppi === 'alle_normin' && x.osaAlue !== 'tekniikka'), haj = pk.find((x) => x.tyyppi === 'hajonta');
    const hh25 = lkm((p) => p.hh_taso != null && p.hh_taso < 2.5), lasku = lkm((p) => p.hh_taso != null && p.hh_taso_edellinen != null && (p.hh_taso - p.hh_taso_edellinen) < -0.3);
    const hhMitattu = lkm((p) => p.hh_taso != null), d1Mitattu = lkm((p) => p.d1_taso != null);
    return { joukkue: d.nimi, pel: pp.length, hhMitattu, d1Mitattu, huomioKarki: tal ? 'KYLLÄ (top-ka ' + tal.arvo + ')' : 'ei', huomioFyys: fys.length ? fys.map((x) => x.osaAlue + ' ' + x.arvo).join(', ') : 'ei', hajonta: haj ? 'kyllä' : 'ei',
      ehdYksilo: hh25 >= 2 ? 'KYLLÄ (' + hh25 + ' pel. hh<2,5)' : 'ei (' + hh25 + ')', ehdLasku: lasku >= 2 ? 'KYLLÄ (' + lasku + ')' : 'ei (' + lasku + ')', k: !!tal, e: hh25 >= 2, f: fys.length > 0 };
  }).filter(Boolean);
  console.log('\n══ ' + nimi + ' ══  joukkue | pel | hh-mitattu | d1-mitattu | HUOMIO kärki | HUOMIO fyysiset (alle normin) | EHDOTUS yksilöllinen (hh_taso<2,5, ≥2)');
  rivit.forEach((r) => console.log(String(r.joukkue).slice(0, 26).padEnd(27) + String(r.pel).padEnd(4) + String(r.hhMitattu).padEnd(4) + String(r.d1Mitattu).padEnd(4) + r.huomioKarki.padEnd(22) + r.huomioFyys.slice(0, 40).padEnd(42) + r.ehdYksilo));
  console.log('YHTEENSÄ joukkueita ' + rivit.length + ' · huomio kärki ' + rivit.filter((r) => r.k).length + ' · huomio fyysiset ' + rivit.filter((r) => r.f).length + ' · ehdotus yksilöllinen ' + rivit.filter((r) => r.e).length + ' · ehdotus lasku ' + rivit.filter((r) => /^KYLLÄ/.test(r.ehdLasku)).length);
}
async function seura(id) {
  if (require.main !== module) throw new Error('käsittelee tuotantodataa — aja suoraan');
  const admin = require(path.join(__dirname, '..', 'functions', 'node_modules', 'firebase-admin'));
  admin.initializeApp({ projectId: 'talentmaster-pilot' });
  const db = admin.firestore(), [ps, js] = await Promise.all([db.collection('seurat').doc(id).collection('pelaajat').get(), db.collection('seurat').doc(id).collection('joukkueet').get()]);
  const K = ['id', 'joukkueet', 'joukkue', 'syntymaVuosi', 'sukupuoli', 'talenttiOhjelma', 'd1_taso', 'hh_taso', 'hh_taso_edellinen', 'd2_taso', 'd2_lahde', 'tki_viimeisin', 'tki_edellinen', 'hh_viimeisin', 'hh_pvm', 'd1_pvm', 'd2_pvm', 'phv_tila', 'biologinenIka_viimeisin'];
  const pel = ps.docs.map((d) => { const x = d.data(), o = { id: d.id }; K.forEach((k) => { if (x[k] !== undefined) o[k] = x[k]; }); return o; });
  console.log('seura ' + id + ': ' + pel.length + ' pelaajaa; hh_taso ' + pel.filter((p) => p.hh_taso != null).length + ', d1_taso ' + pel.filter((p) => p.d1_taso != null).length + ', d2_taso ' + pel.filter((p) => p.d2_taso != null).length + ', talenttiOhjelma ' + pel.filter((p) => p.talenttiOhjelma === true).length);
  raportti(id.toUpperCase(), pel, js.docs.map((d) => ({ id: d.id, nimi: d.data().nimi || d.id })));
}
if (process.argv[2] === 'seura') seura(process.argv[3] || 'sjk').then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
else { const F = require('../tests/helpers/vp_fixture.cjs'), nyt = Date.UTC(2026, 9, 10, 12); ['pilotti', 'kypsa', 'kuormitus'].forEach((n) => { const d = F.lataa(n, nyt); raportti('fixture ' + n + ' (pelaajat; HUOM fixturen huomiot/ehdotukset-speksit ovat käsin annettuja)', d.pelaajat, d.joukkueDocs); const sp = d.spec; console.log('  speksin käsin annetut: huomio-rivejä ' + sp.huomiot.length + ' (kärki ' + sp.huomiot.filter((h) => h.tyyppi === 'talenttiydin').length + ', tekniikka ' + sp.huomiot.filter((h) => h.osaAlue === 'tekniikka').length + '), ehdotukset ' + sp.ehdotukset.map((e) => e.signaali + ':' + e.joukkueet.length).join(' · ')); }); }
