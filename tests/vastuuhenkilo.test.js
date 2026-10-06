/**
 * Vastuuhenkilö per pelaaja (Tero 5.10.2026): lib/tm_vastuuhenkilo.js + VP_v25/Master_v16-adapterit. Kenttä vastuuhenkilo {uid, rooli, asetettu_pvm} (additiivinen, §11) — kertoo
 * vain kenen tehtävä asia on, EI rajaa oikeuksia. Rules v3.38 -testit: tests/rules/firestore.rules.test.js ("vastuuhenkilö"). Fixture: KPV U13 -testipelaaja.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const require = createRequire(import.meta.url);
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const L = require('../lib/tm_vastuuhenkilo.js');
const M = require('../lib/tm_jakso_malli.js');
const lue = (f) => readFileSync(join(juuri, f), 'utf8');
const VP = lue('TalentMaster_VP_v25.html'), MA = lue('TalentMaster_Master_v16.html');
const PID = 'm93GBdOaGCUuenMiCL0I', POLKU = 'seurat/kpv/pelaajat/' + PID, PVM = '2026-10-05';
const HENKILOT = [{ id: 'u-valm', nimi: 'Veera Valmentaja', rooli: 'valmentaja' }, { id: 'u-talval', nimi: 'Taneli Talent', rooli: 'talenttivalmentaja' }, { id: 'u-vp', nimi: 'Vilma VP', rooli: 'vp' },
  { id: 'u-fysio', nimi: 'Fiia Fysio', rooli: 'fysioterapeutti' }, { id: 'u-sihteeri', nimi: 'Sirkku', rooli: 'seurasihteeri' }, { id: 'u-pois', nimi: 'Poistunut', rooli: 'valmentaja', aktiivinen: false }];
const PEL = (o) => Object.assign({ id: PID, joukkue: 'KPV U13', syntymaVuosi: 2013 }, o);

describe('lib: tmVastuuhenkilo / tmVastuuhenkiloAsetus', () => {
  it('muoto {uid, rooli, asetettu_pvm}: neljä sallittua roolia, paikallinen päivä; ylimääräiset kentät pois', () => {
    ['valmentaja', 'apuvalmentaja', 'talenttivalmentaja', 'vp'].forEach((r) => expect(L.tmVastuuhenkilo({ uid: 'u1', rooli: r, ylim: 1 }, PVM)).toEqual({ uid: 'u1', rooli: r, asetettu_pvm: PVM }));
    expect(Object.keys(L.tmVastuuhenkilo({ uid: ' u1 ', rooli: 'vp' }, PVM))).toEqual(['uid', 'rooli', 'asetettu_pvm']); expect(L.tmVastuuhenkilo({ uid: ' u1 ', rooli: 'vp' }, PVM).uid).toBe('u1');
  });
  it('virheet heittävät: puuttuva/liian pitkä uid, muut roolit (UTJ, fysio, sihteeri, pelaaja, tyhjä), virheellinen päivä (UTC-aikaleima, 2026-02-30)', () => {
    [{}, { uid: '' }, { uid: 'x'.repeat(129), rooli: 'vp' }, { uid: 5, rooli: 'vp' }].forEach((x) => expect(() => L.tmVastuuhenkilo(x, PVM), JSON.stringify(x)).toThrow(/uid|rooli/));
    ['urheilutoimenjohtaja', 'fysiikkavalmentaja', 'fysioterapeutti', 'seurasihteeri', 'pelaaja', '', undefined, 'VP'].forEach((r) => expect(() => L.tmVastuuhenkilo({ uid: 'u1', rooli: r }, PVM), String(r)).toThrow(/rooli/));
    ['2026-10-05T10:00:00Z', '2026-02-30', '5.10.2026', '', null, undefined].forEach((p) => expect(() => L.tmVastuuhenkilo({ uid: 'u1', rooli: 'vp' }, p), String(p)).toThrow(/päivä/));
  });
  it('asetus: kirjoitus + paikallinen; poisto (null) vain jos on; syötettä ei mutatoida', () => {
    const p = PEL({ vastuuhenkilo: { uid: 'u-valm', rooli: 'valmentaja', asetettu_pvm: '2026-09-01' } }), kopio = JSON.parse(JSON.stringify(p));
    const a = L.tmVastuuhenkiloAsetus(p, { uid: 'u-vp', rooli: 'vp' }, PVM); expect(a.kirjoitus.vastuuhenkilo).toEqual({ uid: 'u-vp', rooli: 'vp', asetettu_pvm: PVM }); expect(a.paikallinen).toEqual(a.kirjoitus);
    const b = L.tmVastuuhenkiloAsetus(p, null, PVM); expect(b.kirjoitus.vastuuhenkilo).toBe(L.POISTA); expect(p).toEqual(kopio);
    expect(() => L.tmVastuuhenkiloAsetus(PEL(), null, PVM)).toThrow(/poistettavaa/);
  });
  it('vaihtoehdot: vain valmentaja/talenttivalmentaja/vp (ei fysio, ei sihteeri, ei deaktivoitu); valmentajalle myös apuvalmentaja-vaihtoehto; järjestys nimen mukaan', () => {
    const v = L.tmVastuuhenkiloVaihtoehdot(HENKILOT);
    expect(v.map((x) => x.arvo)).toEqual(['u-talval|talenttivalmentaja', 'u-valm|apuvalmentaja', 'u-valm|valmentaja', 'u-vp|vp']);
    expect(L.tmVastuuhenkiloVaihtoehdot(null)).toEqual([]); expect(L.tmVastuuhenkiloVaihtoehdot([null, {}, { id: 'x', rooli: 'pelaaja' }])).toEqual([]);
    expect(v.every((x) => L.ROOLIT.indexOf(x.rooli) >= 0)).toBe(true);   // jokainen vaihtoehto on Rulesin sallima rooli
  });
  it('nimi/teksti: uid → nimi henkilöstöstä; tuntematon uid → "tuntematon"; t:n läpi; ei kenttää → ""', () => {
    const vh = { uid: 'u-talval', rooli: 'talenttivalmentaja', asetettu_pvm: PVM };
    expect(L.tmVastuuhenkiloNimi(vh, HENKILOT)).toBe('Taneli Talent'); expect(L.tmVastuuhenkiloNimi({ uid: 'x' }, HENKILOT)).toBe(''); expect(L.tmVastuuhenkiloNimi(null, HENKILOT)).toBe('');
    expect(L.tmVastuuhenkiloTeksti(vh, HENKILOT)).toBe('Taneli Talent · talenttivalmentaja'); expect(L.tmVastuuhenkiloTeksti({ uid: 'x', rooli: 'vp' }, HENKILOT, { t: (k) => '«' + k + '»' })).toBe('«tuntematon» · «vp»'); expect(L.tmVastuuhenkiloTeksti(null, HENKILOT)).toBe('');
  });
  it('HTML: nimi + rooli; valitsin vain voiAsettaa + onchange; valittu rivi selected; escape; ei hex-värejä; GDPR-sanat puhtaana', () => {
    const vh = { uid: 'u-valm', rooli: 'apuvalmentaja', asetettu_pvm: PVM };
    const h = L.tmVastuuhenkiloHTML(PEL({ vastuuhenkilo: vh }), HENKILOT, { t: (k) => k, voiAsettaa: true, onchange: '_asetaVH' });
    expect(h).toContain('Vastuuhenkilö:'); expect(h).toContain('Veera Valmentaja · apuvalmentaja'); expect(h).toContain('<select'); expect(h).toContain('_asetaVH(\'' + PID + '\',this.value)');
    expect(h).toMatch(/<option value="u-valm\|apuvalmentaja" selected>/); expect(h).not.toMatch(/Fiia|Sirkku|Poistunut/);
    expect(L.tmVastuuhenkiloHTML(PEL({ vastuuhenkilo: vh }), HENKILOT, { voiAsettaa: false, onchange: 'x' })).not.toContain('<select');
    expect(L.tmVastuuhenkiloHTML(PEL(), HENKILOT, { voiAsettaa: false })).toContain('ei asetettu'); expect(L.tmVastuuhenkiloHTML(null, HENKILOT)).toBe('');
    const x = L.tmVastuuhenkiloHTML(PEL({ vastuuhenkilo: { uid: 'x1', rooli: 'vp', asetettu_pvm: PVM } }), [{ id: 'x1', nimi: '<img onerror=1>', rooli: 'vp' }], { voiAsettaa: true, onchange: 'f' }); expect(x).not.toContain('<img'); expect(x).toContain('&lt;img');
    expect(h).not.toMatch(/#[0-9a-fA-F]{3,6}\b|rgb\(/); expect(M.tmTarkistaJaksoData({ vastuuhenkilo: vh })).toEqual([]);   // kenttänimet neutraalit (heikkous/rajoite/kriittinen/ase ei)
    expect(L.tmVastuuhenkiloHTML(PEL(), HENKILOT, { t: (k) => '<u>' + k + '</u>' })).not.toContain('<u>');
  });
  it('lähde: lib ei lataa Firestorea; Pelaaja/Vanhempi eivät lataa libiä eivätkä käytä kenttää (henkilökunnan tieto)', () => {
    const koodi = lue('lib/tm_vastuuhenkilo.js').replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');
    expect(koodi).not.toMatch(/firebase|fetch\(|collection\(|https?:\/\//i);
    ['TalentMaster_Pelaaja_v7.html', 'TalentMaster_Vanhempi_v2.html'].forEach((f) => expect(lue(f), f).not.toMatch(/tm_vastuuhenkilo|TM_VASTUUHENKILO|vastuuhenkilo/));
    expect(VP).toContain('lib/tm_vastuuhenkilo.js?v=1'); expect(MA).toContain('lib/tm_vastuuhenkilo.js?v=1');
  });
});

/* ── adapterit vm:ssä ── */
function pura(HTML, t) {
  const i = HTML.indexOf(t); expect(i, t).toBeGreaterThan(-1); let d = 0;
  for (let k = HTML.indexOf('{', i); k < HTML.length; k++) { if (HTML[k] === '{') d++; else if (HTML[k] === '}') { d--; if (!d) return HTML.slice(i, k + 1); } }
  throw new Error('sulkeet');
}
const DEL = { __delete: true };
function ymp(sovellus, { kaada = false, demo = false, rooli = 'vp', vastuu = null, editable = true, henkilosto = HENKILOT } = {}) {
  const kirj = [], log = { toastit: [], renderit: 0 };
  const p = PEL(vastuu ? { vastuuhenkilo: vastuu } : {});
  const dok = { update: async (d) => { if (kaada) throw new Error('permission-denied'); kirj.push({ polku: POLKU, d }); } };
  const db = { collection: () => ({ doc: () => ({ collection: () => ({ doc: () => dok, get: async () => ({ docs: henkilosto.map((h) => ({ id: h.id, data: () => ({ rooli: h.rooli, etunimi: h.nimi, aktiivinen: h.aktiivinen }) })) }) }) }) }) };
  const c = { window: { TM_VASTUUHENKILO: L, _vpRooli: rooli, _vpSA: false, _mHenkilosto: sovellus === 'vp' ? undefined : henkilosto }, db, _db: db, _seuraId: 'kpv', _isDemoMode: demo, _demo: demo, _valmentajat: HENKILOT, vpT: (x) => x, masterT: (x) => x, tmPaivaIso: () => PVM,
    toast: (t, k) => log.toastit.push([t, k]), console: { warn() {} }, Object, String, Array, Promise, _vpIdpPelaaja: () => p, _mIdpP: () => p, _vpKausitavoiteReRender() { log.renderit++; }, _mIdpReRender() { log.renderit++; }, _mTuoreToken: async () => {}, _tmHenkiloNimi: (x) => x.etunimi,
    firebase: { auth: () => ({ currentUser: { getIdToken: async () => 't' } }), firestore: { FieldValue: { delete: () => DEL } } } };
  vm.createContext(c);
  if (sovellus === 'vp') vm.runInContext([pura(VP, 'function _vpVastuuhenkiloRivi('), pura(VP, 'window._vpAsetaVastuuhenkilo = async function')].join(';\n') + ';', c);
  else vm.runInContext([pura(MA, 'async function _mLataaHenkilosto('), pura(MA, 'function _mVastuuhenkiloRivi('), pura(MA, 'window._mAsetaVastuuhenkilo = async function')].join(';\n') + ';', c);
  return { c, p, kirj, log };
}

