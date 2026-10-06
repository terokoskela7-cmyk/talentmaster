/**
 * R6.3-E — katselmuksen "Vahvista merkinnät" (09 §6): ydinvahvuuden havaittu_pvm ja tukitarve vahvistetaan tai poistetaan katselmuksessa, samassa batchissa kuin katselmus (§26).
 * lib/tm_jakso_malli.js (tmMerkinnatTila, tmVahvistaMerkinnat, kypsyysvihjeet) + VP_v25 (_vpRvMerkinnatHTML, _vpRvVahvista, _vpTallennaReview). Fixture: KPV U13 -testipelaaja.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const require = createRequire(import.meta.url);
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const VP = readFileSync(join(juuri, 'TalentMaster_VP_v25.html'), 'utf8');
const M = require('../lib/tm_jakso_malli.js');
const K = require('../lib/tm_kehityssilmukka.js');
const PHV = require('../lib/tm_phv_tila.js');
function pura(t) {
  const i = VP.indexOf(t); expect(i, t).toBeGreaterThan(-1); let d = 0;
  for (let k = VP.indexOf('{', i); k < VP.length; k++) { if (VP[k] === '{') d++; else if (VP[k] === '}') { d--; if (!d) return VP.slice(i, k + 1); } }
  throw new Error('sulkeet');
}
const PID = 'm93GBdOaGCUuenMiCL0I', POLKU = 'seurat/kpv/pelaajat/' + PID, PVM = '2026-10-05';
const YV = { kuvaus: 'Tempokuljetus', havaittu_pvm: '2026-09-12', rooli: 'valmentaja' };
const TT = { alue: 'voima', merkitty_pvm: '2026-06-20', rooli: 'vp' };   // 15 viikkoa → vanhentunut
const DEL = { __delete: true };
const pel = (o) => Object.assign({ id: PID, joukkue: 'KPV U13', syntymaVuosi: 2013, sukupuoli: 'M', review_viimeisin_pvm: '2026-06-01', review_viimeisin_tyyppi: 'mdr' }, o);

describe('lib: tmMerkinnatTila / tmVahvistaMerkinnat', () => {
  it('tila: ikä viikkoina, vanhentunut > 12 vk (09 §6: 14 vk vanha merkintä), ei merkintöjä → tyhjä', () => {
    const t = M.tmMerkinnatTila(pel({ ydinvahvuus: YV, tukitarve: TT }), PVM);
    expect(t.ydinvahvuus).toMatchObject({ kuvaus: 'Tempokuljetus', ika_vk: 3, vanhentunut: false }); expect(t.tukitarve).toMatchObject({ alue: 'voima', ika_vk: 15, vanhentunut: true });
    expect(M.MERKINTA_VANHENTUNUT_VK).toBe(12);
    const raja = (pvm) => M.tmMerkinnatTila(pel({ tukitarve: Object.assign({}, TT, { merkitty_pvm: pvm }) }), PVM).tukitarve;
    expect(raja('2026-07-13').ika_vk).toBe(12); expect(raja('2026-07-13').vanhentunut).toBe(false);   // tasan 12 vk → ei vielä
    expect(raja('2026-07-12').ika_vk).toBe(12); expect(raja('2026-07-05').vanhentunut).toBe(true);
    const yr = (pvm) => M.tmMerkinnatTila(pel({ ydinvahvuus: Object.assign({}, YV, { havaittu_pvm: pvm }) }), PVM).ydinvahvuus;
    expect(yr('2026-07-13')).toMatchObject({ ika_vk: 12, vanhentunut: false }); expect(yr('2026-07-05')).toMatchObject({ vanhentunut: true });   // ydinvahvuuden raja kuten tukitarpeen
    expect(M.tmMerkinnatTila(pel(), PVM)).toEqual({ ydinvahvuus: null, tukitarve: null, vihjeet: [] }); expect(M.tmMerkinnatTila(null, PVM).vihjeet).toEqual([]);
    expect(M.tmMerkinnatTila(pel({ tukitarve: { alue: 'voima', merkitty_pvm: 'eilen' } }), PVM).tukitarve, 'viallinen pvm ohitetaan').toBeNull();
    expect(() => M.tmMerkinnatTila(pel(), '5.10.2026')).toThrow(/päivä/);
  });
  it('vihjeet: tuntematon PHV + alin testitaso → "mittaa kasvu"; POST + fyysinen ydinvahvuus → "harkitse tekninen/taktinen"; varhain kypsynyt (tmVarhainKypsynyt) → sama vihje', () => {
    const alin = { deps: { osaindeksit: () => ({ maksinopeus: 1 }) } };
    expect(M.tmMerkinnatTila(pel(), PVM, alin).vihjeet).toEqual(['mittaa_kasvu']);
    const post = pel({ biologinenIka_viimeisin: { phv_tila_koodi: 'POST', phv_ika: 13.5, mittauspaiva: '2026-09-01' }, ydinvahvuus: { kuvaus: 'Maksiminopeus', havaittu_pvm: '2026-09-12', rooli: 'valmentaja' } });
    expect(M.tmMerkinnatTila(post, PVM).vihjeet).toEqual(['harkitse_tekninen_tai_taktinen']);
    const varhain = pel({ biologinenIka_viimeisin: { phv_tila_koodi: 'PH', phv_ika: 12.5, mittaukset: { sukupuoli: 'P' } }, ydinvahvuus: { kuvaus: 'Voima ja kestävyys', havaittu_pvm: '2026-09-12', rooli: 'valmentaja' } });
    expect(PHV.tmVarhainKypsynyt(varhain)).toBe(true); expect(M.tmMerkinnatTila(varhain, PVM).vihjeet).toEqual(['harkitse_tekninen_tai_taktinen']);   // oletus: lib/tm_phv_tila.js
    expect(M.tmMerkinnatTila(Object.assign({}, varhain, { ydinvahvuus: YV }), PVM).vihjeet, 'tekninen ydinvahvuus → ei vihjettä').toEqual([]);
  });
  it('vahvista: ydinvahvuus.havaittu_pvm = tänään (kuvaus + rooli säilyvät); tukitarve vahvista = merkitty_pvm tänään; poista = POISTA; syötettä ei mutatoida', () => {
    const p = pel({ ydinvahvuus: YV, tukitarve: TT }), kopio = JSON.parse(JSON.stringify(p));
    const a = M.tmVahvistaMerkinnat(p, { ydinvahvuus: 'vahvista', tukitarve: 'vahvista' }, PVM);
    expect(a.kirjoitus).toEqual({ ydinvahvuus: { havaittu_pvm: PVM }, tukitarve: { merkitty_pvm: PVM } }); expect(a.paikallinen.ydinvahvuus).toEqual(Object.assign({}, YV, { havaittu_pvm: PVM })); expect(a.paikallinen.tukitarve).toEqual(Object.assign({}, TT, { merkitty_pvm: PVM }));
    expect(a.muutokset).toEqual(['ydinvahvuus_vahvistettu', 'tukitarve_vahvistettu']);
    const b = M.tmVahvistaMerkinnat(p, { tukitarve: 'poista' }, PVM); expect(b.kirjoitus).toEqual({ tukitarve: M.POISTA }); expect(b.paikallinen.tukitarve).toBe(M.POISTA); expect(b.kirjoitus.ydinvahvuus).toBeUndefined();
    expect(p).toEqual(kopio); expect(M.tmVahvistaMerkinnat(p, {}, PVM).kirjoitus).toEqual({}); expect(M.tmVahvistaMerkinnat(p, null, PVM).muutokset).toEqual([]);
  });
  it('virheet: ei merkintää → heittää (ei valevahvistusta); tuntematon valinta heittää; virheellinen päivä heittää', () => {
    expect(() => M.tmVahvistaMerkinnat(pel(), { tukitarve: 'vahvista' }, PVM)).toThrow(/tukitarvetta/); expect(() => M.tmVahvistaMerkinnat(pel(), { ydinvahvuus: 'vahvista' }, PVM)).toThrow(/ydinvahvuutta/);
    expect(() => M.tmVahvistaMerkinnat(pel({ ydinvahvuus: YV }), { ydinvahvuus: 'poista' }, PVM)).toThrow(/vahvista/); expect(() => M.tmVahvistaMerkinnat(pel({ tukitarve: TT }), { tukitarve: 'x' }, PVM)).toThrow(/vahvista" tai "poista/);
    expect(() => M.tmVahvistaMerkinnat(pel({ tukitarve: TT }), { tukitarve: 'poista' }, '2026-02-30')).toThrow(/päivä/);
  });
});

/* ── VP_v25-polut vm:ssä (oikea set-merge-semantiikka: syvä merge + delete-sentinel) ── */
function syvaMerge(a, b) {
  const o = Object.assign({}, a);
  Object.keys(b).forEach((k) => { if (b[k] === DEL) delete o[k]; else if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && o[k] && typeof o[k] === 'object') o[k] = syvaMerge(o[k], b[k]); else o[k] = b[k]; });
  return o;
}
function ymp({ kaada = false, pelaaja = {}, valinnat = null, demo = false } = {}) {
  const docs = { [POLKU]: JSON.parse(JSON.stringify(pel(pelaaja))) }, kirj = [];
  const ref = (p) => ({ path: p, collection: (c) => ({ doc: (id) => ref(p + '/' + c + '/' + id) }) });
  const db = { collection: (c) => ({ doc: (id) => ref(c + '/' + id) }), batch: () => { const ops = []; return { set: (r, d, o) => ops.push({ p: r.path, d, merge: !!(o && o.merge) }),
    commit: async () => { if (kaada) throw new Error('permission-denied'); ops.forEach((x) => { docs[x.p] = x.merge ? syvaMerge(docs[x.p] || {}, x.d) : x.d; kirj.push(x); }); } }; } };
  const p = Object.assign(pel(pelaaja), { _idpTavoite: { arviot: [] } });
  const log = { toastit: [], el: null };
  const arvot = { _rvArvo: '4.5', _rvNote: '', _rvKomm: '', _rvTagit: '', _vpReviewModal: null };
  const c = { db, _seuraId: 'kpv', _isDemoMode: demo, _uid: 'vp-uid', _pelaajat: [p], Object, Array, Math, console: { warn() {} }, tmPaivaIso: () => PVM, tmPvmFi: (iso) => iso.split('-').reverse().join('.'), _jsvEsc: (x) => String(x == null ? '' : x),
    window: { TM_KEHITYSSILMUKKA: K, TM_JAKSO_MALLI: M, tmVarhainKypsynyt: PHV.tmVarhainKypsynyt, _rvArvioVal: 4, _vpRooli: 'vp', _rvVahvista: valinnat, _rvPid: PID }, vpT: (x) => x, toast: (t, k) => log.toastit.push([t, k]),
    tmPhvKoodi: PHV.tmPhvKoodi,
    firebase: { firestore: { FieldValue: { delete: () => DEL } }, auth: () => ({ currentUser: { uid: 'vp-uid' } }) },
    document: { getElementById: (id) => (id === '_rvMerkinnat' ? { replaceWith(n) { log.el = n; } } : (id in arvot ? (arvot[id] == null ? null : { value: arvot[id], remove() {} }) : null)), createElement: () => ({ set innerHTML(h) { this._h = h; this.firstChild = h ? { html: h } : null; } }) },
    _vpIdpPelaaja: () => p, idpLisaaArvio() {}, _vpReviewTagitSanitoi: (a) => a, _vpKausitavoiteReRender() {}, _vpTallennaIdpDok: async () => true, _vpKehAskelReRender() {}, renderReviewit() {}, renderTilanne() {} };
  vm.createContext(c);
  vm.runInContext([pura('function _vpRvMerkinnatHTML('), pura('window._vpRvVahvista = function'), pura('async function _vpKirjoitaReview('), pura('window._vpTallennaReview = async function')].join(';\n') + ';', c);
  return { c, p, docs, kirj, log };
}
const teksti = (h) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

