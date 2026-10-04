/**
 * KORTTI 1c — oma ennätys näkyviin pelaajalle. Oire: Topias teki Pikakirjauksella 30 m ennätyksen (5.9 → 4.0 s),
 * Pelaaja_v7 näytti "Huippuvauhtia" mutta Ennätykset-kortti ei syttynyt: p.ennatykset päivittyi VAIN Testaus_v9:n
 * "Merkitse valmiiksi" -polussa (+ Excel_Tuonti), ei Pikakirjauksessa eikä Testituonti_Masterissa.
 *   1) jaettu lib/tm_ennatykset.js: aikatesti parannus → päivittyy · huonompi → ei muutu · suunta · §22 alusta
 *   2) kirjoittajat: Pikakirjaus + Testituonti samassa batchissa (§26) · Testaus_v9/Excel käyttävät samaa libiä (ei kopioita)
 *   3) Pelaaja_v7: juhlaviesti KERRAN (localStorage-merkki per testi), estetty localStorage → ei näytetä
 *   4) Vanhempi_v2: sama ennätys neutraalisti
 *   5) §7.22-vahti: ei tasolukuja, ei vertailua muihin, ei XP/progressbaria, ei loss aversion -kieltä
 * Funktiot PURETAAN LÄHTEESTÄ ja AJETAAN (vm), data OIKEALLA Pikakirjaus-laskennalla.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const require = createRequire(import.meta.url);
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const lue = (f) => readFileSync(join(juuri, f), 'utf8');
const E = require('../lib/tm_ennatykset.js');
const LANG = require('../lib/tm_lang.js');
function pura(lahde, tunniste) {
  const i = lahde.indexOf(tunniste); expect(i, tunniste).toBeGreaterThan(-1);
  let syv = 0;
  for (let k = lahde.indexOf('{', i); k < lahde.length; k++) { if (lahde[k] === '{') syv++; else if (lahde[k] === '}') { syv--; if (!syv) return lahde.slice(i, k + 1); } }
  throw new Error('sulkeet');
}
/* Batch kaikki-tai-ei-mitään; get/where pelaajadokille. */
function mockDb(alku = {}) {
  const docs = JSON.parse(JSON.stringify(alku)); const erilliset = [];
  const ref = (p) => ({ path: p, collection: (n) => col(p + '/' + n),
    get: async () => ({ exists: p in docs, data: () => docs[p] }),
    set: async () => erilliset.push(p), update: async () => erilliset.push(p) });
  const col = (p) => ({ doc: (id) => ref(p + '/' + id),
    where: (kentta, op, arvo) => ({ limit: () => ({ get: async () => {
      const os = Object.keys(docs).filter((k) => k.startsWith(p + '/') && k.slice(p.length + 1).indexOf('/') < 0 && docs[k][kentta] === arvo);
      return { empty: !os.length, docs: os.map((k) => ({ id: k.split('/').pop(), ref: ref(k), data: () => docs[k] })) };
    } }) }) });
  const db = { collection: (n) => col(n), batches: [], batch: () => { const ops = []; return {
    set: (r, d, o) => ops.push(['set', r.path, d, o]), update: (r, d) => ops.push(['update', r.path, d]),
    commit: async () => { db.batches.push(ops.map(([t, p]) => t + ' ' + p)); ops.forEach(([t, p, d, o]) => { docs[p] = (t === 'update' || (o && o.merge)) ? Object.assign({}, docs[p], d) : d; }); } }; } };
  return { db, docs, erilliset };
}
const PEL = 'seurat/kpv/pelaajat/m93GBdOaGCUuenMiCL0I';
const VUOSI = new Date().getFullYear();
const TOPIAS = { syntymaVuosi: VUOSI - 13, sukupuoli: 'M', joukkue: 'KPV P13', tunniste: '12345678', etunimi: 'Topias' };

