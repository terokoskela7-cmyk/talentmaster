/**
 * Avauskirjoitukset palvelimelle, PR B — toimenpide-ehdotukset viikkokoosteessa (VAIHE0.md §2; PM 8.11.2026 P3/P4 + id-korjaus).
 *  · PARITEETTI: VP:n inline TP_SIGNAALIT (vielä VP:ssä) ja lib/tm_toimenpide_signaalit.js antavat saman tuloksen samalla datalla (vm-sandbox).
 *  · ID: auto_{signaali}_{joukkueId}_{vvvv-Www}_{sha1[:10]}; su 21 + seuraava ma 06 = sama kooste-viikko → sama id.
 *  · kuitattu → sama viikko ei uutta (ALREADY_EXISTS) → seuraava viikko → uusi ehdotus.
 *  · rinnakkaiset ajot: vain yksi dokumentti.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import vm from 'vm';
import { readFileSync } from 'fs';
const require = createRequire(import.meta.url);
const SIG = require('../lib/tm_toimenpide_signaalit.js');
const FYS = require('../lib/tm_fyysinen.js');
const TEK = require('../lib/tm_tekniikka.js');
const E = require('../functions/toimenpide_ehdotukset.js');
const KOOSTE = require('../functions/seuran_kooste.js');
const H = require('../functions/helsinki_paiva.js');
const NYT = Date.UTC(2026, 10, 9, 8, 0);

const VP = readFileSync(new URL('../TalentMaster_VP_v25.html', import.meta.url), 'utf8');
const alku = VP.indexOf('const TP_SIGNAALIT = ['), loppu = VP.indexOf('// Lataa avoimet ehdotukset', alku);

/* fixtuurit: jokainen kuudesta signaalista laukeaa jollain joukkueella */
const hh = (v) => ({ lin30m: v, cmj: 14, lin10m: 2.4 });
const pel = (id, joukkue, o) => Object.assign({ id, joukkue, joukkueet: [], syntymaVuosi: 2012, sukupuoli: 'M', hh_taso: null, tki_viimeisin: null, flei_viimeisin: null }, o || {});
const FIX = [
  pel('a1', 'KPV U14', { hh_taso: 2.0, hh_taso_edellinen: 3.0 }), pel('a2', 'KPV U14', { hh_taso: 2.0, hh_taso_edellinen: 2.9 }),   // suunta_lasku + tkk_puuttuu + flei puuttuu (2 → ei flei)
  pel('b1', 'KPV U13', { tki_viimeisin: 40, flei_viimeisin: 60 }), pel('b2', 'KPV U13', { tki_viimeisin: 36, flei_viimeisin: 70 }),   // tki_lahella_merkkia
  pel('c1', 'KPV U12'), pel('c2', 'KPV U12'), pel('c3', 'KPV U12'),                                                               // tkk_puuttuu + flei_kartoitus_puuttuu
  pel('d1', 'KPV U15', { hh_viimeisin: hh(5.2), tki_viimeisin: 20, testipaivat: { fyysinen_hh: '2026-10-01', tekniikka: '2026-10-01' } }),
];
for (const p of FIX) p._jNimet = [p.joukkue];
const ctxLib = { nytMs: NYT, onJoukkueessa: (p, j) => p._jNimet.indexOf(j) >= 0, jasenNimet: (p) => p._jNimet, fysinen: FYS, tekniikka: TEK };

