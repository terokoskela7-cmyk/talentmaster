/* Vaihe 0 B.4 PR 2 — Master lukee lista_joukkue-dokumentit lipulla; runtime vm-ajo oikeasta HTML-lohkosta (nappaa ReferenceErrorit).
   Tynkien nimet = tuotannon muuttujat (_db, _pelaajatData, _joukkue …). */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import vm from 'vm';
const require = createRequire(import.meta.url);
const HTML = readFileSync(new URL('../TalentMaster_Master_v16.html', import.meta.url), 'utf8');
const A = HTML.indexOf('window._mListaTila = null;'), B = HTML.indexOf('async function _lataaPelaajat() {');
const LOHKO = HTML.slice(A, B);
const L = require('../lib/tm_lista_yhteenveto.js'), LL = require('../lib/tm_lista_lataus.js');

function ymparisto(o) {
  o = o || {}; const lokit = { luvut: [], renderit: 0, haettuPelaajaDoc: [], toast: [], kirjaukset: 0, varoitukset: [] };
  const docs = o.docs || {};
  const col = (nimi) => ({ doc: (id) => ({ get: async () => { lokit.luvut.push(nimi + '/' + id); if (nimi === 'pelaajat') { lokit.haettuPelaajaDoc.push(id); const d = (o.taydet || {})[id]; return { exists: !!d, id, data: () => d }; } const d = docs[id]; return { exists: !!d, data: () => d }; } }), get: async () => { lokit.luvut.push(nimi + '/*'); return { docs: Object.keys(docs).map((id) => ({ id, data: () => docs[id] })) }; } });
  const _db = { collection: () => ({ doc: () => ({ collection: (n) => col(n) }) }) };
  const sb = { console: { warn(...a) { lokit.varoitukset.push(a.join(' ')); }, log() {} }, Date, Object, Array, String, JSON, Promise, Math, Intl, setTimeout, window: {}, document: { getElementById: () => sb._el }, _el: { style: {}, innerHTML: '' },
    _db, _seuraId: 's', _demo: !!o.demo, _joukkue: o.joukkue || '', _rooli: o.rooli || 'vp', _superAdmin: !!o.sa, _pelaajatData: [], _mJoukkueDocs: o.joukkueDocs || [],
    _mEsc: (x) => String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/</g, '&lt;'), masterT: (x) => x, toast: (m, t) => lokit.toast.push(m + '|' + t),
    tmPhvIlmoitettuPH: () => false, tmPhvEiMitattu: () => false, tmPhvKoodi: () => null, tmKanonisoiJoukkue: (n, jd) => jd.find((j) => j.nimi === n) || null,
    _valmentajanJoukkueNimet: () => o.omatNimet || [], _paivitaKaikkiNakymat: () => { lokit.renderit++; }, _ktKaynnista() {}, _lataaKirjaukset: () => { lokit.kirjaukset++; }, _kuunteleVpViestit() {}, _mvKuuntele() {},
    _mSisainenYhdista: async (l) => (o.sisainen ? o.sisainen.tmSisainenLataaJaYhdista(_db, 's', l, {}) : l), _mJjLataaLiput: async () => ({ lista_yhteenveto: o.lippu !== false }), _lataaPelaajat: async () => {}, firebase: {} };
  sb.window = sb; sb.window.TM_LISTA_LATAUS = LL; sb.window.TM_LISTA_YHTEENVETO = L; sb.window.TM_SISAINEN = o.sisainen || null; sb.window._valmentajaData = o.valmentajaData || null; sb.window._tmClaimRooli = o.rooli || 'vp';
  vm.createContext(sb); vm.runInContext(LOHKO + '\n;this.__x={ yrita:_mListaYritaLadata, hydratoi:_mListaHydratoi, vaihda:_mListaVaihdaLaajuus, onRivi:_mListaOnRivi, tila:()=>window._mListaTila };', sb);
  return { sb, lokit, x: sb.__x };
}
const rivi = (id, jk, o) => Object.assign({ id, e: id, s: id, jk }, o || {});
const dok = (jid, rivit) => ({ jid, nimi: jid, versio: L.VERSIO, n: rivit.length, rivit, laskettu: { toMillis: () => 1000 } });
const DOCS = () => ({ a: dok('a', [rivi('p1', ['a']), rivi('p2', ['a'])]), b: dok('b', [rivi('p3', ['b'], { to: 1 }), rivi('p4', ['b'])]) });
const JD = [{ id: 'a', nimi: 'A' }, { id: 'b', nimi: 'B' }];

