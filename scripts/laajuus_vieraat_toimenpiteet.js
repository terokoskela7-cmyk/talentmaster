#!/usr/bin/env node
/* laajuus_vieraat_toimenpiteet.js — VAIN LUKU (.get()), gcloud ADC. Projekti 03 / PR B4 (seuranvaihdon kilpatilanne, vieraan seuran data).
 * Tulostaa VAIN lukumäärät, seuroittain ja kokoelmittain (ei tekstejä, nimiä eikä tunnisteita):
 *  · toimenpiteet: dokit, joiden joukkue ei kuulu seuraan (kaikki tilat/tyypit, pulssi_* mukana erikseen) + pelaajan koko nimi tekstissä
 *  · pelaajat: joukkue/joukkueNimi/joukkueId/joukkueet viittaa joukkueeseen, joka ei ole seuran oma (ja onko se jonkin toisen seuran joukkue);
 *    sama pelaaja-id usealla seuralla; osittaiset dokit (ei nimeä eikä syntymävuotta = set merge -jäänne)
 *  · seuranta_kuittaukset: vieras joukkue (jos kenttä) tai valmentaja_uid, jota ei ole seuran kayttajat-kokoelmassa
 * Ajo (Tero): node scripts/laajuus_vieraat_toimenpiteet.js */
'use strict';
if (require.main !== module) throw new Error('käsittelee tuotantodataa — aja suoraan: node scripts/laajuus_vieraat_toimenpiteet.js');
const path = require('path');
const admin = require(path.join(__dirname, '..', 'functions', 'node_modules', 'firebase-admin'));
const V = require('../lib/tm_valvonta.js');   // projekti 07 / PR 1: luokittelu puhtaassa libissä; skripti on vain I/O-kuori
const { normJoukkue, onVieras, vieraatViitteet } = V;
const pelaajanNimi = (x) => ((x.etunimi || '') + ' ' + (x.sukunimi || '')).trim().toLowerCase();
const kasvata = (o, k) => { o[k] = (o[k] || 0) + 1; };
(async () => {
  admin.initializeApp({ projectId: 'talentmaster-pilot' }); const db = admin.firestore();
  const seurat = (await db.collection('seurat').get()).docs.map((d) => d.id);
  const data = [], pelaajanSeurat = {}, nimet = new Set(), kaikkiJoukkueNimet = {};   // nimi → Set(seurat)
  for (const sid of seurat) {
    const s = db.collection('seurat').doc(sid);
    const [js, ts, ps, ks, ku] = await Promise.all(['joukkueet', 'toimenpiteet', 'pelaajat', 'seuranta_kuittaukset', 'kayttajat'].map((k) => s.collection(k).get()));
    const omatNimet = new Set(js.docs.map((d) => normJoukkue((d.data() || {}).nimi || d.id))), omatIdt = new Set(js.docs.map((d) => String(d.id)));
    omatNimet.forEach((n) => { (kaikkiJoukkueNimet[n] = kaikkiJoukkueNimet[n] || new Set()).add(sid); });
    ps.docs.forEach((d) => { (pelaajanSeurat[d.id] = pelaajanSeurat[d.id] || []).push(sid); const x = d.data() || {}; const n = pelaajanNimi(x); if (n.indexOf(' ') > 0) nimet.add(n); if (x.nimi && String(x.nimi).indexOf(' ') > 0) nimet.add(String(x.nimi).toLowerCase()); });
    data.push({ sid, omatNimet, omatIdt, ts: ts.docs.map((d) => Object.assign({ _id: d.id }, d.data() || {})), ps: ps.docs.map((d) => Object.assign({ _id: d.id }, d.data() || {})), ks: ks.docs.map((d) => Object.assign({ _id: d.id }, d.data() || {})), kayttajat: new Set(ku.docs.map((d) => d.id)) });
  }
  const nimiLista = [...nimet];
  console.log('seuroja ' + seurat.length + ' · pelaajanimiä (koko nimi) indeksissä ' + nimiLista.length);
  const yht = { toimenpiteet: 0, pulssi: 0, tekstissaNimi: 0, pelaajaVieras: 0, pelaajaToisenSeuranJoukkue: 0, pelaajaTuplaId: 0, pelaajaOsittainen: 0, kuittausVieras: 0 };
  data.forEach((d) => {
    // toimenpiteet
    const vieras = d.ts.filter((t) => onVieras(t.joukkue, d.omatNimet)), tilat = {}, tyypit = {};
    vieras.forEach((t) => { kasvata(tilat, t.tila || '—'); kasvata(tyypit, t.tyyppi || '—'); });
    const pulssi = vieras.filter((t) => String(t._id).indexOf('pulssi_') === 0).length;
    const nimella = vieras.filter((t) => { const x = String(t.teksti || '').toLowerCase(); return x && nimiLista.some((n) => x.indexOf(n) >= 0); }).length;
    yht.toimenpiteet += vieras.length; yht.pulssi += pulssi; yht.tekstissaNimi += nimella;
    console.log('seura ' + d.sid + ' · toimenpiteet: ' + d.ts.length + ' dokumenttia · omia joukkueita ' + d.omatNimet.size + ' · vieraan joukkueen ' + vieras.length + ' (joista pulssi_* ' + pulssi + ') · tekstissä pelaajan nimi ' + nimella
      + (vieras.length ? '\n    tilat ' + JSON.stringify(tilat) + ' · tyypit ' + JSON.stringify(tyypit) : ''));
    // pelaajat
    let vierasP = 0, toisenSeuran = 0, tupla = 0, osittainen = 0;
    d.ps.forEach((x) => {
      const v = vieraatViitteet(x, d.omatNimet, d.omatIdt);
      if (v.length) { vierasP++; if (v.some((j) => { return V.onToisenSeuranNimi(j, d.sid, kaikkiJoukkueNimet); })) toisenSeuran++; }
      if ((pelaajanSeurat[x._id] || []).length > 1) tupla++;
      if (V.onOsittainen(x)) osittainen++;
    });
    yht.pelaajaVieras += vierasP; yht.pelaajaToisenSeuranJoukkue += toisenSeuran; yht.pelaajaTuplaId += tupla; yht.pelaajaOsittainen += osittainen;
    console.log('seura ' + d.sid + ' · pelaajat: ' + d.ps.length + ' dokumenttia · viite ei-omaan joukkueeseen ' + vierasP + ' (joista toisen seuran joukkue ' + toisenSeuran + ') · sama id usealla seuralla ' + tupla + ' · osittaisia (ei nimeä eikä syntymävuotta) ' + osittainen);
    // seuranta_kuittaukset
    const kv = d.ks.filter((k) => V.kuittausVieras(k, d.omatNimet, d.kayttajat)).length;
    yht.kuittausVieras += kv;
    console.log('seura ' + d.sid + ' · seuranta_kuittaukset: ' + d.ks.length + ' dokumenttia · vieras joukkue tai tuntematon valmentaja ' + kv);
  });
  console.log('YHTEENSÄ ' + JSON.stringify(yht));
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
