#!/usr/bin/env node
/**
 * KUIVA-AJO (READ-ONLY): montako dokumenttia sisältää SÄHKÖPOSTIN tekijän nimikentässä — VAIN LUKUMÄÄRÄT.
 * Tietosuoja: lapsi voi nähdä `tekija_nimi`-kentän pelaajakortillaan (nakyvyys 'pelaaja'). Kysymys: kuinka monta dokumenttia
 * on jo kirjoitettu sähköpostilla (tm_master_firebase_patch.js: `auth.user.email`; vanhat havainnot) ja kuinka moni niistä
 * on lapselle näkyvä.
 *
 * Lukee collectionGroup('havainnot') ja collectionGroup('kirjaukset') kentät tekija_nimi / valmentajaNimi / nakyvyys (select).
 * Ei tulosta nimiä, sähköposteja eikä id:itä — vain seuratunnus (path) ja lukumäärät.
 * AJO:  node scripts/laske_tekija_nimi_sahkoposti.js
 * AUTENTIKOINTI: Application Default Credentials (gcloud auth application-default login).
 */
'use strict';
if (require.main !== module) throw new Error('scripts/laske_tekija_nimi_sahkoposti.js käsittelee tuotantodataa — aja suoraan: node scripts/laske_tekija_nimi_sahkoposti.js (ei requirea).');
const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'talentmaster-pilot' });
const db = admin.firestore();

const onTeksti = (v) => typeof v === 'string' && v.trim().length > 0;
const onSahkoposti = (v) => onTeksti(v) && v.indexOf('@') >= 0;
const tyhja = () => ({ yht: 0, nimiPuuttuu: 0, nimiNull: 0, nimiValmentaja: 0, nimiSahkoposti: 0, valmNimiSahkoposti: 0, jokinSahkoposti: 0, jokinSahkopostiLapselleNakyva: 0 });

async function laske(ryhma) {
  const snap = await db.collectionGroup(ryhma).select('tekija_nimi', 'valmentajaNimi', 'nakyvyys').get();
  const seuroittain = {}, yht = tyhja();
  snap.docs.forEach((d) => {
    const x = d.data(), seura = d.ref.path.split('/')[1] || '?';
    const s = seuroittain[seura] || (seuroittain[seura] = tyhja());
    const nak = x.nakyvyys === 'pelaaja';
    const sahko = onSahkoposti(x.tekija_nimi), valmSahko = onSahkoposti(x.valmentajaNimi);
    [s, yht].forEach((t) => {
      t.yht++;
      if (x.tekija_nimi === undefined) t.nimiPuuttuu++;
      else if (x.tekija_nimi === null) t.nimiNull++;
      else if (x.tekija_nimi === 'Valmentaja') t.nimiValmentaja++;
      if (sahko) t.nimiSahkoposti++;
      if (valmSahko) t.valmNimiSahkoposti++;
      if (sahko || valmSahko) { t.jokinSahkoposti++; if (nak) t.jokinSahkopostiLapselleNakyva++; }
    });
  });
  console.log('\n=== collectionGroup(' + ryhma + ') — YHTEENSÄ ===');
  console.log(yht);
  console.log('--- seuroittain (vain seurat, joilla sähköposteja) ---');
  console.table(Object.entries(seuroittain).filter(([, t]) => t.jokinSahkoposti > 0).map(([seura, t]) => Object.assign({ seura }, t)));
}

(async () => {
  await laske('havainnot');
  await laske('kirjaukset');
})().catch((e) => { console.error('virhe:', e.code || e.message); process.exit(1); });
