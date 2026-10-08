#!/usr/bin/env node
/* diag_phv_alkupera.js — KUIVA, VAIN LUKU. Mistä pelaajan phv_tila on peräisin (Mirwald-mittaus vai lomake/tuonti)?
 *
 * Tausta (docs/PHV_AN_ALKUPERA.md): koodi 'AN' tarkoittaa kahta vastakkaista asiaa:
 *   - Mirwald (lib/tm_bioika.js, Testaus_v9 kasvumittaus): AN = Jälki-PHV (offset > +1,0 v)
 *   - vanha lomake-/tuontisanasto (Harjoitettavuus_Lomake_v4, Excel_Tuonti, Testituonti_Master): AN = Pre-PHV ("Ennen kasvua")
 * Pelaaja_v7 näyttää AN:n "Kehittynyt vaihe" (Mirwald-merkitys).
 *
 * Ajo (gcloud ADC, EI palvelutilin avainta):
 *   node scripts/diag_phv_alkupera.js                              (oletus: Topias, seurat/kpv/pelaajat/m93GBdOaGCUuenMiCL0I)
 *   node scripts/diag_phv_alkupera.js --seura=kpv --id=<docId>
 *
 * VAIN .get() — ei set/update/delete/batch/add. Tulosteessa EI nimiä, sähköposteja eikä vapaatekstejä: vain dokumentti-ID:t,
 * päivämäärät, koodit ja lähdekentät (protokolla/lahde/tapahtumaId).
 */
if (require.main !== module) throw new Error('scripts/diag_phv_alkupera.js käsittelee tuotantodataa — aja suoraan: node scripts/diag_phv_alkupera.js (ei require/import)');   // vahinkoajon esto (S1)
const path = require('path');
const admin = require(path.join(__dirname, '..', 'functions', 'node_modules', 'firebase-admin'));
const argv = process.argv.slice(2);
const arg = (n, d) => { const o = argv.find((a) => a.indexOf('--' + n + '=') === 0); return o ? o.split('=').slice(1).join('=') : d; };
const SEURA = arg('seura', 'kpv');
const ID = arg('id', 'm93GBdOaGCUuenMiCL0I');   // Topias (CLAUDE.md §7.8 — kaksi u:ta)

const ms = (t) => (t && t.toDate ? t.toDate().getTime() : (t ? Date.parse(t) : NaN));
const pvm = (t) => { if (t == null || t === '') return '—'; const m = ms(t); return isNaN(m) ? String(t) : new Date(m).toISOString().slice(0, 10); };
const MERKITYS = {
  mirwald: { PRE: 'Pre-PHV (>1 v ennen)', LAH: 'lähestyy PHV:tä', PH: 'PHV-huippu', POST: 'post-PHV (0,5–1 v jälk.)', AN: 'JÄLKI-PHV (>1 v jälkeen)' },
  lomake: { AN: 'PRE-PHV ("Ennen kasvua")', PH: 'PHV-huippu', VA: 'post-PHV ("Kasvu ohitse")' },
};