describe('VP_v25 · lohko "Vahvista merkinnät" (09 §6)', () => {
  it('EI merkintöjä eikä vihjeitä → lohko EI renderöidy (modaali ennallaan)', () => { expect(ymp().c._vpRvMerkinnatHTML(pel())).toBe(''); });
  it('molemmat merkinnät: ydinvahvuus "pitääkö yhä?" + [Kyllä]; Tukiosa-rivi + [Vahvista] [Poista]; vanhentunut-varoitus 15 viikkoa; päivät fi-muodossa', () => {
    const t = teksti(ymp().c._vpRvMerkinnatHTML(pel({ ydinvahvuus: YV, tukitarve: TT })));
    expect(t).toContain('Vahvista merkinnät'); expect(t).toContain('Ydinvahvuus · Tempokuljetus · havaittu 12.09.2026 — pitääkö yhä?'); expect(t).toContain('Kyllä');
    expect(t).toContain('Tukiosa: voima · merkintä 20.06.2026'); expect(t).toContain('Tukiosan merkintä on 15 viikkoa vanha. Vahvista tai poista ennen kuin aloitat uuden jakson.'); expect(t).toContain('Vahvista'); expect(t).toContain('Poista');
  });
  it('tuore tukitarve → ei vanhentunut-varoitusta; vihje "Mittaa kasvu" näkyy vain kun tuntematon PHV + alin taso (injektoitu); POST + fyysinen ydinvahvuus → "Harkitse teknistä…"', () => {
    const e = ymp(); const tuore = teksti(e.c._vpRvMerkinnatHTML(pel({ tukitarve: Object.assign({}, TT, { merkitty_pvm: '2026-09-20' }) })));
    expect(tuore).toContain('Tukiosa: voima'); expect(tuore).not.toContain('vanha.');
    const post = teksti(e.c._vpRvMerkinnatHTML(pel({ biologinenIka_viimeisin: { phv_tila_koodi: 'POST', phv_ika: 13.5, mittauspaiva: '2026-09-01' }, ydinvahvuus: { kuvaus: 'Maksiminopeus', havaittu_pvm: '2026-09-12', rooli: 'valmentaja' } })));
    expect(post).toContain('Harkitse teknistä tai taktista ydinvahvuutta.');
  });
  it('henkilökunnan näkymä: lohkossa ei sanoja heikkous/rajoite/kriittinen eikä lukuarvoja X/5 (§7.22, GDPR-sanatesti)', () => {
    const h = ymp().c._vpRvMerkinnatHTML(pel({ ydinvahvuus: YV, tukitarve: TT }));
    expect(h).not.toMatch(/heikkou|rajoite|rajoitt|kriittin|\d\/5/i);
  });
  it('painikkeet: valinta vaihtuu (aria-pressed), sama valinta uudelleen peruu; tilan muutos piirtää lohkon uudelleen', () => {
    const e = ymp({ valinnat: { ydinvahvuus: null, tukitarve: null }, pelaaja: { tukitarve: TT } });
    e.c.window._vpRvVahvista('tukitarve', 'poista'); expect(e.c.window._rvVahvista.tukitarve).toBe('poista'); expect(e.log.el.html).toMatch(/aria-pressed="true"[^>]*>Poista/);
    e.c.window._vpRvVahvista('tukitarve', 'poista'); expect(e.c.window._rvVahvista.tukitarve).toBeNull();
    e.c.window._vpRvVahvista('tukitarve', 'vahvista'); e.c.window._vpRvVahvista('tukitarve', 'poista'); expect(e.c.window._rvVahvista.tukitarve, 'toinen valinta korvaa edellisen').toBe('poista');
  });
});

