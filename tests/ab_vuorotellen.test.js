/* ab_vuorotellen.js: järjestyksen vaihtuminen, token vain ympäristöstä, URL-vartija, aggregointi (mediaanit, B−A, suunta) — ajaja mockattu, ei selainta eikä verkkoa. */
import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const AB = require('../scripts/kuorma/ab_vuorotellen.js');
const A = 'https://talentmaster-staging--kuorma-aaaa1111.web.app', B = 'https://talentmaster-staging--kuorma-b-bbbb2222.web.app';
const avaus = (fcp, auth, fs) => ({ fcp_ms: fcp, tti_ms: fcp + 500, ajat: { auth_haku: [auth, auth + 300], firestore_ensimmainen: [fs, fs + 100] } });
const tulos = (kylmaFcp, lampFcp) => ({ mittaukset: [{ sivu: 'master', profiili: 'tyopoyta', kylma: kylmaFcp.map((f) => avaus(f, f / 4, f / 2)), lampimat: lampFcp.map((f) => avaus(f, f / 4, f / 2)) }] });

describe('ab_vuorotellen', () => {
  it('järjestys vaihtuu joka kierroksella', () => {
    expect([0, 1, 2, 3].map((k) => AB.jarjestys(k).join(''))).toEqual(['AB', 'BA', 'AB', 'BA']);
  });
  it('tarkista: token ei komentoriviltä, vain staging-URL:t, A≠B, token puuttuu → virhe', () => {
    const ok = AB.lueArgv(['--a=' + A, '--b=' + B]), env = { STAGING_APPCHECK_DEBUG_TOKEN: 'x' };
    expect(AB.tarkista(ok, env)).toBeNull();
    expect(AB.tarkista(ok, {})).toMatch(/STAGING_APPCHECK_DEBUG_TOKEN/);
    expect(AB.tarkista(AB.lueArgv(['--a=' + A, '--b=' + B, '--token=salainen123']), env)).toMatch(/komentoriviltä/);
    expect(AB.tarkista(AB.lueArgv(['--a=' + A, '--b=' + B, '--token=salainen123']), env)).not.toContain('salainen123');
    expect(AB.tarkista(AB.lueArgv(['--a=https://talentmaster-pilot.web.app', '--b=' + B]), env)).toMatch(/staging/);
    expect(AB.tarkista(AB.lueArgv(['--a=' + A, '--b=' + A]), env)).toMatch(/sama URL/);
    expect(AB.tarkista(AB.lueArgv(['--a=' + A, '--b=' + B, '--kierrokset=1']), env)).toMatch(/kierrokset/);
  });
  it('yhdista: mediaanit, B−A ja per-kierros-erotus; johdonmukaisuus vaatii saman suunnan käännetylläkin järjestyksellä', () => {
    const kr = [{ A: tulos([2000, 2100, 2200], [1000, 1100, 1200]), B: tulos([3500, 3600, 3700], [1100, 1100, 1100]) }, { A: tulos([2000, 2000, 2000], [1000, 1000, 1000]), B: tulos([3600, 3600, 3600], [1000, 1000, 1000]) }];
    const y = AB.yhdista(kr)['master|tyopoyta'];
    const r = y.rivit.find((x) => x.tila === 'kylma' && x.mittari === 'fcp');
    expect(r.a).toBe(2000); expect(r.b).toBe(3600); expect(r.ero).toBe(1600); expect(r.ero_kierroksittain).toEqual([1500, 1600]);
    expect(AB.suunta(r)).toMatch(/B hitaampi \(johdonmukainen\)/);
    expect(AB.suunta({ ero: 900, ero_kierroksittain: [1800, -100] })).toMatch(/ei johdonmukainen/);
    expect(AB.suunta(y.rivit.find((x) => x.tila === 'lampimat' && x.mittari === 'fcp'))).toMatch(/ei johdonmukainen/);
    expect(y.rivit.find((x) => x.tila === 'kylma' && x.mittari === 'auth').a).toBe(500);
  });
  it('main: ajaa A,B / B,A -järjestyksessä, ympäristö periytyy (ei tokenia argumentteihin), kirjoittaa yhteenvedon; virhekoodi keskeyttää', async () => {
    const ulos = mkdtempSync(join(tmpdir(), 'ab-')), kutsut = [], rivit = [];
    const ajaa = (argit, env) => { kutsut.push({ argit, token: env.STAGING_APPCHECK_DEBUG_TOKEN }); const u = argit.find((a) => a.startsWith('--ulos=')).slice(7); writeFileSync(u, JSON.stringify(tulos([2000], [1000]))); return 0; };
    const env = { STAGING_APPCHECK_DEBUG_TOKEN: 'tok-xyz' };
    const koodi = await AB.main(['--a=' + A, '--b=' + B, '--kierrokset=3', '--ulos=' + ulos], { ajaa, env, kirjaa: (r) => rivit.push(r), virhe: () => {} });
    expect(koodi).toBe(0);
    expect(kutsut.map((k) => k.argit.find((a) => a.startsWith('--url=')).slice(6) === A ? 'A' : 'B').join('')).toBe('ABBAAB');
    expect(kutsut.every((k) => k.token === 'tok-xyz' && !k.argit.join(' ').includes('tok-xyz'))).toBe(true);
    expect(existsSync(join(ulos, 'yhteenveto.json'))).toBe(true);
    expect(JSON.parse(readFileSync(join(ulos, 'yhteenveto.json'), 'utf8')).tulos['master|tyopoyta'].rivit.length).toBe(12);   // 6 mittaria (FCP, TTI, init, App Check -vaihto, auth, Firestore) × 2 tilaa
    expect(rivit.join('\n')).toContain('B−A');
    let n = 0; const ajaaVirhe = (argit) => { n++; if (n === 2) return 3; const u = argit.find((a) => a.startsWith('--ulos=')).slice(7); writeFileSync(u, JSON.stringify(tulos([1], [1]))); return 0; };
    expect(await AB.main(['--a=' + A, '--b=' + B, '--ulos=' + ulos], { ajaa: ajaaVirhe, env, kirjaa: () => {}, virhe: () => {} })).toBe(3);
    expect(n).toBe(2);   // keskeytyy heti
  });
  it('--ilman-tokenia (tapaus b): ei vaadi debug-tokenia ja välittyy mittaa_sivut-ajoihin', async () => {
    const kutsut = []; const ulos = join(mkdtempSync(join(tmpdir(), 'abit-')), 'x');
    const ajaa = (argit) => { kutsut.push(argit); const u = argit.find((a) => a.startsWith('--ulos=')).slice(7); writeFileSync(u, JSON.stringify(tulos([1], [1]))); return 0; };
    expect(await AB.main(['--a=' + A, '--b=' + B, '--kierrokset=2', '--ilman-tokenia', '--ulos=' + ulos], { ajaa, env: {}, kirjaa: () => {}, virhe: () => {} })).toBe(0);
    expect(kutsut.length).toBe(4); expect(kutsut.every((k) => k.includes('--ilman-tokenia'))).toBe(true);
    expect(await AB.main(['--a=' + A, '--b=' + B, '--ulos=' + ulos], { ajaa, env: {}, kirjaa: () => {}, virhe: () => {} })).toBe(2);   // ilman lippua token vaaditaan edelleen
  });
  it('mittaa_sivut --ilman-tokenia: ei vaadi debug-tokenia; storageStatesta poistuu vain App Check -tietokanta (Auth-istunto säilyy)', () => {
    const MS = require('../scripts/kuorma/mittaa_sivut.js');
    expect(MS.tarkista(MS.lueArgv(['--url=' + A, '--ilman-tokenia']), {}, () => true)).toBe(null);
    expect(MS.tarkista(MS.lueArgv(['--url=' + A]), {}, () => true)).toMatch(/STAGING_APPCHECK_DEBUG_TOKEN/);
    const st = { cookies: [1], origins: [{ origin: 'x', localStorage: [], indexedDB: [{ name: 'firebaseLocalStorageDb' }, { name: 'firebase-app-check-database' }] }] };
    const r = MS.ilmanAppCheckTokenia(st);
    expect(r.origins[0].indexedDB.map((d) => d.name)).toEqual(['firebaseLocalStorageDb']); expect(r.cookies).toEqual([1]); expect(st.origins[0].indexedDB.length).toBe(2);   // alkuperäinen koskematon
  });
  it('kuiva-ajo ei kutsu ajajaa eikä vaadi tokenia', async () => {
    let kutsuttu = false; const rivit = [];
    expect(await AB.main(['--a=' + A, '--b=' + B, '--kuiva'], { ajaa: () => { kutsuttu = true; return 0; }, env: {}, kirjaa: (r) => rivit.push(r), virhe: () => {} })).toBe(0);
    expect(kutsuttu).toBe(false); expect(rivit.join('\n')).toMatch(/kierros 2: B → A/);
  });
});
