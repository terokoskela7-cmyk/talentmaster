// Projekti 06 PR 3 — mittausputken pure-osat ja skriptien vartijat (ei verkkoa, ei selainta): tilastot, TTI, Firestore-dokumenttikoko, tunnukset, URL-/lukko-vartijat, funktio- ja monitoring-skriptit (vale-suoritin), raportin P11-arviointi.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { readFileSync, mkdtempSync, readFileSync as rd, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
const require = createRequire(import.meta.url);
const M = require('../scripts/kuorma/mittaus_lib.js');
const S = require('../scripts/kuorma/mittaa_sivut.js');
const F = require('../scripts/kuorma/mittaa_funktiot.js');
const MO = require('../scripts/kuorma/mittaa_monitoring.js');
const D = require('../scripts/kuorma/mittaa_dokkoot.js');
const R = require('../scripts/kuorma/mittaus_raportti.js');
const PILOT = ['talentmaster', 'pilot'].join('-');
const tmp = () => mkdtempSync(join(tmpdir(), 'mittaus-'));

describe('P11-rajat ja tilastot', () => {
  it('RAJAT = VAIHE0 P11: 2 s / 5 s / 2 000 lukua / 270 s / 250 kt / 1 €', () => {
    expect(M.RAJAT).toMatchObject({ interaktiivinen_tyopoyta_s: 2, interaktiivinen_slow4g_s: 5, lukuja_per_avaus: 2000, funktio_s: 270, pelaajadokumentti_kt: 250, kustannus_eur_pelaaja_vuosi: 1 });
    expect(Object.isFrozen(M.RAJAT)).toBe(true);
  });
  it('tilasto: mediaani, p95 (nearest-rank), ohittaa ei-luvut', () => {
    const t = M.tilasto([5, 1, 3, 2, 4, null, 'x', NaN]); expect(t).toEqual({ n: 5, mediaani: 3, p95: 5, min: 1, max: 5 });
    expect(M.tilasto([1, 2, 3, 4]).mediaani).toBe(2.5); expect(M.tilasto([]).mediaani).toBeNull(); expect(M.tilasto(Array.from({ length: 100 }, (_, i) => i + 1)).p95).toBe(95);
  });
});

describe('laskeInteraktiivinen (TTI-approksimaatio)', () => {
  it('rauhallinen heti FCP:n jälkeen → t = FCP', () => expect(M.laskeInteraktiivinen({ fcp: 800, varit: [], ikkuna: 2000, havaintoLoppu: 4000 })).toBe(800));
  it('pitkä tehtävä + avoin luku siirtävät: t = viimeisen kiireisen jakson loppu ennen ≥ 2 s hiljaisuutta', () => {
    const o = { fcp: 500, varit: [[600, 900], [1200, 3100], [3200, 3300]], ikkuna: 2000, havaintoLoppu: 6000 };
    expect(M.laskeInteraktiivinen(o)).toBe(3300);
  });
  it('ei ehdi rauhoittua havaintoikkunassa → null; ennen FCP:tä päättyneet jaksot ohitetaan', () => {
    expect(M.laskeInteraktiivinen({ fcp: 500, varit: [[0, 400], [1000, 2000]], ikkuna: 2000, havaintoLoppu: 3500 })).toBeNull();
    expect(M.laskeInteraktiivinen({ fcp: 500, varit: [[0, 400]], ikkuna: 2000, havaintoLoppu: 3000 })).toBe(500);
    expect(M.laskeInteraktiivinen({ fcp: undefined, varit: [], havaintoLoppu: 1 })).toBeNull();
  });
});

