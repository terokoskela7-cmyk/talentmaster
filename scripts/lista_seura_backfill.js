#!/usr/bin/env node
'use strict';
/**
 * Seuran lista_seura — BACKFILL + TARKISTUSAJO. TERO AJAA (staging → tuotanto); Code ei aja.
 * Backfill: rakentaa seurat/{sid}/lista_seura/{_meta|sNNNN} (+ lista_joukkue) samalla laskennalla kuin palvelin (functions/lista_yhteenveto.js laskeSeura).
 * Tarkistusajo (--tarkista): vertaa KOOSTETTA pelaajadokumentteihin — puuttuvat / ylimääräiset / eroavat rivit. Tulostaa VAIN lukumääriä seuroittain (ei nimiä, ei ID:itä, ei PIN:iä).
 *   Vertailu: lista_seura-rivit (Admin SDK) vs. tuore tmListaSeuraRivi(pelaajadokumentti) samalla libillä; poissuljettu poistettu/arkistoitu/aktiivinen===false (kuten palvelin).
 *   Huom: koosteen ikä ei ole "ero" (eventuaalinen johdonmukaisuus ≤ ~1 min); aja tarkistus heti backfillin jälkeen tai kun likaisia merkkejä ei ole (tulostetaan lkm).
 * OLETUS = KUIVA-AJO (ei kirjoita). AJO (gcloud ADC, ei SA-avainta):
 *   node scripts/lista_seura_backfill.js                                   → kuiva-ajo: seuroittain pelaajia/sivuja/kt/laskurit
 *   node scripts/lista_seura_backfill.js --projekti=talentmaster-staging   → staging (oletus talentmaster-pilot)
 *   node scripts/lista_seura_backfill.js --seura=<id> --kirjoita           → kirjoittaa yhden seuran
 *   node scripts/lista_seura_backfill.js --kirjoita                        → kirjoittaa kaikki aktiiviset
 *   node scripts/lista_seura_backfill.js --tarkista [--seura=<id>]         → pariteettivertailu; poistumiskoodi 1 jos eroja
 */
const admin = require('firebase-admin');
const S = require('../functions/lista_yhteenveto');
const L = require('../functions/tm_lista_yhteenveto');

const arg = (nimi) => { const a = process.argv.find((x) => x.startsWith('--' + nimi + '=')); return a ? a.slice(nimi.length + 3) : null; };
const kirjoita = process.argv.includes('--kirjoita'), tarkista = process.argv.includes('--tarkista');
const projekti = arg('projekti') || 'talentmaster-pilot', vainSeura = arg('seura');
const poissa = (d) => d.poistettu === true || d.arkistoitu === true || d.aktiivinen === false;   // = palvelimen _poissa

/** Vertaa yhden seuran koostetta pelaajadokumentteihin. Palauttaa lukumäärät. Vain Admin SDK -luku (db). */
async function tarkistaSeura(db, sid) {
  const ref = db.collection('seurat').doc(sid);
  const [pSnap, jSnap, kSnap, likSnap] = await Promise.all([ref.collection('pelaajat').get(), ref.collection('joukkueet').get(), ref.collection('lista_seura').get(), ref.collection('lista_likainen').get()]);
  const joukkueet = jSnap.docs.map((d) => ({ id: d.id, nimi: (d.data() || {}).nimi || '' }));
  const tuore = new Map(); L.tmListaSeuraDokumentit(pSnap.docs.filter((d) => !poissa(d.data() || {})).map((d) => ({ id: d.id, data: d.data() || {} })), joukkueet, 0).forEach((x) => { if (x.id !== '_meta') x.data.rivit.forEach((r) => tuore.set(r.id, JSON.stringify(r))); });
  const dokt = {}; kSnap.docs.forEach((d) => { dokt[d.id] = d.data(); });
  const kooste = new Map(); Object.keys(dokt).filter((k) => k !== '_meta').forEach((k) => (dokt[k].rivit || []).forEach((r) => kooste.set(r.id, JSON.stringify(r))));
  let puuttuu = 0, ylimaara = 0, eroaa = 0;
  tuore.forEach((v, id) => { if (!kooste.has(id)) puuttuu++; else if (kooste.get(id) !== v) eroaa++; });
  kooste.forEach((v, id) => { if (!tuore.has(id)) ylimaara++; });
  const meta = dokt._meta || null, laskurit = L.tmListaSeuraLaskurit([...tuore.values()].map((x) => JSON.parse(x)));
  const laskuriEro = meta && meta.laskurit ? Object.keys(laskurit).filter((k) => (meta.laskurit[k] || 0) !== laskurit[k]).length : null;
  return { sid, pelaajia: tuore.size, koosteRiveja: kooste.size, puuttuu, ylimaara, eroaa, kelpaa: L.tmListaSeuraKelpaa(dokt), metaPuuttuu: !meta, laskuriEro, likaisia: likSnap.size };
}

