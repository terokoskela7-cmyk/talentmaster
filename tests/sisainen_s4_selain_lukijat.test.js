/* Vaihe 1 / PR 1e-3a (viipale S4) — selaimen LUKUPUOLI + jaetut kirjoitusapurit. Kirjoittajia (Pikakortti, Master, VP, Testaus, Seura) EI vielä kytketä: ne tulevat 1e-3b:ssä. Lippu RYHMAT.s4.kirjoitus POIS → käytös ennallaan.
   Kattaa: (1) syvä pistepolkukirjoitus (arviointi_havaittu) · (2) ADAR hist → havainto_porras_hist + hist_n · (3) vain-sisainen-kirjoitus ei koskaan heitä · (4) terveyslukijat roolin mukaan ·
   (5) signaalin lukijat yhdistetyn muodon kautta · (6) P7 hist_n + pelaajan kortin snapshot (identtinen vanhalla ja uudella muodolla). */
import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { fakeDb } from './_fakeFirestore.mjs';
import { PEL_APU, laajennaT } from './helpers/pelaaja_t.mjs';
const require = createRequire(import.meta.url);
const JUURI = join(dirname(fileURLToPath(import.meta.url)), '..');
const lue = (f) => readFileSync(join(JUURI, f), 'utf8');
const S = require('../lib/tm_sisainen.js');
const LIPPU = S.RYHMAT.s4;
afterEach(() => { LIPPU.kirjoitus = false; });
const SIS = 'seurat/s/pelaajat/p1/sisainen/tiedot', TERV = 'seurat/s/pelaajat/p1/sisainen/terveys', PEL = 'seurat/s/pelaajat/p1';
const denied = () => { const e = new Error('denied'); e.code = 'permission-denied'; return e; };

describe('(1) syvä kenttä arviointi_havaittu → pistepolut, ei koko kartan korvausta', () => {
  it('rekisteri: vain arviointi_havaittu on syvä; mergeFields = arviointi_havaittu.<avain> + muut kentät kokonaisina', () => {
    expect(S.tmS4SyvaKentat()).toEqual(['arviointi_havaittu']);
    const o = S.tmS4Osa('s', { arviointi_havaittu: { a: 3, b: null }, arviointi_pvm: '2026-10-25', arviointi_kehys: 'palloliitto' }, { s4Kirjoitus: true });
    expect(o.mergeFields).toEqual(['seuraId', 'paivitetty', 'arviointi_havaittu.a', 'arviointi_havaittu.b', 'arviointi_pvm', 'arviointi_kehys']);
    expect(o.data.arviointi_havaittu).toEqual({ a: 3, b: null });
  });
  it('EI VACUOUS: sisainen-kartan muut avaimet säilyvät, päivitetty avain korvautuu, FieldValue.delete-sentinel poistaa vain sen avaimen', async () => {
    LIPPU.kirjoitus = true;
    const { db, D } = fakeDb({ [SIS]: { seuraId: 's', arviointi_havaittu: { a: 1, b: 2, c: 4 } }, [PEL]: { arviointi_havaittu: { a: 1, b: 2, c: 4 } } });
    await S.tmS4Kirjoita(db, 's', 'p1', { arviointi_havaittu: { b: 5, d: 3, c: { __poista: true } }, arviointi_pvm: '2026-10-25' }, { pelaajaSet: true });
    expect(D.get(SIS).arviointi_havaittu).toEqual({ a: 1, b: 5, d: 3 }); expect(D.get(SIS).arviointi_pvm).toBe('2026-10-25');
  });
  it('avain jossa piste/kauttaviiva (ei kelpaa pistepolkuun) jätetään sisainen-puolelta pois, muut kulkevat; pelaajalle kirjoitus kokonaan', () => {
    const o = S.tmS4Osa('s', { arviointi_havaittu: { 'a.b': 1, ok: 2 } }, { s4Kirjoitus: true });
    expect(o.mergeFields).toEqual(['seuraId', 'paivitetty', 'arviointi_havaittu.ok']); expect(o.data.arviointi_havaittu).toEqual({ ok: 2 });
  });
  it('null / tyhjä kartta → koko kenttä (ei pistepolkuja); lippu pois → null', () => {
    expect(S.tmS4Osa('s', { arviointi_havaittu: null }, { s4Kirjoitus: true }).mergeFields).toEqual(['seuraId', 'paivitetty', 'arviointi_havaittu']);
    expect(S.tmS4Osa('s', { arviointi_havaittu: { a: 1 } })).toBeNull();
  });
});

