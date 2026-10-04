#!/usr/bin/env node
/* migrate_phv_sanasto.js — PR C: PHV-sanaston yhtenäistys (kanoninen Mirwald PRE/LAH/PH/POST/AN).
 *
 * Tausta: docs/PHV_AN_ALKUPERA.md. Vanha lomake-/tuontisanasto käytti AN-merkkiä päinvastaisessa merkityksessä
 * (ennen kasvua) kuin Mirwald-kasvumittaus (jälki-PHV). Teron päätös 4.10.2026: kanoninen tila on voimassa VAIN
 * mittauslähteestä (pikakenttä biologinenIka_viimeisin, lib/tm_phv_tila.js) — muuten 'tuntematon'.
 *
 * AJO (gcloud ADC, EI palvelutilin avainta — sama kuin scripts/diag_*.js):
 *   Dry-run (OLETUS, ei kirjoita):  node scripts/migrate_phv_sanasto.js            [--seura=kpv]
 *   Kirjoitus (VASTA kun Tero on hyväksynyt dry-run-listan):  node scripts/migrate_phv_sanasto.js --apply [--seura=kpv]
 *
 * LUOKITTELU (puhdas funktio luokittelePhv, testit: tests/phv_sanasto.test.js):
 *   (a) phv_tila ILMAN mittauslähdettä (ei biologinenIka_viimeisin eikä biologinen_ika-dokumenttia)
 *       → ehdotus: POISTA kenttä (+ kehitysvaihe_kaista samassa kirjoituksessa, jos sellainen on).
 *         Peruste: lukijat palauttavat 'tuntematon' myös puuttuvasta kentästä; literaali 'tuntematon' olisi
 *         ei-kanoninen koodi koodikentässä, ja välimuistissa olevat vanhat klientit näyttäisivät sen
 *         mitattuna ("Kasvuvaihe mitattu") — puuttuva kenttä on kaikille versioille "ei mittausta".
 *       → POIKKEUS: 'PH' ilman mittausta SÄILYTETÄÄN (ilmoitettu PH, kuormasuoja + henkilökunnan
 *         "ilmoitettu, ei mitattu" -merkintä; PH tarkoittaa kasvupyrähdystä molemmissa sanastoissa).
 *   (b) vanhan sanaston koodi, jonka merkitys on yksiselitteinen → muunnos:
 *       - mittauslähteellinen pelaaja, phv_tila puuttuu tai ei-kanoninen (VA/huippu/PHV/pienet kirjaimet)
 *         → mittauksen koodi (biologinenIka_viimeisin.phv_tila_koodi)
 *       - 'huippu'/'PHV' ilman mittausta → 'PH' (ilmoitettu PH säilyy kuormasuojaa varten)
 *   (c) epäselvät → EI muutosta, listaan (ristiriita mittauksen kanssa, biologinen_ika-dokkeja ilman pikakenttää…)
 *   Mittaukseen perustuvat (biologinenIka_viimeisin.phv_tila_koodi === phv_tila) → EI muutosta (ok).
 *
 * TULOSTE: per seura doc-ID + nykyinen arvo + ehdotus + peruste (EI nimiä), lopuksi a/b/c-yhteenveto per seura.
 * KIRJOITUS: vain --apply; batch ≤ 450; kentät jotka kuuluvat yhteen (phv_tila + kehitysvaihe_kaista) samassa updatessa.
 */
'use strict';

const PHV_KANONISET = ['PRE', 'LAH', 'PH', 'POST', 'AN'];
const POISTA = '__POISTA__';   // paivitys-arvo → FieldValue.delete() (puhdas funktio ei riipu firebase-administa)

function _kanoninen(k) { return typeof k === 'string' && PHV_KANONISET.indexOf(k) >= 0; }
function _tyhja(v) { return v === undefined || v === null || v === ''; }

/**
 * Puhdas luokittelu yhdelle pelaajadokumentille.
 * @param {{ data: object, bioDokLkm?: number }} syote  bioDokLkm = biologinen_ika-alikokoelman dokkien määrä
 *        (tarvitaan vain kun pikakenttä puuttuu; muuten saa olla undefined)
 * @returns {null | { luokka: 'ok'|'a'|'b'|'c', nykyinen: any, ehdotus: string, peruste: string, paivitys: object|null }}
 *          null = ei PHV-tietoa lainkaan (ei listata)
 */