describe('VP_v25-adapteri', () => {
  it('rivi: VP/UTJ/talenttivalmentaja/SA saavat valitsimen, muu rooli vain tekstin; henkilöstö = _valmentajat', () => {
    ['vp', 'urheilutoimenjohtaja', 'talenttivalmentaja'].forEach((r) => expect(ymp('vp', { rooli: r }).c._vpVastuuhenkiloRivi(PEL()), r).toContain('<select'));
    ['valmentaja', 'fysiikkavalmentaja', 'seurasihteeri', ''].forEach((r) => expect(ymp('vp', { rooli: r }).c._vpVastuuhenkiloRivi(PEL()), r).not.toContain('<select'));
    const sa = ymp('vp', { rooli: 'valmentaja' }); sa.c.window._vpSA = true; expect(sa.c._vpVastuuhenkiloRivi(PEL())).toContain('<select');
  });
  it('asetus: YKSI update samaan KPV U13 -pelaajadokkiin {vastuuhenkilo:{uid, rooli, asetettu_pvm tänään}}; paikallinen tila + uudelleenpiirto vasta onnistumisen jälkeen; toast', async () => {
    const e = ymp('vp'); await e.c.window._vpAsetaVastuuhenkilo(PID, 'u-valm|valmentaja');
    expect(e.kirj).toEqual([{ polku: POLKU, d: { vastuuhenkilo: { uid: 'u-valm', rooli: 'valmentaja', asetettu_pvm: PVM } } }]); expect(e.p.vastuuhenkilo.uid).toBe('u-valm'); expect(e.log.renderit).toBe(1); expect(e.log.toastit[0][1]).toBe('ok');
  });
  it('vaihto + poisto: poisto = FieldValue.delete(); tyhjä valinta → kenttä pois paikallisesti', async () => {
    const e = ymp('vp', { vastuu: { uid: 'u-valm', rooli: 'valmentaja', asetettu_pvm: '2026-09-01' } });
    await e.c.window._vpAsetaVastuuhenkilo(PID, 'u-vp|vp'); expect(e.p.vastuuhenkilo).toEqual({ uid: 'u-vp', rooli: 'vp', asetettu_pvm: PVM });
    await e.c.window._vpAsetaVastuuhenkilo(PID, ''); expect(e.kirj[1].d.vastuuhenkilo).toBe(DEL); expect('vastuuhenkilo' in e.p).toBe(false);
  });
  it('kirjoitus epäonnistuu → EI paikallista muutosta, virheilmoitus, uudelleenpiirto (valitsin palaa); virheellinen valinta (UTJ-rooli/rikkinäinen) → ei kirjoitusta', async () => {
    const e = ymp('vp', { kaada: true, vastuu: { uid: 'u-valm', rooli: 'valmentaja', asetettu_pvm: '2026-09-01' } }); await e.c.window._vpAsetaVastuuhenkilo(PID, 'u-vp|vp');
    expect(e.p.vastuuhenkilo.uid).toBe('u-valm'); expect(e.log.toastit.some(([, k]) => k === 'error')).toBe(true); expect(e.log.renderit).toBe(1);
    const v = ymp('vp'); await v.c.window._vpAsetaVastuuhenkilo(PID, 'u-x|urheilutoimenjohtaja'); await v.c.window._vpAsetaVastuuhenkilo(PID, 'rikki'); expect(v.kirj).toEqual([]); expect(v.log.toastit.filter(([, k]) => k === 'error').length).toBe(2);
  });
  it('demo: ei kirjoitusta, paikallinen tila päivittyy', async () => { const e = ymp('vp', { demo: true }); await e.c.window._vpAsetaVastuuhenkilo(PID, 'u-vp|vp'); expect(e.kirj).toEqual([]); expect(e.p.vastuuhenkilo.uid).toBe('u-vp'); });
  it('lähde: rivi lisätty IDP-kortin yläosaan ennen luonnos-/muokkauslogiikkaa', () => {
    const k = pura(VP, 'function _vpKausitavoiteHTML('); expect(k).toContain('h += _vpVastuuhenkiloRivi(p);'); expect(k.indexOf('_vpVastuuhenkiloRivi(p)')).toBeLessThan(k.indexOf("_luonnosTyyppi === 'vaihto'"));
  });
});

