#!/usr/bin/env node
/* diag_nakyma_ennen_jalkeen.cjs — KUIVA, VAIN LUKU (.get(), gcloud ADC), ei nimiä. "Yksi totuus näkymissä": joukkueen luvut ENNEN (vanha Masterin laskentatapa tallennetuista tasoista, 12 kk) ja JÄLKEEN (lib/tm_nakyma_ryhmat.js).
 *   node scripts/diag_nakyma_ennen_jalkeen.cjs --seura=kpv --joukkueet=kpv_u13,<P12-id>
 *   node scripts/diag_nakyma_ennen_jalkeen.cjs --seura=sjk --joukkueet=<P15-id>        (ilman --joukkueet: joukkuelista ja pelaajamäärät)
 * ENNEN = mitä Master näytti: D2 "mitattu"/pylväät = pelaajat joilla on d2-taso (laskeD2Joustava), popup = samat, banneri = tulos yli 12 kk (max hh/d1/tki/flei_pvm), "Testattu" = hh_taso|d1_taso|tki ≠ null / kaikki. */
'use strict';
const path = require('path');
const E = require('../lib/tm_eerikkila_normit.js'), JK = require('../lib/tm_joukkue.js'), PVM = require('../lib/tm_pvm.js');
['tm_normisto', 'tm_testipaiva', 'tm_joukkuesaanto', 'tm_tekniikka', 'tm_fyysinen', 'tm_koti_luvut'].forEach((m) => require('../lib/' + m + '.js'));
const NR = require('../lib/tm_nakyma_ryhmat.js');
const arg = (n, d) => { const a = process.argv.find((x) => x.indexOf('--' + n + '=') === 0); return a ? a.split('=')[1] : d; };
const iso = (t) => (t && t.toDate ? t.toDate().toISOString().slice(0, 10) : (t ? String(t).slice(0, 10) : null));
const ikaSp = (p) => { const jm = String(p.joukkue || '').match(/\b([PTU])\s?(\d{1,2})\b/i); const pvm = p.hh_pvm || p.d1_pvm || p.tki_pvm || p.d2_pvm || null; let ika = E.normiIka(p.syntymaVuosi, pvm, p.joukkue); if (ika == null && jm) ika = +jm[2]; const s = p.sukupuoli === 'N' || p.sukupuoli === 'T' ? 'N' : (p.sukupuoli === 'P' || p.sukupuoli === 'M') ? 'M' : (jm && jm[1].toUpperCase() === 'T' ? 'N' : 'M'); return { ika, sp: s }; };
function ennen(P) {
  const mp = (p) => [p.hh_pvm, p.d1_pvm, p.tki_pvm, p.flei_pvm].filter(Boolean).map(iso).sort().pop() || null;
  const vanhoja = P.filter((p) => mp(p) && PVM.tmTasoVanhentunut(mp(p))).length, Pt = P.filter((p) => !(mp(p) && PVM.tmTasoVanhentunut(mp(p))));
  const d2 = Pt.filter((p) => { const x = ikaSp(p), r = E.laskeD2Joustava(p, x.ika, x.sp); return (r ? r.taso : p.d2_taso) != null; }).length;
  const kehit = Pt.filter((p) => { const x = ikaSp(p), r = E.laskeD2Joustava(p, x.ika, x.sp), t = r ? r.taso : p.d2_taso; return t != null && t < 3; }).length;
  const testattu = P.filter((p) => p.hh_taso != null || p.d1_taso != null || p.tki_viimeisin != null).length;
  return { 'D2 mitattu (pylväiden summa, popup)': d2 + '/' + P.length, 'popup "Kehityskohteet (taso < 3)"': kehit, 'banneri "yli 12 kk vanha"': vanhoja, 'Testattu': testattu + '/' + P.length + ' = ' + Math.round(testattu / P.length * 100) + ' %' };
}
function jalkeen(P, nimi) {
  const nyt = Date.now(), Y = NR.tmNakymaYhteenveto(P, nyt, { joukkueNimi: nimi }), R1 = Y.d1, R2 = Y.d2, g = (R) => JSON.stringify(Object.fromEntries(NR.RYHMAT.map((x) => [x, R.ryhmat[x].length])));
  return { 'D2 ryhmät': g(R2) + ' → ' + R2.luokka.luokka, 'D2 kortti': NR.tmKorttiSyy(R2), 'D1 ryhmät': g(R1) + ' → ' + R1.luokka.luokka, 'D1 kortti': NR.tmKorttiSyy(R1), 'banneri': NR.tmBanneriTeksti(Y.banneri), 'Testattu (tuoreesti luokitellut)': Y.kattavuus.testattu + '/' + Y.kattavuus.yht + ' = ' + Math.round(Y.kattavuus.testattu / Y.kattavuus.yht * 100) + ' % · vain vanha ' + Y.kattavuus.vainVanha + ' · ei tulosta ' + Y.kattavuus.ilmanTulosta };
}
async function main() {
  const admin = require(path.join(__dirname, '..', 'functions', 'node_modules', 'firebase-admin')); admin.initializeApp({ projectId: 'talentmaster-pilot' });
  const db = admin.firestore(), sid = arg('seura', 'kpv'), valitut = arg('joukkueet') ? arg('joukkueet').split(',') : null;
  const [ps, js] = await Promise.all([db.collection('seurat').doc(sid).collection('pelaajat').get(), db.collection('seurat').doc(sid).collection('joukkueet').get()]);
  const docs = js.docs.map((d) => ({ id: d.id, nimi: d.data().nimi || d.id })), pel = ps.docs.map((d) => Object.assign({ id: d.id }, d.data()));
  const jasen = (id) => pel.filter((p) => JK.tmPelaajanJoukkueet(p, docs).indexOf(id) >= 0);
  if (!valitut) { console.log(docs.map((j) => j.id + '=' + j.nimi + '(' + jasen(j.id).length + ')').join(' · ')); return; }
  valitut.forEach((id) => { const d = docs.find((j) => j.id === id); if (!d) return console.log('ei joukkuetta ' + id); const P = jasen(id);
    console.log('\n══ ' + sid + ' / ' + id + ' (' + d.nimi + ', ' + P.length + ' pelaajaa) — vain luku'); console.log('ENNEN:'); Object.entries(ennen(P)).forEach(([k, v]) => console.log('  ' + k + ': ' + v)); console.log('JÄLKEEN:'); Object.entries(jalkeen(P, d.nimi)).forEach(([k, v]) => console.log('  ' + k + ': ' + v)); });
}
if (require.main === module) main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
module.exports = { ennen, jalkeen };