function luokittelePhv(syote) {
  const d = (syote && syote.data) || {};
  const raaka = d.phv_tila;
  const bio = d.biologinenIka_viimeisin;
  const onBio = !!(bio && typeof bio === 'object');
  const mitattu = onBio && _kanoninen(bio.phv_tila_koodi) ? bio.phv_tila_koodi : null;
  const tulos = (luokka, ehdotus, peruste, paivitys) => ({ luokka, nykyinen: _tyhja(raaka) ? null : raaka, ehdotus, peruste, paivitys: paivitys || null });

  if (onBio) {
    if (mitattu) {
      if (raaka === mitattu) return tulos('ok', 'ei muutosta', 'mittaukseen perustuva (biologinenIka_viimeisin.phv_tila_koodi === phv_tila)');
      if (_tyhja(raaka)) return tulos('b', mitattu, 'pikakenttä phv_tila puuttuu, mittaus olemassa → mittauksen koodi', { phv_tila: mitattu });
      if (!_kanoninen(raaka)) return tulos('b', mitattu, 'ei-kanoninen arvo (' + raaka + '), mittauslähde olemassa → mittauksen koodi', { phv_tila: mitattu });
      return tulos('c', 'tarkista (ei muutosta)', 'ristiriita: phv_tila ' + raaka + ' ≠ mittaus ' + mitattu + ' (lukijat käyttävät mittausta)');
    }
    if (_kanoninen(raaka)) return tulos('ok', 'ei muutosta', 'vanha mittausdokki ilman koodia — lukija käyttää kanonista pikakenttää');
    return tulos('c', 'tarkista (ei muutosta)', 'biologinenIka_viimeisin ilman kanonista koodia ja phv_tila ' + (_tyhja(raaka) ? 'puuttuu' : 'ei-kanoninen (' + raaka + ')'));
  }

  if (_tyhja(raaka)) return null;   // ei tilaa, ei mittausta → ei mitään tehtävää

  if ((syote && syote.bioDokLkm) > 0) {
    return tulos('c', 'tarkista (ei muutosta)', 'biologinen_ika-dokumentteja ' + syote.bioDokLkm + ' kpl, mutta pikakenttä biologinenIka_viimeisin puuttuu → aja kasvumittauksen pikakenttäsynkka ensin');
  }
  const iso = String(raaka).trim().toUpperCase();
  if (raaka === 'PH') {
    return tulos('a', 'säilytä (ilmoitettu PH)', 'ei mittauslähdettä → lukijoille tuntematon; PH säilytetään kuormasuojaa ja henkilökunnan "ilmoitettu, ei mitattu" -merkintää varten');
  }
  if (iso === 'HUIPPU' || iso === 'PHV' || iso === 'PH') {
    return tulos('b', 'PH', 'vanha huippukoodi (' + raaka + ') = kasvupyrähdys yksiselitteisesti → PH (ilmoitettu, ei mitattu; kuormasuoja säilyy)', { phv_tila: 'PH' });
  }
  const paivitys = { phv_tila: POISTA };
  if (!_tyhja(d.kehitysvaihe_kaista)) paivitys.kehitysvaihe_kaista = POISTA;   // pari: johdettu PHV-koodista
  return tulos('a', 'poista kenttä', 'ei mittauslähdettä (ei biologinenIka_viimeisin eikä biologinen_ika-dokumenttia) → tuntematon'
    + (iso === 'AN' ? '; AN moniselitteinen (vanha lomake ja Mirwald-mittaus käyttävät sitä eri merkityksissä)' : ''), paivitys);
}

/** Per seura -yhteenveto riveistä. */
function yhteenveto(rivit) {
  const s = { a: 0, a_poisto: 0, a_sailyta: 0, b: 0, c: 0, ok: 0 };
  rivit.forEach((r) => {
    s[r.luokka] = (s[r.luokka] || 0) + 1;
    if (r.luokka === 'a') { if (r.paivitys) s.a_poisto++; else s.a_sailyta++; }
  });
  return s;
}