describe('firestoreDokKoko (Firestore-tallennuskoon laskentakaava)', () => {
  it('users/jeff {name:"Jeff"} = nimi (5+1)+(4+1)+16 + kenttä (4+1)+(4+1) + 32 = 69', () => expect(M.firestoreDokKoko('users/jeff', { name: 'Jeff' })).toBe(69));
  it('arvotyypit: luku 8, totuusarvo 1, null 1, aikaleima 8, taulukko Σ, map Σ(avain+1+arvo); undefined ohitetaan; ä/ö = 2 tavua', () => {
    const base = M.firestoreDokKoko('a/b', {});
    expect(M.firestoreDokKoko('a/b', { n: 1 }) - base).toBe(2 + 8); expect(M.firestoreDokKoko('a/b', { b: true }) - base).toBe(2 + 1); expect(M.firestoreDokKoko('a/b', { z: null }) - base).toBe(2 + 1);
    expect(M.firestoreDokKoko('a/b', { t: new Date() }) - base).toBe(2 + 8); expect(M.firestoreDokKoko('a/b', { t: { toDate() {} } }) - base).toBe(2 + 8);
    expect(M.firestoreDokKoko('a/b', { l: ['ab', 3] }) - base).toBe(2 + (3 + 8)); expect(M.firestoreDokKoko('a/b', { m: { x: 'y' } }) - base).toBe(2 + (2 + 2)); expect(M.firestoreDokKoko('a/b', { u: undefined }) - base).toBe(0);
    expect(M.firestoreDokKoko('a/b', { s: 'ä' }) - base).toBe(2 + 3);
  });
  it('kasvaa lineaarisesti taulukon rivimäärän mukana (jaksofokus_historia-tyyppinen kasvaja)', () => {
    const rivi = { alku: '2026-01-01', loppu: '2026-02-01', teema: 'Pallonhallinta', paino: 3 }, koko = (n) => M.firestoreDokKoko('seurat/s/pelaajat/p', { h: Array.from({ length: n }, () => rivi) });
    expect(koko(100) - koko(0)).toBe(100 * (Object.keys(rivi).reduce((a, k) => a + k.length + 1 + (typeof rivi[k] === 'string' ? rivi[k].length + 1 : 8), 0)));
  });
});