// ─── 1) Jaettu laskenta ─────────────────────────────────────────────────────────────────────────────────
describe('lib/tm_ennatykset — oma paras (suunta, kohina, §22 alusta, ei "huononi")', () => {
  it('aikatesti: parannus → ennätys päivittyy + edellinen talteen; huonompi → ei muutu', () => {
    let r = E.paivitaEnnatykset(null, [{ testi: 'lin30m', arvo: 5.9, pvm: '2026-09-01' }]);
    expect(r.ennatykset.lin30m).toEqual({ paras: 5.9, pvm: '2026-09-01', alusta: 'tuntematon' });
    expect(r.uudet, '1. mittaus = lähtötaso, ei "uusi ennätys"').toEqual([]);
    r = E.paivitaEnnatykset(r.ennatykset, [{ testi: 'lin30m', arvo: 4.0, pvm: '2026-10-03' }]);
    expect(r.ennatykset.lin30m).toEqual({ paras: 4.0, pvm: '2026-10-03', alusta: 'tuntematon', edellinen: 5.9 });
    expect(r.uudet).toEqual(['lin30m']);
    const huonompi = E.paivitaEnnatykset(r.ennatykset, [{ testi: 'lin30m', arvo: 4.4, pvm: '2026-10-10' }]);
    expect(huonompi.ennatykset.lin30m).toEqual(r.ennatykset.lin30m);
    expect(huonompi.uudet).toEqual([]);
  });
  it('suurempi parempi (cmj/mas): nousu = ennätys, lasku ei; kohinan sisällä ei ennätystä', () => {
    const r = E.paivitaEnnatykset({ cmj: { paras: 30, pvm: '2026-09-01', alusta: 'tuntematon' } },
      [{ testi: 'cmj', arvo: 33, pvm: '2026-10-03' }, { testi: 'mas', arvo: 14, pvm: '2026-10-03' }]);
    expect(r.ennatykset.cmj.paras).toBe(33);
    expect(E.paivitaEnnatykset(r.ennatykset, [{ testi: 'cmj', arvo: 31 }]).ennatykset.cmj.paras).toBe(33);
    expect(E.paivitaEnnatykset({ lin30m: { paras: 4.5, alusta: 'tuntematon' } }, [{ testi: 'lin30m', arvo: 4.48 }]).uudet).toEqual([]);
  });
  it('§22: alustaherkkä testi eri alustalla ei korvaa ennätystä', () => {
    const r = E.paivitaEnnatykset({ lin30m: { paras: 4.8, alusta: 'keinonurmi_3g' } }, [{ testi: 'lin30m', arvo: 4.2, alusta: 'Halli / parketti' }]);
    expect(r.ennatykset.lin30m.paras).toBe(4.8);
  });
  it('tmEnnatysTulokset: kaikkien kirjoittajien avaimet (lin_30m · lin30m · hyppy_cj) + {paras}; H-H pujottelu EI sekoitu TK-lajiin', () => {
    const t = E.tmEnnatysTulokset({ lin_30m: 4.1, hyppy_cj: 30, pujottelu_hh: 9.9, ponnauttelu: { paras: 20 }, syotto: '' }, 'tuntematon', '2026-10-03');
    expect(t.map((x) => x.testi).sort()).toEqual(['cmj', 'lin30m', 'ponnauttelu']);
    expect(E.tmEnnatysTulokset({ lin30m: 4.1 }, null, null)[0]).toEqual({ testi: 'lin30m', arvo: 4.1, alusta: 'tuntematon', pvm: null });
    expect(E.tmEnnatyksetUpd(null, { kyykky: 3 }, null, '2026-10-03'), 'ei ennätystestejä → ei kenttää').toBeNull();
  });
});

