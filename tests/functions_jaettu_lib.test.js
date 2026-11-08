/**
 * functions/ ↔ lib/ jaetut kopiot (functions/jaettu_lib.json; S1 — Seuran pulssi, myöhemmin R3).
 * functions/ deployataan omana pakettinaan eikä voi ladata ../lib/: lib/-tiedoston TAVU TAVULTA SAMA kopio on functions/-kansiossa. Tämä portti pitää ne samoina,
 * ja todistaa, että kopiot toimivat IRTI lib/-kansiosta (ei piilotettua ../lib-riippuvuutta). Päivitys: node scripts/sync_functions_lib.js
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, mkdtempSync, copyFileSync } from 'fs';
import { createRequire } from 'module';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const lue = (f) => readFileSync(join(juuri, f), 'utf8');
const M = JSON.parse(lue('functions/jaettu_lib.json'));

describe('jaetut lib-kopiot', () => {
  it('manifestin jokainen tiedosto on tavu tavulta sama functions/- ja lib/-kansiossa', () => {
    expect(M.tiedostot.length).toBeGreaterThan(0);
    for (const f of M.tiedostot) expect(lue('functions/' + f), f + ' (aja node scripts/sync_functions_lib.js)').toBe(lue('lib/' + f));
  });
  it('skriptin --tarkista on vihreä', () => { const r = spawnSync('node', ['scripts/sync_functions_lib.js', '--tarkista'], { cwd: juuri, encoding: 'utf8' }); expect(r.status, r.stderr).toBe(0); });
  it('kopiot toimivat eristettynä (vain functions/-tiedostot tmp-hakemistossa, ei ../lib): kooste lasketaan', () => {
    const d = mkdtempSync(join(tmpdir(), 'fn-eristys-'));
    for (const f of M.tiedostot) copyFileSync(join(juuri, 'functions', f), join(d, f));
    const koodi = `const K=require('./tm_seuran_kooste.js');const a=K.tmKoosteAnalysoi({joukkueet:[{id:'u13',nimi:'KPV U13'}],pelaajat:[{id:'p',joukkue:'KPV U13',syntymaVuosi:2013,jaksofokus:{konsepti_avain:'k',alkoi:'2026-10-05T10:00:00.000Z',kesto_vk:4}}],aika:{alkuMs:Date.UTC(2026,9,4,21),loppuMs:Date.UTC(2026,9,11,21),arvioMs:Date.UTC(2026,9,11,18),vuosi:2026}});const t=K.tmKoosteTulos(a,{vastanneet:['p']},{vk:'2026-W41'});process.stdout.write(JSON.stringify(t.joukkueet.u13));`;
    const r = spawnSync('node', ['-e', koodi], { cwd: d, encoding: 'utf8' }); expect(r.status, r.stderr).toBe(0);
    const u = JSON.parse(r.stdout); expect(u.n_jaksolla).toBe(1); expect(u.n_vastausperusta).toBe(1); expect(u.n_vastanneet).toBe(1);
  });
  it('toimenpide-signaalien ketju (projekti 03 PR B, PM P4) sulkeutuu eristettynä: fyysinen §28-vahti + tekniikka + signaalit ajetaan vain functions/-kopioilla', () => {
    const d = mkdtempSync(join(tmpdir(), 'fn-signaalit-'));
    for (const f of M.tiedostot) copyFileSync(join(juuri, 'functions', f), join(d, f));
    for (const f of ['tm_phv_tila.js']) copyFileSync(join(juuri, 'functions', f), join(d, f));
    const koodi = `const F=require('./tm_fyysinen.js'),T=require('./tm_tekniikka.js'),S=require('./tm_toimenpide_signaalit.js');
      const pp=[{id:'a',syntymaVuosi:2012,joukkue:'J',_jNimet:['J'],sukupuoli:'M',hh_viimeisin:{lin30m:4.5,cmj:12,lin10m:2.4},tki_viimeisin:40,testipaivat:{fyysinen_hh:'2026-10-01',tekniikka:'2026-10-01'}}];
      const ctx={nytMs:Date.UTC(2026,10,9),onJoukkueessa:(p,j)=>p._jNimet.indexOf(j)>=0,jasenNimet:(p)=>p._jNimet,fysinen:F,tekniikka:T};
      const f=F.tmFyysinenJoukkueLuokka(pp,ctx.nytMs,{joukkueNimi:'J'});
      process.stdout.write(JSON.stringify({kypsyys:f.kypsyysMittaamatta,n:S.laskeEhdotukset(pp,ctx).length}));`;
    const r = spawnSync('node', ['-e', koodi], { cwd: d, encoding: 'utf8' }); expect(r.status, r.stderr).toBe(0);
    const u = JSON.parse(r.stdout); expect(u.kypsyys).toBe(1); expect(u.n).toBeGreaterThanOrEqual(0);   // kypsyys=1 → LU.kypsyysEstetty (tm_koti_luvut → tm_idp) toimii eristettynä
  });
  it('functions/seuran_kooste.js käyttää vain functions/-kansion tiedostoja (ei ../lib)', () => { expect(lue('functions/seuran_kooste.js')).not.toMatch(/require\(['"]\.\.\//); });
});