async function main() {
  if (!admin.apps.length) admin.initializeApp({ projectId: projekti });
  const db = admin.firestore();
  if (tarkista) {
    console.log('TARKISTUSAJO · projekti ' + projekti + ' · ' + (vainSeura ? 'seura ' + vainSeura : 'kaikki aktiiviset seurat'));
    const seurat = (await db.collection('seurat').get()).docs.filter((s) => (s.data() || {}).aktiivinen !== false && (!vainSeura || vainSeura === s.id));
    let virheita = 0, eroja = 0;
    for (const s of seurat) {
      try {
        const r = await tarkistaSeura(db, s.id), ero = r.puuttuu + r.ylimaara + r.eroaa + (r.laskuriEro || 0) + (r.kelpaa ? 0 : 1);
        eroja += ero ? 1 : 0;
        console.log('  ' + (ero ? '✗ ' : '✓ ') + r.sid + ': ' + r.pelaajia + ' pelaajaa · kooste ' + r.koosteRiveja + ' riviä · puuttuu ' + r.puuttuu + ' · ylimääräisiä ' + r.ylimaara + ' · eroavia ' + r.eroaa + ' · laskurieroja ' + (r.laskuriEro == null ? '—' : r.laskuriEro) + ' · kelpaa ' + (r.kelpaa ? 'kyllä' : 'EI') + (r.metaPuuttuu ? ' (_meta puuttuu)' : '') + (r.likaisia ? ' · likaisia merkkejä ' + r.likaisia + ' (odottaa uudelleenkoostetta)' : ''));
      } catch (e) { virheita++; console.log('  ✗ ' + s.id + ': ' + (e && e.message || e)); }
    }
    console.log('Valmis: ' + seurat.length + ' seuraa, ' + eroja + ' seuraa joissa eroja, ' + virheita + ' virhettä');
    process.exit(eroja || virheita ? 1 : 0);
  }
  console.log((kirjoita ? 'KIRJOITUS' : 'KUIVA-AJO (ei kirjoita; lisää --kirjoita)') + ' · projekti ' + projekti + ' · ' + (vainSeura ? 'seura ' + vainSeura : 'kaikki aktiiviset seurat'));
  const r = await S.laskeKaikki({ db, FieldValue: admin.firestore.FieldValue }, { nytMs: Date.now(), kuiva: !kirjoita, vainSeura });
  r.tulokset.forEach((x) => console.log('  ' + x.sid + ': ' + x.pelaajia + ' pelaajaa · ' + x.seuraSivuja + ' sivua · ' + Math.round(x.seuraTavuja / 1024) + ' kt · laskurit ' + JSON.stringify(x.seuraLaskurit)));
  r.virheet.forEach((v) => console.log('  ✗ ' + v.sid + ': ' + v.viesti));
  console.log('Valmis: ' + r.tulokset.length + ' seuraa ok, ' + r.virheet.length + ' virhettä' + (kirjoita ? '' : ' (kuiva-ajo)'));
  process.exit(r.virheet.length ? 1 : 0);
}
// Vahinkoajon esto: ajo vain suoraan, ei require/import-kutsulla (tests/scripts_ei_ajeta_requirella.test.js).
if (require.main === module) { main().catch((e) => { console.error(e); process.exit(1); }); }
module.exports = { main, tarkistaSeura };