describe('pariteetti: VP:n inline TP_SIGNAALIT ≡ lib', () => {
  it('VP:n lähde löytyy (poistuu PR C:ssä; silloin tämä lohko poistetaan)', () => { expect(alku).toBeGreaterThan(0); expect(loppu).toBeGreaterThan(alku); });
  it('sama {joukkue, signaali, teksti} kaikille joukkueille ja signaaleille', () => {
    const sb = { window: { TM_FYSINEN: FYS, TM_TEKNIIKKA: TEK }, Date: { now: () => NYT }, _pOnJoukkueessa: (p, j) => p._jNimet.indexOf(j) >= 0 };
    vm.createContext(sb);
    const vpSig = vm.runInContext(VP.slice(alku, loppu).replace(/^const TP_SIGNAALIT = /, '(') .replace(/\];\s*$/, '])'), sb);
    expect(vpSig.map((s) => s.id)).toEqual(SIG.TP_SIGNAALIT.map((s) => s.id));
    const nimet = ['KPV U14', 'KPV U13', 'KPV U12', 'KPV U15', 'Tuntematon'];
    let osumia = 0;
    for (const j of nimet) vpSig.forEach((s, i) => {
      const vp = s.tarkista(j, FIX), lib = SIG.TP_SIGNAALIT[i].tarkista(j, FIX, ctxLib);
      expect(lib, s.id + ' ' + j).toEqual(vp); if (vp) osumia++;
    });
    expect(osumia).toBeGreaterThanOrEqual(5);   // fixtuuri todella laukaisee signaaleja (ei vain null ≡ null)
  });
});

/* fake Firestore: toimenpiteet-kokoelma, create() → ALREADY_EXISTS (6) */
function fakeDb(tallessa) {
  const doks = tallessa || new Map();
  const kok = {
    where: (k, _o, v) => ({ limit: () => ({ get: async () => ({ docs: [...doks.entries()].filter(([, d]) => d[k] === v).map(([id, d]) => ({ id, data: () => d })) }) }) }),
    doc: (id) => ({ create: async (d) => { await Promise.resolve(); if (doks.has(id)) { const e = new Error('6 ALREADY_EXISTS'); e.code = 6; throw e; } doks.set(id, d); } }),
  };
  return { doks, db: { collection: () => ({ doc: () => ({ collection: () => kok }) }) }, FieldValue: { serverTimestamp: () => 'TS' } };
}
const JOUKKUEET = [{ id: 'kpv_u12', nimi: 'KPV U12' }];
const RIVIT = ['c1', 'c2', 'c3'].map((id) => ({ id, data: { joukkue: 'KPV U12', joukkueet: ['kpv_u12'], syntymaVuosi: 2014, sukupuoli: 'M' } }));

