#!/usr/bin/env node
'use strict';
/**
 * liput_siirra_julkisiin.js — D1 (Tero 5.11.2026, päätös 2): seura-dokin vanhat liput → seurat/{sid}/liput/julkiset. KUIVA-AJO OLETUKSENA. Tero ajaa (ADC).
 *   node scripts/liput_siirra_julkisiin.js                 # kuiva-ajo: kaikki seurat; listaa mitä kirjoitettaisiin
 *   node scripts/liput_siirra_julkisiin.js --seura kpv     # vain yksi seura
 *   node scripts/liput_siirra_julkisiin.js --kirjoita      # kirjoittaa
 * Mitä: jokaiselle rekisterin lipulle (lib/tm_liput.js LIPUT), jolla EI ole vielä boolean-arvoa liput/julkiset-dokumentissa mutta seura-dokin
 *   liput-kentässä on avain → julkiset[avain] = TEHOKAS arvo (tm_liput.tmLippuTila: vain täsmälleen true = päällä). Tehokas arvo EI MUUTU kenelläkään.
 * Turva: (1) yhden seuran julkiset + audit-rivit yhdessä batchissa (lippu_muutettu, tapa: 'migraatio', jokaisesta lipusta oma rivi);
 *   (2) kirjoitus verifioidaan lukemalla julkiset takaisin; (3) idempotentti: toinen ajo ei löydä siirrettävää; (4) olemassa olevaa julkiset-arvoa ei kosketa;
 *   (5) vanha seura-dokin liput-kenttä JÄÄ (fallback, poisto myöhemmin erikseen); (6) tuntemattomat avaimet vain listataan, ei siirretä.
 */
const L = require('../lib/tm_liput.js'), PROJECT_ID = 'talentmaster-pilot', TEKIJA = 'skripti:liput_siirra_julkisiin';

/** PURE: seura-dokin data + julkiset → { siirrettavat: [{ avain, arvo, vanha_raaka }], tuntemattomat: [avain] }. */
function suunnittele(seuraData, julkiset) {
  const vanhat = seuraData && seuraData.liput && typeof seuraData.liput === 'object' ? seuraData.liput : {}, jul = julkiset || {}, siirrettavat = [], tuntemattomat = [];
  Object.keys(vanhat).forEach((k) => {
    if (!L.tmLippuTunnettu(k)) { tuntemattomat.push(k); return; }
    if (typeof jul[k] === 'boolean') return;   // julkiset ratkaisee jo
    siirrettavat.push({ avain: k, arvo: L.tmLippuTila(k, jul, seuraData).arvo, vanha_raaka: vanhat[k] });
  });
  return { siirrettavat, tuntemattomat };
}
async function aja({ db, FieldValue, seura, kirjoita, loki }) {
  loki = loki || console.log;
  const col = db.collection('seurat'), ids = []; if (seura) ids.push(seura); else (await col.get()).forEach((d) => ids.push(d.id));
  const tulos = { seuroja: ids.length, siirretty: 0, lippuja: 0, virheita: 0 };
  loki((kirjoita ? 'KIRJOITUS' : 'KUIVA-AJO (ei kirjoiteta)') + ' · ' + ids.length + ' seuraa');
  for (const sid of ids) {
    const sref = col.doc(sid), sd = await sref.get(); if (!sd.exists) { loki('  ' + sid + ': ei seura-dokumenttia'); continue; }
    const jref = sref.collection('liput').doc('julkiset'), jd = await jref.get(), p = suunnittele(sd.data() || {}, jd.exists ? jd.data() : null);
    if (p.tuntemattomat.length) loki('  ' + sid + ': tuntemattomat avaimet (ei siirretä): ' + p.tuntemattomat.join(', '));
    if (!p.siirrettavat.length) continue;
    loki('  ' + sid + ': ' + p.siirrettavat.map((x) => x.avain + ' = ' + x.arvo + (x.vanha_raaka !== x.arvo ? ' (vanha ' + JSON.stringify(x.vanha_raaka) + ')' : '')).join(', '));
    if (!kirjoita) continue;
    try {
      const b = db.batch(), data = {}; p.siirrettavat.forEach((x) => { data[x.avain] = x.arvo; });
      b.set(jref, data, { merge: true });
      p.siirrettavat.forEach((x) => b.set(db.collection('audit').doc(), { toiminto: 'lippu_muutettu', severity: 'info', seuraId: sid, lippu: x.avain, vanha: x.arvo, uusi: x.arvo, lahde_vanha: 'vanha', tapa: 'migraatio', tekija_uid: TEKIJA, aikaleima: FieldValue.serverTimestamp() }));
      await b.commit();
      const t = (await jref.get()).data() || {}, ero = p.siirrettavat.filter((x) => t[x.avain] !== x.arvo);
      if (ero.length) throw new Error('verifiointi epäonnistui: ' + ero.map((x) => x.avain).join(', '));
      tulos.siirretty++; tulos.lippuja += p.siirrettavat.length; loki('    ✓ kirjoitettu + verifioitu');
    } catch (e) { tulos.virheita++; loki('    ✗ ' + sid + ': ' + e.message); }
  }
  loki('Yhteensä: ' + (kirjoita ? tulos.siirretty + ' seuraa (' + tulos.lippuja + ' lippua)' : 'kuiva-ajo') + ' · virheitä ' + tulos.virheita + (kirjoita ? '' : '. Kirjoita: --kirjoita'));
  return tulos;
}
function lueArgit(argv) {
  const i = argv.indexOf('--seura'), seura = i >= 0 ? argv[i + 1] : null;
  if (i >= 0 && (!seura || seura.charAt(0) === '-' || /[\/\s]/.test(seura))) throw new Error('Käyttö: node scripts/liput_siirra_julkisiin.js [--seura <id>] [--kirjoita]');
  return { seura, kirjoita: argv.indexOf('--kirjoita') >= 0 };
}
async function main() {
  let a; try { a = lueArgit(process.argv.slice(2)); } catch (e) { console.error(e.message); process.exit(1); }
  const admin = require('firebase-admin'); if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId: PROJECT_ID });
  const t = await aja({ db: admin.firestore(), FieldValue: admin.firestore.FieldValue, seura: a.seura, kirjoita: a.kirjoita }); if (t.virheita) process.exit(2);
}
module.exports = { suunnittele, aja, lueArgit, TEKIJA };
if (require.main === module) main().catch((e) => { console.error('VIRHE:', e.message); process.exit(1); });