describe('(2) ADAR: tmAdarS4Valmista — hist → havainto_porras_hist (vain sisainen), pelaajalle hist_n', () => {
  const kentat = () => ({ adar_pvm: '2026-10-25', adar_arvioijia: 2, adar_heikoin: 'r', havainto_porras_ehdotus: { valmis: false, seuraava: null, hist: [3, 3, 2] } });
  it('lippu POIS: täsmälleen sama olio takaisin, lisa null (kirjoitus ennallaan)', () => {
    const k = kentat(), v = S.tmAdarS4Valmista(k); expect(v.upd).toBe(k); expect(v.lisa).toBeNull(); expect(k.havainto_porras_ehdotus.hist_n).toBeUndefined();
  });
  it('lippu PÄÄLLÄ: ehdotus + hist_n (hist säilyy dual-write-ajan), lisa = raakapisteet; alkuperäinen olio koskematon; ei hist-taulukkoa → ennallaan', () => {
    LIPPU.kirjoitus = true; const k = kentat(), ennen = JSON.stringify(k), v = S.tmAdarS4Valmista(k);
    expect(v.upd.havainto_porras_ehdotus).toEqual({ valmis: false, seuraava: null, hist: [3, 3, 2], hist_n: 3 }); expect(v.lisa).toEqual({ havainto_porras_hist: [3, 3, 2] }); expect(JSON.stringify(k)).toBe(ennen);
    expect(S.tmAdarS4Valmista({ adar_pvm: 'x' }).lisa).toBeNull(); expect(S.tmAdarS4Valmista({ havainto_porras_ehdotus: null }).lisa).toBeNull(); expect(S.tmAdarS4Valmista({ havainto_porras_ehdotus: { valmis: true } }).lisa).toBeNull();
  });
  it('kirjoitus lipulla: sisainen saa havainto_porras_hist + adar_* ; pelaajadokumentti EI saa havainto_porras_hist-kenttää (hist_n kyllä); lippu pois → pelkkä pelaajakirjoitus', async () => {
    LIPPU.kirjoitus = true; const a = fakeDb({ [PEL]: { nimi: 'x' } }), v = S.tmAdarS4Valmista(kentat());
    await S.tmS4Kirjoita(a.db, 's', 'p1', v.upd, { pelaajaSet: true, lisa: v.lisa });
    expect(a.D.get(SIS)).toMatchObject({ seuraId: 's', adar_arvioijia: 2, havainto_porras_hist: [3, 3, 2] }); expect(a.D.get(SIS)).not.toHaveProperty('adar_heikoin'); expect(a.D.get(SIS)).not.toHaveProperty('havainto_porras_ehdotus');
    expect(a.D.get(PEL)).not.toHaveProperty('havainto_porras_hist'); expect(a.D.get(PEL).havainto_porras_ehdotus).toEqual({ valmis: false, seuraava: null, hist: [3, 3, 2], hist_n: 3 }); expect(a.D.get(PEL).adar_heikoin).toBe('r');
    LIPPU.kirjoitus = false; const b = fakeDb({ [PEL]: { nimi: 'x' } }), w = S.tmAdarS4Valmista(kentat());
    await S.tmS4Kirjoita(b.db, 's', 'p1', w.upd, { pelaajaSet: true, lisa: w.lisa }); expect(b.D.has(SIS)).toBe(false); expect(b.D.get(PEL).havainto_porras_ehdotus).toEqual({ valmis: false, seuraava: null, hist: [3, 3, 2] });
  });
});

