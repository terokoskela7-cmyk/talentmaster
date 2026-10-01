// Testiapu: Pelaaja_v7:n "ilman verkkoa" -apurit (_p7Verkossa, _p7Aikaraja, …) vm-harnesseihin OIKEASTA lähteestä.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';
const SIVU = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'TalentMaster_Pelaaja_v7.html'), 'utf8');
export const P7_OFFLINE_LAHDE = SIVU.slice(SIVU.indexOf('const _P7_AIKARAJA_MS'), SIVU.indexOf('// Firestore-kirjaus — kutsu aina kun tehty-nappia painetaan'));
export function lisaaP7Offline(ctx) {
  if (!ctx.Promise) ctx.Promise = Promise;
  if (!ctx.setTimeout) ctx.setTimeout = setTimeout;
  if (!ctx.clearTimeout) ctx.clearTimeout = clearTimeout;
  vm.runInContext(P7_OFFLINE_LAHDE.replace('const _P7_AIKARAJA_MS', 'var _P7_AIKARAJA_MS'), ctx);
  return ctx;
}
