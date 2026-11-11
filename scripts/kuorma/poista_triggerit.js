#!/usr/bin/env node
'use strict';
/* poista_triggerit.js — projekti 06 PR 2b jatko: poistaa generaattorin massakirjoituksesta laukeavat Firestore-triggerit STAGINGISTA ennen datalatausta (kuluarvio: STAGING_ASENNUS F). Tero ajaa.
 *   ! node scripts/kuorma/poista_triggerit.js --projekti=talentmaster-staging           KUIVA-AJO (oletus): tulostaa komennon, ei suorita
 *   ! node scripts/kuorma/poista_triggerit.js --projekti=talentmaster-staging --aja     suorittaa: npx firebase functions:delete <4 triggeriä> --project <projekti> --region europe-west1 --force
 * LUKKO (lukko.js): vain talentmaster-staging[-x] (ei emulaattoria: ei mitään poistettavaa); --projekti + env + ADC samaa. Lisäksi komento kootaan VAIN tästä tiedostosta: funktiolista on kiinteä sallintalista
 * (4 triggeriä; luonti- ja päivitystriggerit — uusinta-ajo laukaisee update-triggerit) ja `--project` on aina lukon hyväksymä arvo — ei vapaata funktionimeä eikä projektia argumentista. Palautus: Deploy Staging (functions) -workflow deployaa triggerit takaisin. */
const { spawnSync } = require('child_process');
const L = require('./lukko.js');

const TRIGGERIT = ['kertymaKirjausOnWrite', 'kertymaLasnaolijaOnWrite', 'kertymaTapahtumaOnUpdate', 'notifKalenteriViikko'];
const REGION = 'europe-west1';
const STAGING = /^talentmaster-staging(-[a-z0-9]+)?$/;

/** → argumenttilista (npx:lle) tai heittää, jos projekti ei ole staging. */
function komento(projekti) {
  if (typeof projekti !== 'string' || !STAGING.test(projekti)) throw new Error('Trigger-poisto vain stagingiin (talentmaster-staging[-x]).');
  return ['firebase', 'functions:delete'].concat(TRIGGERIT, ['--project', projekti, '--region', REGION, '--force']);
}

/** deps: { suorita(cmd, args) → { status }, kirjaa, virhe, env, adc }. Exit 0/1/2. */
async function main(argv, deps) {
  const d = deps || {}, kirjaa = d.kirjaa || ((r) => console.log(r)), virhe = d.virhe || ((r) => console.error(r)), a = { aja: false, projekti: undefined, tuntematon: [] };
  (argv || []).forEach((x) => { if (x === '--aja') a.aja = true; else if (x.indexOf('--projekti=') === 0) a.projekti = x.slice(11); else a.tuntematon.push(x); });
  if (a.tuntematon.length) { virhe('Tuntematon valinta (' + a.tuntematon.length + ' kpl).'); return 2; }
  const lukko = L.tarkistaLukko({ projekti: a.projekti, env: d.env || process.env, adc: ('adc' in d) ? d.adc : L.lueAdcQuotaProjekti(d.env || process.env) });
  if (!lukko.ok) { virhe('LUKKO: ' + lukko.virhe); return 1; }
  let args; try { args = komento(lukko.projekti); } catch (e) { virhe('LUKKO: ' + e.message); return 1; }
  kirjaa((a.aja ? 'POISTO (SUORITTAA)' : 'POISTO (KUIVA-AJO, ei suorita)') + ' · projekti ' + lukko.projekti + ' · ' + TRIGGERIT.length + ' triggeriä');
  kirjaa('  npx ' + args.join(' '));
  if (!a.aja) { kirjaa('Kuiva-ajo valmis. Suorita lisäämällä --aja.'); return 0; }
  const r = (d.suorita || ((c, ar) => spawnSync(c, ar, { stdio: 'inherit' })))('npx', args);
  if (!r || r.status !== 0) { virhe('Poisto epäonnistui (exit ' + (r && r.status) + ').'); return 1; }
  kirjaa('Triggerit poistettu stagingista. Seuraavaksi: --aja datalataus, kertymien backfill, Deploy Staging (functions).'); return 0;
}
if (require.main === module) main(process.argv.slice(2)).then((c) => process.exit(c)).catch((e) => { console.error('Virhe: ' + (e && e.message)); process.exit(2); });
module.exports = { main, komento, TRIGGERIT };