describe('(3) tmS4Sisainen / tmTerveysSisainen — vain sisainen-dokumentti, ei koskaan heitä', () => {
  it('lippu pois → ei kirjoitusta; päällä → vain sisainen (pelaajadokumenttia ei luoda), terveys omaan dokumenttiinsa terveysSeuraId:llä', async () => {
    const a = fakeDb({}); expect(await S.tmS4Sisainen(a.db, 's', 'p1', { talenttiTaso: 'perus' })).toEqual({ ok: true, sisainen: false }); expect(a.D.size).toBe(0);
    LIPPU.kirjoitus = true; const b = fakeDb({});
    expect(await S.tmS4Sisainen(b.db, 's', 'p1', { talenttiTaso: 'perus', nimi: 'EI' })).toEqual({ ok: true, sisainen: true }); expect(b.D.get(SIS)).toMatchObject({ seuraId: 's', talenttiTaso: 'perus' }); expect(b.D.get(SIS)).not.toHaveProperty('nimi'); expect(b.D.has(PEL)).toBe(false);
    await S.tmTerveysSisainen(b.db, 's', 'p1', { kaytettavyys: 'rajoitettu', talenttiTaso: 'EI' }); expect(b.D.get(TERV)).toMatchObject({ terveysSeuraId: 's', kaytettavyys: 'rajoitettu' }); expect(b.D.get(TERV)).not.toHaveProperty('seuraId'); expect(b.D.get(TERV)).not.toHaveProperty('talenttiTaso');
  });
  it('permission-denied / verkkovirhe → ok:false, EI heitä (console.warn); hiljainen:false heittää; ei kenttiä → ei kirjoitusta', async () => {
    LIPPU.kirjoitus = true; const mk = (virhe) => ({ collection: () => ({ doc: () => ({ collection: () => ({ doc: () => ({ collection: () => ({ doc: () => ({ set: async () => { throw virhe; } }) }) }) }) }) }) });
    const r = await S.tmS4Sisainen(mk(denied()), 's', 'p1', { talenttiTaso: 'perus' }); expect(r).toMatchObject({ ok: false, sisainen: false, virhe: 'permission-denied' });
    expect((await S.tmS4Sisainen(mk(new Error('offline')), 's', 'p1', { talenttiTaso: 'perus' })).ok).toBe(false);
    await expect(S.tmS4Sisainen(mk(denied()), 's', 'p1', { talenttiTaso: 'perus' }, { hiljainen: false })).rejects.toMatchObject({ code: 'permission-denied' });
    expect(await S.tmS4Sisainen(fakeDb({}).db, 's', 'p1', { nimi: 'x' })).toEqual({ ok: true, sisainen: false });
  });
});

