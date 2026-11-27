#!/usr/bin/env node
/* diag_toimenpide_ehdotukset.cjs — KUIVA, VAIN LUKU (.get()), gcloud ADC. Projekti 03 / PR B2.
 * Ajaa palvelimen oikean putken (yhdistaLista → valmistelePelaajat → SIG.laskeEhdotukset) seuran datalla ja kertoo
 * signaaleittain, laukeaako se ja jos ei, mitkä kentät puuttuvat. Ei kirjoita mitään. Tulostaa vain lukuja ja joukkuenimet (ei pelaajatunnisteita).
 * Ajo: node scripts/diag_toimenpide_ehdotukset.cjs kpv */
'use strict';
if (require.main !== module) throw new Error('käsittelee tuotantodataa — aja suoraan: node scripts/diag_toimenpide_ehdotukset.cjs <seura>');
const path = require('path');
const F = path.join(__dirname, '..', 'functions');
const admin = require(path.join(F, 'node_modules', 'firebase-admin'));
const { yhdistaLista } = require(path.join(F, 'sisainen_luku'));
const E = require(path.join(F, 'toimenpide_ehdotukset'));
const SIG = require(path.join(F, 'tm_toimenpide_signaalit'));
const LU = require(path.join(F, 'tm_koti_luvut')), FYS = require(path.join(F, 'tm_fyysinen')), TEK = require(path.join(F, 'tm_tekniikka'));
const sid = process.argv[2] || 'kpv';
(async () => {
  admin.initializeApp({ projectId: 'talentmaster-pilot' }); const db = admin.firestore(), s = db.collection('seurat').doc(sid);
  const [js, ps, ts] = await Promise.all([s.collection('joukkueet').get(), s.collection('pelaajat').get(), s.collection('toimenpiteet').get()]);
  const joukkueDokt = js.docs.map((d) => ({ id: d.id, nimi: (d.data() || {}).nimi || d.id }));
  const rivit = (await yhdistaLista(db, sid, ps.docs.map((d) => ({ id: d.id, data: d.data() || {} })), { aina: true })).filter((d) => !(d.data.poistettu === true || d.data.arkistoitu === true || d.data.aktiivinen === false));
  const pel = E.valmistelePelaajat(rivit, joukkueDokt), nytMs = Date.now();
  const n = (f) => pel.filter(f).length;
  console.log('seura ' + sid + ': pelaajia ' + pel.length + ', joukkueita ' + joukkueDokt.length + ', toimenpiteet-dokumentteja ' + ts.size + ' (tila=ehdotus: ' + ts.docs.filter((d) => (d.data() || {}).tila === 'ehdotus').length + ')');
  console.log('kentät: tki_viimeisin ' + n((p) => p.tki_viimeisin != null) + ' · hh_taso ' + n((p) => p.hh_taso != null) + ' · hh_taso_edellinen ' + n((p) => p.hh_taso_edellinen != null) + ' · flei_viimeisin ' + n((p) => p.flei_viimeisin != null)
    + ' · hh_viimeisin ' + n((p) => p.hh_viimeisin && Object.keys(p.hh_viimeisin).length) + ' · testipaivat.fyysinen_hh ' + n((p) => p.testipaivat && p.testipaivat.fyysinen_hh) + ' · testipaivat.tekniikka ' + n((p) => p.testipaivat && p.testipaivat.tekniikka)
    + ' · sukupuoli ' + n((p) => p.sukupuoli === 'M' || p.sukupuoli === 'N') + ' · syntymaVuosi ' + n((p) => p.syntymaVuosi != null) + ' · joukkueeton ' + n((p) => !E.jasenNimet(p).length));
  const ctx = { nytMs, onJoukkueessa: (p, j) => E.jasenNimet(p).indexOf(j) >= 0, jasenNimet: E.jasenNimet, fysinen: FYS, tekniikka: TEK };
  const nimet = SIG.joukkueNimet(pel, E.jasenNimet);
  const avoimet = ts.docs.filter((d) => (d.data() || {}).tila === 'ehdotus').map((d) => Object.assign({ id: d.id }, d.data()));
  const este = LU.ehdotusEste(avoimet, nytMs);
  nimet.forEach((j) => {
    const jp = pel.filter((p) => ctx.onJoukkueessa(p, j)), rivi = [];
    SIG.TP_SIGNAALIT.forEach((sig) => { const r = sig.tarkista(j, pel, ctx); rivi.push(sig.id + '=' + (r ? (LU.ehdotusEstetty(este, r) ? 'LAUKEAA(estetty: avoin ehdotus)' : 'LAUKEAA') : 'ei')); });
    const f = FYS.tmFyysinenJoukkueLuokka(jp, nytMs, { joukkueNimi: j }), t = TEK.tmTekniikkaJoukkueLuokka(jp, nytMs, { joukkueNimi: j });
    console.log('— ' + j + ' (' + jp.length + ' pelaajaa): ' + rivi.join(' · ') + '\n    fysiikka: luokka=' + f.luokka + ' mitattu=' + f.mitattu + ' kehityskohteita=' + f.kehityskohteita + ' eiDataa=' + f.eiDataa + ' · tekniikka: luokka=' + t.luokka + ' mitattu=' + t.mitattu + ' kehityskohteita=' + t.kehityskohteita + ' eiDataa=' + t.eiDataa);
  });
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