describe('Master lista-lukija (lippu lista_yhteenveto)', () => {
  it('lohko löytyi lähteestä (ei vacuous)', () => { expect(A).toBeGreaterThan(0); expect(B).toBeGreaterThan(A); expect(LOHKO).toContain('_mListaHydratoi'); });
  it('REGRESSIO (esc is not defined): renderöinti ajetaan loppuun ilman poikkeusta — ei "vanha polku (poikkeus)" -varoitusta, lohko ei käytä paljasta esc():ia, _mEsc on määritelty', async () => {
    expect(LOHKO).not.toMatch(/(^|[^A-Za-z_])esc\(/); expect(HTML).toMatch(/\nfunction _mEsc\(/);
    for (const omat of [false, true]) {
      const e = ymparisto(omat ? { docs: DOCS(), joukkueDocs: JD, rooli: 'talenttivalmentaja', omatNimet: ['A'] } : { docs: DOCS(), joukkueDocs: JD });
      expect(Object.prototype.hasOwnProperty.call(e.sb, 'esc')).toBe(false);   // sandboxissa EI esc-tynkää → ReferenceError näkyisi
      expect(await e.x.yrita(null)).toBe(true); expect(e.lokit.varoitukset.filter((v) => /poikkeus/.test(v))).toEqual([]); expect(e.sb._el.innerHTML).toContain('Päivitä nyt'); expect(e.sb._pelaajatData.length).toBeGreaterThan(0);
    }
  });
  it('lippu pois → false, EI lukua lista_joukkue:sta, _pelaajatData koskematon', async () => {
    const e = ymparisto({ lippu: false, docs: DOCS(), joukkueDocs: JD }); expect(await e.x.yrita(null)).toBe(false); expect(e.lokit.luvut).toEqual([]); expect(e.sb._pelaajatData).toEqual([]);
  });
  it('lippu päällä, koko seura: 2 lukua (ei 4 pelaajalukua), rivit pelaajina, renderöi kerran, kirjaukset/viestit käynnistyvät', async () => {
    const e = ymparisto({ docs: DOCS(), joukkueDocs: JD }); expect(await e.x.yrita(null)).toBe(true);
    expect(e.lokit.luvut).toEqual(['lista_joukkue/*']); expect(e.sb._pelaajatData.map((p) => p.id)).toEqual(['p1', 'p2', 'p3', 'p4']); expect(e.sb._pelaajatData.every(e.x.onRivi)).toBe(true); expect(e.lokit.renderit).toBe(1); expect(e.lokit.kirjaukset).toBe(1);
    expect(e.sb._el.innerHTML).toContain('Päivitä nyt'); expect(e.sb._el.innerHTML).toContain('✓ Päivitetty (');
  });
  it('PR A: käynnistyksen kaksi PERÄKKÄISTÄ _lataaPelaajat-kutsua (_alusta + renderDev) → YKSI lista_joukkue-luku; muistin nollaus (Päivitä nyt) pakottaa uuden; epäonnistunut luku ei jää muistiin', async () => {
    const e = ymparisto({ docs: DOCS(), joukkueDocs: JD }); expect(await e.x.yrita(null)).toBe(true); expect(await e.x.yrita(null)).toBe(true);
    expect(e.lokit.luvut).toEqual(['lista_joukkue/*']);   // ennen: 2 × (kaikki joukkuedokumentit)
    e.sb._mListaMuistiNollaa(); expect(await e.x.yrita(null)).toBe(true); expect(e.lokit.luvut).toEqual(['lista_joukkue/*', 'lista_joukkue/*']);
    const puuttuu = ymparisto({ docs: { a: DOCS().a }, joukkueDocs: JD }); expect(await puuttuu.x.yrita(null)).toBe(false); const n = puuttuu.lokit.luvut.length; expect(await puuttuu.x.yrita(null)).toBe(false); expect(puuttuu.lokit.luvut.length).toBe(2 * n);
    expect(HTML).toMatch(/httpsCallable\('paivitaListaYhteenveto'\)\(\{ seuraId: _seuraId \}\);\s*_mListaMuistiNollaa\(\);\s*await _lataaPelaajat\(\);/);
  });
  it('yksi joukkue: vain sen dokumentti', async () => {
    const e = ymparisto({ docs: DOCS(), joukkueDocs: JD, joukkue: 'B' }); expect(await e.x.yrita({ id: 'b' })).toBe(true); expect(e.lokit.luvut).toEqual(['lista_joukkue/b']); expect(e.sb._pelaajatData.map((p) => p.id)).toEqual(['p3', 'p4']);
  });
  it('puuttuva joukkuedokumentti → false (vanha polku), tila nollattu, ei osittaista listaa', async () => {
    const d = DOCS(); delete d.b; const e = ymparisto({ docs: d, joukkueDocs: JD }); expect(await e.x.yrita(null)).toBe(false); expect(e.sb._pelaajatData).toEqual([]); expect(e.x.tila()).toBeNull();
  });
  it('vanha versio (v1) → false', async () => {
    const d = DOCS(); d.a.versio = 1; expect(await ymparisto({ docs: d, joukkueDocs: JD }).x.yrita(null)).toBe(false);
  });
  it('demo → false', async () => { expect(await ymparisto({ demo: true, docs: DOCS(), joukkueDocs: JD }).x.yrita(null)).toBe(false); });
  it('P2: talenttivalmentaja → oma joukkue + talenttiohjelma; "Koko seura" näyttää kaikki; valinta säilyy uudelleenlatauksessa', async () => {
    const e = ymparisto({ docs: DOCS(), joukkueDocs: JD, rooli: 'talenttivalmentaja', omatNimet: ['A'] }); await e.x.yrita(null);
    expect(e.sb._pelaajatData.map((p) => p.id)).toEqual(['p1', 'p2', 'p3']);   // a-joukkue + talenttiohjelma-pelaaja p3 (joukkue b)
    e.x.vaihda(); expect(e.sb._pelaajatData.map((p) => p.id)).toEqual(['p1', 'p2', 'p3', 'p4']); expect(e.sb._el.innerHTML).toContain('Omat ryhmät');
    await e.x.yrita(null); expect(e.sb._pelaajatData.length).toBe(4);
  });
  it('VP: ei rajausta (oletus = koko seura), ei Koko seura -painiketta', async () => {
    const e = ymparisto({ docs: DOCS(), joukkueDocs: JD, rooli: 'vp' }); await e.x.yrita(null); expect(e.sb._pelaajatData.length).toBe(4); expect(e.sb._el.innerHTML).not.toContain('Koko seura');
  });
  it('hydrointi: rivi → täysi dokumentti SAMASSA objektissa; A-kentät mukaan; _lista pois; toinen kutsu ei lue uudelleen', async () => {
    const sisainen = { tmTerveysLukuOpts: () => ({}), tmSisainenLataaJaYhdista: async (db, sid, rst) => rst.map((p) => Object.assign({}, p, { sisainen: { hh: 1 } })) };
    const e = ymparisto({ docs: DOCS(), joukkueDocs: JD, sisainen, taydet: { p1: { etunimi: 'Eero', jaksofokus_historia: [{ x: 1 }] } } }); await e.x.yrita(null);
    const p = e.sb._pelaajatData.find((q) => q.id === 'p1'); const sama = await e.x.hydratoi('p1');
    expect(sama).toBe(p); expect(p._lista).toBeUndefined(); expect(p.jaksofokus_historia).toEqual([{ x: 1 }]); expect(p.sisainen).toEqual({ hh: 1 }); expect(p.id).toBe('p1');
    await e.x.hydratoi('p1'); expect(e.lokit.haettuPelaajaDoc).toEqual(['p1']);
  });
  it('hydrointi: puuttuva dokumentti ei kaada; rivi jää riviksi', async () => {
    const e = ymparisto({ docs: DOCS(), joukkueDocs: JD }); await e.x.yrita(null); const p = await e.x.hydratoi('p2'); expect(e.x.onRivi(p)).toBe(true);
  });
});

describe('Master lista-lukija: kytkennät lähteessä', () => {
  it('_lataaPelaajat kutsuu lukijaa ennen vanhaa polkua; renderDev + _mAvaaPelaajaVanha hydratoivat; Ohjelmat ei oikaise riveillä', () => {
    const i1 = HTML.indexOf('if (await _mListaYritaLadata(_kanonJ)) return;'), i2 = HTML.indexOf("col.where('joukkue', '==', _joukkue)");
    expect(i1).toBeGreaterThan(0); expect(i1).toBeLessThan(i2);
    expect(HTML).toContain('_mListaHydratoi(fp.id)'); expect(HTML).toMatch(/function _mAvaaPelaajaVanha\(pid\) \{\n  \{ const _r/); expect(HTML).toContain('!_pelaajatData.some(_mListaOnRivi)');
  });
  it('lipun rekisteröinti + skriptit mukana', () => { expect(require('../lib/tm_liput.js').tmLippuTunnettu('lista_yhteenveto')).toBe(true); expect(HTML).toContain('lib/tm_lista_yhteenveto.js'); expect(HTML).toContain('lib/tm_lista_lataus.js'); });
});