describe('(4) terveyslukijat roolin mukaan (tmTerveysLukuOpts)', () => {
  it('seurasihteeri, testivastaava (ja fysiikkavalmentaja, pelaaja, tuntematon) → {} = terveyttä ei yritetä; koko seura → "seura"; valmentaja → oman joukkueen idt', () => {
    ['seurasihteeri', 'testivastaava', 'fysiikkavalmentaja', 'pelaaja', 'vanhempi', '', null, undefined].forEach((r) => expect(S.tmTerveysLukuOpts(r, [{ id: 'p1' }]), String(r)).toEqual({}));
    ['super_admin', 'superadmin', 'vp', 'urheilutoimenjohtaja', 'fysioterapeutti', 'talenttivalmentaja'].forEach((r) => expect(S.tmTerveysLukuOpts(r, [{ id: 'p1' }]), r).toEqual({ terveysLuku: 'seura' }));
    expect(S.tmTerveysLukuOpts('valmentaja', [{ id: 'p1' }, { id: 'p2' }, null, {}])).toEqual({ terveysLuku: ['p1', 'p2'] }); expect(S.tmTerveysLukuOpts('valmentaja', undefined)).toEqual({ terveysLuku: [] });
  });
  /* ajo: sama db-tynkä kuin sisainen_s4.test.js — kyselyt kirjataan, jotta nähdään MIHIN rooli kohdistuu */
  function db() {
    const kyselyt = [], docs = (l) => ({ forEach: (fn) => l.forEach(fn) }), ref = (pid) => ({ parent: { parent: { id: pid } } });
    return { kyselyt, db: {
      collectionGroup: () => ({ where: (k, o, v) => ({ get: async () => { kyselyt.push(['cg', k, v]); return docs(k === 'terveysSeuraId' ? [{ id: 'terveys', ref: ref('p1'), data: () => ({ loukkaantuminen_tyyppi: 'polvi' }) }] : [{ id: 'tiedot', ref: ref('p1'), data: () => ({ seuraId: 's' }) }]); } }) }),
      collection: () => ({ doc: () => ({ collection: () => ({ doc: (pid) => ({ collection: () => ({ doc: (dok) => ({ get: async () => { kyselyt.push(['get', pid, dok]); return pid === 'p1' ? { exists: true, data: () => ({ loukkaantuminen_tyyppi: 'polvi' }) } : { exists: false }; } }) }) }) }) }) }),
    } };
  }
  const lista = () => [{ id: 'p1', loukkaantuminen_tyyppi: 'nilkka' }, { id: 'p2' }];
  it('lippu päällä: seurasihteeri/testivastaava → vain tiedot-kysely, vanha terveyskenttä jää; vp → collectionGroup terveysSeuraId; valmentaja → get terveys/<pelaaja> vain omille', async () => {
    LIPPU.kirjoitus = true;
    for (const rooli of ['seurasihteeri', 'testivastaava']) { const d = db(); const y = await S.tmSisainenLataaJaYhdista(d.db, 's', lista(), S.tmTerveysLukuOpts(rooli, lista())); expect(d.kyselyt, rooli).toEqual([['cg', 'seuraId', 's']]); expect(y[0].loukkaantuminen_tyyppi).toBe('nilkka'); }
    const v = db(); const yv = await S.tmSisainenLataaJaYhdista(v.db, 's', lista(), S.tmTerveysLukuOpts('vp', lista())); expect(v.kyselyt).toEqual([['cg', 'seuraId', 's'], ['cg', 'terveysSeuraId', 's']]); expect(yv[0].loukkaantuminen_tyyppi).toBe('polvi');
    const m = db(); const ym = await S.tmSisainenLataaJaYhdista(m.db, 's', lista(), S.tmTerveysLukuOpts('valmentaja', lista())); expect(m.kyselyt).toEqual([['cg', 'seuraId', 's'], ['get', 'p1', 'terveys'], ['get', 'p2', 'terveys']]); expect(ym[0].loukkaantuminen_tyyppi).toBe('polvi');
  });
  it('lippu POIS: roolista riippumatta ei terveyskyselyä, lista ennallaan', async () => {
    const d = db(); const y = await S.tmSisainenLataaJaYhdista(d.db, 's', lista(), S.tmTerveysLukuOpts('vp', lista())); expect(d.kyselyt).toEqual([['cg', 'seuraId', 's']]); expect(y[0].loukkaantuminen_tyyppi).toBe('nilkka');
  });
  it('kolme latauspaikkaa (VP, Master, Kehitystyöpöytä) välittävät roolin: tmTerveysLukuOpts(rooli, lista) — ei paljasta kutsua', () => {
    expect(lue('TalentMaster_VP_v25.html')).toMatch(/tmSisainenLataaJaYhdista\(db, _seuraId, _pelaajat, window\.TM_SISAINEN\.tmTerveysLukuOpts\(window\._vpSA \? "super_admin" : window\._vpRooli, _pelaajat\)\)/);
    expect(lue('TalentMaster_Master_v16.html')).toContain('tmSisainenLataaJaYhdista(_db, _seuraId, _pelaajatData, window.TM_SISAINEN.tmTerveysLukuOpts(_rooli, _pelaajatData))');
    expect(lue('TalentMaster_Kehitystyopoyta.html')).toContain('tmSisainenLataaJaYhdista(_db, _seuraId, _pelaajat, window.TM_SISAINEN.tmTerveysLukuOpts(_rooli, _pelaajat))');
    for (const f of ['TalentMaster_VP_v25.html', 'TalentMaster_Master_v16.html', 'TalentMaster_Kehitystyopoyta.html']) expect((lue(f).match(/tmSisainenLataaJaYhdista\(/g) || []).length, f).toBe(1);
  });
});

describe('(5) signaalin lukijat yhdistetyn muodon kautta — tulos identtinen kun talenttisignaali on siirtynyt sisaiseen; PHV-merkki säilyy pelaajalla', () => {
  const migroi = (lista) => lista.map((p) => { const j = S.tmSignaaliJaa(p.signaali); return Object.assign({}, p, { signaali: j.pelaaja }); });
  const sisMapa = (lista) => { const m = {}; lista.forEach((p) => { const j = S.tmSignaaliJaa(p.signaali); if (j.sisainen != null) m[p.id] = { seuraId: 's', signaali: j.sisainen }; }); return m; };
  const yhdista = (lista) => { LIPPU.kirjoitus = true; const y = S.tmSisainenYhdistaLista(migroi(lista), sisMapa(lista)); LIPPU.kirjoitus = false; return y; };

  it('jako: xfactor / x-factor / hidden-gem / hidden → sisainen; phv + tyhjä jäävät pelaajalle; yhdistys palauttaa täsmälleen alkuperäisen arvon', () => {
    const l = [{ id: 'a', signaali: 'xfactor' }, { id: 'b', signaali: 'hidden' }, { id: 'c', signaali: 'phv' }, { id: 'd', signaali: null }, { id: 'e', signaali: 'hidden-gem' }];
    const mig = migroi(l); expect(mig.map((p) => p.signaali)).toEqual([null, null, 'phv', null, null]);   // PHV-merkki pelaajan omassa dokumentissa
    expect(yhdista(l).map((p) => p.signaali)).toEqual(['xfactor', 'hidden', 'phv', null, 'hidden-gem']);
  });
  it('tm_seuraava_askel: peruste.signaali "xfactor" sama vanhalla ja yhdistetyllä muodolla (EI VACUOUS: vanha → xfactor)', () => {
    const A = require('../lib/tm_seuraava_askel.js'), N = require('../lib/tm_eerikkila_normit.js'), IDP = require('../lib/tm_idp.js'), JF = require('../lib/tm_jaksofokus.js'), PHV = require('../lib/tm_phv_tila.js');
    const PV = 86400000, NYT = new Date('2026-10-05T12:00:00Z').getTime(), iso = (ms) => new Date(ms).toISOString().slice(0, 10);
    const DEPS = { laskeReviewKadenssi: N.laskeReviewKadenssi, idpJumissa: IDP.idpJumissa, jaksoUmpeutunut: JF.tmJfUmpeutunut, phvKuormaTila: PHV.tmPhvKuormaTila, phvKuormaVarovainen: PHV.tmPhvKuormaVarovainen, phvEiMitattu: PHV.tmPhvEiMitattu, phvOhjelmaKuorma: PHV.tmPhvOhjelmaKuorma };
    const p = { id: 'p1', syntymaVuosi: 2010, sukupuoli: 'M', joukkue: 'KPV U16', signaali: 'xfactor', review_viimeisin_pvm: iso(NYT - 5 * PV), jaksofokus: { konsepti_nimi: 'S', konsepti_avain: 'y_h2', alkoi: iso(NYT - 7 * PV), kesto_vk: 4, domeeni: 'teknis_taktinen' }, _idpTavoite: { luotu: iso(NYT - 10 * PV), status: 'aktiivinen' }, idp_sitoumus_pvm: null };
    const aja = (x) => A.tmSeuraavaAskel(x, { nyt: NYT, deps: DEPS });
    const vanha = aja(p); expect(vanha.avain).toBe('yllapito'); expect(vanha.peruste).toEqual({ signaali: 'xfactor' });
    expect(migroi([p])[0].signaali).toBeNull(); expect(aja(yhdista([p])[0])).toEqual(vanha);
  });
  it('tm_kehitystilanne (S1) ja tm_eerikkila_normit (talentti_n): luvut samat vanhalla ja yhdistetyllä muodolla (demodata, 4 xfactor-pelaajaa)', () => {
    const KT = require('../lib/tm_kehitystilanne.js'), N = require('../lib/tm_eerikkila_normit.js'), DATA = require('./helpers/kehitystilanne_demodata.cjs')(JUURI);
    const ennen = KT.rakennaMalli(DATA, { nyt: '2026-10-02' }); expect(ennen.lohko2.S1).not.toBeNull(); expect(ennen.lohko2.S1.n).toBe(4);   // EI VACUOUS
    const jalkeen = KT.rakennaMalli(Object.assign({}, DATA, { pelaajat: yhdista(DATA.pelaajat) }), { nyt: '2026-10-02' }); expect(jalkeen.lohko2.S1).toEqual(ennen.lohko2.S1);
    const tiimi = [{ id: 'a', signaali: 'xfactor' }, { id: 'b', signaali: 'hidden' }, { id: 'c', signaali: 'phv' }, { id: 'd' }];
    const k0 = N.laskeVPTuloskortti(tiimi, [], null, new Date(2026, 5, 22).getTime()), k1 = N.laskeVPTuloskortti(yhdista(tiimi), [], null, new Date(2026, 5, 22).getTime());
    expect(k0.metriikat.talentti_n).toBe(1); expect(k1.metriikat.talentti_n).toBe(1); expect(k1.metriikat).toEqual(k0.metriikat);   // 'xfactor' laskeutuu pelaajalle takaisin; ei hävitä talenttia
  });
  it('Master ja VP: signaalin lukijat saavat yhdistetyn listan (lataus tmSisainenLataaJaYhdista-reittiä); VP:n lataus normalisoi signaali ennen yhdistystä (sisainen voittaa)', () => {
    expect(lue('TalentMaster_VP_v25.html')).toContain('signaali: data.signaali || null,');
    expect(lue('TalentMaster_VP_v25.html').indexOf('signaali: data.signaali || null,')).toBeLessThan(lue('TalentMaster_VP_v25.html').indexOf('window.TM_SISAINEN.tmSisainenLataaJaYhdista(db, _seuraId, _pelaajat'));
    ['lib/tm_seuraava_askel.js', 'lib/tm_kehitystilanne.js', 'lib/tm_eerikkila_normit.js'].forEach((f) => expect(lue(f), f).not.toMatch(/sisainen\/tiedot|collectionGroup\(/));   // lukijat eivät lataa itse → eivät ohita yhdistystä
  });
});

describe('(6) P7: hist_n + pelaajan kortin snapshot', () => {
  const src = laajennaT(lue('TalentMaster_Pelaaja_v7.html')), L = require('../lib/tm_pelialy_yksilo.js');
  function ajaRAdar(pelaaja) {
    const i = src.indexOf('function rAdar() {'); let syvyys = 0, runko = '';
    for (let j = src.indexOf('{', i); j < src.length; j++) { if (src[j] === '{') syvyys++; else if (src[j] === '}') { syvyys--; if (!syvyys) { runko = src.slice(i, j + 1); break; } } }
    const store = { _pelaaja: pelaaja, console, Math, Number, String, Object, Array, Date, isNaN, tmAdarBand: L.tmAdarBand, tmAdarYht: L.tmAdarYht, tmAdarBonusOsat: L.tmAdarBonusOsat, tmAdarIkaPorras: L.tmAdarIkaPorras, TM_ADAR_PORTAAT: L.TM_ADAR_PORTAAT, TM_ADAR_NIMET: L.TM_ADAR_NIMET, ...PEL_APU };
    const ymp = new Proxy(store, { has: (t, k) => (k in t) || !(k in globalThis), get: (t, k) => (k === Symbol.unscopables ? undefined : (k in t ? t[k] : undefined)), set: (t, k, v) => { t[k] = v; return true; } });
    // eslint-disable-next-line no-new-func
    return new Function('__ymp', 'with(__ymp){' + runko + '\nreturn rAdar();}')(ymp);
  }
  const pohja = { ika: 12, adar_viimeisin: { a: 3, d: 1 }, havainto_porras: 2 };
  const vanha = (hist) => Object.assign({}, pohja, { havainto_porras_ehdotus: { hist, valmis: false, seuraava: null } });
  const uusi = (hist) => Object.assign({}, pohja, { havainto_porras_ehdotus: { hist_n: hist.length, valmis: false, seuraava: null } });
  it('P7 lukee hist_n (varalla hist.length): rAdar() tuottaa TÄSMÄLLEEN saman kortin vanhalla {hist} ja uudella {hist_n} -muodolla, kaikilla n = 0…3', () => {
    for (const hist of [[], [2], [2, 3], [2, 3, 2]]) expect(ajaRAdar(uusi(hist)), 'n=' + hist.length).toBe(ajaRAdar(vanha(hist)));
    expect(ajaRAdar(Object.assign({}, pohja, { havainto_porras_ehdotus: { hist_n: 2, hist: [2, 3], valmis: false } }))).toBe(ajaRAdar(vanha([2, 3])));   // dual-write-aika: molemmat kentät
  });
  it('EI VACUOUS: n < 3 → "Uusi taito"; n = 3 → ei; ilman ehdotusta → ei kaatumista, ei "uutta taitoa" portaalla 1', () => {
    expect(ajaRAdar(uusi([2]))).toContain('Uusi taito'); expect(ajaRAdar(uusi([2, 3, 2]))).not.toContain('Uusi taito');
    expect(ajaRAdar(Object.assign({}, pohja, { havainto_porras: 1 }))).not.toContain('Uusi taito'); expect(() => ajaRAdar(Object.assign({}, pohja))).not.toThrow();
  });
  it('pelaajan HTML ei viittaa raakapisteisiin: P7 ei lue ehdotus.hist-taulukkoa muuhun kuin pituuteen (hist_n ensin) eikä havainto_porras_hist-kenttään', () => {
    const p7 = lue('TalentMaster_Pelaaja_v7.html'); expect(p7).not.toContain('havainto_porras_hist'); expect(p7).toContain('_ehdN < 3'); expect(p7).not.toContain('_ehdHist');
    const hist = p7.split('\n').filter((r) => /havainto_porras_ehdotus/.test(r) && /\.hist\b/.test(r)); expect(hist.every((r) => /_ehdE\.hist\b/.test(r) && /hist_n/.test(r))).toBe(true);
  });
});

describe('(7) functions-kopio ja ?v-bumpit', () => {
  it('functions/tm_sisainen.js on tavu tavulta lib/tm_sisainen.js (uudet apurit CF:n puolella samat); sivut lataavat uuden ?v', () => {
    expect(lue('functions/tm_sisainen.js')).toBe(lue('lib/tm_sisainen.js'));
    for (const f of ['TalentMaster_VP_v25.html', 'TalentMaster_Master_v16.html', 'TalentMaster_Kehitystyopoyta.html']) expect(lue(f), f).toMatch(/lib\/tm_sisainen\.js/);
  });
});