// ─── 2) Kirjoittajat ────────────────────────────────────────────────────────────────────────────────────
describe('kirjoittajat päivittävät ennatykset samassa batchissa (§26)', () => {
  beforeAll(() => {
    globalThis.TM_TESTIKATALOGI = require('../lib/tm_testikatalogi.js');
    globalThis.TM_PIKAKENTAT = require('../lib/tm_pikakentat.js');
    const H = require('../lib/tm_historia.js');
    globalThis.tmHhSnapshot = H.tmHhSnapshot; globalThis.tmTkiSnapshot = H.tmTkiSnapshot; globalThis.tmHistoriaLisaa = H.tmHistoriaLisaa;
  });
  const PK = () => require('../lib/tm_pikakirjaus.js');

  it('JUURISYY-TOISTO Pikakirjaus: Topias 5.9 → 4.0 s → ennatykset.lin30m = 4.0 (+ edellinen) SAMASSA batchissa tuloksen + pikakenttien kanssa', async () => {
    const m = mockDb({ [PEL]: TOPIAS });
    for (const [arvo, pvm] of [[5.9, '2026-09-01'], [4.0, '2026-10-03']]) {
      const payload = PK()._testitulosPayload({ lin_30m: arvo }, pvm, 'vp-uid', null, pvm + 'T10:00:00.000Z');
      await PK()._tallennaPelaajanTulokset(m.db, 'kpv', 'm93GBdOaGCUuenMiCL0I', payload, { lin_30m: arvo }, pvm);
    }
    expect(m.docs[PEL].hh_taso, 'aineisto ei ole huipputasolla').toBe(5);
    expect(m.docs[PEL].ennatykset.lin30m).toEqual({ paras: 4.0, pvm: '2026-10-03', alusta: 'tuntematon', edellinen: 5.9 });
    expect(m.db.batches.at(-1)).toEqual([`set ${PEL}/testitulokset/2026-10-03_pikakirjaus`, `update ${PEL}`]);
    expect(m.erilliset).toEqual([]);
  });
  it('Pikakirjaus: huonompi tulos → ennätys ei muutu; lomakkeen alusta kulkee ennätykseen (§22)', async () => {
    const m = mockDb({ [PEL]: Object.assign({}, TOPIAS, { ennatykset: { lin30m: { paras: 4.0, pvm: '2026-10-03', alusta: 'Tekonurmi', edellinen: 5.9 } } }) });
    const payload = Object.assign(PK()._testitulosPayload({ lin_30m: 4.5 }, '2026-10-20', 'u', null, 'x'), { alusta: 'Tekonurmi' });
    await PK()._tallennaPelaajanTulokset(m.db, 'kpv', 'm93GBdOaGCUuenMiCL0I', payload, { lin_30m: 4.5 }, '2026-10-20');
    expect(m.docs[PEL].ennatykset.lin30m).toEqual({ paras: 4.0, pvm: '2026-10-03', alusta: 'Tekonurmi', edellinen: 5.9 });
  });
  it('Testituonti_Master: ennatykset samassa batchissa testituloksen kanssa (tapahtuman alusta)', async () => {
    const T = lue('TalentMaster_Testituonti_Master.html');
    expect(T).toMatch(/<script src="lib\/tm_ennatykset\.js\?v=\d+"><\/script>/);
    const m = mockDb({ [PEL]: Object.assign({}, TOPIAS, { ennatykset: { lin30m: { paras: 5.9, pvm: '2026-09-01', alusta: 'keinonurmi_3g' } } }) });
    const ctx = { TM_ENNATYKSET: E, firebase: { firestore: { FieldValue: { arrayUnion: (...x) => ({ __au: x }) } } }, Date };
    vm.createContext(ctx); vm.runInContext(pura(T, 'async function ttTallennaPelaaja(') + '\nthis.f = ttTallennaPelaaja;', ctx);
    expect(await ctx.f(m.db, 'kpv', { id: 'tt1', pvm: '2026-10-03', alusta: 'keinonurmi_3g' }, { tunniste: '12345678' }, { testit: { lin30m: 4.0, hyppy_cj: 31 } }, null)).toBe('ok');
    expect(m.db.batches).toEqual([['set seurat/kpv/testitapahtumat/tt1/tulokset/12345678', 'update ' + PEL]]);
    expect(m.docs[PEL].ennatykset.lin30m).toEqual({ paras: 4.0, pvm: '2026-10-03', alusta: 'keinonurmi_3g', edellinen: 5.9 });
    expect(m.docs[PEL].ennatykset.cmj.paras).toBe(31);
  });
  it('Testaus_v9 _v6EnnatyksetUpd käyttää jaettua libiä (sama tulos kuin Pikakirjaus)', () => {
    const T9 = lue('TalentMaster_Testaus_v9.html');
    const ctx = { TM_ENNATYKSET: E, tmPaivaIso: () => '2026-10-03', _aktiivinenTapahtuma: { alusta: 'keinonurmi_3g', pvm: '2026-10-03' },
      _tulokset: { a: { lin_30m: { paras: 4.0 } } } };
    vm.createContext(ctx); vm.runInContext(pura(T9, 'function _v6EnnatyksetUpd(') + '\nthis.f = _v6EnnatyksetUpd;', ctx);
    expect(ctx.f({ id: 'a' }, { ennatykset: { lin30m: { paras: 4.3, alusta: 'keinonurmi_3g' } } }).ennatykset.lin30m).toEqual(
      { paras: 4.0, pvm: '2026-10-03', alusta: 'keinonurmi_3g', edellinen: 4.3 });
    expect(ctx.f({ id: 'b' }, {}), 'ei tuloksia → ei kenttää').toEqual({});
  });
  it('EI KOPIOITA: paivitaEnnatykset/ENNATYS_META määritellään VAIN lib/tm_ennatykset.js:ssä; kaikki kirjoittajat lataavat sen', () => {
    const tiedostot = readdirSync(juuri).filter((f) => /\.(html|js)$/.test(f)).concat(['docs/testit_indeksit.js'],
      readdirSync(join(juuri, 'lib')).filter((f) => f.endsWith('.js')).map((f) => 'lib/' + f));
    const maarittelijat = tiedostot.filter((f) => /function paivitaEnnatykset\s*\(|ENNATYS_META\s*=/.test(lue(f)));
    expect(maarittelijat).toEqual(['lib/tm_ennatykset.js']);
    for (const f of ['TalentMaster_Testaus_v9.html', 'TalentMaster_Excel_Tuonti.html', 'TalentMaster_Testituonti_Master.html', 'TalentMaster_VP_v25.html', 'TalentMaster_Master_v16.html']) {
      expect(lue(f), f).toMatch(/<script src="lib\/tm_ennatykset\.js\?v=\d+"><\/script>/);
    }
    // VP/Master: lib ladataan ENNEN Pikakirjausta (TM_ENNATYKSET globaali avaa()-hetkellä)
    for (const f of ['TalentMaster_VP_v25.html', 'TalentMaster_Master_v16.html']) {
      const s = lue(f); expect(s.indexOf('lib/tm_ennatykset.js'), f).toBeLessThan(s.indexOf('lib/tm_pikakirjaus.js'));
    }
  });
});

// ─── 3) Pelaaja_v7: juhlaviesti kerran ──────────────────────────────────────────────────────────────────
const P7 = lue('TalentMaster_Pelaaja_v7.html');
function pelaajaCtx(pelaaja, ls) {
  const body = []; const el = () => ({ classList: { add() {}, remove() {} }, remove() {}, set innerHTML(v) { this._h = v; }, get innerHTML() { return this._h; } });
  const document = { getElementById: (id) => body.find((e) => e.id === id) || null, createElement: el, body: { appendChild: (e) => body.push(e) } };
  const ctx = { _pelaaja: pelaaja, _isDemoUser: false, window: {}, document, localStorage: ls, requestAnimationFrame: (f) => f(),
    setTimeout: () => 0, JSON, Object, String, Number, Math, t: LANG.t };
  vm.createContext(ctx);
  vm.runInContext([pura(P7, 'function _thEsc('), pura(P7, 'function _kkEnnatysTiedot('), pura(P7, 'function _ennUudetNakematta('),
    pura(P7, 'function _ennLuku('), pura(P7, 'function _ennArvoTxt('), pura(P7, 'function _naytaUusiEnnatys('), pura(P7, 'function _kkEnnatyksetHTML(')].join('\n')
    + '\nthis.nayta = _naytaUusiEnnatys; this.puhdas = _ennUudetNakematta; this.kortti = _kkEnnatyksetHTML;', ctx);
  ctx.body = body; return ctx;
}
function muistiLS() { const m = {}; return { m, getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); } }; }
const TOPIAS_DOC = { id: 'm93GBdOaGCUuenMiCL0I', etunimi: 'Topias', ennatykset: { lin30m: { paras: 4.0, pvm: '2026-10-03', alusta: 'tuntematon', edellinen: 5.9 } } };

