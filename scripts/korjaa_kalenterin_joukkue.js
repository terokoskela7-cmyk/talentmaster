#!/usr/bin/env node
'use strict';
/**
 * korjaa_kalenterin_joukkue.js — K35-12 #3b · kalenteritapahtumien joukkue-kenttä: NIMI → doc-ID -normalisointi. KUIVA-AJO OLETUKSENA.
 *   node scripts/korjaa_kalenterin_joukkue.js --seura kpv                # kuiva-ajo: tulostaa muutokset, ei kirjoita
 *   node scripts/korjaa_kalenterin_joukkue.js --seura kpv --kirjoita     # kirjoittaa seurat/kpv/kalenteri/{id}: joukkue, joukkue_nimi, joukkueet
 * Sääntö: `joukkue` ja `joukkueet[]` joukkueen doc-id:ksi (tmKanonisoiJoukkue — sama normalisointi kuin tmPelaajanJoukkueet: tyhjätila/isot kirjaimet/NBSP); `joukkue_nimi` = docin nimi.
 * EI KÄSITTELE joukkueettomia tapahtumia (joukkue tyhjä, joukkueet[] tyhjä) — ne jätetään koskematta eikä niitä listata (Tero poistaa käsin). EI arvaa joukkuetta.
 * Tunnistamaton nimi (ei vastaa mitään joukkue-docia) → jää ennalleen ja raportoidaan. Admin SDK + ADC (admin.credential.applicationDefault()). Ei kosketa poistettuihin tapahtumiin.
 */
const J = require('../lib/tm_joukkue.js'), PROJECT_ID = 'talentmaster-pilot';
const _s = (x) => (x == null ? '' : String(x).trim());

/** PURE: → { muutokset:[{id, data, vanha}], tunnistamattomat:[{id, arvo}], ennallaan:n, joukkueettomia:n } */
function laske(tapahtumat, joukkueDocs) {
  const docs = (joukkueDocs || []).filter((d) => d && d.id), idt = new Set(docs.map((d) => String(d.id))), nimiIdlla = {}; docs.forEach((d) => { nimiIdlla[d.id] = d.nimi; });
  const tulos = { muutokset: [], tunnistamattomat: [], ennallaan: 0, joukkueettomia: 0 };
  const idksi = (x) => { x = _s(x); if (!x) return { tyhja: true }; if (idt.has(x)) return { id: x }; const k = J.tmKanonisoiJoukkue(x, docs); return k ? { id: String(k.id) } : { tunnistamaton: x }; };
  (tapahtumat || []).forEach((e) => {
    if (!e || e.poistettu === true) return;
    const lista = Array.isArray(e.joukkueet) ? e.joukkueet : [], onJ = !!_s(e.joukkue), onL = lista.some((x) => _s(x));
    if (!onJ && !onL) { tulos.joukkueettomia++; return; }   // ei käsitellä lainkaan
    const j = onJ ? idksi(e.joukkue) : { tyhja: true }, l = lista.map(idksi).filter((r) => !r.tyhja);
    const tunn = [j, ...l].filter((r) => r.tunnistamaton).map((r) => r.tunnistamaton);
    if (tunn.length) { tulos.tunnistamattomat.push({ id: e.id, arvo: tunn.join(' | ') }); return; }   // ei muuteta osittain
    const uusiL = []; l.forEach((r) => { if (uusiL.indexOf(r.id) < 0) uusiL.push(r.id); });
    const uusiJ = j.id || (uusiL.length === 1 ? uusiL[0] : null); if (onJ && uusiJ && !uusiL.length) uusiL.push(uusiJ);   // joukkue-kenttä vain kun se oli jo asetettu (tai joukkueet[] kertoo yksiselitteisesti)
    const data = {}; if (onJ && uusiJ !== e.joukkue) data.joukkue = uusiJ;
    if (onJ && uusiJ && nimiIdlla[uusiJ] && e.joukkue_nimi !== nimiIdlla[uusiJ]) data.joukkue_nimi = nimiIdlla[uusiJ];
    if (JSON.stringify(uusiL) !== JSON.stringify(lista)) data.joukkueet = uusiL;
    if (Object.keys(data).length) tulos.muutokset.push({ id: e.id, data, vanha: { joukkue: e.joukkue == null ? null : e.joukkue, joukkueet: lista } }); else tulos.ennallaan++;
  });
  return tulos;
}

async function aja({ db, seura, kirjoita, loki }) {
  if (!_s(seura)) throw new Error('Keskeytetty: --seura vaaditaan.'); loki = loki || console.log;
  const sref = db.collection('seurat').doc(seura), jsn = await sref.collection('joukkueet').get(), docs = []; jsn.forEach((d) => docs.push({ id: d.id, nimi: (d.data() || {}).nimi }));
  const ksn = await sref.collection('kalenteri').get(), tap = []; ksn.forEach((d) => tap.push(Object.assign({ id: d.id }, d.data() || {})));
  const r = laske(tap, docs);
  loki((kirjoita ? 'KIRJOITUS' : 'KUIVA-AJO (ei kirjoiteta)') + ' · seura ' + seura + ' · ' + docs.length + ' joukkuetta · ' + tap.length + ' tapahtumaa');
  r.muutokset.forEach((m) => loki('  ' + m.id + ': ' + JSON.stringify(m.vanha) + ' → ' + JSON.stringify(m.data)));
  if (r.tunnistamattomat.length) { loki('Tunnistamaton joukkue (ei muutettu; ratkaise käsin):'); r.tunnistamattomat.forEach((t) => loki('  ' + t.id + ': ' + t.arvo)); }
  loki('Yhteensä: ' + r.muutokset.length + ' muutosta · ' + r.ennallaan + ' ennallaan · ' + r.tunnistamattomat.length + ' tunnistamatonta · ' + r.joukkueettomia + ' joukkueetonta ohitettu' + (kirjoita ? '' : ' (kuiva-ajo). Kirjoita lipulla --kirjoita.'));
  if (kirjoita) for (let i = 0; i < r.muutokset.length; i += 400) { const b = db.batch(); r.muutokset.slice(i, i + 400).forEach((m) => b.update(sref.collection('kalenteri').doc(m.id), m.data)); await b.commit(); }
  return r;
}
function lueArgit(argv) {
  const i = argv.indexOf('--seura'), seura = i >= 0 ? argv[i + 1] : null;
  if (!seura || seura.charAt(0) === '-' || /[\/\s]/.test(seura)) throw new Error('Käyttö: node scripts/korjaa_kalenterin_joukkue.js --seura <id> [--kirjoita]');
  return { seura, kirjoita: argv.includes('--kirjoita') };
}
async function main() {
  let a; try { a = lueArgit(process.argv.slice(2)); } catch (e) { console.error(e.message); process.exit(1); }
  const admin = require('firebase-admin'); if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId: PROJECT_ID });
  await aja({ db: admin.firestore(), seura: a.seura, kirjoita: a.kirjoita });
}
module.exports = { laske, aja, lueArgit };
if (require.main === module) main().catch((e) => { console.error('VIRHE:', e.message); process.exit(1); });
