/* Pikakorjaus: ehdotuksen joukkuelista — tuplat pois, D144 (enintään kuusi + "+N"). Livenä: "P10, P11, P12, P10, P12, T13…" yli 20 nimeä. */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import vm from 'vm';
const VP = fs.readFileSync(new URL('../TalentMaster_VP_v25.html', import.meta.url), 'utf8');
const alku = VP.indexOf('function dedupToimenpiteet('), loppu = VP.indexOf('\nfunction ', alku + 10);
const lyh = VP.slice(VP.indexOf('function lyhennaNimi('), VP.indexOf('\nfunction ', VP.indexOf('function lyhennaNimi(') + 10));
const ctx = vm.createContext({}); vm.runInContext(lyh + '\n' + VP.slice(alku, loppu) + '\nthis.dedup = dedupToimenpiteet;', ctx);
const E = (signaali, joukkue, i) => ({ id: signaali + i, signaali, joukkue, teksti: 'x', luotu: 1 });
describe('dedupToimenpiteet · joukkuelista', () => {
  it('tuplat pois (P12 kilpa + harraste = yksi) ja järjestys säilyy', () => {
    const r = ctx.dedup(['P10 Demo', 'P11 Demo', 'P12 Demo', 'P10 Demo', 'P12 Demo', 'T13 Demo'].map((j, i) => E('tki_alhainen', j, i)))[0];
    const nimet = r.teksti.split(' — ')[0].split(', '); expect(new Set(nimet).size).toBe(nimet.length); expect(nimet.length).toBe(4); expect(r.ids.length).toBe(6);
  });
  it('yli kuusi joukkuetta → kuusi + "+N", koko teksti ei lista yli 20 nimeä', () => {
    const r = ctx.dedup(Array.from({ length: 22 }, (_, i) => E('tki_alhainen', 'P' + (i + 1) + ' Demo', i)))[0];
    const alkuosa = r.teksti.split(' — ')[0]; expect(alkuosa.split(', ').length).toBe(6); expect(alkuosa).toMatch(/ \+16$/);
  });
});
