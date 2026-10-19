/* K2: Masterin Näyttö (V4b-1) täsmälleen ennallaan kun lohkot siirrettiin libiin (lib/tm_naytto_lohkot.js).
   Baseline (tests/fixtures/k2_master_naytto_baseline.json) on luotu VANHASTA koodista (origin/main 8018dc97, ennen siirtoa) samalla kellolla ja TZ:llä: TM_SIVU_JUURI=<vanha kopio> node tests/helpers/master_naytto.mjs. */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { renderNaytto, NAYTTO_PELAAJAT } from './helpers/master_naytto.mjs';
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
beforeAll(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-07T12:00:00+03:00')); });
afterAll(() => { vi.useRealTimers(); });
const BASE = JSON.parse(readFileSync(join(juuri, 'tests/fixtures/k2_master_naytto_baseline.json'), 'utf8'));
describe('K2: Masterin Näyttö-lohkot ennallaan (snapshot vanhasta koodista)', () => {
  for (const k of Object.keys(NAYTTO_PELAAJAT)) it('pelaaja "' + k + '": _ktNayttoHTML, _ktKasvuHTML, _mMitaOsattavaHTML, KPI-solut === baseline', () => {
    const o = renderNaytto(NAYTTO_PELAAJAT[k]);
    expect(o.naytto).toBe(BASE[k].naytto); expect(o.kasvu).toBe(BASE[k].kasvu); expect(o.mita).toBe(BASE[k].mita); expect(o.stats).toBe(BASE[k].stats);
  });
  it('baseline ei ole tyhjä: rikas pelaaja sisältää kaikki lohkot', () => {
    for (const t of ['Perustiedot', 'Kasvu ja kypsyys', 'Mittaukset', 'Pelihavainnot', 'Psyykkinen (D3)', 'Harjoittelu', 'Mitä pelaajan tulee osata']) expect(BASE.rikas.naytto).toContain(t);
    expect(BASE.rikas.mita).toContain('Mitä pelaajan tulee osata');
  });
});