describe('deterministinen id + aikaikkuna', () => {
  it('id-muoto: auto_{signaali}_{joukkueId}_{vvvv-Www}_{sha1[:10]}', () => {
    expect(E.ehdotusId('tkk_puuttuu', 'kpv_u12', '2026-W45', 'teksti')).toMatch(/^auto_tkk_puuttuu_kpv_u12_2026-W45_[0-9a-f]{10}$/);
  });
  it('su 21 ja seuraava ma 06 ovat sama kooste-viikko; callable ma 08 on jo seuraava', () => {
    const su = Date.UTC(2026, 10, 8, 19, 0), ma = Date.UTC(2026, 10, 9, 4, 0);   // su 21:00 / ma 06:00 Helsinki (talviaika, UTC+2)
    expect(KOOSTE.koosteViikko(su, 'sunnuntai').tunniste).toBe('2026-W45');
    expect(KOOSTE.koosteViikko(ma, 'maanantai').tunniste).toBe('2026-W45');
    expect(H.viikonRajat(Date.UTC(2026, 10, 9, 6, 0)).tunniste).toBe('2026-W46');
  });
  it('luo ehdotukset ja kenttärakenne = VP:n entinen tallennaToimenpide', async () => {
    const f = fakeDb(); const r = await E.luoEhdotukset(f, 's', RIVIT, JOUKKUEET, '2026-W45', NYT);
    expect(r.luotu).toBeGreaterThanOrEqual(2);   // tkk_puuttuu + flei_kartoitus_puuttuu
    const d = [...f.doks.entries()].find(([id]) => id.startsWith('auto_tkk_puuttuu_kpv_u12_2026-W45_'))[1];
    expect(d).toMatchObject({ tyyppi: 'automaattinen', signaali: 'tkk_puuttuu', joukkue: 'KPV U12', tila: 'ehdotus', vp_teksti: null, luotu: 'TS', kuitattu_pvm: null, kuitattu_uid: null });
    expect(d.teksti).toMatch(/^KPV U12 — tekniikkamittaukset puuttuvat/);
  });
  it('su 21 + ma 06 (sama viikko, avoin ehdotus olemassa) → ei tuplia', async () => {
    const f = fakeDb(); await E.luoEhdotukset(f, 's', RIVIT, JOUKKUEET, '2026-W45', NYT);
    const n = f.doks.size; const r = await E.luoEhdotukset(f, 's', RIVIT, JOUKKUEET, '2026-W45', NYT + 10 * 3600e3);
    expect(r.luotu).toBe(0); expect(f.doks.size).toBe(n);
  });
  it('rinnakkaiset ajot (kaksi callablea / su + ma yhtä aikaa) → yksi dokumentti per ehdotus, ALREADY_EXISTS ohitetaan', async () => {
    const f = fakeDb(); const [a, b] = await Promise.all([E.luoEhdotukset(f, 's', RIVIT, JOUKKUEET, '2026-W45', NYT), E.luoEhdotukset(f, 's', RIVIT, JOUKKUEET, '2026-W45', NYT)]);
    expect(a.luotu + b.luotu).toBe(f.doks.size); expect(a.ohitettu + b.ohitettu).toBeGreaterThanOrEqual(1);
    expect(new Set([...f.doks.keys()]).size).toBe(f.doks.size);
  });
  it('kuitattu → sama viikko: ei uutta · seuraava viikko: uusi ehdotus, jos signaali on yhä päällä', async () => {
    const f = fakeDb(); await E.luoEhdotukset(f, 's', RIVIT, JOUKKUEET, '2026-W45', NYT);
    const idt = [...f.doks.keys()], n = idt.length;
    for (const [, d] of f.doks) { d.tila = 'kuitattu'; d.kuitattu_pvm = 'x'; d.kuitattu_uid = 'u'; }   // VP kuittaa kaikki
    const sama = await E.luoEhdotukset(f, 's', RIVIT, JOUKKUEET, '2026-W45', NYT + 86400e3);
    expect(sama.luotu).toBe(0); expect(sama.ohitettu).toBe(n); expect(f.doks.size).toBe(n);   // id olemassa → pysyvä esto viikon ajan
    const seur = await E.luoEhdotukset(f, 's', RIVIT, JOUKKUEET, '2026-W46', NYT + 7 * 86400e3);
    expect(seur.luotu).toBe(n); expect(f.doks.size).toBe(2 * n);
    expect([...f.doks.keys()].filter((id) => id.includes('_2026-W46_')).length).toBe(n);
  });
  it('signaali pois päältä → seuraavana viikkona ei uutta', async () => {
    const f = fakeDb(); await E.luoEhdotukset(f, 's', RIVIT, JOUKKUEET, '2026-W45', NYT);
    for (const [, d] of f.doks) d.tila = 'kuitattu';
    const korjattu = RIVIT.map((r) => ({ id: r.id, data: Object.assign({}, r.data, { tki_viimeisin: 60, flei_viimeisin: 60 }) }));
    const r = await E.luoEhdotukset(f, 's', korjattu, JOUKKUEET, '2026-W46', NYT + 7 * 86400e3);
    expect(r.luotu).toBe(0);
  });
  it('arvio-/kuiva-ajo (takaisinlaskenta) ei luo ehdotuksia; ehdotusvirhe ei kaada koostetta (source-vartija)', () => {
    const s = readFileSync(new URL('../functions/seuran_kooste.js', import.meta.url), 'utf8');
    expect(s).toMatch(/typeof deps\.ehdotukset === 'function' && !opts\.arvio/);
    expect(s).toMatch(/try \{[\s\S]{0,300}deps\.ehdotukset\([\s\S]{0,300}catch \(e\)/);
  });
});
