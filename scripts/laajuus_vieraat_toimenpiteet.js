#!/usr/bin/env node
/* laajuus_vieraat_toimenpiteet.js — VAIN LUKU (.get()), gcloud ADC. Projekti 03 / PR B4.
 * Kaikille seuroille: toimenpiteet-dokumentit, joiden joukkue ei vastaa seuran omia joukkueita (normalisoituna), KAIKKI tilat ja tyypit.
 * Lisäksi: sisältääkö vieraiden dokumenttien teksti jonkin pelaajan koko nimen (kaikkien seurojen pelaajat). Tulostaa VAIN lukumäärät.
 * Ajo (Tero): node scripts/laajuus_vieraat_toimenpiteet.js */
'use strict';
if (require.main !== module) throw new Error('käsittelee tuotantodataa — aja suoraan: node scripts/laajuus_vieraat_toimenpiteet.js');
const path = require('path');
const admin = require(path.join(__dirname, '..', 'functions', 'node_modules', 'firebase-admin'));
const { normJoukkue, onVieras } = require('./siivoa_toimenpide_tuplat.js');
(async () => {
  admin.initializeApp({ projectId: 'talentmaster-pilot' }); const db = admin.firestore();
  const seurat = (await db.collection('seurat').get()).docs.map((d) => d.id);
  const nimet = new Set(), data = [];
  for (const sid of seurat) {
    const s = db.collection('seurat').doc(sid);
    const [js, ts, ps] = await Promise.all([s.collection('joukkueet').get(), s.collection('toimenpiteet').get(), s.collection('pelaajat').get()]);
    ps.docs.forEach((d) => { const x = d.data() || {}; const n = ((x.etunimi || '') + ' ' + (x.sukunimi || '')).trim().toLowerCase(); if (n.indexOf(' ') > 0) nimet.add(n); if (x.nimi && String(x.nimi).indexOf(' ') > 0) nimet.add(String(x.nimi).toLowerCase()); });
    data.push({ sid, omat: new Set(js.docs.map((d) => normJoukkue((d.data() || {}).nimi || d.id))), ts: ts.docs.map((d) => d.data() || {}) });
  }
  const nimiLista = [...nimet];
  console.log('seuroja ' + seurat.length + ' · pelaajanimiä (koko nimi) indeksissä ' + nimiLista.length);
  let kokoVieras = 0, kokoNimia = 0;
  data.forEach((d) => {
    const vieras = d.ts.filter((t) => onVieras(t.joukkue, d.omat)), tilat = {}, tyypit = {};
    vieras.forEach((t) => { tilat[t.tila || '—'] = (tilat[t.tila || '—'] || 0) + 1; tyypit[t.tyyppi || '—'] = (tyypit[t.tyyppi || '—'] || 0) + 1; });
    const nimella = vieras.filter((t) => { const x = String(t.teksti || '').toLowerCase(); return x && nimiLista.some((n) => x.indexOf(n) >= 0); }).length;
    kokoVieras += vieras.length; kokoNimia += nimella;
    console.log('seura ' + d.sid + ': toimenpiteitä ' + d.ts.length + ' · omia joukkueita ' + d.omat.size + ' · vieraan joukkueen ' + vieras.length + ' · joista tekstissä pelaajan nimi ' + nimella
      + (vieras.length ? '\n    tilat ' + JSON.stringify(tilat) + ' · tyypit ' + JSON.stringify(tyypit) : ''));
  });
  console.log('YHTEENSÄ vieraan joukkueen ' + kokoVieras + ' · tekstissä pelaajan nimi ' + kokoNimia);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
