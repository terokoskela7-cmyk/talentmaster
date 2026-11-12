import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { lueKuori } = require('../scripts/kuoren_lahde.js');
const juuri = path.resolve(__dirname, '..');
const html = lueKuori('TalentMaster_Seura.html');   // vartija: Seuran lähdettä ei lueta ohi kuoren_lahde.js:n
const E = require('../lib/tm_pelaajat_esilataus.js');

describe('Seura: pelaajaluvun jako (B.6 #1, lib/tm_pelaajat_esilataus.js)', () => {
  it('lib ladataan Seurassa; KPI-lataus tallettaa snapin', () => {
    expect(html).toContain('<script src="lib/tm_pelaajat_esilataus.js"></script>');
    expect(html).toMatch(/tmPelaajatEsiTalleta\(tila\.seuraId, pelaajatSnap\)/);
  });
  it('lista ja Kehitystilanne käyttävät jaettua lukua', () => {
    expect(html).toMatch(/const snap = await tmLuePelaajatSnap\(db, tila\.seuraId\)/);
    expect(html).toMatch(/tmLuePelaajatSnap\(db, sid\),/);
  });
  it('kertakäyttöinen: ota() tyhjentää, vieras seura hylätään, tyhjennä() nollaa, vanha (>20 s) hylätään, muuten varapolku lukee Firestoresta', async () => {
    E.talleta('a', { n: 1 }); expect(E.ota('a')).toEqual({ n: 1 }); expect(E.ota('a')).toBeNull();
    E.talleta('a', { n: 2 }); expect(E.ota('b')).toBeNull();
    E.talleta('a', { n: 3 }); E.tyhjenna(); expect(E.ota('a')).toBeNull();
    const nyt = Date.now; try { E.talleta('a', { n: 4 }); Date.now = () => nyt() + 21000; expect(E.ota('a')).toBeNull(); } finally { Date.now = nyt; }
    let luvut = 0; const db = { collection: () => ({ doc: () => ({ collection: () => ({ get: async () => { luvut++; return { v: 'tuore' }; } }) }) }) };
    E.talleta('a', { v: 'esi' });
    expect(await E.lue(db, 'a')).toEqual({ v: 'esi' }); expect(luvut).toBe(0);   // ensimmäinen: esilatauksesta
    expect(await E.lue(db, 'a')).toEqual({ v: 'tuore' }); expect(luvut).toBe(1);  // toinen: oikea luku
  });
  it('kirjoituspolut tyhjentävät esilatauksen', () => {
    for (const f of ['seura/seura_kutsut.js', 'seura/seura_pelaajahallinta.js', 'seura/seura_hallinta.js', 'seura/seura_tuonti.js']) {
      expect(fs.readFileSync(path.join(juuri, f), 'utf8'), f).toMatch(/tmPelaajatEsiTyhjenna/);
    }
    expect(html).toMatch(/tmPelaajatEsiTyhjenna\(\);\s*\n\s*await db\.collection\('seurat'\)\.doc\(tila\.seuraId\)\.collection\('pelaajat'\)\.doc\(pid\)\.update/);
  });
  it('rivikatto (Seura + seura/-osat) alle 7100 pysyy', () => {
    expect(lueKuori('TalentMaster_Seura.html').split('\n').length - 1).toBeLessThanOrEqual(7100);
  });
});