(async () => {
  admin.initializeApp({ projectId: 'talentmaster-pilot' });
  const db = admin.firestore();
  const seuraRef = db.collection('seurat').doc(SEURA);
  const pelRef = seuraRef.collection('pelaajat').doc(ID);
  const snap = await pelRef.get();
  if (!snap.exists) { console.log('Pelaajaa ei löydy:', SEURA + '/' + ID); return; }
  const p = snap.data() || {};
  const tunnisteet = [ID, p.tunniste, p.palloID].filter((x) => x != null && x !== '').map(String)
    .filter((x, i, a) => a.indexOf(x) === i);

  console.log('=== PHV-alkuperä · seurat/' + SEURA + '/pelaajat/' + ID + ' ===');
  console.log('ikä (kuluva vuosi − syntymaVuosi):', p.syntymaVuosi ? (new Date().getFullYear() - p.syntymaVuosi) : '—', '| sukupuoli:', p.sukupuoli || '—');
  console.log('\n1) phv_tila (pikakenttä):', JSON.stringify(p.phv_tila === undefined ? null : p.phv_tila));
  if (p.phv_tila) {
    console.log('   merkitys Mirwald-sanastossa:', MERKITYS.mirwald[p.phv_tila] || '(ei Mirwald-koodi)');
    console.log('   merkitys lomake/tuonti-sanastossa:', MERKITYS.lomake[p.phv_tila] || '(ei lomakekoodi)');
  }
  console.log('   kehitysvaihe_kaista:', p.kehitysvaihe_kaista || '—', '| kasvutahti_vyohyke:', p.kasvutahti_vyohyke || '—');

  // 2) biologinenIka_viimeisin (Testaus_v9 kasvumittaus kirjoittaa SAMASSA batchissa phv_tila:n kanssa)
  const bv = p.biologinenIka_viimeisin;
  console.log('\n2) biologinenIka_viimeisin:', bv ? 'ON' : 'EI');
  if (bv) {
    console.log('   phv_tila_koodi:', bv.phv_tila_koodi || '—', '| mittauspaiva:', pvm(bv.mittauspaiva), '| maturity_offset:', bv.maturity_offset != null ? bv.maturity_offset : '—',
      '| konteksti:', bv.konteksti || '—', '| täsmää phv_tila:an:', bv.phv_tila_koodi === p.phv_tila);
  }

  // 3) biologinen_ika-alikokoelma (Mirwald-historia)
  const bio = await pelRef.collection('biologinen_ika').get();
  console.log('\n3) biologinen_ika-alikokoelma:', bio.size, 'dokumenttia');
  bio.docs.forEach((d) => { const x = d.data() || {}; console.log('   ·', d.id, '| mittauspaiva', pvm(x.mittauspaiva), '| koodi', x.phv_tila_koodi || '—', '| offset', x.maturity_offset != null ? x.maturity_offset : '—'); });

  // 4) testitulokset-alikokoelma: dokit joissa phv_tila (Excel_Tuonti historiapohja kirjoittaa phv_tila-kentän)
  const tt = await pelRef.collection('testitulokset').get();
  const ttPhv = tt.docs.filter((d) => { const x = d.data() || {}; return (x.phv_tila != null && x.phv_tila !== '') || (x.testit && x.testit.phv_tila); });
  console.log('\n4) testitulokset:', tt.size, 'dokumenttia, joista phv_tila:', ttPhv.length);
  ttPhv.forEach((d) => { const x = d.data() || {}; console.log('   ·', d.id, '| phv_tila', JSON.stringify(x.phv_tila || (x.testit && x.testit.phv_tila)), '| protokolla', x.protokolla || '—', '| lahde', x.lahde || '—', '| testauspvm', pvm(x.testauspvm)); });

  // 5) testitapahtumat/*/tulokset/{docId|tunniste|palloID} (Testituonti: doc-ID = tunniste; Lomake: doc-ID = pelaajan docId;
  //    Excel_Tuonti tapahtumamoodi: doc-ID = docId). phv_tila juuressa, testit.phv_tila (Testituonti) tai tulokset.phv_tila (Lomake).
  const tap = await seuraRef.collection('testitapahtumat').get();
  const tapOsumat = [];
  for (const t of tap.docs) {
    for (const tid of tunnisteet) {
      const r = await t.ref.collection('tulokset').doc(tid).get();
      if (!r.exists) continue;
      const x = r.data() || {};
      const arvo = (x.phv_tila != null && x.phv_tila !== '') ? x.phv_tila : (x.testit && x.testit.phv_tila) ? x.testit.phv_tila : (x.tulokset && x.tulokset.phv_tila) ? x.tulokset.phv_tila : null;
      if (arvo == null) continue;
      const td = t.data() || {};
      // Testaus_v9 _kirjoitaFirestoreTulos KOPIOI pelaajadokin phv_tila:n tulos-dokkiin (kirjaaja/kirjattu) → EI lähde.
      const kopio = !!(x.kirjattu || x.kirjaaja);
      const kirjoittaja = kopio ? 'Testaus_v9 (KOPIO pelaajadokista, ei lähde)' : (x.tulokset && x.tulokset.phv_tila) ? 'Harjoitettavuus_Lomake_v4' : (x.lahde === 'tapahtumapohja') ? 'Excel_Tuonti (tapahtuma)' : (x.testit && x.testit.phv_tila) ? 'Testituonti_Master' : '?';
      tapOsumat.push({ tapahtuma: t.id, doc: tid === ID ? 'docId' : 'tunniste/palloID', arvo, protokolla: td.protokolla || '—', pvm: pvm(x.testauspvm || x.testipvm || td.pvm), kirjoittaja, kopio });
    }
  }
  console.log('\n5) testitapahtumat/*/tulokset, joissa phv_tila:', tapOsumat.length, '(tapahtumia yhteensä', tap.size + ')');
  tapOsumat.forEach((o) => console.log('   ·', o.tapahtuma, '| doc', o.doc, '| phv_tila', JSON.stringify(o.arvo), '| protokolla', o.protokolla, '| pvm', o.pvm, '| todennäk. kirjoittaja', o.kirjoittaja));

  // 6) kartoitukset (Lomake ilman tapahtumaId:tä)
  const kart = await seuraRef.collection('kartoitukset').where('pelaajaId', '==', ID).get();
  const kartPhv = kart.docs.filter((d) => { const x = d.data() || {}; return x.tulokset && x.tulokset.phv_tila; });
  console.log('\n6) kartoitukset (pelaajaId):', kart.size, ', joista phv_tila:', kartPhv.length);
  kartPhv.forEach((d) => { const x = d.data() || {}; console.log('   ·', d.id, '| phv_tila', JSON.stringify(x.tulokset.phv_tila), '| testipvm', pvm(x.testipvm)); });

  // 7) flei_historia (Lomake + Testituonti lisäävät rivin samassa kirjoituksessa kuin phv_tila)
  const fh = Array.isArray(p.flei_historia) ? p.flei_historia : [];
  console.log('\n7) flei_historia:', fh.length, 'riviä | flei_pvm:', pvm(p.flei_pvm));
  fh.forEach((r) => console.log('   · pvm', pvm(r && r.pvm), '| flei', r && r.flei, '| tapahtumaId', (r && r.tapahtumaId) || '—', '| tallennettu', pvm(r && r.tallennettu)));

  // PÄÄTELMÄ
  console.log('\n=== PÄÄTELMÄ ===');
  const mittaus = !!(bv && bv.phv_tila_koodi && bv.phv_tila_koodi === p.phv_tila);
  const lomakeLahteet = tapOsumat.filter((o) => !o.kopio && o.arvo === p.phv_tila).length + ttPhv.filter((d) => { const x = d.data() || {}; return (x.phv_tila || (x.testit && x.testit.phv_tila)) === p.phv_tila; }).length + kartPhv.length;
  if (!p.phv_tila) console.log('phv_tila puuttuu → ei pääteltävää.');
  else if (mittaus && !lomakeLahteet) console.log('MITTAUS: phv_tila tulee Testaus_v9:n kasvumittauksesta (Mirwald, mitattu ' + pvm(bv.mittauspaiva) + '). "' + p.phv_tila + '" = ' + (MERKITYS.mirwald[p.phv_tila] || '?') + '. Arvo on Mirwald-merkityksessä oikein tulkittu; jos se on epäuskottava, tarkista mittauksen syötteet (pituus/istumapituus/paino/syntymäaika).');
  else if (!mittaus && lomakeLahteet) console.log('LOMAKE/TUONTI: phv_tila tulee lomake-/tuontisarakkeesta (' + lomakeLahteet + ' lähdettä yllä), EI Mirwald-mittauksesta. Vanhassa sanastossa "' + p.phv_tila + '" = ' + (MERKITYS.lomake[p.phv_tila] || '?') + ', mutta Pelaaja_v7/hhKehityskohde tulkitsevat sen Mirwald-merkityksessä (' + (MERKITYS.mirwald[p.phv_tila] || '?') + ') → SANASTORISTIRIITA (PR C).');
  else if (mittaus && lomakeLahteet) console.log('MOLEMMAT: sama koodi sekä mittauksessa (' + pvm(bv.mittauspaiva) + ') että ' + lomakeLahteet + ' lomake-/tuontilähteessä. Viimeisin kirjoittaja voittaa — vertaa päivämääriä yllä. Jos tuonti on mittausta uudempi, arvo on todennäköisesti lomakesanastoa.');
  else console.log('TUNTEMATON: ei Mirwald-mittausta eikä lomake-/tuontilähdettä samalla koodilla. Mahdolliset: poistettu tapahtuma, käsin/konsolista kirjoitettu, demo-/seed-skripti (tm_admin/setup_demo_kehitys.js) tai Testaus_v9:n Excel-pohjan esitäyttö (phv_tila pelaajadokista → takaisin tuontiin).');
})().catch((e) => { console.error('VIRHE', e.message); process.exit(1); });
