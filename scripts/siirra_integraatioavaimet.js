#!/usr/bin/env node
'use strict';
/**
 * siirra_integraatioavaimet.js — turvallisuus-PR · ulkoisten palveluiden avaimet seura-dokista server-only-dokumenttiin. KUIVA-AJO OLETUKSENA.
 *   node scripts/siirra_integraatioavaimet.js                     # kuiva-ajo: kaikki seurat; listaa mitä siirrettäisiin (kentän nimi + pituus, EI arvoa)
 *   node scripts/siirra_integraatioavaimet.js --seura kpv         # vain yksi seura
 *   node scripts/siirra_integraatioavaimet.js --kirjoita          # siirtää: seurat/{sid}/salaiset/integraatiot ← kentät (merge), lippu taso_avain_asetettu, POISTAA kentät seura-dokista
 * Siirrettävät kentät: taso_api_key + kaikki seura-dokin kentät joiden nimi päättyy _api_key / _apikey / _secret / _token / _password / _salasana / _private_key (functions/salaiset.js SALAINEN_KENTTA).
 * Turva: (1) avaimia EI tulosteta (vain nimi ja pituus); (2) kirjoitus VERIFIOIDAAN lukemalla salainen dokumentti takaisin ENNEN kuin kenttä poistetaan seura-dokista — ero → keskeytys, mitään ei poisteta;
 * (3) idempotentti: toinen ajo ei löydä siirrettävää; jo siirretty kenttä jonka arvo eroaa salaisessa dokissa → keskeytys (ei ylikirjoiteta hiljaa). Admin SDK + ADC.
 */
const { SALAINEN_KENTTA } = require('../functions/salaiset.js'), PROJECT_ID = 'talentmaster-pilot';

/** PURE: seura-dokin data + salainen data → { siirrettavat:[{kentta, pituus}], ristiriidat:[kentta] }. Arvo siirretään vain jos se on ei-tyhjä merkkijono. */
function suunnittele(seuraData, salainen) {
  const siirrettavat = [], ristiriidat = []; seuraData = seuraData || {}; salainen = salainen || {};
  Object.keys(seuraData).forEach((k) => {
    if (!SALAINEN_KENTTA.test(k)) return; const v = seuraData[k]; if (typeof v !== 'string' || !v) return;
    if (typeof salainen[k] === 'string' && salainen[k] && salainen[k] !== v) { ristiriidat.push(k); return; }
    siirrettavat.push({ kentta: k, pituus: v.length });
  });
  return { siirrettavat, ristiriidat };
}
async function aja({ db, FieldValue, seura, kirjoita, loki }) {
  loki = loki || console.log;
  const col = db.collection('seurat'), ids = []; if (seura) ids.push(seura); else (await col.get()).forEach((d) => ids.push(d.id));
  const tulos = { seuroja: ids.length, siirretty: 0, kenttia: 0, ristiriitoja: 0, virheita: 0 };
  loki((kirjoita ? 'KIRJOITUS' : 'KUIVA-AJO (ei kirjoiteta)') + ' · ' + ids.length + ' seuraa');
  for (const sid of ids) {
    const sref = col.doc(sid), sd = await sref.get(); if (!sd.exists) { loki('  ' + sid + ': ei seura-dokumenttia'); continue; }
    const iref = sref.collection('salaiset').doc('integraatiot'), id = await iref.get(), salainen = id.exists ? id.data() : {}, s = sd.data() || {}, p = suunnittele(s, salainen);
    if (p.ristiriidat.length) { tulos.ristiriitoja += p.ristiriidat.length; loki('  ' + sid + ': RISTIRIITA (salaisessa dokissa eri arvo) → ei kosketa: ' + p.ristiriidat.join(', ')); continue; }
    if (!p.siirrettavat.length) continue;
    loki('  ' + sid + ': siirrettäisiin ' + p.siirrettavat.map((x) => x.kentta + ' (' + x.pituus + ' merkkiä)').join(', '));
    if (!kirjoita) continue;
    try {
      const data = {}; p.siirrettavat.forEach((x) => { data[x.kentta] = s[x.kentta]; }); data.siirretty_seura_dokista = FieldValue.serverTimestamp();
      await iref.set(data, { merge: true });
      const tarkistus = (await iref.get()).data() || {}; const ero = p.siirrettavat.filter((x) => tarkistus[x.kentta] !== s[x.kentta]);
      if (ero.length) throw new Error('verifiointi epäonnistui (' + ero.map((x) => x.kentta).join(', ') + ') — kenttiä EI poistettu');
      const upd = {}; p.siirrettavat.forEach((x) => { upd[x.kentta] = FieldValue.delete(); }); if (p.siirrettavat.some((x) => x.kentta === 'taso_api_key')) upd.taso_avain_asetettu = true;
      await sref.update(upd); tulos.siirretty++; tulos.kenttia += p.siirrettavat.length; loki('    ✓ siirretty + poistettu seura-dokista');
    } catch (e) { tulos.virheita++; loki('    ✗ ' + sid + ': ' + e.message); }
  }
  loki('Yhteensä: ' + (kirjoita ? tulos.siirretty + ' seuraa siirretty (' + tulos.kenttia + ' kenttää)' : 'kuiva-ajo') + ' · ristiriitoja ' + tulos.ristiriitoja + ' · virheitä ' + tulos.virheita + (kirjoita ? '' : '. Kirjoita lipulla --kirjoita.'));
  return tulos;
}
function lueArgit(argv) { const i = argv.indexOf('--seura'), seura = i >= 0 ? argv[i + 1] : null; if (i >= 0 && (!seura || seura.charAt(0) === '-' || /[\/\s]/.test(seura))) throw new Error('Käyttö: node scripts/siirra_integraatioavaimet.js [--seura <id>] [--kirjoita]'); return { seura, kirjoita: argv.includes('--kirjoita') }; }
async function main() {
  let a; try { a = lueArgit(process.argv.slice(2)); } catch (e) { console.error(e.message); process.exit(1); }
  const admin = require('firebase-admin'); if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId: PROJECT_ID });
  const t = await aja({ db: admin.firestore(), FieldValue: admin.firestore.FieldValue, seura: a.seura, kirjoita: a.kirjoita }); if (t.virheita || t.ristiriitoja) process.exit(2);
}
module.exports = { suunnittele, aja, lueArgit };
if (require.main === module) main().catch((e) => { console.error('VIRHE:', e.message); process.exit(1); });
