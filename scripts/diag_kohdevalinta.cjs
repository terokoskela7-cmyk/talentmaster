#!/usr/bin/env node
/* diag_kohdevalinta.cjs — KUIVA, VAIN LUKU (.get(), gcloud ADC), vain LUKUMÄÄRIÄ, ei nimiä. PR 4 (K14): harjoitelogiikan kohdevalinta ENNEN → JÄLKEEN.
 * ENNEN = harjoitelogiikka_v4.js origin/mainista (git show origin/main:harjoitelogiikka_v4.js > _vanha_hl_tmp.js; poista ajon jälkeen), JÄLKEEN = työpuun versio.
 * Ajo: node scripts/diag_kohdevalinta.cjs <seura> [seura…]   (esim. sjk kpv) */
'use strict';
const path = require('path'), fs = require('fs');
if (require.main !== module) throw new Error('käsittelee tuotantodataa — aja suoraan');
const juuri = path.join(__dirname, '..'), V = fs.existsSync(path.join(juuri, '_vanha_hl_tmp.js')) ? require('../_vanha_hl_tmp.js') : null, U = require('../harjoitelogiikka_v4.js');
const KENTAT = ['syntymaVuosi', 'sukupuoli', 'joukkue', 'tki_kehityskohde', 'tsi_viimeisin', 'tsi_pvm', 'sm_pallo_viimeisin', 'sm_juoksu_viimeisin', 'hh_taso', 'hh_viimeisin', 'hh_pvm', 'testipaivat', 'biologinenIka_viimeisin', 'phv_tila', 'ika', 'ikaluokka'];
async function lue(id) {
  const admin = require(path.join(juuri, 'functions', 'node_modules', 'firebase-admin')); if (!admin.apps.length) admin.initializeApp({ projectId: 'talentmaster-pilot' });
  const ps = await admin.firestore().collection('seurat').doc(id).collection('pelaajat').get();
  return ps.docs.map((d) => { const x = d.data(), o = {}; KENTAT.forEach((k) => { if (x[k] !== undefined) o[k] = x[k]; }); if (o.testipaivat && o.testipaivat.fyysinen_hh && o.testipaivat.fyysinen_hh.toDate) o.testipaivat = Object.assign({}, o.testipaivat, { fyysinen_hh: o.testipaivat.fyysinen_hh.toDate().toISOString() }); return o; });
}
(async () => {
  for (const id of process.argv.slice(2)) {
    const P = await lue(id), nyt = Date.now(), matr = {}, lahteet = { ennen: {}, jalkeen: {} }; let sama = 0, muuttui = 0;
    P.forEach((p) => {
      const a = V ? V.laskeTekninenKehityskohde(p) : { kohde: '-', lahde: '-' }, b = U.laskeTekninenKehityskohde(p, nyt);
      lahteet.ennen[a.lahde] = (lahteet.ennen[a.lahde] || 0) + 1; lahteet.jalkeen[b.lahde] = (lahteet.jalkeen[b.lahde] || 0) + 1;
      const k = a.kohde + '/' + a.lahde + ' → ' + b.kohde + '/' + b.lahde; matr[k] = (matr[k] || 0) + 1; if (a.kohde === b.kohde) sama++; else muuttui++;
    });
    console.log('seura ' + id + ': pelaajia ' + P.length + ' · kohde SAMA ' + sama + ' · kohde MUUTTUI ' + muuttui + '\n  lähteet ennen ' + JSON.stringify(lahteet.ennen) + ' → jälkeen ' + JSON.stringify(lahteet.jalkeen));
    Object.keys(matr).sort().forEach((k) => console.log('    ' + String(matr[k]).padStart(3) + '  ' + k));
  }
})().catch((e) => { console.error(e.message); process.exit(1); });