describe('tunnukset ja vartijat', () => {
  const teksti = '# kommentti\nvp.s01@kuorma.test\tSalasana-Yksi\tvp\nvalmentaja1.s01@kuorma.test\tToinen#Salasana\nmuu@example.com\tEiSaa\nrikki-rivi\n';
  it('lueTunnukset: vain @kuorma.test, kommentit/rikkinäiset pois; haeTunnus rooli+seura', () => {
    const m = M.lueTunnukset(teksti); expect([...m.keys()]).toEqual(['vp.s01@kuorma.test', 'valmentaja1.s01@kuorma.test']);
    expect(M.haeTunnus(m, 'vp', 1)).toEqual({ email: 'vp.s01@kuorma.test', salasana: 'Salasana-Yksi' }); expect(M.haeTunnus(m, 'vp', 2)).toBeNull();
  });
  it('piilota poistaa salasanat mistä tahansa tekstistä (virheviestit, JSON)', () => {
    const m = M.lueTunnukset(teksti); const s = M.piilota('virhe: Salasana-Yksi ja Toinen#Salasana + Salasana-Yksi', m); expect(s).not.toMatch(/Salasana-Yksi|Toinen#Salasana/); expect(s).toContain('***');
  });
  it('kanavaUrlSallittu: vain staging-hosting (live + kanava); tuotanto, http, muu isäntä hylätään', () => {
    ['https://talentmaster-staging.web.app', 'https://talentmaster-staging--kuorma-abc123.web.app', 'https://talentmaster-staging.web.app/'].forEach((u) => expect(M.kanavaUrlSallittu(u), u).toBe(true));
    ['https://' + PILOT + '.web.app', 'https://' + PILOT + '--kuorma-x.web.app', 'http://talentmaster-staging.web.app', 'https://talentmaster-staging.web.app.evil.com', 'https://talentmasterid.com', 'https://terokoskela7-cmyk.github.io/talentmaster/', '', undefined].forEach((u) => expect(M.kanavaUrlSallittu(u), String(u)).toBe(false));
  });
  it('parsiFunktioLoki: gen1-rivit → ms + tila', () => {
    const r = M.parsiFunktioLoki([{ textPayload: "Function execution took 12345 ms, finished with status: 'ok'", timestamp: 't1' }, { textPayload: 'Function execution took 200 ms, finished with status code: 200' }, { textPayload: 'muu rivi' }, "Function execution took 5 ms"]);
    expect(r).toEqual([{ ms: 12345, tila: 'ok', aika: 't1' }, { ms: 200, tila: '200', aika: null }, { ms: 5, tila: null, aika: null }]);
  });
  it('kustannus: P7-laskenta; €/pelaaja/vuosi', () => {
    const c = M.kustannus({ lukujaAvaus: 5000, pelaajia: 10000, kayttajia: 415, avauksiaPvKayttaja: 2, paivia: 20, funktiot: [] });
    expect(c.avauksiaKk).toBe(16600); expect(c.luvutKk).toBe(83000000); expect(c.usdKk).toBeCloseTo(49.8, 1); expect(c.eurPelaajaVuosi).toBeCloseTo(c.eurKk * 12 / 10000, 6);
  });
});

describe('mittaa_sivut: argumentit ja vartijat', () => {
  const ok = ['--url=https://talentmaster-staging--kuorma-abc.web.app'];
  it('oletukset: 6 sivua × 2 profiilia, 5 toistoa; profiilit: puhelin Slow 4G (1,6 Mbit/s, 150 ms, CPU 4×), työpöytä ei kuristusta', () => {
    const o = S.lueArgv(ok); expect(o.sivut).toEqual(['seura', 'vp', 'master', 'kehitys', 'testaus', 'pelaaja']); expect(o.profiilit).toEqual(['tyopoyta', 'puhelin']); expect(o.toistot).toBe(5);
    expect(S.PROFIILIT.puhelin.verkko).toEqual({ offline: false, latency: 150, downloadThroughput: 200000, uploadThroughput: 93750 }); expect(S.PROFIILIT.puhelin.cpu).toBe(4); expect(S.PROFIILIT.tyopoyta.verkko).toBeNull();
    Object.values(S.SIVUT).forEach((s) => expect(existsSync(join(__dirname, '..', s.tiedosto)), s.tiedosto).toBe(true));
  });
  it('tarkista: tuotanto-URL hylätään; token puuttuu → virhe (paitsi --kuiva); tuntematon sivu/profiili/valinta', () => {
    expect(S.tarkista(S.lueArgv(['--url=https://' + PILOT + '.web.app']), { STAGING_APPCHECK_DEBUG_TOKEN: 'x' })).toMatch(/ei ole stagingin/);
    expect(S.tarkista(S.lueArgv(ok), {})).toMatch(/STAGING_APPCHECK_DEBUG_TOKEN/); expect(S.tarkista(S.lueArgv(ok.concat('--kuiva')), {})).toBeNull(); expect(S.tarkista(S.lueArgv(ok), { STAGING_APPCHECK_DEBUG_TOKEN: 'x' })).toBeNull();
    expect(S.tarkista(S.lueArgv(ok.concat('--sivut=kaikki')), { STAGING_APPCHECK_DEBUG_TOKEN: 'x' })).toMatch(/Tuntematon profiili tai sivu/); expect(S.tarkista(S.lueArgv(ok.concat('--roskaa')), {})).toMatch(/Tuntematon valinta/);
  });
  it('main: tuotanto-URL → exit 2 eikä selainta käynnistetä; kuiva-ajo ei avaa selainta eikä tulosta tokenia/salasanoja', async () => {
    const ulos = []; let avattu = 0; const dps = { kirjaa: (r) => ulos.push(r), virhe: (r) => ulos.push('VIRHE ' + r), env: { STAGING_APPCHECK_DEBUG_TOKEN: 'SALAINEN-TOKEN' }, playwright: { chromium: { launch: async () => { avattu++; } } } };
    expect(await S.main(['--url=https://' + PILOT + '.web.app'], dps)).toBe(2); expect(await S.main(['--url=https://talentmaster-staging--kuorma-a.web.app', '--kuiva'], dps)).toBe(0); expect(avattu).toBe(0);
    expect(ulos.join('\n')).not.toContain('SALAINEN-TOKEN'); expect(ulos.join('\n')).toMatch(/KUIVA-AJO.*120 avausta/s);
  });
});

describe('mittaa_funktiot (vale-suoritin)', () => {
  const ADC = undefined, ENV = {};
  const aja = async (argv, suoritus, extra) => { const ulos = []; const koodi = await F.main(argv, Object.assign({ kirjaa: (r) => ulos.push(r), virhe: (r) => ulos.push('VIRHE ' + r), env: ENV, adc: ADC, suorita: suoritus || (() => { throw new Error('ei saa suorittaa'); }), odota: async () => {}, kysely_ms: 0 }, extra)); return { koodi, ulos: ulos.join('\n') }; };
  it('kuiva-ajo oletus: tulostaa gcloud-komennot, EI suorita mitään; oletuslista 5 funktiota', async () => {
    const r = await aja(['--projekti=talentmaster-staging', '--profiili=savu_taysi']); expect(r.koodi).toBe(0); expect(r.ulos).toContain('KUIVA-AJO'); expect(r.ulos).toContain('2 seuraa / 1000 pelaajaa');
    F.OLETUS.forEach((f) => expect(r.ulos).toContain('gcloud scheduler jobs run firebase-schedule-' + f + '-europe-west1 --location=europe-west1 --project=talentmaster-staging')); expect(F.OLETUS.length).toBe(5);
  });
  it('lukko: pilot / emulaattori / ristiriitainen env / ADC → exit 1 eikä mitään suoriteta (myös --aja)', async () => {
    for (const [argv, env, adc] of [[['--projekti=' + PILOT, '--aja'], {}, undefined], [['--projekti=demo-kuorma', '--aja'], {}, undefined], [['--aja'], {}, undefined], [['--projekti=talentmaster-staging', '--aja'], { GCLOUD_PROJECT: PILOT }, undefined], [['--projekti=talentmaster-staging', '--aja'], {}, PILOT]]) {
      const r = await aja(argv, undefined, { env, adc }); expect(r.koodi, JSON.stringify(argv)).toBe(1); expect(r.ulos).toContain('LUKKO');
    }
  });
  it('sallintalista: vieras funktionimi hylätään (exit 2) ja komennot() heittää; komentoon ei pääse ei-staging-projekti', async () => {
    expect((await aja(['--projekti=talentmaster-staging', '--funktiot=laskeSeuranKooste,deleteEverything', '--aja'])).koodi).toBe(2);
    expect(() => F.komennot('talentmaster-staging', 'rm -rf', 'x')).toThrow(); expect(() => F.komennot(PILOT, 'laskeSeuranKooste', 'x')).toThrow(); expect(() => F.komennot('talentmaster-staging', 'laskeSeuranKooste', 'x')).not.toThrow();
  });
  it('--aja: scheduler-ajo + lokirivi → kesto tallentuu (3 ajoa/funktio), JSON-muoto; epäonnistunut ajo ei kaada muita; ei lokiriviä → aikakatkaisu', async () => {
    const kut = [], ulosPolku = join(tmp(), 'f.json'); let kello = Date.parse('2026-11-12T10:00:00Z'), n = 0;
    const suorita = (c, args) => { kut.push([c, args]); if (args[0] === 'scheduler') return { status: 0 }; return { status: 0, stdout: JSON.stringify([{ textPayload: "Function execution took " + (10000 + 1000 * (++n)) + " ms, finished with status: 'ok'", timestamp: '2026-11-12T10:00:30Z' }]) }; };
    const r = await aja(['--projekti=talentmaster-staging', '--funktiot=laskeSeuranKooste,kirjautumisaikaYo', '--toistot=3', '--aja', '--ulos=' + ulosPolku], suorita, { nyt: () => new Date((kello += 20000)) });
    expect(r.koodi).toBe(0); const j = JSON.parse(rd(ulosPolku, 'utf8')); expect(j.funktiot.map((f) => f.nimi)).toEqual(['laskeSeuranKooste', 'kirjautumisaikaYo']);
    expect(j.funktiot[0].ajot.length).toBe(3); expect(j.funktiot[0].ajot[0]).toMatchObject({ ajo: 1, ensimmainen: true, ms: 11000, tila: 'ok' }); expect(j.funktiot[0].kesto_s.max).toBe(13); expect(j.funktiot[0].maaritys).toEqual({ aikaraja_s: 540, muisti_mb: 512 });
    expect(kut.filter((k) => k[1][0] === 'scheduler').length).toBe(6); kut.forEach((k) => { expect(k[0]).toBe('gcloud'); expect(k[1].join(' ')).toContain('--project=talentmaster-staging'); });
    const e = await aja(['--projekti=talentmaster-staging', '--funktiot=kirjautumisaikaYo', '--toistot=2', '--aja', '--odotus=1', '--ulos=' + join(tmp(), 'g.json')], (c, a) => (a[0] === 'scheduler' ? { status: a.join(' ').includes('kirjautumisaikaYo') ? 1 : 0 } : { status: 0, stdout: '[]' }));
    expect(e.koodi).toBe(0); expect(e.ulos).toMatch(/scheduler jobs run epäonnistui/);
  });
  it('MAARITYS vastaa functions/index.js:n runWith-arvoja (aikaraja + muisti) — ja tasoHaeMaatcheck on yhä kommentoitu pois', () => {
    const src = readFileSync(join(__dirname, '..', 'functions', 'index.js'), 'utf8');
    ['laskeSeuranKooste', 'laskeSeuranKoosteMa', 'laskutusKuukausi', 'kirjautumisaikaYo', 'valvontaPaivittain', 'valvontaViikko'].forEach((f) => {
      const i = src.indexOf('exports.' + f + ' '), m = /timeoutSeconds:\s*(\d+),\s*memory:\s*'(\d+)(MB|GB)'/.exec(src.slice(i, i + 700)); expect(m, f).toBeTruthy();
      expect(F.MAARITYS[f], f).toEqual({ aikaraja_s: +m[1], muisti_mb: m[3] === 'GB' ? +m[2] * 1024 : +m[2] });
    });
    const a = src.indexOf('exports.tasoHaeMaatcheck'), ennen = src.lastIndexOf('/*', a), jalkeen = src.indexOf('*/', a); expect(ennen).toBeGreaterThan(-1); expect(src.lastIndexOf('*/', a)).toBeLessThan(ennen); expect(jalkeen).toBeGreaterThan(a);
    F.SALLITUT.forEach((f) => expect(src, f).toMatch(new RegExp('exports\\.' + f + '\\b|\\b' + f + '\\b')));
  });
});

describe('mittaa_monitoring (vale-HTTP)', () => {
  it('summaa/huippu aikasarjoista; read_count kirjoitetaan sivut.json:iin; muisti funktioille; lukko estää muun kuin stagingin', async () => {
    expect(MO.summaa({ timeSeries: [{ points: [{ value: { int64Value: '100' } }, { value: { int64Value: '50' } }] }, { points: [{ value: { int64Value: '7' } }] }] })).toBe(157); expect(MO.summaa({})).toBe(0);
    expect(MO.huippu({ timeSeries: [{ points: [{ value: { doubleValue: 1048576 * 200 } }, { value: { doubleValue: 1048576 * 310 } }] }] })).toBe(1048576 * 310);
    const dir = tmp(), sivut = join(dir, 's.json'), fn = join(dir, 'f.json'); require('fs').writeFileSync(sivut, JSON.stringify({ meta: { aika: '2026-11-12T10:00:00Z', loppu: '2026-11-12T10:30:00Z' }, mittaukset: [{ kylma: [{ yht: 100 }], lampimat: [{ yht: 20 }] }] }));
    require('fs').writeFileSync(fn, JSON.stringify({ funktiot: [{ nimi: 'laskeSeuranKooste', maaritys: { muisti_mb: 512 }, ajot: [{ alku: '2026-11-12T11:00:00Z', loppu: '2026-11-12T11:05:00Z' }] }] }));
    const polut = [], ulos = []; const dps = { kirjaa: (r) => ulos.push(r), virhe: (r) => ulos.push('VIRHE ' + r), env: {}, adc: undefined, token: async () => 'T', hae: async (p) => { polut.push(p); return p.includes('read_count') ? { timeSeries: [{ points: [{ value: { int64Value: '240' } }] }] } : { timeSeries: [{ points: [{ value: { doubleValue: 1048576 * 300 } }] }] }; } };
    expect(await MO.main(['--projekti=talentmaster-staging', '--tulos=' + sivut, '--funktiot=' + fn], dps)).toBe(0);
    expect(JSON.parse(rd(sivut, 'utf8')).monitoring.read_count).toBe(240); expect(JSON.parse(rd(fn, 'utf8')).funktiot[0].huippumuisti_mb).toBe(300);
    expect(polut[0]).toContain('/v3/projects/talentmaster-staging/timeSeries'); expect(decodeURIComponent(polut[0])).toContain('firestore.googleapis.com/document/read_count'); expect(decodeURIComponent(polut[1])).toContain('user_memory_bytes');
    expect(await MO.main(['--projekti=' + PILOT, '--tulos=' + sivut], dps)).toBe(1);
  });
});

describe('mittaa_dokkoot (offline, generaattorin data)', () => {
  it('isoin pelaajadokumentti = jaksofokus_historia-vetoinen; < 250 kt; ryhmät pelaajat/kayttajat; tuloste ilman tunnisteita', async () => {
    const ulos = [], polku = join(tmp(), 'd.json'), koodi = await D.main(['--offline=savu_taysi', '--ulos=' + polku], { kirjaa: (r) => ulos.push(r), virhe: (r) => ulos.push('VIRHE ' + r) });
    const j = JSON.parse(rd(polku, 'utf8')); expect(koodi).toBe(0); expect(j.meta.tila).toBe('offline'); expect(j.ryhmat.pelaajat.n).toBe(1000); expect(j.ryhmat.kayttajat.n).toBe(20);
    expect(j.isoinPelaaja.kentat[0].kentta).toBe('jaksofokus_historia'); expect(j.isoinPelaaja.koko_kt).toBeLessThan(M.RAJAT.pelaajadokumentti_kt); expect(j.isoinPelaaja.koko_kt).toBeGreaterThan(10);
    expect(ulos.join('\n')).not.toMatch(/kuorma_|SYNT-|Testi/);
  }, 120000);
  it('live-tila: lukko (pilot → exit 1), kuiva-ajo ei lue; mittaaKoot luokittelee polut', async () => {
    const dps = { kirjaa: () => {}, virhe: () => {}, env: {}, adc: undefined, luoDb: async () => { throw new Error('ei saa yhdistää'); } };
    expect(await D.main(['--projekti=' + PILOT, '--aja'], dps)).toBe(1); expect(await D.main(['--projekti=talentmaster-staging'], dps)).toBe(0);
    const r = D.mittaaKoot([{ polku: 'seurat/s/pelaajat/p1', data: { a: 'x' } }, { polku: 'seurat/s/pelaajat/p1/kooste/k', data: { v: 1 } }, { polku: 'seurat/s/kooste/w', data: {} }, { polku: 'muu/x', data: {} }]);
    expect(Object.keys(r.ryhmat).sort()).toEqual(['pelaajan_kooste', 'pelaajat', 'seuran_kooste']);
  });
});

describe('mittaus_raportti: P11-arviointi ja ensimmäiseksi pettävä', () => {
  const sivu = (sivu, profiili, tti, luvut, extra) => ({ sivu, profiili, rooli: 'vp', kylma: [{ kirjautunut: true, luvut: extra || { pelaajat: luvut } }], lampimat: [], yhteenveto: { kylma: { n: 5, virheita: 0, tti_s: { n: 5, mediaani: tti, p95: tti + 1 }, fcp_s: { mediaani: 0.5 }, lukuja: { mediaani: luvut, p95: luvut }, mb: { mediaani: 1.2 } }, lampimat: { tti_s: { mediaani: tti / 2 }, lukuja: {} } } });
  it('ei dataa: kaikki "ei mitattu", ei pettävää kohtaa, ei kaadu', () => {
    const t = R.muodosta({}); expect(t).toContain('⏳ ei mitattu'); expect(t).toContain('Ei vielä pätevää mittausta'); expect(t).not.toContain('❌');
  });
  it('rajaa verrataan oikein: työpöytä 2 s, Slow 4G 5 s, 2 000 lukua; ensimmäiseksi pettävä = suurin ylitys', () => {
    const t = R.muodosta({ sivut: { meta: { aika: '2026-11-12T10:00:00Z', toistot: 5 }, mittaukset: [sivu('vp', 'tyopoyta', 1.8, 2500, { havainnot: 2300, pelaajat: 200 }), sivu('vp', 'puhelin', 7.5, 2500), sivu('master', 'tyopoyta', 2.4, 900)] } });
    const r = R.rivit({ sivut: { mittaukset: [sivu('vp', 'tyopoyta', 1.8, 2500), sivu('vp', 'puhelin', 7.5, 2500), sivu('master', 'tyopoyta', 2.4, 900)] } }), by = (id) => r.find((x) => x.id === id);
    expect(by('tti_tyopoyta_vp').tila).toBe('lapi'); expect(by('tti_puhelin_vp').tila).toBe('ei'); expect(by('tti_tyopoyta_master').tila).toBe('ei'); expect(by('luvut_vp').tila).toBe('ei'); expect(by('luvut_master').tila).toBe('lapi');
    const e = R.ensimmainen(r); expect(e.pettaa).toBe(true); expect(e.rivi.id).toBe('tti_puhelin_vp'); expect(t).toContain('❌ EI LÄPI'); expect(t).toContain('havainnot'); expect(t).toMatch(/## 2\. Ensimmäiseksi pettävä kohta\s+\*\*Aika interaktiiviseksi — VP \(puhelin/);
  });
  it('raja on "alle": täsmälleen raja = läpi, raja + epsilon = ei läpi', () => {
    const r = (tti) => R.rivit({ sivut: { mittaukset: [sivu('seura', 'tyopoyta', tti, 100)] } }).find((x) => x.id === 'tti_tyopoyta_seura').tila; expect(r(2)).toBe('lapi'); expect(r(2.001)).toBe('ei');
  });
  it('funktio: täysi aineisto = mittaus; pieni aineisto = lineaarinen ekstrapolaatio 10 000 pelaajaan (merkitty); 270 s -raja', () => {
    const fd = (max, pelaajia) => ({ meta: { pelaajia, seuroja: 2, profiili: 'x' }, funktiot: [{ nimi: 'laskeSeuranKooste', maaritys: { aikaraja_s: 540, muisti_mb: 512 }, huippumuisti_mb: 300, ajot: [], kesto_s: { n: 3, max, mediaani: max } }] });
    const a = R.rivit({ funktiot: fd(20, 1000) }).find((x) => x.id === 'fn_laskeSeuranKooste'); expect(a.arvo).toBe(200); expect(a.tila).toBe('lapi_ekstra'); expect(a.huom).toContain('lineaarinen');
    expect(R.rivit({ funktiot: fd(30, 1000) }).find((x) => x.id === 'fn_laskeSeuranKooste').tila).toBe('ei_ekstra');
    const c = R.rivit({ funktiot: fd(271, 10000) }).find((x) => x.id === 'fn_laskeSeuranKooste'); expect(c.tila).toBe('ei'); expect(c.huom).not.toContain('lineaarinen');
    expect(R.ensimmainen([c]).rivi.id).toBe('fn_laskeSeuranKooste');
  });
  it('dokumentti: offline-data = ennakko (ei läpi/ei läpi -tuomiota); staging = tuomio 250 kt:lla; kaikki läpi → pienin kasvunvara', () => {
    const dok = (kt, tila) => ({ meta: { tila }, ryhmat: { pelaajat: { n: 1, max_kt: kt, mediaani_b: 1, p95_b: 1 } }, isoinPelaaja: { koko_kt: kt, kentat: [{ kentta: 'jaksofokus_historia', b: 100 }] } });
    expect(R.rivit({ dokumentit: dok(48, 'offline') }).find((x) => x.id === 'dok').tila).toBe('ennakko'); expect(R.rivit({ dokumentit: dok(260, 'staging') }).find((x) => x.id === 'dok').tila).toBe('ei'); expect(R.rivit({ dokumentit: dok(250, 'staging') }).find((x) => x.id === 'dok').tila).toBe('lapi');
    const t = R.muodosta({ sivut: { meta: {}, mittaukset: [sivu('seura', 'tyopoyta', 1.0, 500)] }, dokumentit: dok(100, 'staging') }); expect(t).toContain('Mikään mitattu mittari ei ylitä rajaa'); expect(t).toContain('Pienin kasvunvara');
  });
  it('kustannus: tarvitsee lukuja/avaus + pelaajat + seurat; laskee P7-profiililla; < 1 €/pelaaja/vuosi → läpi', () => {
    const k = R.rivit({ pelaajia: 10000, seuroja: 40, sivut: { mittaukset: [sivu('vp', 'tyopoyta', 1, 5000)] } }).find((x) => x.id === 'kustannus'); expect(k.arvo).toBeGreaterThan(0); expect(k.arvo).toBeLessThan(1); expect(k.tila).toBe('lapi'); expect(k.huom).toContain('415 käyttäjää');
    expect(R.rivit({ sivut: { mittaukset: [sivu('vp', 'tyopoyta', 1, 5000)] } }).find((x) => x.id === 'kustannus').tila).toBe('ei_mitattu');
  });
  it('pelaaja-sivu merkitään kirjautumattomaksi; raportti ei sisällä salasanoja eikä seuratunnisteita; main kirjoittaa tiedoston', () => {
    const t = R.muodosta({ sivut: { meta: {}, mittaukset: [sivu('pelaaja', 'tyopoyta', 0.9, 0)] } }); expect(t).toContain('kirjautumaton'); expect(t).not.toMatch(/kuorma_|@kuorma\.test|SYNT-/);
    const polku = join(tmp(), 'r.md'); expect(R.main(['--sivut=/ei', '--funktiot=/ei', '--dokumentit=/ei', '--ulos=' + polku], { kirjaa: () => {} })).toBe(0); expect(rd(polku, 'utf8')).toContain('# Mittausraportti');
  });
  it('yhdistaTulokset: osa-ajo (--sivut=pelaaja) säilyttää aiemmat sivut, korvaa saman sivu×profiili-parin, jättää monitoring-lohkon pois; eri isäntä → ylikirjoitus', () => {
    const rivi = (sivu, tti) => ({ sivu, profiili: 'tyopoyta', kylma: [], lampimat: [], yhteenveto: { tti } });
    const aiempi = { meta: { aika: '2026-11-12T09:00:00Z', loppu: '2026-11-12T09:10:00Z', isanta: 'h', seura: 1, toistot: 5, kesto_s: 600 }, mittaukset: [rivi('seura', 1), rivi('vp', 2), rivi('pelaaja', 9)], monitoring: { read_count: 5 } };
    const uusi = { meta: { aika: '2026-11-12T09:30:00Z', loppu: '2026-11-12T09:32:00Z', isanta: 'h', seura: 1, toistot: 5, kesto_s: 130 }, mittaukset: [rivi('pelaaja', 3)] };
    const y = S.yhdistaTulokset(aiempi, uusi);
    expect(y.mittaukset.map((m) => m.sivu + ':' + m.yhteenveto.tti)).toEqual(['seura:1', 'vp:2', 'pelaaja:3']);
    expect(y.meta.aika).toBe('2026-11-12T09:00:00Z'); expect(y.meta.loppu).toBe('2026-11-12T09:32:00Z'); expect(y.meta.kesto_s).toBe(730); expect(y.monitoring).toBeUndefined();
    expect(S.yhdistaTulokset(Object.assign({}, aiempi, { meta: Object.assign({}, aiempi.meta, { isanta: 'toinen' }) }), uusi)).toBe(uusi);
    expect(S.yhdistaTulokset(null, uusi)).toBe(uusi);
  });
});
