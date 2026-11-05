/* GitHub Actions: Node 20 -ajoympäristö on poistumassa runnereilta (varoitus savutestin ajossa 5.11.2026).
   Vartija: checkout, setup-node, upload-artifact ja download-artifact vähintään siinä pääversiossa, joka ajaa Node 24:llä
   (action.yml runs.using: node24 — checkout v5, setup-node v5, upload-artifact v6, download-artifact v7). */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const WF = join(dirname(fileURLToPath(import.meta.url)), '..', '.github', 'workflows');
const MINIMI = { checkout: 5, 'setup-node': 5, 'upload-artifact': 6, 'download-artifact': 7 };
const kaytot = readdirSync(WF).filter((f) => /\.ya?ml$/.test(f)).flatMap((f) =>
  [...readFileSync(join(WF, f), 'utf8').matchAll(/uses:\s*actions\/([a-z-]+)@(\S+)/g)].map((m) => ({ f, nimi: m[1], ref: m[2] })));

describe('Actions Node 24', () => {
  it('workflowt käyttävät näitä actioneita', () => {
    for (const n of Object.keys(MINIMI)) expect(kaytot.some((k) => k.nimi === n), n).toBe(true);
  });
  it('jokainen käyttö vähintään Node 24 -pääversiossa (vX tai vX.Y.Z)', () => {
    const huonot = kaytot.filter((k) => MINIMI[k.nimi] && !((/^v(\d+)/.exec(k.ref) || [])[1] >= MINIMI[k.nimi])).map((k) => k.f + ': ' + k.nimi + '@' + k.ref);
    expect(huonot).toEqual([]);
  });
});
