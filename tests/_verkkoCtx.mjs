// Testiapu: kirjautumisen vm-harnessit tarvitsevat lib/tm_verkko.js:n (verkkokatkon käsittely). Ajetaan OIKEA lähde.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';
const LAHDE = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'tm_verkko.js'), 'utf8');
export function lisaaVerkko(ctx) {
  if (!ctx.Promise) ctx.Promise = Promise;
  if (!ctx.setTimeout) ctx.setTimeout = setTimeout;
  vm.runInContext(LAHDE, ctx);
  return ctx;
}
