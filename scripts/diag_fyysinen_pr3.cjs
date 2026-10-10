#!/usr/bin/env node
/* diag_fyysinen_pr3.cjs — KUIVA, VAIN LUKU (.get(), gcloud ADC), vain LUKUMÄÄRIÄ, ei nimiä. PR 3 -raportti: ennen/jälkeen seuralle.
 * ENNEN = vanha laskeJoukkuePoikkeamat (HEAD) + poikkeamaPortti + vanha ehdotus (≥ 2 pelaajaa hh_taso < 2,5) + vanha Kärkipelaajat (talenttiydin);
 * JÄLKEEN = lib/tm_fyysinen.js (sama funktio huomiolle ja ehdotukselle) + hajonta uudella komposiitilla (Eerikkilä-tekniikkatestien D2 pois).
 * Ajo: node scripts/diag_fyysinen_pr3.cjs <seura>   (esim. sjk, kpv). Vanha normit-kopio: git show HEAD:lib/tm_eerikkila_normit.js > lib/_vanha_normit_tmp.js (poista ajon jälkeen). */
'use strict';
const path = require('path'), fs = require('fs');
if (require.main !== module) throw new Error('käsittelee tuotantodataa — aja suoraan');
const VANHA = fs.existsSync(path.join(__dirname, '..', 'lib', '_vanha_normit_tmp.js')) ? require('../lib/_vanha_normit_tmp.js') : null;
const E = require('../lib/tm_eerikkila_normit.js'), JK = require('../lib/tm_joukkue.js'), LU = require('../lib/tm_koti_luvut.js'), FY = require('../lib/tm_fyysinen.js'), TKL = require('../lib/tm_tekniikka.js');
const ikaSp = (nimi) => { const s = String(nimi || ''), a = s.match(/(\d{1,2})/), b = s.match(/\b([PT])\s?\d/i); return { ika: a ? parseInt(a[1], 10) : null, sp: b && b[1].toUpperCase() === 'T' ? 'T' : 'P' }; };
async function lue(id) {
  const admin = require(path.join(__dirname, '..', 'functions', 'node_modules', 'firebase-admin')); admin.initializeApp({ projectId: 'talentmaster-pilot' });
  const db = admin.firestore(), [ps, js] = await Promise.all([db.collection('seurat').doc(id).collection('pelaajat').get(), db.collection('seurat').doc(id).collection('joukkueet').get()]);
  const K = ['id', 'joukkueet', 'joukkue', 'syntymaVuosi', 'sukupuoli', 'hh_viimeisin', 'hh_pvm', 'hh_taso', 'd1_taso', 'd1_pvm', 'testipaivat', 'phv_tila', 'biologinenIka_viimeisin', 'd2_taso', 'd2_lahde', 'tki_viimeisin', 'sm_pallo_viimeisin', 'sm_juoksu_viimeisin', 'tsi_pvm', 'talenttiOhjelma'];
  const pel = ps.docs.map((d) => { const x = d.data(), o = { id: d.id }; K.forEach((k) => { if (x[k] !== undefined) o[k] = x[k]; }); if (o.testipaivat && o.testipaivat.fyysinen_hh && o.testipaivat.fyysinen_hh.toDate) o.testipaivat = Object.assign({}, o.testipaivat, { fyysinen_hh: o.testipaivat.fyysinen_hh.toDate().toISOString() }); return o; });
  return { pel, docs: js.docs.map((d) => ({ id: d.id, nimi: d.data().nimi, ...(d.data().jasenet ? { jasenet: d.data().jasenet } : {}) })) };
}
lue(process.argv[2] || 'sjk').then(({ pel, docs }) => {
  const nyt = Date.now(), per = {}; docs.forEach((d) => { per[d.id] = []; }); pel.forEach((p) => JK.tmPelaajanJoukkueet(p, docs).forEach((id) => { if (per[id]) per[id].push(p); }));
  const o = { vanha: { huomioFyys: 0, ehdotus: 0, karki: 0, hajonta: 0 }, uusi: { kehityskohde: 0, ok: 0, ilmanLuokkaa: 0, otosPieni: 0, hajonta: 0 }, joukkueita: 0 };
  docs.forEach((d) => {
    const pp = per[d.id]; if (!pp.length) return; o.joukkueita++; const is = ikaSp(d.nimi), sp = is.sp === 'T' ? 'N' : 'M';
    if (VANHA) {
      const pk = LU.poikkeamaPortti(VANHA.laskeJoukkuePoikkeamat(pp, is.ika, sp), pp), fys = pk.filter((x) => (x.tyyppi === 'alle_normin' || x.tyyppi === 'profiilipoikkeama') && x.osaAlue !== 'tekniikka'), akt = fys.filter((x) => !x.kypsyysEstetty);
      if (akt.length && !akt.some((x) => x.alaraja)) o.vanha.huomioFyys++;
      if (pp.filter((p) => p.hh_taso != null && p.hh_taso < 2.5).length >= 2) o.vanha.ehdotus++;
      if (pk.some((x) => x.tyyppi === 'talenttiydin')) o.vanha.karki++;
      if (pk.some((x) => x.tyyppi === 'hajonta')) o.vanha.hajonta++;
    }
    const uk = LU.poikkeamaPortti(E.laskeJoukkuePoikkeamat(pp, is.ika, sp), pp); if (uk.some((x) => x.tyyppi === 'hajonta')) o.uusi.hajonta++;
    const r = FY.tmFyysinenJoukkueLuokka(pp, nyt, { joukkueNimi: d.nimi }); if (r.luokka === 'kehityskohde') o.uusi.kehityskohde++; else if (r.luokka === 'ok') o.uusi.ok++; else o.uusi.ilmanLuokkaa++; if (r.otosPieni) o.uusi.otosPieni++;
  });
  const y = FY.tmFyysinenYhteenveto(pel, docs, nyt), ty = TKL.tmTekniikkaYhteenveto(pel, docs, nyt);
  console.log('TEKNIIKKA ' + process.argv[2] + ': kehityskohde ' + ty.kehityskohde + ' · ok ' + ty.ok + ' · ilman luokkaa ' + ty.eiLuokkaa + ' · otos pieni ' + ty.otosPieni);
  console.log('seura ' + process.argv[2] + ' · pelaajia ' + pel.length + ' · ' + JSON.stringify(o) + ' · kypsyysMittaamatta(pelaajia) ' + y.kypsyysMittaamatta + ' · neutraaleja ' + y.neutraaleja + ' · eiFyysistaDataa(joukkueita) ' + y.eiFyysistaDataa);
}).catch((e) => { console.error(e.message); process.exit(1); });