describe('VP_v25 · _vpTallennaReview: vahvistukset SAMASSA BATCHISSA katselmuksen kanssa', () => {
  it('Vahvista + Kyllä: yksi batch {reviewit/{pvm}, pelaajadokki}; ydinvahvuus.havaittu_pvm + tukitarve.merkitty_pvm päivittyvät, kuvaus/rooli/alue säilyvät; katselmusrytmi nollautuu', async () => {
    const e = ymp({ pelaaja: { ydinvahvuus: YV, tukitarve: TT }, valinnat: { ydinvahvuus: 'vahvista', tukitarve: 'vahvista' } });
    await e.c.window._vpTallennaReview(PID);
    expect(e.kirj.length).toBe(2); expect(e.kirj.map((k) => k.p)).toEqual([POLKU + '/reviewit/' + PVM, POLKU]);   // yksi batch: katselmus + pelaajadokki
    const d = e.docs[POLKU]; expect(d.ydinvahvuus).toEqual(Object.assign({}, YV, { havaittu_pvm: PVM })); expect(d.tukitarve).toEqual(Object.assign({}, TT, { merkitty_pvm: PVM }));
    expect(d.review_viimeisin_pvm).toBe(PVM); expect(e.p.ydinvahvuus.havaittu_pvm).toBe(PVM); expect(e.c.window._rvVahvista).toBeNull();
  });
  it('Poista: tukitarve poistuu pelaajadokista (FieldValue.delete) ja paikallisesta tilasta; ydinvahvuus koskematon', async () => {
    const e = ymp({ pelaaja: { ydinvahvuus: YV, tukitarve: TT }, valinnat: { ydinvahvuus: null, tukitarve: 'poista' } });
    await e.c.window._vpTallennaReview(PID);
    expect('tukitarve' in e.docs[POLKU]).toBe(false); expect('tukitarve' in e.p).toBe(false); expect(e.docs[POLKU].ydinvahvuus).toEqual(YV); expect(e.docs[POLKU].review_viimeisin_pvm).toBe(PVM);
  });
  it('ei valintoja → batchissa vain katselmus + review-pikakentät (ennallaan); ydinvahvuus/tukitarve koskemattomat', async () => {
    const e = ymp({ pelaaja: { ydinvahvuus: YV, tukitarve: TT }, valinnat: { ydinvahvuus: null, tukitarve: null } });
    await e.c.window._vpTallennaReview(PID);
    expect(e.docs[POLKU].ydinvahvuus).toEqual(YV); expect(e.docs[POLKU].tukitarve).toEqual(TT); expect(e.kirj[1].d).not.toHaveProperty('ydinvahvuus'); expect(e.kirj[1].d).not.toHaveProperty('tukitarve');
  });
  it('batch kaatuu → EI vahvistuksia, EI paikallista päivitystä (atomisuus), virheilmoitus', async () => {
    const e = ymp({ kaada: true, pelaaja: { ydinvahvuus: YV, tukitarve: TT }, valinnat: { ydinvahvuus: 'vahvista', tukitarve: 'poista' } });
    await e.c.window._vpTallennaReview(PID);
    expect(e.docs[POLKU].tukitarve).toEqual(TT); expect(e.docs[POLKU].ydinvahvuus).toEqual(YV); expect(e.p.tukitarve).toEqual(TT); expect(e.log.toastit.some(([, k]) => k === 'error')).toBe(true);
  });
  it('vahvistus ilman merkintää (vanhentunut tila) → ei kaada katselmusta: varoitus, katselmus kirjautuu ilman vahvistusta; demo: vain paikallinen', async () => {
    const e = ymp({ pelaaja: {}, valinnat: { ydinvahvuus: null, tukitarve: 'poista' } });
    await e.c.window._vpTallennaReview(PID);
    expect(e.log.toastit.some(([, k]) => k === 'error')).toBe(true); expect(e.docs[POLKU].review_viimeisin_pvm).toBe(PVM);
    const d = ymp({ demo: true, pelaaja: { tukitarve: TT }, valinnat: { ydinvahvuus: null, tukitarve: 'poista' } }); await d.c.window._vpTallennaReview(PID);
    expect(d.kirj).toEqual([]); expect('tukitarve' in d.p).toBe(false);
  });
});

describe('lähdevartijat', () => {
  it('lohko lisätään modaaliin ennen Tallenna-nappeja; lib ladataan; lohkon tekstit vpT:n läpi; _vpTtKirjoita/_vpJfKirjoita ei käytetä', () => {
    const modaali = pura('window._vpKirjaaReview = function'); expect(modaali.indexOf('_vpRvMerkinnatHTML(p)')).toBeGreaterThan(-1); expect(modaali.indexOf('_vpRvMerkinnatHTML(p)')).toBeLessThan(modaali.indexOf('Tallenna review'));
    expect(VP).toContain('lib/tm_jakso_malli.js?v=1'); expect(VP.indexOf('lib/tm_jakso_malli.js')).toBeLessThan(VP.indexOf('lib/tm_kehityssilmukka.js'));
    const lohko = pura('function _vpRvMerkinnatHTML('); expect(lohko).not.toMatch(/_vpTtKirjoita|_vpJfKirjoita|\.set\(|\.update\(/); expect((lohko.match(/vpT\(/g) || []).length).toBeGreaterThan(8);
  });
});
