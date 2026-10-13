#!/usr/bin/env node
'use strict';
/**
 * yhdista_taso_joukkueet.js — K35-5 · TASO-joukkueiden yhdistys kalenteriin. KUIVA-AJO OLETUKSENA.
 *   node scripts/yhdista_taso_joukkueet.js --seura kpv --listaa                         # tulostaa seuran TASO-joukkueet (team_id · nimi) ja nykyisen yhdistyskartan
 *   node scripts/yhdista_taso_joukkueet.js --seura kpv --yhdista 12345=kpv_u13,12346=kpv_u14            # kuiva-ajo: näyttää mitä kirjoitettaisiin
 *   node scripts/yhdista_taso_joukkueet.js --seura kpv --yhdista 12345=kpv_u13 --kirjoita                # kirjoittaa seurat/kpv/konfiguraatio/kalenterilahteet.taso.joukkueet (merge; muut avaimet säilyvät)
 * Vain yhdistetyt joukkueet tuodaan kalenteriin (functions/kalenteri_taso.js). Joukkue-id:n pitää löytyä seurat/{sid}/joukkueet-kokoelmasta (muuten keskeytys). Admin SDK + ADC; TASO-avain luetaan seura-dokista (taso_api_key, taso_club_id).
 */
const PROJECT_ID = 'talentmaster-pilot';
const TASO = require('../functions/taso_api.js');   // YKSI osoite/haku/kausi (docs/integraatiot/TASO_API.md)
function lueArgit(argv) {
  const arg = (k) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : null; }, seura = arg('seura'), yh = arg('yhdista');
  if (!seura || seura.charAt(0) === '-' || /[\/\s]/.test(seura)) throw new Error('Käyttö: node scripts/yhdista_taso_joukkueet.js --seura <id> (--listaa | --yhdista <taso_id>=<joukkue_id>[,…] [--kirjoita])');
  const kartta = {};
  if (yh) yh.split(',').forEach((p) => { const m = /^([^=\s]+)=([^=\s]+)$/.exec(p.trim()); if (!m) throw new Error("Virheellinen pari '" + p + "' (odotettu taso_id=joukkue_id)"); kartta[m[1]] = m[2]; });
  if (!argv.includes('--listaa') && !Object.keys(kartta).length) throw new Error('Anna --listaa tai --yhdista.');
  return { seura, listaa: argv.includes('--listaa'), kartta, kirjoita: argv.includes('--kirjoita') };
}
async function aja({ db, tasoHae, FieldValue, seura, listaa, kartta, kirjoita, loki }) {
  loki = loki || console.log; const sref = db.collection('seurat').doc(seura), sd = await sref.get(); if (!sd.exists) throw new Error('Seuraa ei löydy: ' + seura);
  const s = sd.data() || {}, cref = sref.collection('konfiguraatio').doc('kalenterilahteet'), cd = await cref.get(), nyk = ((cd.exists && (cd.data() || {}).taso) || {}).joukkueet || {};
  if (listaa) {
    const avain = await require('../functions/salaiset.js').tasoAvain(db, seura, s);   // server-only avain (salaiset/integraatiot); varalla vanha seura-dokin kenttä
    if (!avain || !s.taso_club_id) throw new Error('Seuralla ei ole TASO-avainta / taso_club_id:tä.');
    const kausi = TASO.kausiTunniste(Date.now()), r = await tasoHae('getClub', { club_id: s.taso_club_id, season_id: kausi }, avain);
    loki('TASO-joukkueet (kausi ' + kausi + '): team_id · team_name · category_name'); (r.teams || []).forEach((t) => loki('  ' + t.team_id + ' · ' + (t.team_name || t.name || '') + ' · ' + (t.category_name || '') + (nyk[t.team_id] ? '  → ' + nyk[t.team_id] : '')));
    loki('Nykyinen kartta: ' + JSON.stringify(nyk)); return { nyk };
  }
  const jsn = await sref.collection('joukkueet').get(), idt = new Set(); jsn.forEach((d) => idt.add(d.id));
  const tuntemattomat = Object.values(kartta).filter((j) => !idt.has(j)); if (tuntemattomat.length) throw new Error('Joukkue-doc puuttuu: ' + tuntemattomat.join(', ') + ' (olemassa: ' + [...idt].join(', ') + ')');
  const uusi = Object.assign({}, nyk, kartta); loki((kirjoita ? 'KIRJOITUS' : 'KUIVA-AJO (ei kirjoiteta)') + ' · seura ' + seura + ' · taso.joukkueet = ' + JSON.stringify(uusi));
  if (kirjoita) await cref.set({ taso: { joukkueet: uusi } }, { merge: true }); else loki('Kirjoita lipulla --kirjoita.');
  return { uusi };
}
async function main() {
  let a; try { a = lueArgit(process.argv.slice(2)); } catch (e) { console.error(e.message); process.exit(1); }
  const admin = require('firebase-admin'); if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId: PROJECT_ID });
  const tasoHae = TASO.tasoHae;
  await aja(Object.assign({ db: admin.firestore(), tasoHae, FieldValue: admin.firestore.FieldValue }, a));
}
module.exports = { lueArgit, aja };
if (require.main === module) main().catch((e) => { console.error('VIRHE:', e.message); process.exit(1); });
