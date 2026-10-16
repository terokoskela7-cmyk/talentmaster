#!/usr/bin/env node
/**
 * KERTASIIVOUS: nollaa sähköpostin `tekija_nimi`-kentästä (tietosuoja: lapsi näkee kentän pelaajakortillaan).
 *
 * OLETUS = KUIVA-AJO (ei kirjoita mitään): listaa polut + lukumäärän + sähköpostin VERKKOTUNNUKSEN (esim. "@gmail.com";
 * ei koko osoitetta), jotta voi tunnistaa onko kyse omasta osoitteesta.
 * --kirjoita = asettaa `tekija_nimi: null` VAIN dokumenteille, joissa kenttä sisältää '@'. EI muita kenttiä, ei muita dokumentteja.
 * Näyttö kääntää puuttuvan nimen oletuksen (lib/tm_tekija_nimi.js), joten null on turvallinen (Rules ei tarkista kenttää).
 *
 * Kattaa collectionGroup('havainnot') ja collectionGroup('kirjaukset'). Lopuksi tulostaa muutettujen määrän.
 * AJO:  node scripts/siivoa_tekija_nimi_sahkoposti.js              (kuiva)
 *       node scripts/siivoa_tekija_nimi_sahkoposti.js --kirjoita   (kirjoittaa)
 * AUTENTIKOINTI: Application Default Credentials (gcloud auth application-default login).
 */
'use strict';
if (require.main !== module) throw new Error('scripts/siivoa_tekija_nimi_sahkoposti.js käsittelee tuotantodataa — aja suoraan (ei requirea).');
const admin = require('firebase-admin');
const KIRJOITA = process.argv.includes('--kirjoita');
admin.initializeApp({ projectId: 'talentmaster-pilot' });
const db = admin.firestore();

const onSahkoposti = (v) => typeof v === 'string' && v.indexOf('@') >= 0;
/* Vain verkkotunnus: viimeisen '@':n jälkeinen osa, "@" edellä. Ei paikallisosaa. */
const verkkotunnus = (v) => '@' + (String(v).slice(String(v).lastIndexOf('@') + 1).trim() || '?');

(async () => {
  console.log(KIRJOITA ? '*** KIRJOITUSTILA (--kirjoita) ***' : 'KUIVA-AJO (ei kirjoita; lisää --kirjoita muuttaaksesi)');
  const osumat = [];
  for (const ryhma of ['havainnot', 'kirjaukset']) {
    const snap = await db.collectionGroup(ryhma).select('tekija_nimi').get();
    snap.docs.forEach((d) => { const v = d.get('tekija_nimi'); if (onSahkoposti(v)) osumat.push({ ref: d.ref, polku: d.ref.path, domain: verkkotunnus(v) }); });
    console.log('collectionGroup(' + ryhma + '): ' + snap.size + ' dokumenttia luettu');
  }
  console.log('\nSähköposti tekija_nimi-kentässä: ' + osumat.length + ' dokumenttia');
  osumat.forEach((o) => console.log('  ' + o.polku + '   ' + o.domain));
  if (!KIRJOITA) { console.log('\nKuiva-ajo: mitään ei muutettu. Muutettu: 0'); return; }
  let muutettu = 0;
  for (let i = 0; i < osumat.length; i += 400) {
    const batch = db.batch();
    osumat.slice(i, i + 400).forEach((o) => batch.update(o.ref, { tekija_nimi: null }));   // VAIN tämä kenttä
    await batch.commit(); muutettu += Math.min(400, osumat.length - i);
  }
  console.log('\nMuutettu: ' + muutettu + ' dokumenttia (tekija_nimi → null)');
})().catch((e) => { console.error('virhe:', e.code || e.message); process.exit(1); });
