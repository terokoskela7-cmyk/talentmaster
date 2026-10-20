#!/usr/bin/env node
'use strict';
/**
 * K1d · yhteenvetorytmin vaikutusarvio (READ-ONLY — ei kirjoita mitään, ei muuta dataa)
 * ────────────────────────────────────────────────────────────────────────────
 * Vertaa pelaajakohtaista rytmitilaa KAHDELLA säännöllä samasta tuotantodatasta:
 *   VANHA = vain review_viimeisin_pvm (jakson sulku ei nollannut; jakso ei vaikuta)
 *   UUSI  = lib/tm_rytmi.js (K1d): edellinen yhteenveto = myöhäisin (review_viimeisin_pvm, viimeisin suljettu jakso);
 *           jakso käynnissä ja päättyy ≤ eräpäivä → ei erääntymässä/myöhässä
 * Tulostaa luvut (tila vanha → uusi, montako muuttuu). Nimet VAIN nimetyistä KPV-testipelaajista (Topias O´Koskela, Toppari Testi, Testi Pelaaja, Testi Test, Tero Testaaja); muista vain lukumäärät.
 *
 * AJO (Tero):  ! node scripts/k1d_rytmi_vaikutus.js [seuraId=kpv]
 * AUTENTIKOINTI: gcloud ADC (gcloud auth application-default login) — ei palvelutilin avainta. firebase-admin löytyy functions/node_modules:sta (cd functions && npm ci).
 */
const path = require('path');
let admin; try { admin = require('firebase-admin'); } catch (e) { admin = require(path.join(__dirname, '..', 'functions', 'node_modules', 'firebase-admin')); }
const N = require('../lib/tm_eerikkila_normit.js');
const TESTI = ['topias', 'toppari', 'testi pelaaja', 'testi test', 'tero testaaja'];
const seura = process.argv[2] || 'kpv';
const NYT = Date.now();
function vanha(p) { return N.laskeReviewKadenssi({ syntymaVuosi: p.syntymaVuosi, joukkue: p.joukkue, review_viimeisin_pvm: p.review_viimeisin_pvm, review_viimeisin_tyyppi: p.review_viimeisin_tyyppi }, NYT); }
(async () => {
  if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId: 'talentmaster-pilot' });
  const sn = await admin.firestore().collection('seurat').doc(seura).collection('pelaajat').get();
  const taulu = {}, testit = []; let muuttuu = 0;
  sn.forEach((d) => {
    const p = d.data(), a = vanha(p).status, b = N.laskeReviewKadenssi(p, NYT), k = a + ' → ' + b.status; taulu[k] = (taulu[k] || 0) + 1; if (a !== b.status) muuttuu++;
    const nimi = ((p.etunimi || '') + ' ' + (p.sukunimi || '')).toLowerCase();
    if (TESTI.some((t) => nimi.indexOf(t) === 0 || nimi.indexOf(t) >= 0)) testit.push({ nimi: (p.etunimi || '') + ' ' + (p.sukunimi || ''), vanha: a, uusi: b.status, eraantyy: b.eraantyyPvm, jaksoLoppuu: b.jakso && b.jakso.loppuPvm, edellinen: b.viimeisinPvm + (b.tyyppi ? ' (' + b.tyyppi + ')' : '') });
  });
  console.log('Seura: ' + seura + ' · pelaajia ' + sn.size + ' · tila muuttuu ' + muuttuu);
  console.table(taulu); console.table(testit);
})().catch((e) => { console.error('Virhe:', e.message); process.exit(1); });