describe('Pelaaja_v7 · uusi oma ennätys → juhlaviesti KERRAN', () => {
  it('Topias: "🏅 Uusi oma ennätys: 30 m kiri 4.0 s! Voitit itsesi." näkyy kerran — ei toistu seuraavalla avauksella', () => {
    const ls = muistiLS();
    const a = pelaajaCtx(TOPIAS_DOC, ls); a.nayta();
    expect(a.body).toHaveLength(1);
    expect(a.body[0].innerHTML).toContain('🏅 Uusi oma ennätys: 30 m kiri 4.0 s! Voitit itsesi.');
    expect(JSON.parse(ls.m['tm_ennatys_nahty_m93GBdOaGCUuenMiCL0I'])).toEqual({ lin30m: '2026-10-03' });
    const b = pelaajaCtx(TOPIAS_DOC, ls); b.nayta();
    expect(b.body, 'toinen avaus: ei juhlaviestiä').toHaveLength(0);
  });
  it('uudempi ennätys myöhemmin → juhlitaan taas (vain se testi)', () => {
    const ls = muistiLS(); ls.setItem('tm_ennatys_nahty_m93GBdOaGCUuenMiCL0I', JSON.stringify({ lin30m: '2026-10-03', cmj: '2026-09-01' }));
    const doc = { id: 'm93GBdOaGCUuenMiCL0I', ennatykset: { lin30m: { paras: 3.9, pvm: '2026-11-01', edellinen: 4.0 }, cmj: { paras: 30, pvm: '2026-09-01', edellinen: 28 } } };
    const c = pelaajaCtx(doc, ls); c.nayta();
    expect(c.body[0].innerHTML).toContain('30 m kiri 3.9 s');
    expect(c.body[0].innerHTML).not.toContain('Kevennyshyppy');
  });
  it('1. mittaus (ei edellistä = ei voitettu omaa tulosta) → EI juhlaa, merkitään nähdyksi hiljaa', () => {
    const ls = muistiLS();
    const c = pelaajaCtx({ id: 'x', ennatykset: { lin30m: { paras: 5.9, pvm: '2026-09-01', alusta: 'tuntematon' } } }, ls); c.nayta();
    expect(c.body).toHaveLength(0);
    expect(JSON.parse(ls.m.tm_ennatys_nahty_x)).toEqual({ lin30m: '2026-09-01' });
  });
  it('localStorage estetty (try/catch) → ei näytetä eikä kaadu (muuten toistuisi joka avauksella)', () => {
    const esto = { getItem: () => { throw new Error('SecurityError'); }, setItem: () => { throw new Error('SecurityError'); } };
    const c = pelaajaCtx(TOPIAS_DOC, esto);
    expect(() => c.nayta()).not.toThrow();
    expect(c.body).toHaveLength(0);
  });
  it('demo-käyttäjä tai tervetulo-overlay auki → ei juhlaa (eikä merkitä nähdyksi)', () => {
    const ls = muistiLS(); const c = pelaajaCtx(TOPIAS_DOC, ls);
    c.body.push({ id: 'tervetuloOv' }); c.nayta();
    expect(c.body).toHaveLength(1); expect(ls.m).toEqual({});
    const d = pelaajaCtx(TOPIAS_DOC, ls); d._isDemoUser = true; d.nayta(); expect(d.body).toHaveLength(0);
  });
  it('kytketty käynnistykseen + Ennätykset-kortti näyttää uuden parhaan', () => {
    expect(pura(P7, 'function _kaynnistaAppUI(')).toContain('_naytaUusiEnnatys()');
    expect(pelaajaCtx(TOPIAS_DOC, muistiLS()).kortti(TOPIAS_DOC, '2_rakentaja')).toMatch(/30 m kiri[\s\S]*>4\.0 s</);
  });
});