module.exports = { luokittelePhv, yhteenveto, POISTA, PHV_KANONISET };

// ── CLI ───────────────────────────────────────────────────────────────────────────────────────────
async function main() {
  const path = require('path');
  let admin;
  try { admin = require(path.join(__dirname, '..', 'functions', 'node_modules', 'firebase-admin')); }
  catch (e) { admin = require('firebase-admin'); }
  const argv = process.argv.slice(2);
  const APPLY = argv.includes('--apply');
  const seuraArg = (argv.find((a) => a.indexOf('--seura=') === 0) || '').split('=')[1] || null;
  const BATCH = 450;

  admin.initializeApp({ projectId: 'talentmaster-pilot' });   // gcloud ADC
  const db = admin.firestore();
  const FV = admin.firestore.FieldValue;

  const seurat = seuraArg ? [seuraArg] : (await db.collection('seurat').get()).docs.map((d) => d.id);
  console.log('=== PHV-sanaston migraatio · ' + (APPLY ? 'APPLY (KIRJOITTAA)' : 'DRY-RUN (ei kirjoita)') + ' · seuroja ' + seurat.length + ' ===');
  const kaikki = {};
  const kirjoitukset = [];

  for (const sid of seurat) {
    const snap = await db.collection('seurat').doc(sid).collection('pelaajat').get();
    const rivit = [];
    for (const doc of snap.docs) {
      const data = doc.data() || {};
      let bioDokLkm;
      const onBio = !!(data.biologinenIka_viimeisin && typeof data.biologinenIka_viimeisin === 'object');
      if (!onBio && !_tyhja(data.phv_tila)) {
        const b = await doc.ref.collection('biologinen_ika').limit(5).get();
        bioDokLkm = b.size;
      }
      const r = luokittelePhv({ data, bioDokLkm });
      if (!r || r.luokka === 'ok') { if (r) rivit.push(Object.assign({ id: doc.id }, r)); continue; }
      rivit.push(Object.assign({ id: doc.id }, r));
      console.log('[' + sid + '] ' + doc.id + ' | (' + r.luokka + ') ' + JSON.stringify(r.nykyinen) + ' → ' + r.ehdotus + ' | ' + r.peruste);
      if (r.paivitys) {
        const upd = {};
        Object.keys(r.paivitys).forEach((k) => { upd[k] = r.paivitys[k] === POISTA ? FV.delete() : r.paivitys[k]; });
        kirjoitukset.push({ ref: doc.ref, upd });
      }
    }
    kaikki[sid] = yhteenveto(rivit);
  }

  console.log('\n=== Yhteenveto per seura (a = ilman mittausta [poisto / säilytä PH], b = muunnos, c = epäselvä, ok = mittaukseen perustuva) ===');
  Object.keys(kaikki).forEach((sid) => {
    const s = kaikki[sid];
    console.log(sid + ': a=' + s.a + ' (poisto ' + s.a_poisto + ', säilytä PH ' + s.a_sailyta + ') · b=' + s.b + ' · c=' + s.c + ' · ok=' + s.ok);
  });
  console.log('Kirjoitettavia dokumentteja: ' + kirjoitukset.length);

  if (!APPLY) { console.log('\nDRY-RUN — mitään ei kirjoitettu. Kirjoitus vasta hyväksynnän jälkeen: --apply'); return; }
  for (let i = 0; i < kirjoitukset.length; i += BATCH) {
    const b = db.batch();
    kirjoitukset.slice(i, i + BATCH).forEach((k) => b.update(k.ref, k.upd));   // phv_tila + pari SAMASSA updatessa (§26)
    await b.commit();
    console.log('commit ' + (i + 1) + '–' + Math.min(i + BATCH, kirjoitukset.length));
  }
  console.log('APPLY valmis.');
}

if (require.main === module) {
  main().catch((e) => { console.error('VIRHE:', e && e.message ? e.message : e); process.exit(1); });
}
