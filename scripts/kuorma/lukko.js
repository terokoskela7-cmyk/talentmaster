'use strict';
/* lukko.js — projekti 06 PR 2: GENERAATTORIN PROJEKTILUKKO (VAIHE0 §2.1). Positiivinen sallintalista + eksplisiittinen esto.
 * Projekti-id hyväksytään vain, jos se on TÄSMÄLLEEN `talentmaster-staging` (tai `talentmaster-staging-<a-z0-9>`) tai emulaattorin `demo-kuorma`.
 * Ei siivousta: isot kirjaimet, välilyönnit, tyhjä arvo, JSON-roska → kaatuu (ei "korjata" hiljaa).
 * Tarkistetaan KOLMESTA lähteestä: (1) --projekti, (2) ympäristömuuttujat GOOGLE_CLOUD_PROJECT / GCLOUD_PROJECT / FIREBASE_CONFIG,
 * (3) ADC:n quota-projekti (application_default_credentials.json). Jokaisen ASETETUN lähteen on oltava sallittu JA sama kuin --projekti; ristiriita kaatuu.
 * Pure: ympäristö ja ADC annetaan sisään (testattava). Tässä on ainoa paikka, jossa tuotantoprojektin nimi saa esiintyä (staattinen testi vartioi). */
const fs = require('fs');
const os = require('os');
const path = require('path');

const SALLITTU = /^talentmaster-staging(-[a-z0-9]+)?$/;
const EMULAATTORI = 'demo-kuorma';
const ESTETYT = ['talentmaster-pilot'];

function onSallittu(p) { return typeof p === 'string' && (SALLITTU.test(p) || p === EMULAATTORI) && ESTETYT.indexOf(p) < 0; }

/** FIREBASE_CONFIG: JSON {"projectId":…}. Rikkinäinen JSON → { virhe }. */
function firebaseConfigProjekti(raaka) {
  try { const j = JSON.parse(raaka); return { arvo: j && j.projectId != null ? j.projectId : undefined }; } catch (e) { return { virhe: true }; }
}

/** ADC-tiedoston quota-projekti (vain luku). Ei tiedostoa / ei kenttää → undefined (lähdettä ei ole). */
function lueAdcQuotaProjekti(env, koti) {
  const e = env || process.env;
  const polku = e.GOOGLE_APPLICATION_CREDENTIALS || path.join(koti || os.homedir(), '.config', 'gcloud', 'application_default_credentials.json');
  try { const j = JSON.parse(fs.readFileSync(polku, 'utf8')); return j && j.quota_project_id != null ? j.quota_project_id : undefined; } catch (e2) { return undefined; }
}

/** → { ok:true, projekti } | { ok:false, virhe }. syote: { projekti, env, adc } (adc = ADC:n quota-projekti tai undefined). */
function tarkistaLukko(syote) {
  const s = syote || {}, env = s.env || {};
  if (s.projekti === undefined) return { ok: false, virhe: 'Anna --projekti=talentmaster-staging (ei oletusta).' };
  if (!onSallittu(s.projekti)) return { ok: false, virhe: 'Projekti ei ole sallittu: generaattori ajetaan vain stagingiin (talentmaster-staging) tai emulaattoriin (demo-kuorma).' };
  const lahteet = [['GOOGLE_CLOUD_PROJECT', env.GOOGLE_CLOUD_PROJECT], ['GCLOUD_PROJECT', env.GCLOUD_PROJECT], ['ADC quota-projekti', s.adc]];
  if (env.FIREBASE_CONFIG !== undefined) {
    const fc = firebaseConfigProjekti(env.FIREBASE_CONFIG);
    if (fc.virhe) return { ok: false, virhe: 'FIREBASE_CONFIG ei ole luettavaa JSONia — ajo keskeytetty (poista muuttuja tai korjaa).' };
    lahteet.push(['FIREBASE_CONFIG.projectId', fc.arvo]);
  }
  for (const [nimi, arvo] of lahteet) {
    if (arvo === undefined) continue;
    if (!onSallittu(arvo)) return { ok: false, virhe: nimi + ' osoittaa muuhun kuin sallittuun projektiin — ajo keskeytetty. Korjaa: ' + (nimi.indexOf('ADC') === 0 ? 'gcloud auth application-default set-quota-project ' + s.projekti : 'unset ' + nimi.split('.')[0] + ' (tai aseta se arvoon ' + s.projekti + ')') + '.' };
    if (arvo !== s.projekti) return { ok: false, virhe: nimi + ' on ristiriidassa --projekti-parametrin kanssa — ajo keskeytetty.' };
  }
  return { ok: true, projekti: s.projekti };
}

module.exports = { tarkistaLukko, onSallittu, lueAdcQuotaProjekti, firebaseConfigProjekti, SALLITTU, EMULAATTORI, ESTETYT };