// ─── 4) Vanhempi_v2 ─────────────────────────────────────────────────────────────────────────────────────
const V2 = lue('TalentMaster_Vanhempi_v2.html');
function vanhempiKortti(lapsi) {
  const ctx = { window: { _lapsi: lapsi }, t: LANG.t, tmPaivaIso: () => '2026-10-04', Date, Number, String, Math, Object, isNaN };
  vm.createContext(ctx);
  const alku = V2.indexOf('const _VANH_ENN = {');
  vm.runInContext(V2.slice(alku, V2.indexOf('};', alku) + 2) + '\n' + pura(V2, 'function _vEsc(') + '\n' + pura(V2, 'function _vanhEnnArvo(') + '\n'
    + pura(V2, 'function _vanhEnnPvm(') + '\n' + pura(V2, 'function rVanhempiEnnatykset(') + '\nthis.f = rVanhempiEnnatykset;', ctx);
  return ctx.f();
}
describe('Vanhempi_v2 · sama ennätys neutraalisti', () => {
  it('näyttää arvon + päivän, "Uusi oma ennätys" tuoreelle parannukselle; kytketty Kortti-tabiin', () => {
    const h = vanhempiKortti(TOPIAS_DOC);
    expect(h).toContain('Omat ennätykset'); expect(h).toContain('30 m kiri'); expect(h).toContain('4.0 s'); expect(h).toContain('3.10.2026');
    expect(h).toContain('Uusi oma ennätys');
    expect(h, 'ei edellistä tulosta/deltaa vanhemmalle (painostus)').not.toContain('5.9');
    expect(pura(V2, 'function rKortti(')).toContain('${rVanhempiEnnatykset()}');
  });
  it('ei ennätyksiä → kortti piilossa (ei "tulossa"-täytettä)', () => {
    expect(vanhempiKortti({})).toBe('');
  });
});

