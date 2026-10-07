/**
 * K4 — sunnuntain viikkokatsaus + jakson päätöskortti + henkilökunnan osio (docs/CODE_BRIEF_K4_VIIKKOKATSAUS.md, päätös 7.10.2026: oma alikokoelma viikkokatsaukset, Rules v3.44).
 * lib/tm_viikkokatsaus.js (puhtaat funktiot), Pelaaja_v7-adapteri (vm: SIVUN oikea koodi), §7.22-portti, Master/VP-kytkentä. Fixturet keksittyjä; KPV U13 -testipelaaja.
 * Rules-emulaattoritestit: tests/rules/firestore.rules.test.js ("v3.44 · viikkokatsaukset").
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import vm from 'vm';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const require = createRequire(import.meta.url);
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const lue = (f) => readFileSync(join(juuri, f), 'utf8');
const SRC = lue('TalentMaster_Pelaaja_v7.html');
const V = require('../lib/tm_viikkokatsaus.js'), TK = require('../lib/tm_tanaan_kentta.js'), KS = require('../lib/tm_kehityssilmukka.js');

const SU = '2026-11-15';   // sunnuntai; jakso alkoi ma 2026-11-09 → viikko 1
const KE = '2026-11-11';   // keskiviikko
const MA = '2026-11-16';   // maanantai
const ALKOI = new Date(2026, 10, 9).toISOString();
const JAKSO = (lisa) => Object.assign({ konsepti_avain: 'y_h2', konsepti_nimi: 'Kuljettaminen', kesto_vk: 6, alkoi: ALKOI, osat: ['Laukaus vauhdista', 'Heikompi jalka', 'Pallon suojaus'] }, lisa || {});
const P = (lisa) => Object.assign({ id: 'topias', etunimi: 'Topias', seuraId: 'kpv', syntymaVuosi: 2013, jaksofokus: JAKSO() }, lisa || {});
const kaanon = () => null;

describe('tmVkNakyy — milloin kortti näkyy', () => {
  it('vain sunnuntaina, jakso käynnissä, ei Leikkijä, ei jo vastattu; maanantaina ei muistuteta', () => {
    expect(V.tmVkNakyy(P(), { tanaan: SU })).toBe(true);
    expect(V.tmVkNakyy(P(), { tanaan: KE })).toBe(false);
    expect(V.tmVkNakyy(P(), { tanaan: MA })).toBe(false);   // §7.22: ei muistutusta, ei putken katkeamista
    expect(V.tmVkNakyy(P({ jaksofokus: null }), { tanaan: SU })).toBe(false);
    expect(V.tmVkNakyy(P(), { tanaan: SU, ikavaihe: 'leikkija' })).toBe(false);
    expect(V.tmVkNakyy(P(), { tanaan: SU, vastattu: true })).toBe(false);
    expect(V.tmVkNakyy(P(), {})).toBe(false);
    expect(V.tmVkNakyy(P({ jaksofokus: JAKSO({ alkoi: new Date(2026, 9, 1).toISOString() }) }), { tanaan: SU })).toBe(false);   // umpeutunut jakso → ei viikkokatsausta (päätöskortti hoitaa)
  });
});

describe('tmVkKysymykset — osat kuten K1:ssä', () => {
  it('0–3 osaa: enintään kolme kysymystä; osat jaksofokus.osat → konsepti-kpi; ei osia → yksi yleiskysymys', () => {
    const k = V.tmVkKysymykset(JAKSO(), { kaanon });
    expect(k).toEqual([{ osa: 'A', teksti: 'Laukaus vauhdista' }, { osa: 'B', teksti: 'Heikompi jalka' }, { osa: 'C', teksti: 'Pallon suojaus' }]);
    expect(V.tmVkKysymykset(JAKSO({ osat: ['a1', 'b1', 'c1', 'd1', 'e1'] }), { kaanon })).toHaveLength(3);
    expect(V.tmVkKysymykset(JAKSO({ osat: ['Vain yksi'] }), { kaanon })).toEqual([{ osa: 'A', teksti: 'Vain yksi' }]);
    const kpi = V.tmVkKysymykset(JAKSO({ osat: undefined }), { kaanon: () => ({ kpi: [{ teksti: 'Ensikosketus' }, { teksti: 'Katse ylös' }] }) }); expect(kpi.map((x) => x.osa)).toEqual(['A', 'B']);
    const y = V.tmVkKysymykset(JAKSO({ osat: undefined }), { kaanon }); expect(y).toHaveLength(1); expect(y[0].osa).toBe('jakso'); expect(y[0].teksti).toBe('Miten jakso on näkynyt pelissä?');
    expect(V.tmVkKysymykset(JAKSO({ osat: ['Heikkoutena X', 'Hyvä osa'] }), { kaanon })).toEqual([{ osa: 'A', teksti: 'Hyvä osa' }]);   // KIELLETYT-sana pudottaa osan (K1:n tavoin), kirjain seuraa jäljelle jääneitä
  });
});

describe('lause — KIELLETYT, pituus, mittausmuodot', () => {
  it('pelaajan lause: tyhjä → null, ≤140 ok, 141 ✗, KIELLETYT ✗', () => {
    expect(V.tmVkLausePelaaja('')).toEqual({ ok: true, teksti: null, syy: null }); expect(V.tmVkLausePelaaja('   ').teksti).toBeNull(); expect(V.tmVkLausePelaaja(undefined).ok).toBe(true);
    expect(V.tmVkLausePelaaja('x'.repeat(140)).ok).toBe(true); expect(V.tmVkLausePelaaja('x'.repeat(141))).toEqual({ ok: false, teksti: null, syy: 'pitka' });
    for (const s of ['oma heikkous', 'rajoite jalassa', 'kriittinen hetki']) expect(V.tmVkLausePelaaja(s).syy, s).toBe('sana');
    expect(V.tmVkLausePelaaja('  Pelasin hyvin  ').teksti).toBe('Pelasin hyvin');
  });
  it('valmentajan lause: sama + K1:n perustelun tarkistus — ei lukuja/mittausmuotoja (X/Y, 3,5, 10 s, taso N, pisteet)', () => {
    expect(V.tmVkLauseValmentaja('Hienoa työtä, jatka samaan malliin').ok).toBe(true);
    for (const s of ['Teit 3,5 pistettä', 'Aika 10 s', 'Sait 4/5', 'Hyvä taso 3', 'kriittinen kohta']) expect(V.tmVkLauseValmentaja(s).ok, s).toBe(false);
    expect(V.tmVkLauseValmentaja('Hyvä 1. kosketus tänään').ok).toBe(true);   // järjestysnumero sallittu (K1)
    expect(V.tmVkLauseValmentaja('x'.repeat(141)).syy).toBe('pitka');
    expect(V.tmVkLauseVirhe('pitka', {})).toContain('140'); expect(V.tmVkLauseVirhe('luku', {})).toContain('lukuja'); expect(V.tmVkLauseVirhe('sana', {})).toContain('sanan');
  });
});

describe('tmVkTallennusolio', () => {
  const ctx = { tanaan: SU, kaanon };
  it('muoto { vk, jakso_alkoi, vastaukset:[{osa, teksti, arvo}], lause? } — ei tyyppi/tehty/lahde/putkikenttiä; teksti = kopio; vain vastatut osat', () => {
    const o = V.tmVkTallennusolio(P(), { A: 'usein', C: 'ei_viela' }, 'Hyvä viikko', ctx);
    expect(o.id).toBe(SU);
    expect(o.data).toEqual({ vk: 1, jakso_alkoi: '2026-11-09', vastaukset: [{ osa: 'A', teksti: 'Laukaus vauhdista', arvo: 'usein' }, { osa: 'C', teksti: 'Pallon suojaus', arvo: 'ei_viela' }], lause: 'Hyvä viikko' });
    for (const k of ['tyyppi', 'tehty', 'lahde', 'paivitetty', 'pvm', 'streak_pvm', 'xp', 'luotu']) expect(Object.keys(o.data)).not.toContain(k);   // luotu = adapterin serverTimestamp (Rules: == request.time)
    expect(V.tmVkTallennusolio(P(), { A: 'joskus' }, '', ctx).data).not.toHaveProperty('lause');
  });
  it('null kun: ei vastauksia / väärä arvo / ei sunnuntai / ei jaksoa / kielletty lause; viikko lasketaan alusta kun kestoa ei ole', () => {
    expect(V.tmVkTallennusolio(P(), {}, '', ctx)).toBeNull(); expect(V.tmVkTallennusolio(P(), { A: 'erinomainen' }, '', ctx)).toBeNull();
    expect(V.tmVkTallennusolio(P(), { A: 'usein' }, '', { tanaan: KE, kaanon })).toBeNull(); expect(V.tmVkTallennusolio(P({ jaksofokus: null }), { A: 'usein' }, '', ctx)).toBeNull();
    expect(V.tmVkTallennusolio(P(), { A: 'usein' }, 'oma heikkous', ctx)).toBeNull();
    expect(V.tmVkTallennusolio(P({ jaksofokus: JAKSO({ kesto_vk: undefined }) }), { A: 'usein' }, '', { tanaan: '2026-11-22', kaanon }).data.vk).toBe(2);
  });
  it('yleiskysymys tallentuu osalla "jakso"', () => {
    const o = V.tmVkTallennusolio(P({ jaksofokus: JAKSO({ osat: undefined }) }), { jakso: 'joskus' }, '', ctx); expect(o.data.vastaukset).toEqual([{ osa: 'jakso', teksti: 'Miten jakso on näkynyt pelissä?', arvo: 'joskus' }]);
  });
});

describe('tmVkPaatos — jakson päätöskortti', () => {
  const SULJETTU = (lisa) => Object.assign({ konsepti_nimi: 'Kuljettaminen', sulkutapa: 'suljettu', alkoi: '2026-10-01', paattyi: '2026-11-08' }, lisa || {});
  it('suljettu jakso + lause → "Hyvä jakso" + lause; ei lausetta → "Hyvä jakso, {nimi} tehty"; kortissa ei nappia', () => {
    const l = V.tmVkPaatos(P({ jaksofokus: null, jaksofokus_historia: [SULJETTU({ lause: 'Hienoa kuljetusta!' })] }), { tanaan: KE });
    expect(l).toEqual({ tila: 'lause', nimi: 'Kuljettaminen', lause: 'Hienoa kuljetusta!' });
    const hl = V.tmVkPaatosHTML(l, {}); expect(hl).toContain('Hyvä jakso'); expect(hl).toContain('Hienoa kuljetusta!'); expect(hl).toContain('Valmentajalta'); expect(hl).not.toMatch(/<button/);
    const e = V.tmVkPaatos(P({ jaksofokus: null, jaksofokus_historia: [SULJETTU()] }), { tanaan: KE }); expect(e).toEqual({ tila: 'ei_lausetta', nimi: 'Kuljettaminen', lause: null });
    const he = V.tmVkPaatosHTML(e, {}); expect(he).toContain('Hyvä jakso, Kuljettaminen tehty'); expect(he).not.toContain('Valmentajalta'); expect(he).not.toMatch(/<button/);
  });
  it('käyttää VIIMEISTÄ historiariviä; uusi jakso alkanut → kortti pois; umpeutunut sulkematta → "ei lausetta" (ei vanhan jakson lausetta); ei historiaa/jaksoa → ei korttia', () => {
    const hist = [SULJETTU({ lause: 'Vanha lause', konsepti_nimi: 'Vanha' }), SULJETTU({ lause: 'Uusin lause' })];
    expect(V.tmVkPaatos(P({ jaksofokus: null, jaksofokus_historia: hist }), { tanaan: KE }).lause).toBe('Uusin lause');
    expect(V.tmVkPaatos(P({ jaksofokus: JAKSO(), jaksofokus_historia: hist }), { tanaan: KE })).toBeNull();   // uusi jakso käynnissä
    const umpi = JAKSO({ alkoi: new Date(2026, 9, 1).toISOString(), kesto_vk: 4 }); expect(V.tmVkPaatos(P({ jaksofokus: umpi, jaksofokus_historia: hist }), { tanaan: KE })).toEqual({ tila: 'ei_lausetta', nimi: 'Kuljettaminen', lause: null });
    expect(V.tmVkPaatos(P({ jaksofokus: null }), { tanaan: KE })).toBeNull(); expect(V.tmVkPaatos(P({ jaksofokus: null, jaksofokus_historia: [] }), { tanaan: KE })).toBeNull();
    expect(V.tmVkPaatos(P({ jaksofokus: { konsepti_nimi: 'Valittavana', tila: 'valittavana' }, jaksofokus_historia: hist }), { tanaan: KE }).lause).toBe('Uusin lause');   // K3-valinta kesken → kortti jää
  });
  it('puolustava luku: historiarivin lause jossa kielletty sana / yli 140 merkkiä ei koskaan pelaajalle', () => {
    for (const lause of ['Tämä on heikkous', 'x'.repeat(141)]) expect(V.tmVkPaatos(P({ jaksofokus: null, jaksofokus_historia: [SULJETTU({ lause })] }), { tanaan: KE }).tila).toBe('ei_lausetta');
  });
  it('HTML escapaa lauseen ja nimen', () => {
    const h = V.tmVkPaatosHTML({ tila: 'lause', nimi: '<b>N</b>', lause: '<img src=x onerror=1>' }, {}); expect(h).not.toContain('<img'); expect(h).not.toContain('<b>N'); expect(h).toContain('&lt;img');
  });
});

describe('Henkilökunta — tiivistelmä ja osio', () => {
  const DOCS = [
    { id: '2026-11-22', vk: 2, vastaukset: [{ osa: 'A', teksti: 'Laukaus', arvo: 'usein' }, { osa: 'B', teksti: 'Jalka', arvo: 'ei_viela' }], lause: 'Hyvä viikko' },
    { id: '2026-11-15', vk: 1, vastaukset: [{ osa: 'A', teksti: 'Laukaus', arvo: 'usein' }, { osa: 'B', teksti: 'Jalka', arvo: 'joskus' }] },
    { id: '2026-11-29', vk: 3, vastaukset: [{ osa: 'A', teksti: 'Laukaus', arvo: 'joskus' }] },
    { id: '2026-12-06', vk: 4, vastaukset: [{ osa: 'A', teksti: 'Laukaus', arvo: 'usein' }] }];
  it('tiivistelmä: "A: usein 3/4 viikkoa"; vain vastatut viikot lasketaan nimittäjään', () => {
    const t = V.tmVkTiivistelma(DOCS); expect(t.map((x) => x.rivi)).toEqual(['A: usein 3/4 viikkoa', 'B: usein 0/2 viikkoa']);
    expect(t[0]).toMatchObject({ usein: 3, joskus: 1, ei_viela: 0, n: 4 }); expect(V.tmVkTiivistelma([])).toEqual([]); expect(V.tmVkTiivistelma(null)).toEqual([]);
  });
  it('osio: otsikko "Pelaajan viikkokatsaukset", viikot aikajärjestyksessä, osa → vastaus, lause; luvut sallittu henkilökunnalle; tyhjä → ohje; escape', () => {
    const h = V.tmVkHenkilokuntaHTML(DOCS, {}); expect(h).toContain('Pelaajan viikkokatsaukset'); expect(h).toContain('A: usein 3/4'); expect(h).toContain('Hyvä viikko'); expect(h).toContain('Viikko 1');
    expect(h.indexOf('Viikko 1')).toBeLessThan(h.indexOf('Viikko 2')); expect(h.indexOf('Viikko 3')).toBeLessThan(h.indexOf('Viikko 4'));
    expect(V.tmVkHenkilokuntaHTML([], {})).toContain('Ei vielä viikkokatsauksia');
    expect(V.tmVkHenkilokuntaHTML([{ id: '2026-11-15', vk: 1, vastaukset: [{ osa: 'A', teksti: '<script>', arvo: 'usein' }], lause: '<b>x</b>' }], {})).not.toMatch(/<script>|<b>x/);
  });
});

describe('§7.22-portti — pelaajan HTML', () => {
  const o = {};
  const korttiH = V.tmVkKorttiHTML(V.tmVkKysymykset(JAKSO(), { kaanon }), { valinnat: { A: 'usein' }, lause: 'Hyvä' }, o);
  const kiitosH = V.tmVkKiitosHTML(o);
  const paatosH = [V.tmVkPaatosHTML({ tila: 'lause', nimi: 'Kuljettaminen', lause: 'Hienoa menoa' }, o), V.tmVkPaatosHTML({ tila: 'ei_lausetta', nimi: 'Kuljettaminen', lause: null }, o)];
  it('ei lukuja, X/5-muotoja, asteikkoa, prosentteja, vertailua, XP:tä eikä hex-värejä (kortti, kiitos, päätöskortti)', () => {
    for (const h of [korttiH, kiitosH].concat(paatosH)) {
      const t = h.replace(/maxlength="\d+"/g, '').replace(/rows="\d+"/g, '').replace(/style="[^"]*"/g, '').replace(/<[^>]+>/g, ' ');
      expect(t).not.toMatch(/\d/); expect(h).not.toMatch(/\d\s*\/\s*5\b/); expect(t).not.toMatch(/%|\bXP\b|vertai|muihin|keskiarvo|tasolle|\btaso\b|pistettä|asteikko/i);
      expect(h).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    }
  });
  it('kortti: otsikko, ohje valmentajan katselmuksesta, kolme nappia (Onnistui usein · Joskus · Ei vielä), valinnainen vapaa lause maxlength 140, "Valmis"; ei Archivo-fonttia kovakoodattuna', () => {
    expect(korttiH).toContain('Miten osat näkyivät pelissä?'); expect(korttiH).toContain('Vastauksesi näkyy valmentajan katselmuksessa.');
    for (const t of ['Onnistui usein', 'Joskus', 'Ei vielä']) expect((korttiH.match(new RegExp('>' + t + '<', 'g')) || []).length).toBe(3);
    expect(korttiH).toContain('maxlength="140"'); expect(korttiH).toContain('Valmis'); expect(korttiH).toContain('aria-pressed="true"'); expect(korttiH).not.toMatch(/Archivo/);
    expect(korttiH).toMatch(/id="p7VkValmis"[^>]*>/);
  });
  it('Valmis-nappi disabled kunnes jokin osa on valittu', () => {
    const tyhja = V.tmVkKorttiHTML(V.tmVkKysymykset(JAKSO(), { kaanon }), { valinnat: {} }, o); expect(tyhja).toMatch(/id="p7VkValmis"[^>]*disabled/); expect(korttiH).not.toMatch(/id="p7VkValmis"[^>]*disabled/);
  });
});

/* ── Pelaaja_v7-adapteri: SIVUN oikea koodi vm:ssä ── */
function pura(tunniste) { const i = SRC.indexOf(tunniste); expect(i, tunniste).toBeGreaterThan(-1); let d = 0; for (let k = SRC.indexOf('{', i); k < SRC.length; k++) { if (SRC[k] === '{') d++; else if (SRC[k] === '}' && !--d) return SRC.slice(i, k + 1); } throw new Error('ei sulkeva: ' + tunniste); }
function ymp({ p = P(), tanaan = SU, demo = false, stage = '2_rakentaja', olemassa = false, lukuVirhe = false, kirjoitusVirhe = null, kirjoitusJalkeenOlemassa = false } = {}) {
  const log = { luvut: [], kirjoitukset: [], virheet: [], draw: 0, korvattu: [] };
  let _on = olemassa;
  const node = (path) => ({ collection: (c) => node(path + '/' + c), doc: (d) => node(path + '/' + d),
    get: async () => { log.luvut.push(path); if (lukuVirhe) throw new Error('unavailable'); return { exists: _on, data: () => ({}) }; },
    set: async (data, opts) => { log.kirjoitukset.push({ path, data, opts }); if (kirjoitusVirhe) { if (kirjoitusJalkeenOlemassa) _on = true; throw Object.assign(new Error('x'), { code: kirjoitusVirhe }); } _on = true; } });
  const sb = { console: { warn() {} }, Date, Object, Array, String, Number, JSON, Math, Promise, _isDemoUser: demo, _pelaaja: p, _tab: 'tanaan', _stage: stage, _seuraId: 'kpv', _paivaIso: () => tanaan,
    _thEsc: (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'), T: (k) => 'pelaaja.' + k, draw: () => { log.draw++; },
    _db: { collection: (c) => node(c) }, firebase: { firestore: { FieldValue: { serverTimestamp: () => '__SERVER_TS__' } } }, _auth: null,
    _p7Verkossa: () => true, _p7Aikaraja: (x) => x, _p7EiYhteyttaVirhe: () => new Error('ei yhteyttä'), _p7KirjausVirheTeksti: (e) => 'VIRHE:' + (e && e.code), _naytaKirjausVirhe: (t) => log.virheet.push(t),
    tmKonseptiKaanon: () => null, TM_VIIKKOKATSAUS: V, TM_TANAAN_KENTTA: TK, TM_KIELLETYT: require('../lib/tm_kielletyt.js'), TM_TAMAN_TUEKSI: require('../lib/tm_taman_tueksi.js') };
  sb.window = sb; sb.document = { getElementById: (id) => (id === 'p7VkKortti' ? { replaceWith: (n) => log.korvattu.push(n.html) } : null), createElement: () => ({ set innerHTML(v) { this.firstChild = { html: v }; } }) };
  vm.createContext(sb);
  const alustus = /^window\._p7Vk = \{[^\n]*\};/m.exec(SRC); expect(alustus, 'window._p7Vk alustus').toBeTruthy();
  vm.runInContext([alustus[0], 'function _p7K1T(k) { const v = T(k); return (v === \'pelaaja.\' + k) ? k : v; }'].concat(['async function _p7VkLataa(', 'function _p7VkHTML(', 'function _p7VkPiirra(', 'function _p7VkValitse(', 'function _p7VkLause(', 'async function _p7VkTallenna('].map(pura)).join(';\n')
    + ';\nthis._p7VkLataa=_p7VkLataa;this._p7VkHTML=_p7VkHTML;this._p7VkPiirra=_p7VkPiirra;this._p7VkValitse=_p7VkValitse;this._p7VkLause=_p7VkLause;this._p7VkTallenna=_p7VkTallenna;', sb);
  return { sb, log };
}
const lopeta = () => new Promise((r) => setTimeout(r, 0));
const x = (e) => TK.tmTanaanTila(e.sb._pelaaja, { tanaan: e.sb._paivaIso() });
const nayta = (e) => e.sb._p7VkHTML(x(e), e.sb._pelaaja.jaksofokus, e.sb._paivaIso(), { esc: e.sb._thEsc, t: (k) => k });

describe('Pelaaja_v7 — sunnuntain viikkokatsaus', () => {
  it('SUNNUNTAI: ensimmäinen piirto käynnistää luvun (YKSI doc-luku omaan polkuun), kortti tulee kun dokumenttia ei ole; kerran per päivä', async () => {
    const e = ymp(); expect(nayta(e)).toBe(''); await lopeta(); await lopeta();
    expect(e.log.luvut).toEqual(['seurat/kpv/pelaajat/topias/viikkokatsaukset/' + SU]); expect(e.log.draw).toBe(1);
    const h = nayta(e); expect(h).toContain('id="p7VkKortti"'); expect(h).toContain('Miten osat näkyivät pelissä?'); expect(h).toContain('Laukaus vauhdista'); nayta(e); expect(e.log.luvut).toHaveLength(1);
  });
  it('jo vastattu (dokumentti on): kortti ei näy eikä kiitosta ("seuraavalla avauksella kortti ei enää näy"); luku virhe → ei korttia (ei kaksoisvastausta)', async () => {
    const jo = ymp({ olemassa: true }); nayta(jo); await lopeta(); await lopeta(); expect(nayta(jo)).toBe(''); expect(jo.log.draw).toBe(0);
    const v = ymp({ lukuVirhe: true }); nayta(v); await lopeta(); await lopeta(); expect(nayta(v)).toBe('');
  });
  it('EI sunnuntaina (ke/ma): ei korttia eikä lukua; Leikkijä: ei korttia eikä lukua; demo: ei lukua eikä korttia', async () => {
    for (const e of [ymp({ tanaan: KE }), ymp({ tanaan: MA }), ymp({ stage: '1_leikkija' }), ymp({ demo: true })]) { expect(nayta(e)).toBe(''); await lopeta(); expect(e.log.luvut).toEqual([]); }
  });
  it('valinta: nappi vaihtaa/poistaa valinnan ja piirtää vain kortin uudelleen; lause säilyy uudelleenpiirrossa', async () => {
    const e = ymp(); nayta(e); await lopeta(); await lopeta(); nayta(e);
    e.sb._p7VkValitse('A', 'usein'); expect(e.sb._p7Vk.valinnat).toEqual({ A: 'usein' }); expect(e.log.korvattu).toHaveLength(1); expect(e.log.korvattu[0]).toContain('aria-pressed="true"');
    e.sb._p7VkLause('Hyvä viikko'); e.sb._p7VkValitse('B', 'joskus'); expect(e.log.korvattu[1]).toContain('Hyvä viikko'); e.sb._p7VkValitse('A', 'usein'); expect(e.sb._p7Vk.valinnat).toEqual({ B: 'joskus' });
  });
  it('TALLENNUS: set (EI merge) vain omaan viikkokatsaukset/{sunnuntai}-dokumenttiin; { vk, jakso_alkoi, vastaukset, lause, luotu:serverTimestamp }; ei kirjaukset-polkua; sen jälkeen kiitosrivi', async () => {
    const e = ymp(); nayta(e); await lopeta(); await lopeta(); nayta(e);
    e.sb._p7VkValitse('A', 'usein'); e.sb._p7VkValitse('B', 'ei_viela'); e.sb._p7VkLause('Hyvä viikko'); await e.sb._p7VkTallenna();
    expect(e.log.kirjoitukset).toHaveLength(1); const w = e.log.kirjoitukset[0];
    expect(w.path).toBe('seurat/kpv/pelaajat/topias/viikkokatsaukset/' + SU); expect(w.opts).toBeUndefined();
    expect(w.data).toEqual({ vk: 1, jakso_alkoi: '2026-11-09', vastaukset: [{ osa: 'A', teksti: 'Laukaus vauhdista', arvo: 'usein' }, { osa: 'B', teksti: 'Heikompi jalka', arvo: 'ei_viela' }], lause: 'Hyvä viikko', luotu: '__SERVER_TS__' });
    expect(e.log.kirjoitukset.some((k) => /kirjaukset/.test(k.path))).toBe(false);
    expect(e.sb._p7Vk.tila).toBe('kiitos'); expect(e.log.korvattu.pop()).toContain('Kiitos, vastauksesi on tallessa.'); expect(e.log.virheet).toEqual([]);
    expect(nayta(e)).toContain('Kiitos'); await e.sb._p7VkTallenna(); expect(e.log.kirjoitukset).toHaveLength(1);   // kaksoispainallus ei kirjoita uudelleen
  });
  it('TALLENNUS ilman valintoja: ei kirjoitusta; kielletty lause: ei kirjoitusta + toimintaohje-toast, kortti jää auki', async () => {
    const e = ymp(); nayta(e); await lopeta(); await lopeta(); nayta(e);
    await e.sb._p7VkTallenna(); expect(e.log.kirjoitukset).toEqual([]);
    e.sb._p7VkValitse('A', 'usein'); e.sb._p7VkLause('Tämä on heikkous'); await e.sb._p7VkTallenna(); expect(e.log.kirjoitukset).toEqual([]); expect(e.log.virheet).toHaveLength(1); expect(e.sb._p7Vk.tila).toBe('auki');
  });
  it('KIRJOITUSVIRHE ei nielty: toast (permission-denied → kirjaudu uudelleen) + kortti auki + nappi taas käytössä; jos dokumentti ehti syntyä (toinen laite) → ei virhettä, kortti pois', async () => {
    const e = ymp({ kirjoitusVirhe: 'permission-denied' }); nayta(e); await lopeta(); await lopeta(); nayta(e); e.sb._p7VkValitse('A', 'usein'); await e.sb._p7VkTallenna();
    expect(e.log.virheet).toEqual(['VIRHE:permission-denied']); expect(e.sb._p7Vk.tila).toBe('auki'); expect(e.sb._p7Vk.tallentaa).toBe(false);
    const t = ymp({ kirjoitusVirhe: 'permission-denied', kirjoitusJalkeenOlemassa: true }); nayta(t); await lopeta(); await lopeta(); nayta(t); t.sb._p7VkValitse('A', 'usein'); await t.sb._p7VkTallenna(); expect(t.log.virheet).toEqual([]); expect(t.sb._p7Vk.tila).toBe('vastattu'); expect(nayta(t)).toBe('');
  });
  it('JAKSO PÄÄTTYNYT: päätöskortti (lause / ei lausetta) ilman nappia; ei lukuja; Leikkijälle ei (K5)', () => {
    const hist = [{ konsepti_nimi: 'Kuljettaminen', sulkutapa: 'suljettu', lause: 'Hienoa menoa' }];
    const e = ymp({ p: P({ jaksofokus: null, jaksofokus_historia: hist }), tanaan: KE }); const h = nayta(e); expect(h).toContain('Hyvä jakso'); expect(h).toContain('Hienoa menoa'); expect(h).not.toMatch(/<button/); expect(e.log.luvut).toEqual([]);
    expect(nayta(ymp({ p: P({ jaksofokus: null, jaksofokus_historia: [{ konsepti_nimi: 'Kuljettaminen' }] }), tanaan: KE }))).toContain('Hyvä jakso, Kuljettaminen tehty');
    expect(nayta(ymp({ p: P({ jaksofokus: null, jaksofokus_historia: hist }), tanaan: KE, stage: '1_leikkija' }))).toBe('');
  });
  it('lähdetaso: kortti rA1Kentta-näkymän kärjessä (ennen Kenttä-osiota), skripti ladataan ?v=1, SW-allowlist + cache; K4-lohkossa ei kirjaukset-polkua eikä _tmKirjaa-kutsua; rA1() ei sisällä K4:ää', () => {
    const i = SRC.indexOf('${_p7VkHTML(x, jf, tanaan, o)}'), j = SRC.indexOf('${K.tmTanaanKenttaHTML('); expect(i).toBeGreaterThan(-1); expect(i).toBeLessThan(j);
    expect(SRC).toContain('<script src="lib/tm_viikkokatsaus.js?v=1"></script>');
    const sw = lue('sw_pelaaja.js'); expect(sw).toContain('viikkokatsaus)\\.js'); expect(sw).toMatch(/const CACHE = 'tm-pelaaja-v(7[7-9]|[89]\d)'/);
    const blokki = SRC.slice(SRC.indexOf('═══ K4 — sunnuntain viikkokatsaus'), SRC.indexOf('function rA1Kentta() {')); expect(blokki.length).toBeGreaterThan(500);
    expect(blokki).not.toMatch(/collection\('kirjaukset'\)|_tmKirjaa\(|_tallennaKirjaus\(|merge: *true/); expect(blokki).toContain("collection('viikkokatsaukset')");
    expect(pura('function rA1()')).not.toMatch(/K4|viikkokatsaus|_p7Vk/);
  });
  it('kirjausten lukijat koskemattomat: Vanhempi_v2 ei tunne viikkokatsausta eikä mikään kirjaukset-kirjoitus kanna sitä', () => {
    expect(lue('TalentMaster_Vanhempi_v2.html')).not.toMatch(/viikkokatsaus/i);
    for (const f of ['TalentMaster_Pelaaja_v7.html', 'TalentMaster_Master_v16.html', 'TalentMaster_VP_v25.html']) expect(lue(f), f).not.toMatch(/kirjaukset['"]\)\.doc\([^)]*\)\.(set|update)\([^)]*viikkokatsaus/);
  });
});

describe('Jakson päätös — lause historiariville (Master + VP)', () => {
  it('tmSuljeJakso opts.lisakentat {lause} → sama sulkurivi (YKSI update jaksofokus + arrayUnion(rivi)); ilman lausetta ei kenttää', () => {
    const jf = { konsepti_avain: 'y_h2', konsepti_nimi: 'Kuljettaminen', alkoi: ALKOI, kesto_vk: 4 };
    const a = KS.tmSuljeJakso({ jaksofokus: jf }, { tulos: 'parani', uusi: null }, { nytISO: '2026-12-07T10:00:00.000Z', lisakentat: { lause: 'Hienoa menoa' } }); expect(a.historiaLisays[0].lause).toBe('Hienoa menoa'); expect(a.historiaLisays[0].sulkutapa).toBe('suljettu');
    const b = KS.tmSuljeJakso({ jaksofokus: jf }, { tulos: 'parani', uusi: null }, { nytISO: '2026-12-07T10:00:00.000Z', lisakentat: undefined }); expect(b.historiaLisays[0]).not.toHaveProperty('lause');
    // päätöskortti lukee juuri tämän rivin
    expect(V.tmVkPaatos({ jaksofokus: a.jaksofokus, jaksofokus_historia: a.historiaLisays }, { tanaan: '2026-12-08' })).toMatchObject({ tila: 'lause', lause: 'Hienoa menoa', nimi: 'Kuljettaminen' });
  });
  for (const [f, tallenna, setLause, modalId] of [['TalentMaster_Master_v16.html', 'window._msTallenna = async function', '_msSetLause', '_msLause'], ['TalentMaster_VP_v25.html', 'window._vpSulkuTallenna = async function', '_vpSulkuSetLause', '_vpSulkuLause']]) {
    it(f + ': sulkulomakkeessa lause (≤140, vartija ENNEN sulkua, vain lipulla), lisakentat samaan tmSuljeJakso-kutsuun, ei erillistä kirjoitusta; skriptit ladataan', () => {
      const src = lue(f), i = src.indexOf(tallenna), fn = src.slice(i, i + 6000);
      expect(fn).toMatch(/S\.k4 \? window\.TM_VIIKKOKATSAUS\.tmVkLauseValmentaja\(S\.lause\)/); expect(fn.indexOf('tmVkLauseValmentaja')).toBeLessThan(fn.indexOf('tmSuljeJakso'));
      expect(fn).toMatch(/lisakentat: _lause\.teksti \? \{ lause: _lause\.teksti \} : undefined/); expect(fn).toMatch(/if \(!_lause\.ok\) \{ if \(typeof toast === 'function'\) toast\([^\n]*return; \}/);
      expect(src).toContain('maxlength="\' + K4.MAX_LAUSE + \'"'); expect(src).toContain(setLause); expect(src).toContain(modalId); expect(src).toContain('liput.kentta !== true) return;');
      for (const s of ['tm_kielletyt.js?v=1', 'tm_taman_tueksi.js?v=2', 'tm_viikkokatsaus.js?v=1']) expect(src, s).toContain('<script src="lib/' + s + '"></script>');
      expect(src).not.toMatch(/viikkokatsaukset'\)\.(doc\([^)]*\)\.)?(set|add|update)\(/);   // henkilökunta ei kirjoita viikkokatsauksia (Rules v3.44)
    });
    it(f + ': henkilökunnan osio hakee jakson katsaukset YHDELLÄ kyselyllä where jakso_alkoi == jakson alku, vain lipulla', () => {
      const src = lue(f); expect((src.match(/where\('jakso_alkoi', '==', alkoi\)/g) || []).length).toBe(1); expect(src).toContain("collection('viikkokatsaukset')"); expect(src).toContain('tmVkHenkilokuntaHTML');
    });
  }
});