describe('Master_v16-adapteri', () => {
  it('rivi: valitsin vain kun editable (oikeus pelaajaan) JA henkilöstö ladattu; lukutilassa vain teksti; henkilöstö ladataan kerran (kayttajat) ja kortti piirretään uudelleen', async () => {
    const e = ymp('master'); expect(e.c._mVastuuhenkiloRivi(PEL(), true)).toContain('<select'); expect(e.c._mVastuuhenkiloRivi(PEL(), false)).not.toContain('<select');
    const l = ymp('master'); l.c.window._mHenkilosto = undefined;
    const h = l.c._mVastuuhenkiloRivi(PEL(), true); expect(h).not.toContain('<select'); await new Promise((r) => setTimeout(r, 0));   // ei vielä henkilöstöä → ei valitsinta; lataus käynnistyi
    expect(l.c.window._mHenkilosto.length).toBe(HENKILOT.length); expect(l.log.renderit).toBe(1);
    await l.c._mLataaHenkilosto(); expect(l.log.renderit, 'ladataan vain kerran').toBe(1);
  });
  it('asetus: YKSI update, paikallinen vasta onnistumisen jälkeen; poisto delete(); epäonnistuminen → ei muutosta; demo paikallinen', async () => {
    const e = ymp('master'); await e.c.window._mAsetaVastuuhenkilo(PID, 'u-talval|talenttivalmentaja');
    expect(e.kirj).toEqual([{ polku: POLKU, d: { vastuuhenkilo: { uid: 'u-talval', rooli: 'talenttivalmentaja', asetettu_pvm: PVM } } }]); expect(e.p.vastuuhenkilo.rooli).toBe('talenttivalmentaja');
    await e.c.window._mAsetaVastuuhenkilo(PID, ''); expect(e.kirj[1].d.vastuuhenkilo).toBe(DEL); expect('vastuuhenkilo' in e.p).toBe(false);
    const f = ymp('master', { kaada: true, vastuu: { uid: 'u-valm', rooli: 'valmentaja', asetettu_pvm: '2026-09-01' } }); await f.c.window._mAsetaVastuuhenkilo(PID, 'u-vp|vp'); expect(f.p.vastuuhenkilo.uid).toBe('u-valm'); expect(f.log.toastit.some(([, k]) => k === 'error')).toBe(true);
    const d = ymp('master', { demo: true }); await d.c.window._mAsetaVastuuhenkilo(PID, 'u-vp|vp'); expect(d.kirj).toEqual([]); expect(d.p.vastuuhenkilo.uid).toBe('u-vp');
  });
  it('lähde: rivi IDP-kortin yläosassa ennen "Vain luku" -riviä ja haaroja', () => {
    const k = pura(MA, 'function _mIdpKorttiHTML('); expect(k).toContain('h += _mVastuuhenkiloRivi(p, editable);'); expect(k.indexOf('_mVastuuhenkiloRivi')).toBeLessThan(k.indexOf('jsp-kt-ro'));
  });
});