// ─── 5) §7.22-vahti ─────────────────────────────────────────────────────────────────────────────────────
describe('§7.22-vahti: vain itsevertailu', () => {
  const KIELLETTY = [/taso\s*\d/i, /\btaso\b/i, /\d\s*\/\s*5\b/, /\bT[1-5]\b/, /\d+\s*%/, /\btop\b/i, /muihin|muita pelaajia|joukkueen paras|sijoitus|percentiili/i,
    /\bXP\b/, /progress|edistymispalkki|width:\s*\d+%/i, /menetät|putoat|sulkeutuu|häviät|jäät jälkeen|älä menetä/i, /level|rank|others/i];
  const fiTekstit = ['pelaaja.ennatys_uusi', 'pelaaja.ennatys_otsikko', 'pelaaja.ennatys_kortissa', 'pelaaja.ennatys_jes', 'vanhempi.enn_otsikko', 'vanhempi.enn_selite', 'vanhempi.enn_uusi']
    .flatMap((k) => ['fi', 'en'].map((l) => k.split('.').reduce((o, x) => o[x], LANG.TM_LANG[l])));
  it('uudet tekstit (fi + en) ja renderöity juhlaviesti + vanhemman kortti eivät sisällä kiellettyä', () => {
    const ls = muistiLS(); const c = pelaajaCtx(TOPIAS_DOC, ls); c.nayta();
    const kaikki = fiTekstit.concat([c.body[0].innerHTML.replace(/<[^>]+>/g, ' '), vanhempiKortti(TOPIAS_DOC).replace(/<[^>]+>/g, ' ')]);
    expect(kaikki.length).toBeGreaterThan(10);
    for (const s of kaikki) for (const re of KIELLETTY) expect(s, String(re)).not.toMatch(re);
  });
  it('EI VACUOUS: vahti nappaa tasoluvun, vertailun ja menetys-kielen', () => {
    for (const huono of ['Taso 5!', 'top 30 %', 'Valmius 74 · 4/5', 'Olet joukkueen paras', '+50 XP', 'Älä menetä putkea']) {
      expect(KIELLETTY.some((re) => re.test(huono)), huono).toBe(true);
    }
  });
  it('sv: ei Clauden kirjoittamaa ruotsia — uudet avaimet odotuslistalla', () => {
    const SV = require('./tm_lang_sv_odotuslista.cjs');
    for (const k of ['pelaaja.ennatys_uusi', 'vanhempi.enn_otsikko', 'vanhempi.enn_t_lin30m']) expect(SV).toContain(k);
  });
});
