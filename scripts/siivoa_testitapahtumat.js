#!/usr/bin/env node
'use strict';
/**
 * siivoa_testitapahtumat.js — K35-13 #3 · testidatan siivous kalenterista (esim. KPV:n harjoitukset = Teron testejä, vahvistettu 12.10.). KUIVA-AJO OLETUKSENA.
 *   node scripts/siivoa_testitapahtumat.js --seura kpv --tyyppi harjoitus                # kuiva-ajo: listaa (pvm, tyyppi, nimi, joukkue, sarja, luoja) + yhteismäärä
 *   node scripts/siivoa_testitapahtumat.js --seura kpv --tyyppi harjoitus --kirjoita     # SOFT-DELETE: poistettu: true, poistettu_syy: 'testidata', poistettu_pvm (palvelinaika) — EI hard deleteä
 * Vain annettu tyyppi (kanoninen: tm_kalenteri_tyypit; palaverit, testitapahtumat, kasvumittaukset ym. jäävät). Jo poistetut ohitetaan. Admin SDK + ADC.
 * JÄLKEEN: aja `node scripts/taydenna_harjoituskertyma.js --seura <id> --kirjoita` uudelleen, jotta pelaajien kertymäkorit nollautuvat.
 */
const TY = require('../lib/tm_kalenteri_tyypit.js'), PROJECT_ID = 'talentmaster-pilot';
const _s = (x) => (x == null ? '' : String(x).trim());
const _pvm = (e) => { if (_s(e.pvm)) return _s(e.pvm); const a = e.alkaa; const d = a && typeof a.toDate === 'function' ? a.toDate() : (a ? new Date(a) : null); return d && !isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : ''; };

/** PURE: → { valitut:[{id, pvm, tyyppi, nimi, joukkue, sarja, luoja}], ohitettu:{poistettu, muuTyyppi} } — vain annettu kanoninen tyyppi, ei jo poistettuja. */
function valitse(tapahtumat, tyyppi) {
  const avain = TY.tmKalTyyppiAvain(tyyppi), tulos = { valitut: [], ohitettu: { poistettu: 0, muuTyyppi: 0 } };
  (tapahtumat || []).forEach((e) => {
    if (!e) return;
    if (TY.tmKalTyyppiAvain(e.tyyppi) !== avain) { tulos.ohitettu.muuTyyppi++; return; }
    if (e.poistettu === true) { tulos.ohitettu.poistettu++; return; }
    tulos.valitut.push({ id: e.id, pvm: _pvm(e), tyyppi: avain, nimi: _s(e.nimi), joukkue: _s(e.joukkue_nimi || e.joukkue), sarja: _s(e.toistuvuus_sarja_id), luoja: _s(e.luoja_uid) });
  });
  tulos.valitut.sort((a, b) => (a.pvm < b.pvm ? -1 : a.pvm > b.pvm ? 1 : 0));
  return tulos;
}

async function aja({ db, deps, seura, tyyppi, kirjoita, loki }) {
  if (!_s(seura)) throw new Error('Keskeytetty: --seura vaaditaan.');
  const k0 = _s(tyyppi).toLowerCase(); if (!k0 || !((TY.TYYPIT && TY.TYYPIT[k0]) || (TY.ALIAKSET && TY.ALIAKSET[k0]))) throw new Error("Keskeytetty: --tyyppi vaaditaan ja sen pitää olla tunnettu kalenterityyppi (esim. harjoitus); sai '" + tyyppi + "'.");
  loki = loki || console.log;
  const col = db.collection('seurat').doc(seura).collection('kalenteri'), sn = await col.get(), kaikki = []; sn.forEach((d) => kaikki.push(Object.assign({ id: d.id }, d.data() || {})));
  const r = valitse(kaikki, tyyppi);
  loki((kirjoita ? 'KIRJOITUS (soft-delete)' : 'KUIVA-AJO (ei kirjoiteta)') + ' · seura ' + seura + ' · tyyppi ' + TY.tmKalTyyppiAvain(tyyppi) + ' · ' + kaikki.length + ' tapahtumaa kalenterissa');
  r.valitut.forEach((v) => loki('  ' + [v.pvm, v.tyyppi, v.nimi || '—', v.joukkue || '(ei joukkuetta)', v.sarja ? 'sarja ' + v.sarja : '—', v.luoja || '—'].join(' · ') + '  [' + v.id + ']'));
  loki('Yhteensä: ' + r.valitut.length + ' tapahtumaa' + (kirjoita ? ' merkitty poistetuksi (poistettu_syy: testidata).' : ' (kuiva-ajo). Kirjoita lipulla --kirjoita.') + ' · ohitettu: ' + r.ohitettu.poistettu + ' jo poistettua, ' + r.ohitettu.muuTyyppi + ' muuta tyyppiä (ei kosketa).');
  if (kirjoita) {
    const aika = deps && deps.palvelinAika ? deps.palvelinAika() : new Date().toISOString();
    for (let i = 0; i < r.valitut.length; i += 400) { const b = db.batch(); r.valitut.slice(i, i + 400).forEach((v) => b.update(col.doc(v.id), { poistettu: true, poistettu_syy: 'testidata', poistettu_pvm: aika })); await b.commit(); }
    loki('SEURAAVAKSI: aja `node scripts/taydenna_harjoituskertyma.js --seura ' + seura + ' --kirjoita` uudelleen, jotta pelaajien kertymäkorit nollautuvat.');
  }
  return r;
}
function lueArgit(argv) {
  const arg = (k) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : null; }, seura = arg('seura'), tyyppi = arg('tyyppi'), kayt = 'Käyttö: node scripts/siivoa_testitapahtumat.js --seura <id> --tyyppi <tyyppi> [--kirjoita]';
  if (!seura || seura.charAt(0) === '-' || /[\/\s]/.test(seura)) throw new Error(kayt);
  if (!tyyppi || tyyppi.charAt(0) === '-') throw new Error(kayt + '   (--tyyppi pakollinen, esim. harjoitus)');
  return { seura, tyyppi, kirjoita: argv.includes('--kirjoita') };
}
async function main() {
  let a; try { a = lueArgit(process.argv.slice(2)); } catch (e) { console.error(e.message); process.exit(1); }
  const admin = require('firebase-admin'); if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId: PROJECT_ID });
  await aja({ db: admin.firestore(), deps: { palvelinAika: () => admin.firestore.FieldValue.serverTimestamp() }, seura: a.seura, tyyppi: a.tyyppi, kirjoita: a.kirjoita });
}
module.exports = { valitse, aja, lueArgit };
if (require.main === module) main().catch((e) => { console.error('VIRHE:', e.message); process.exit(1); });
