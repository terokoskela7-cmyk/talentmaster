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
    // #1317: kaikki kierrokset samaa merkkiä mutta |ero| < 500 → oma tila, ei 'ei johdonmukainen'
    const s = AB.suunta({ ero: -404, ero_kierroksittain: [-410, -404, -368] });
    expect(s).toBe('A hitaampi (johdonmukainen, alle merkitsevyysrajan)'); expect(s).not.toMatch(/ei johdonmukainen/);
    expect(AB.suunta({ ero: 404, ero_kierroksittain: [410, 404, 368] })).toMatch(/B hitaampi \(johdonmukainen, alle merkitsevyysrajan\)/);
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
    expect(JSON.parse(readFileSync(join(ulos, 'yhteenveto.json'), 'utf8')).tulos['master|tyopoyta'].rivit.length).toBe(10);   // 5 mittaria (ml. Firestore-luvut) × kylmä/lämmin
    expect(rivit.join('\n')).toContain('B−A');
    let n = 0; const ajaaVirhe = (argit) => { n++; if (n === 2) return 3; const u = argit.find((a) => a.startsWith('--ulos=')).slice(7); writeFileSync(u, JSON.stringify(tulos([1], [1]))); return 0; };
    expect(await AB.main(['--a=' + A, '--b=' + B, '--ulos=' + ulos], { ajaa: ajaaVirhe, env, kirjaa: () => {}, virhe: () => {} })).toBe(3);
    expect(n).toBe(2);   // keskeytyy heti
  });
  it('--seura-a/--seura-b: sama URL kelpaa vain eri seuroilla; puoli saa oman --seura-arvon; luvut raportoidaan', async () => {
    const env = { STAGING_APPCHECK_DEBUG_TOKEN: 'x' };
    expect(AB.tarkista(AB.lueArgv(['--a=' + A, '--b=' + A, '--seura-a=2', '--seura-b=1']), env)).toBeNull();
    expect(AB.tarkista(AB.lueArgv(['--a=' + A, '--b=' + A, '--seura-a=1', '--seura-b=1']), env)).toMatch(/sama URL/);
    expect(AB.tarkista(AB.lueArgv(['--a=' + A, '--b=' + B, '--seura-a=2']), env)).toMatch(/yhdessä/);
    expect(AB.tarkista(AB.lueArgv(['--a=' + A, '--b=' + A, '--seura-a=0', '--seura-b=1']), env)).toMatch(/Virheellinen --seura-a/);
    const kutsut = [], rivit = [], ulos = mkdtempSync(join(tmpdir(), 'ab-seura-'));
    const luvut = (n) => ({ mittaukset: [{ sivu: 'seura', profiili: 'tyopoyta', kylma: [{ ...avaus(2000, 500, 900), yht: n }], lampimat: [{ ...avaus(1000, 500, 900), yht: n }] }] });
    const ajaa = (argit) => { kutsut.push(argit); const seura = argit.find((a) => a.startsWith('--seura=')).slice(8); writeFileSync(argit.find((a) => a.startsWith('--ulos=')).slice(7), JSON.stringify(luvut(seura === '2' ? 1048 : 6))); return 0; };
    expect(await AB.main(['--a=' + A, '--b=' + A, '--seura-a=2', '--seura-b=1', '--kierrokset=2', '--sivut=seura', '--ulos=' + ulos], { ajaa, env, kirjaa: (r) => rivit.push(r), virhe: () => {} })).toBe(0);
    expect(kutsut.map((k) => k.find((a) => a.startsWith('--seura=')).slice(8)).join('')).toBe('2112');   // A=2, B=1; järjestys AB/BA
    expect(kutsut.every((k) => k.includes('--sivut=seura') && k.includes('--url=' + A))).toBe(true);
    const y = JSON.parse(readFileSync(join(ulos, 'yhteenveto.json'), 'utf8'));
    expect(y.meta.seura_a).toBe(2); expect(y.meta.seura_b).toBe(1);
    const r = y.tulos['seura|tyopoyta'].rivit.find((x) => x.tila === 'kylma' && x.mittari === 'luvut');
    expect(r).toMatchObject({ a: 1048, b: 6, ero: -1042 });
    expect(rivit.join('\n')).toContain('kuorma_seura_02');
    expect(AB.seuraPuolelle(AB.lueArgv(['--seura=3']), 'A')).toBe(3);   // ilman --seura-a/b yhteinen --seura
  });
  it('kuiva-ajo ei kutsu ajajaa eikä vaadi tokenia', async () => {
    let kutsuttu = false; const rivit = [];
    expect(await AB.main(['--a=' + A, '--b=' + B, '--kuiva'], { ajaa: () => { kutsuttu = true; return 0; }, env: {}, kirjaa: (r) => rivit.push(r), virhe: () => {} })).toBe(0);
    expect(kutsuttu).toBe(false); expect(rivit.join('\n')).toMatch(/kierros 2: B → A/);
  });
  it('--esta-a / --esta-b: välitetään --esta:ksi vain omalle puolelle, näkyy otsikossa ja yhteenvedon metassa; tyhjä glob hylätään', async () => {
    const G = '**/apis.google.com/**', kutsut = [], rivit = [], ulos = join(mkdtempSync(join(tmpdir(), 'abesta-')), 'ab');
    const ajaa = (argit) => { kutsut.push(argit); const u = argit.find((a) => a.startsWith('--ulos=')).slice(7); writeFileSync(u, JSON.stringify(tulos([2000], [1000]))); return 0; };
    expect(await AB.main(['--a=' + A, '--b=' + B, '--kierrokset=2', '--esta-b=' + G, '--ulos=' + ulos], { ajaa, env: { STAGING_APPCHECK_DEBUG_TOKEN: 'x' }, kirjaa: (r) => rivit.push(r), virhe: () => {} })).toBe(0);
    kutsut.forEach((argit) => { const b = argit.includes('--url=' + B); expect(argit.filter((a) => a.startsWith('--esta=')))[b ? 'toEqual' : 'toEqual'](b ? ['--esta=' + G] : []); });
    const t = rivit.join('\n'); expect(t).toMatch(/B = .*estetty: \*\*\/apis\.google\.com/); expect(t).toMatch(/esto A: – · esto B: /);
    expect(JSON.parse(readFileSync(join(ulos, 'yhteenveto.json'), 'utf8')).meta.esta_b).toEqual([G]);
    let v = ''; expect(await AB.main(['--a=' + A, '--b=' + B, '--esta-a=', '--kuiva'], { env: {}, kirjaa: () => {}, virhe: (r) => { v = r; } })).toBe(2); expect(v).toMatch(/esta/);
  });
  it('--esta-b=<isäntänimi>: välitetään, ja KUMMALLEKIN puolelle annetaan --reititys (sama välimuistikäytös); yhteenveto: reititys molemmat', async () => {
    const kutsut = [], rivit = [], ulos = join(mkdtempSync(join(tmpdir(), 'abreit-')), 'ab');
    const ajaa = (argit) => { kutsut.push(argit); const u = argit.find((a) => a.startsWith('--ulos=')).slice(7); writeFileSync(u, JSON.stringify(tulos([2000], [1000]))); return 0; };
    expect(await AB.main(['--a=' + A, '--b=' + B, '--kierrokset=2', '--esta-b=apis.google.com', '--ulos=' + ulos], { ajaa, env: { STAGING_APPCHECK_DEBUG_TOKEN: 'x' }, kirjaa: (r) => rivit.push(r), virhe: () => {} })).toBe(0);
    kutsut.forEach((argit) => { expect(argit).toContain('--reititys'); expect(argit.filter((a) => a.startsWith('--esta='))).toEqual(argit.includes('--url=' + B) ? ['--esta=apis.google.com'] : []); });
    expect(rivit.join('\n')).toMatch(/reititys: molemmat/);
    expect(JSON.parse(readFileSync(join(ulos, 'yhteenveto.json'), 'utf8')).meta.reititys).toBe('molemmat');
    const ilman = []; await AB.main(['--a=' + A, '--b=' + B, '--ulos=' + ulos + '2'], { ajaa: (argit) => { ilman.push(argit); const u = argit.find((a) => a.startsWith('--ulos=')).slice(7); writeFileSync(u, JSON.stringify(tulos([1], [1]))); return 0; }, env: { STAGING_APPCHECK_DEBUG_TOKEN: 'x' }, kirjaa: () => {}, virhe: () => {} });
    expect(ilman.every((a) => !a.includes('--reititys'))).toBe(true);
  });
  it('estoPredikaatti: isäntänimi osuu apis.google.com/js/api.js:ään ja gapi_iframes-URL:iin, ei muihin; vanha glob "*apis.google.com*" ei osu (regressio)', () => {
    const S = require('../scripts/kuorma/mittaa_sivut.js'), p = S.estoPredikaatti('apis.google.com');
    expect(p('https://apis.google.com/js/api.js')).toBe(true);
    expect(p('https://apis.google.com/_/scs/abc-static/_/js/k=gapi.gapi.en.X/m=gapi_iframes/rt=j/sv=1/d=1/ed=1/cb=gapi.loaded_0?x=1')).toBe(true);
    expect(p('https://www.apis.google.com/x')).toBe(true);   // aliverkkotunnus
    expect(p('https://notapis.google.com/x')).toBe(false); expect(p('https://www.googleapis.com/x')).toBe(false); expect(p('https://talentmaster-staging.web.app/?u=apis.google.com')).toBe(false);
    expect(S.estoPredikaatti('*apis.google.com*')('https://apis.google.com/js/api.js')).toBe(false);   // glob: * ei ylitä '/'
    expect(S.estoPredikaatti('https://apis.google.com/**')('https://apis.google.com/js/api.js')).toBe(true);
    expect(S.lueArgv(['--esta=apis.google.com', '--reititys']).reititys).toBe(true);
  });
  it('asennaReititys: esto → catch-all continue + abort-reitti; ilman estoa/--reititys ei reittejä; --reititys yksin → vain continue (A-puoli)', async () => {
    const S = require('../scripts/kuorma/mittaa_sivut.js');
    const teeCtx = () => { const reitit = []; return { reitit, route: async (m, h) => { reitit.push({ m, h }); } }; };
    const c0 = teeCtx(); await S.asennaReititys(c0, [], false); expect(c0.reitit.length).toBe(0);
    const cA = teeCtx(); await S.asennaReititys(cA, [], true); expect(cA.reitit.length).toBe(1); expect(cA.reitit[0].m).toBe('**/*');
    const cB = teeCtx(), estetyt = await S.asennaReititys(cB, ['apis.google.com'], true);
    expect(cB.reitit.length).toBe(2); expect(cB.reitit[0].m).toBe('**/*'); expect(typeof cB.reitit[1].m).toBe('function');
    expect(cB.reitit[1].m(new URL('https://apis.google.com/js/api.js'))).toBe(true); expect(cB.reitit[1].m(new URL('https://x.web.app/a.js'))).toBe(false);
    let abortattu = null; cB.reitit[1].h({ request: () => ({ url: () => 'https://apis.google.com/js/api.js?x=1' }), abort: (s) => { abortattu = s; return Promise.resolve(); } });
    expect(abortattu).toBe('blockedbyclient'); expect(estetyt).toEqual(['https://apis.google.com/js/api.js']);
    let jatkettu = false; cA.reitit[0].h({ continue: () => { jatkettu = true; return Promise.resolve(); } }); expect(jatkettu).toBe(true);
  });
  it('ab main: esto annettu mutta 0 estettyä → virheilmoitus (rivit virheellisiä, poimi ohittaa ne)', async () => {
    const ulos = join(mkdtempSync(join(tmpdir(), 'abnolla-')), 'ab'), vir = [];
    const huono = { mittaukset: [{ sivu: 'master', profiili: 'tyopoyta', kylma: [Object.assign(avaus(2000, 500, 900), { virhe: 'esto ei osunut: apis.google.com → 0 estettyä pyyntöä (rivi virheellinen, ei tulos)' })], lampimat: [avaus(1000, 250, 500)] }] };
    const ajaa = (argit) => { const u = argit.find((a) => a.startsWith('--ulos=')).slice(7); writeFileSync(u, JSON.stringify(argit.includes('--url=' + B) ? huono : tulos([2000], [1000]))); return 0; };
    await AB.main(['--a=' + A, '--b=' + B, '--kierrokset=2', '--esta-b=apis.google.com', '--ulos=' + ulos], { ajaa, env: { STAGING_APPCHECK_DEBUG_TOKEN: 'x' }, kirjaa: () => {}, virhe: (r) => vir.push(r) });
    expect(vir.join('\n')).toMatch(/B: esto \(apis\.google\.com\) ei osunut/);
    expect(AB.poimi(huono)['master|tyopoyta'].kylma.fcp).toEqual([]);
  });
});
