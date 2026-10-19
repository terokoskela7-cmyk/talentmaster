/**
 * Palaute-näkyvyys vaihe 0b (Teron päätökset 19.10.2026): yhtenäinen kytkin "Näytä myös pelaajalle" (oletus POIS), sisäinen katselmuslause ei pelaajan luettavaan paikkaan,
 * pikakortin pelaajaversiosta pois pisteet/havaitut/tekijän nimi, numero- ja sanavartija viestiin ja pelaaja-apin havaintoteksteihin. EI Rules-muutoksia (Rules-testit: tests/rules, "0b ·").
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import vm from 'vm';
const require = createRequire(import.meta.url);
const lue = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const NK = require('../lib/tm_nakyvyys_kytkin.js'), VV = require('../lib/tm_valmentajaviesti.js'), HH = require('../lib/tm_havaintohistoria.js');
const pura = (s, t) => { const i = s.indexOf(t); if (i < 0) throw new Error('puuttuu: ' + t); let d = 0; for (let k = s.indexOf('{', i); k < s.length; k++) { if (s[k] === '{') d++; else if (s[k] === '}') { d--; if (!d) return s.slice(i, k + 1); } } };
const ADAR = lue('TalentMaster_ADAR_Pikakortti.html'), PEL = lue('TalentMaster_Pelaaja_v7.html');

describe('yhtenäinen kytkin lib/tm_nakyvyys_kytkin.js', () => {
  it('oletus POIS: vain true / "pelaaja" on päällä; kaikki muu pois', () => {
    for (const v of [undefined, null, false, 0, '', 'valmentajat', 'vain_valmentaja', 'true', 1]) expect(NK.tmNakyvyysPaalla(v), String(v)).toBe(false);
    expect(NK.tmNakyvyysPaalla(true)).toBe(true); expect(NK.tmNakyvyysPaalla('pelaaja')).toBe(true);
  });
  it('sama komponentti ja sama teksti: otsikko "Näytä myös pelaajalle"; pois = ei checked + selite henkilökunta; päällä = checked; kompakti = vain rivi', () => {
    const pois = NK.tmNakyvyysKytkinHTML(false, { toggleFn: '_f' }), paalla = NK.tmNakyvyysKytkinHTML(true, { toggleFn: '_f' }), komp = NK.tmNakyvyysKytkinHTML(false, { toggleFn: '_f', kompakti: true });
    expect(pois).toContain('Näytä myös pelaajalle'); expect(pois).not.toContain('checked'); expect(pois).toContain('onchange="_f(true)"'); expect(pois).toContain('vain henkilökunta');
    expect(paalla).toContain('checked'); expect(paalla).toContain('onchange="_f(false)"'); expect(paalla).toContain('pelaaja ja huoltaja näkevät');
    expect(komp).toContain('Näytä myös pelaajalle'); expect(komp).not.toContain('data-nk-ohje');
  });
  it('tmLauseSuunnitelma: pois → vain reviewit.lause_sisainen (ei historiariville); päällä → historiariville; tyhjä → ei mitään', () => {
    const c = { lahde: 'vp', uid: 'u1', nytISO: '2026-10-19T10:00:00.000Z' };
    expect(NK.tmLauseSuunnitelma('Hyvä jakso', false, c)).toEqual({ historia: undefined, reviewit: { lause_sisainen: { teksti: 'Hyvä jakso', lahde: 'vp', uid: 'u1', tallennettu: c.nytISO } } });
    expect(NK.tmLauseSuunnitelma('Hyvä jakso', undefined, c).historia).toBeUndefined();
    expect(NK.tmLauseSuunnitelma('Hyvä jakso', true, c)).toEqual({ historia: { lause: 'Hyvä jakso', lause_lahde: 'vp' }, reviewit: undefined });
    expect(NK.tmLauseSuunnitelma('  ', true, c)).toEqual({ historia: undefined, reviewit: undefined });
  });
  it('kytkin on kaikissa kirjoituspaikoissa: katselmuslause (Master+VP+Kehitystyöpöytä), Pikakortti, TKI-palaute; oletus pois', () => {
    for (const f of ['TalentMaster_Master_v16.html', 'TalentMaster_VP_v25.html', 'TalentMaster_Kehitystyopoyta.html', 'TalentMaster_ADAR_Pikakortti.html']) expect(lue(f), f).toMatch(/<script src="lib\/tm_nakyvyys_kytkin\.js\?v=\d+"><\/script>/);
    const M = lue('TalentMaster_Master_v16.html'); expect(M).toContain("toggleFn: '_palauteNakAseta'"); expect(M).toContain('window._palauteNayta = false;'); expect(M).not.toMatch(/name="palauteNak"/);
    expect(M).toContain("tmNakyvyysPaalla(window._palauteNayta) ? 'pelaaja' : 'vain_valmentaja'");
    expect(M).toMatch(/tki: \(nakyvyys === 'pelaaja'\) \? null/);   // TKI-lukua ei pelaajan luettavaan palautedokumenttiin
    expect(lue('lib/tm_kevyt_katselmus.js')).toContain('tmNakyvyysKytkinHTML');
  });
});

describe('pikakortti: oletus sisäinen; pelaajan dokumentissa vain teksti', () => {
  const mockDb = (docs = {}) => {
    const ref = (p) => ({ id: p.split('/').pop(), path: p, collection: (n) => col(p + '/' + n), get: async () => ({ exists: p in docs, data: () => docs[p] }), set: async (d, o) => { docs[p] = (o && o.merge) ? Object.assign({}, docs[p], d) : d; } });
    const col = (p) => ({ doc: (id) => ref(p + '/' + (id || 'auto' + Math.random().toString(36).slice(2, 8))), get: async () => ({ docs: [] }) });
    const db = { collection: (n) => col(n), batches: [], batch: () => { const ops = []; return { set: (r, d, o) => ops.push({ p: r.path, d, o }), commit: async () => { db.batches.push(ops); ops.forEach((o) => { docs[o.p] = o.d; }); } }; } };
    return { db, docs };
  };
  const aja = async (data) => {
    const m = mockDb({}), ctx = { _PH_DB: m.db, Date, console: { warn() {} }, _phIka: () => 14, tmAdarPikakentat: () => null, window: { _pelaajaMap: { p1: {} } } };
    vm.createContext(ctx);
    vm.runInContext(pura(ADAR, 'function _phPelaajaRef(') + '\n' + pura(ADAR, 'function _phJaaPelaajalle(') + '\n' + pura(ADAR, 'async function _phKirjoitaHavaintoJaPikakentat(') + '\nthis.f = _phKirjoitaHavaintoJaPikakentat; this.ref = _phPelaajaRef;', ctx);
    const havRef = ctx.ref('kpv', 'p1').collection('havainnot').doc('sis');
    await ctx.f(havRef, data, 'kpv', 'p1', 1, false);
    return m;
  };
  const SIS = (nak, teksti) => ({ tyyppi: 'adar_pikakortti', pisteet: { A: 2, D: 3 }, havaitut: ['A:Katsoo ylös'], narratiivi: teksti, nakyvyys: nak, tila: 'valmis', pelaaja_lukenut: false, tekija_uid: 'u1', tekija_nimi: 'Vesa Valmentaja', tekija_rooli: 'valmentaja', pelaaja_id: 'p1', seura_id: 'kpv', pvm: '2026-10-19', luotu: 'TS' });
  it('kytkin päällä + teksti: kaksi dokumenttia samassa batchissa — sisäinen (valmentajat, pisteet, havaitut, tekijä) ja pelaajan kopio (vain teksti)', async () => {
    const m = await aja(SIS('pelaaja', 'Hieno ratkaisu!')); const ops = m.db.batches[0];
    const sis = ops.find((o) => o.p.endsWith('/sis')).d, kop = ops.find((o) => /havainnot\/(?!sis)/.test(o.p) && o.p.indexOf('havainnot') > 0 && !o.p.endsWith('/sis') && o.d.tyyppi === 'havainto_pelaajalle').d;
    expect(sis.nakyvyys).toBe('valmentajat'); expect(sis.nayta_pelaajalle).toBe(true); expect(sis.pisteet).toEqual({ A: 2, D: 3 }); expect(sis.havaitut).toHaveLength(1); expect(sis.tekija_nimi).toBe('Vesa Valmentaja');
    expect(sis.pelaajan_havainto_id).toBeTruthy();
    expect(kop.nakyvyys).toBe('pelaaja'); expect(kop.teksti).toBe('Hieno ratkaisu!'); expect(kop.pelaaja_lukenut).toBe(false); expect(kop.valmentajaUid).toBe('u1');
    for (const k of ['pisteet', 'havaitut', 'tekija_nimi', 'tekija_uid', 'tekija_rooli', 'narratiivi', 'porras', 'konteksti', 'pelitilanne']) expect(k in kop, 'pelaajan kopiossa ei kenttää ' + k).toBe(false);
    expect(JSON.stringify(kop)).not.toMatch(/Vesa|Katsoo ylös/);
    expect(ops.find((o) => o.p.endsWith(sis.pelaajan_havainto_id))).toBeTruthy();   // id täsmää
  });
  it('kytkin päällä mutta ei tekstiä → ei pelaajan dokumenttia; kytkin pois → vain sisäinen (nakyvyys valmentajat), ei kopiota', async () => {
    const hav = (m) => m.db.batches[0].filter((o) => /\/havainnot\//.test(o.p));   // pelaajadokin havainto_viimeisin_pvm-rivi ei ole havainto
    const a = await aja(SIS('pelaaja', '')); expect(hav(a)).toHaveLength(1); expect(hav(a)[0].d.nakyvyys).toBe('valmentajat');
    const b = await aja(SIS('valmentajat', 'Muistiinpano')); expect(hav(b)).toHaveLength(1); expect('nayta_pelaajalle' in hav(b)[0].d).toBe(false); expect(hav(b)[0].d.nakyvyys).toBe('valmentajat');
  });
  it('oletus on POIS kaikissa iässä (ei ikäoletusta): _nakOletus() === false', () => {
    const f = pura(ADAR, 'function _nakOletus('); const ctx = {}; vm.createContext(ctx); vm.runInContext(f + '\nthis.o = _nakOletus;', ctx); expect(ctx.o()).toBe(false);
    expect(f).not.toMatch(/ika|>= 13/);
  });
  it('Kumoa perii pelaajan kopion; historialista (henkilökunta) piilottaa kopion omana rivinään, näyttää "Pelaaja näkee" ja siirtää lukukuittauksen sisäiselle riville', () => {
    expect(pura(ADAR, 'async function _phKumoa(')).toContain('v.kopioRef.update(');
    const docs = [Object.assign({ id: 'sis' }, SIS('valmentajat', 'Hieno!'), { nayta_pelaajalle: true, pelaajan_havainto_id: 'kop', luotu: new Date('2026-10-19T10:00:00Z') }),
      { id: 'kop', tyyppi: 'havainto_pelaajalle', teksti: 'Hieno!', nakyvyys: 'pelaaja', tila: 'valmis', pelaaja_lukenut: true, luotu: new Date('2026-10-19T10:00:00Z') }];
    const hk = HH.tmHhRivit(docs, { henkilokunta: true }); expect(hk).toHaveLength(1); expect(hk[0]).toMatchObject({ id: 'sis', nakyvyys: 'pelaaja', luettu: true, pelaajanHavaintoId: 'kop' });
    const pl = HH.tmHhRivit([docs[1]]); expect(pl).toHaveLength(1); expect(pl[0].pisteet).toEqual({}); expect(pl[0].havaitut).toEqual([]); expect(pl[0].tekija || '').not.toMatch(/Vesa/);
  });
});

describe('valmentajan viesti pelaajalle: numero- ja sanavartija kirjoitushetkellä', () => {
  it('tmViestiTarkista: kelpo teksti ja emoji läpi; numero/mittausmuoto → luku; kielletty sana → sana; tyhjä → tyhja', () => {
    expect(VV.tmViestiTarkista('Hienoa työtä tänään!').ok).toBe(true); expect(VV.tmViestiTarkista('💪').ok).toBe(true);
    expect(VV.tmViestiTarkista('Pujottelu 12,4 s on hyvä').syy).toBe('luku'); expect(VV.tmViestiTarkista('Sait 3/5').syy).toBe('luku');
    expect(VV.tmViestiTarkista('Tämä on sinun heikkous').syy).toBe('sana'); expect(VV.tmViestiTarkista('   ').syy).toBe('tyhja');
  });
  it('tmLahetaValmentajaViesti hylkää ennen kirjoitusta (e.syy), kelpo viesti kirjoitetaan; virheteksti kulkee K4:n tekstien kautta', async () => {
    let kirj = 0; const db = { collection: () => ({ doc: () => ({ collection: () => ({ doc: () => ({ collection: () => ({ add: async () => { kirj++; return {}; } }) }) }) }) }) };
    const o = (teksti) => ({ seuraId: 's', pelaajaId: 'p', teksti, uid: 'u', nimi: 'V', sentinel: { serverTimestamp: () => 'TS' } });
    await expect(VV.tmLahetaValmentajaViesti(db, o('Sait 4,5 s'))).rejects.toMatchObject({ syy: 'luku' }); await expect(VV.tmLahetaValmentajaViesti(db, o('heikkous'))).rejects.toMatchObject({ syy: 'sana' }); expect(kirj).toBe(0);
    await VV.tmLahetaValmentajaViesti(db, o('Hieno peli!')); expect(kirj).toBe(1);
    expect(VV.tmViestiVirheTeksti({ syy: 'luku' }, (k) => k)).toMatch(/lukuja/); expect(VV.tmViestiVirheTeksti({ syy: 'sana' }, (k) => k)).toMatch(/sanan/);
  });
});

describe('pelaaja-app: valmentajan teksti numero- ja sanavartijan läpi näyttöhetkellä', () => {
  const aja = (vartijat) => { const ctx = { window: vartijat }; vm.createContext(ctx); vm.runInContext(pura(PEL, 'function _pTekstiKelpaa(') + '\n' + pura(PEL, 'function _p6NakyyPelaajalle(') + '\nthis.n = _p6NakyyPelaajalle; this.t = _pTekstiKelpaa;', ctx); return ctx; };
  const V = { TM_KIELLETYT: require('../lib/tm_kielletyt.js'), TM_TAMAN_TUEKSI: require('../lib/tm_taman_tueksi.js') };
  it('kelpo teksti näkyy; numero tai kielletty sana → ei näy (eikä laske uusiin); vartija puuttuu → ei näy; nakyvyys ≠ pelaaja → ei', () => {
    const c = aja(V);
    expect(c.n({ nakyvyys: 'pelaaja', teksti: 'Hieno peli tänään!' })).toBe(true); expect(c.n({ nakyvyys: 'pelaaja', narratiivi: 'Muista katsoa ylös' })).toBe(true);
    expect(c.n({ nakyvyys: 'pelaaja', teksti: 'Sait 3/5 pistettä' })).toBe(false); expect(c.n({ nakyvyys: 'pelaaja', teksti: 'Tässä on heikkous' })).toBe(false); expect(c.n({ nakyvyys: 'pelaaja', teksti: 'Aika 12,4 s' })).toBe(false);
    expect(c.n({ nakyvyys: 'valmentajat', teksti: 'Hieno peli' })).toBe(false); expect(c.n({ nakyvyys: 'pelaaja', teksti: '' })).toBe(false);
    expect(aja({}).n({ nakyvyys: 'pelaaja', teksti: 'Hieno peli' })).toBe(false);
  });
});
