// Testiapu: vm-harnessit, jotka ajavat functions/index.js:n callableja lähdekoodista, tarvitsevat
// paikkamerkkiesto-apurin (estaPaikkamerkkiOsoite + onPaikkamerkkiOsoite). Ajetaan OIKEA lähde, ei tynkää.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';
import vm from 'vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require_ = createRequire(import.meta.url);
const CF = readFileSync(join(ROOT, 'functions', 'index.js'), 'utf8');
export const { onPaikkamerkkiOsoite } = require_(join(ROOT, 'functions', 'paikkamerkki.js'));
export const ESTA_LAHDE = CF.slice(CF.indexOf('function estaPaikkamerkkiOsoite('), CF.indexOf('async function haeOrLuoHuoltajaAuth('));

/** Lisää vm-kontekstiin onPaikkamerkkiOsoite ja (jos ei jo määritelty) estaPaikkamerkkiOsoite oikeasta lähteestä. */
export function lisaaPaikkamerkki(ctx) {
  ctx.onPaikkamerkkiOsoite = onPaikkamerkkiOsoite;
  ctx.onYksiOsoite = require_(join(ROOT, 'functions', 'sahkoposti_turva.js')).onYksiOsoite;   // lahetaRekisteriKutsu: yksi osoite per kutsu (21.10.2026)
  if (typeof ctx.estaPaikkamerkkiOsoite !== 'function') vm.runInContext(ESTA_LAHDE, ctx);
  lisaaLaskutusEstoPilotti(ctx);
  return ctx;
}

/** Laskutus L1c: index.js:n kutsufunktiot kutsuvat laskutusEsto-moduulia (functions/laskutus_esto.js). Nämä harnessit ajavat
    pilottiseuran polkua (ei estoa); itse esto testataan functions/test/laskutus_esto.test.js:ssä. Nimet = tuotannon muuttujat. */
export function lisaaLaskutusEstoPilotti(ctx) {
  if (!ctx.laskutusEsto) ctx.laskutusEsto = { vaadiPelaajaSallittu: async () => {}, vaadiPelaajaDocSallittu: async () => {}, kirjaaEsto: async () => {}, luoEsto: () => ({ pelaajaEstetty: async () => false, joukkueEstetty: async () => false }) };
  if (!ctx._estoDeps) ctx._estoDeps = () => ({});
  return ctx;
}
