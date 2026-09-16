/**
 * TalentMaster™ — Seurakerros TIER 1 · S2 MUOKKAUSPINTA.
 *
 * S1 rakensi LUKUPUOLEN (resolvointi + sv-ohitus). Tämä sviitti lukitsee KIRJOITUSPUOLEN:
 *
 *   A) päätöslogiikka (tmKonseptiPatch/Validoi/Avain) — puhdas, DOMiton
 *   B) PALUU KAANONIIN = KENTÄN POISTO, EI KOPIO (S2:n kriittisin invariantti)
 *   C) kirjoitusportti = SAMA roolilista kuin firestore.rules onKonseptiMuokkaaja()
 *   D) kytkentä: UI kutsuu libiä, muokkaa SUOMEA (ei sv-kerrosta), eikä kirjoita libiin
 *
 * (B) ansaitsee oman kohtansa: jos "palauta kaanoniin" kirjoittaisi kaanonin arvon overrideen,
 * kaikki näyttäisi oikealta HETI — mutta seura jäisi ikuisesti vanhaan tekstiin kun kaanon
 * päivittyy, ja "muokattu"-merkki valehtelisi. Bugi olisi näkymätön kunnes kaanon muuttuu.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const __dir = dirname(fileURLToPath(import.meta.url));
const require_ = createRequire(import.meta.url);
const ROOT = join(__dir, '..');
const VP = readFileSync(join(ROOT, 'TalentMaster_VP_v25.html'), 'utf8');
const RULES = readFileSync(join(ROOT, 'tm_admin', 'firestore.rules'), 'utf8');
const LIB_SRC = readFileSync(join(ROOT, 'lib', 'tm_konsepti_resolve.js'), 'utf8');

global.window = global.window || {};
const TT = require_(join(ROOT, 'lib', 'tm_teknistaktiset.js'));
// Kaanon luetaan globaaleista (resolvoija on selain-lib) → nostetaan ne kuten S1-sviitissä.
globalThis.TM_TT_YOUTH = TT.TM_TT_YOUTH;
globalThis.TM_TT_JOUKKUE = TT.TM_TT_JOUKKUE;
globalThis.TM_TT_FUNDAMENTIT = TT.TM_TT_FUNDAMENTIT;
const K = require_(join(ROOT, 'lib', 'tm_konsepti_resolve.js'));
const SID = 'testiseura';
// Kaanon-konsepti johon mutaatiot kohdistuvat (luetaan libistä, ei kovakoodata kenttäarvoja).
const KAANON = K.tmKonseptiKaanon('y_h0');

beforeEach(() => K.tmKonseptiTyhjennaKerros());

describe('A — kirjoitusportti vastaa Rulesia', () => {
  it('TM_K_MUOKKAAJAROOLIT === onKonseptiMuokkaaja()-roolilista', () => {
    const m = RULES.match(/function onKonseptiMuokkaaja[\s\S]*?rooli in \[([^\]]*)\]/);
    expect(m).toBeTruthy();
    const rulesRoolit = m[1].split(',').map((x) => x.trim().replace(/^'|'$/g, '')).filter(Boolean);
    expect([...K.TM_K_MUOKKAAJAROOLIT].sort()).toEqual([...rulesRoolit].sort());
  });
  it('vp ja urheilutoimenjohtaja saavat muokata; valmentaja, seurasihteeri ja tuntematon eivät', () => {
    expect(K.tmKonseptiVoiMuokata('vp', false)).toBe(true);
    expect(K.tmKonseptiVoiMuokata('urheilutoimenjohtaja', false)).toBe(true);
    expect(K.tmKonseptiVoiMuokata('valmentaja', false)).toBe(false);
    expect(K.tmKonseptiVoiMuokata('talenttivalmentaja', false)).toBe(false);
    expect(K.tmKonseptiVoiMuokata('seurasihteeri', false)).toBe(false);   // hallinnollinen, ei pedagoginen
    expect(K.tmKonseptiVoiMuokata(null, false)).toBe(false);
  });
  it('super-admin ohittaa roolin (kuten Rulesissa onSuperAdmin() ||)', () => {
    expect(K.tmKonseptiVoiMuokata('valmentaja', true)).toBe(true);
    expect(K.tmKonseptiVoiMuokata(null, true)).toBe(true);
  });
});

describe('B — paluu kaanoniin poistaa kentän, EI kopioi arvoa', () => {
  it('kaanonin kanssa identtinen syöte → poista, ei aseta', () => {
    K.tmKonseptiAsetaKerros(SID, { y_h0: { nimi: 'SEURAN NIMI' } });
    const p = K.tmKonseptiPatch('y_h0', { nimi: KAANON.nimi }, SID);
    expect(p.poista).toContain('nimi');
    expect(p.aseta).not.toHaveProperty('nimi');
    expect(p.muuttuneet).toEqual([]);
  });
  it('tyhjennetty kenttä tulkitaan paluuksi kaanoniin (ei tyhjän tallennukseksi)', () => {
    K.tmKonseptiAsetaKerros(SID, { y_h0: { pelitilanne: 'seuran teksti' } });
    const p = K.tmKonseptiPatch('y_h0', { pelitilanne: '   ' }, SID);
    expect(p.poista).toContain('pelitilanne');
    expect(p.aseta).not.toHaveProperty('pelitilanne');
  });
  it('viimeisen kentän palautus → koko_kaanoniin (dokumentti poistetaan)', () => {
    K.tmKonseptiAsetaKerros(SID, { y_h0: { nimi: 'X', paivitetty: '2026-09-16' } });
    const p = K.tmKonseptiPatch('y_h0', { nimi: '' }, SID);
    expect(p.koko_kaanoniin).toBe(true);   // kirjanpitokentät eivät pidä dokumenttia hengissä
  });
  it('piilotettu konsepti EI katoa vaikka sisältömuokkaukset palautetaan', () => {
    K.tmKonseptiAsetaKerros(SID, { y_h0: { nimi: 'X', piilotettu: true } });
    const p = K.tmKonseptiPatch('y_h0', { nimi: '' }, SID);
    expect(p.koko_kaanoniin).toBe(false);  // dokin poisto palauttaisi konseptin näkyviin
  });
  it('muu muokattu kenttä pitää dokumentin hengissä', () => {
    K.tmKonseptiAsetaKerros(SID, { y_h0: { nimi: 'X', pelitilanne: 'Y' } });
    const p = K.tmKonseptiPatch('y_h0', { nimi: '' }, SID);
    expect(p.poista).toContain('nimi');
    expect(p.koko_kaanoniin).toBe(false);
  });
  it('seuran omalla konseptilla ei ole kaanonia → ei koskaan koko_kaanoniin', () => {
    K.tmKonseptiAsetaKerros(SID, { seura_oma: { nimi: 'Oma', oma: true } });
    const p = K.tmKonseptiPatch('seura_oma', { nimi: '' }, SID);
    expect(p.koko_kaanoniin).toBe(false);
  });
  it('KIERTO: muokkaa → resolvoi seuran teksti → palauta → resolvoi kaanon (elävänä)', () => {
    const p1 = K.tmKonseptiPatch('y_h0', { nimi: 'PÄÄN NOSTO' }, SID);
    expect(p1.aseta.nimi).toBe('PÄÄN NOSTO');
    K.tmKonseptiAsetaKerros(SID, { y_h0: p1.aseta });
    expect(K.tmKonseptiResolvoi('y_h0', SID).nimi).toBe('PÄÄN NOSTO');
    expect(K.tmKonseptiOnMuokattu(K.tmKonseptiResolvoi('y_h0', SID))).toBe(true);

    const p2 = K.tmKonseptiPatch('y_h0', { nimi: '' }, SID);
    expect(p2.koko_kaanoniin).toBe(true);
    K.tmKonseptiAsetaKerros(SID, {});   // sovellus poisti dokumentin
    expect(K.tmKonseptiResolvoi('y_h0', SID).nimi).toBe(KAANON.nimi);
    expect(K.tmKonseptiOnMuokattu(K.tmKonseptiResolvoi('y_h0', SID))).toBe(false);
  });
});

describe('C — patch-semantiikka', () => {
  it('vain muuttuneet kentät kirjoitetaan (ennallaan jätetyt eivät päädy dokumenttiin)', () => {
    const p = K.tmKonseptiPatch('y_h0', {
      nimi: 'UUSI', pelitilanne: KAANON.pelitilanne, kysymykset: KAANON.kysymykset
    }, SID);
    expect(Object.keys(p.aseta)).toEqual(['nimi']);
  });
  it('rakennekentät eivät ole muokattavissa (koodi/dim/ika/pelimuoto ohitetaan)', () => {
    const p = K.tmKonseptiPatch('y_h0', { koodi: 'X-1', dim: 'puolustus', ika: [1, 2], nimi: 'UUSI' }, SID);
    expect(Object.keys(p.aseta)).toEqual(['nimi']);
    expect(K.TM_K_MUOKATTAVAT).not.toContain('koodi');
  });
  it('kpi vertautuu alkioittain koodilla ja tekstillä', () => {
    expect(K.tmKonseptiSamaArvo(KAANON.kpi, KAANON.kpi.map((c) => ({ koodi: c.koodi, teksti: c.teksti })))).toBe(true);
    const muutettu = KAANON.kpi.map((c, i) => (i === 0 ? { koodi: c.koodi, teksti: c.teksti + '!' } : c));
    expect(K.tmKonseptiSamaArvo(KAANON.kpi, muutettu)).toBe(false);
    const p = K.tmKonseptiPatch('y_h0', { kpi: muutettu }, SID);
    expect(p.muuttuneet).toEqual(['kpi']);
  });
  it('kpi-koodit generoidaan järjestyksestä, ei käyttäjän syötteestä (i18n-avainpolku)', () => {
    const r = K.tmKonseptiKpiRivit(['eka', '', '  ', 'toka', 'kolmas']);
    expect(r.map((x) => x.koodi)).toEqual(['a', 'b', 'c']);
    expect(r.map((x) => x.teksti)).toEqual(['eka', 'toka', 'kolmas']);
  });
});

describe('D — oman konseptin avain ja validointi', () => {
  it('avain saa seura_-prefiksin, ääkköset translitteroidaan, prefiksiä ei tuplata', () => {
    expect(K.tmKonseptiOmaAvain('Pään nosto ja käännös')).toBe('seura_paan_nosto_ja_kaannos');
    expect(K.tmKonseptiOmaAvain('seura_valmis')).toBe('seura_valmis');
    expect(K.tmKonseptiOmaAvain('   ')).toBe(null);
    expect(K.tmKonseptiOmaAvain('...')).toBe(null);
  });
  it('nimetön hylätään; kaanon-avain ja jo olemassa oleva seura-avain on varattu', () => {
    expect(K.tmKonseptiOmaValidoi({ nimi: '' }, SID).virheet).toContain('nimi_puuttuu');
    expect(K.tmKonseptiOmaValidoi({ nimi: 'Havainnointi', avain: 'y_h0' }, SID).virheet).toContain('avain_varattu_kaanon');
    K.tmKonseptiAsetaKerros(SID, { seura_oma: { nimi: 'Oma' } });
    expect(K.tmKonseptiOmaValidoi({ nimi: 'Oma' }, SID).virheet).toContain('avain_varattu_seura');
  });
  it('kelvollinen oma konsepti läpäisee ja päätyy listaukseen kaanonin rinnalle', () => {
    const v = K.tmKonseptiOmaValidoi({ nimi: 'Kääntyminen paineessa' }, SID);
    expect(v.ok).toBe(true);
    K.tmKonseptiAsetaKerros(SID, { [v.avain]: { nimi: 'Kääntyminen paineessa', oma: true } });
    const lista = K.tmKonseptiListaa(K.tmKonseptiKaanon('y_h0') ? [K.tmKonseptiKaanon('y_h0')] : [], SID);
    expect(lista.map((x) => x.avain)).toContain(v.avain);
    expect(lista.map((x) => x.avain)).toContain('y_h0');   // kaanon ei katoa
  });
});

describe('E — kytkentä VP_v25:een', () => {
  it('asetuskortti avaa kirjaston ja funktio on globaali (onclick-scope, §7.17)', () => {
    expect(VP).toMatch(/onclick="avaaKonseptikirjasto\(\)"/);
    expect(VP).toContain('window.avaaKonseptikirjasto = avaaKonseptikirjasto;');
  });
  it('resolvoija ladataan päivitetyllä versiolla (lib muuttui → cache-bust)', () => {
    const m = VP.match(/lib\/tm_konsepti_resolve\.js\?v=(\d+)/);
    expect(m).toBeTruthy();
    expect(Number(m[1])).toBeGreaterThanOrEqual(2);
  });
  it('lomake lukee RAAKAA resolvointia, ei sv-kerrosta (§32: suomi tallennetaan)', () => {
    const i = VP.indexOf('function _kkAvaa('), j = VP.indexOf('function _kkKenttaHTML(');
    expect(i).toBeGreaterThan(0);
    const fn = VP.slice(i, j);
    expect(fn).toContain('tmKonseptiResolvoi(');
    expect(fn).not.toContain('_ttKonsepti(');   // sv-kerros kirjoittaisi ruotsia Firestoreen
  });
  it('JOKAINEN kirjoittava _kk-funktio tarkistaa _kkVoiMuokata()', () => {
    const kirjoittajat = ['_kkTallenna', '_kkPiilota', '_kkPalautaKaikki', '_kkPoistaOma', '_kkUusi'];
    const ilmanPorttia = kirjoittajat.filter((nimi) => {
      const i = VP.indexOf('function ' + nimi + '(');
      if (i < 0) return true;
      const runko = VP.slice(i, i + 400);
      return !/_kkVoiMuokata\(\)/.test(runko);
    });
    expect(ilmanPorttia).toEqual([]);
  });
  it('UI:n kenttälista ja libin TM_K_MUOKATTAVAT ovat samat (ei ajautumista)', () => {
    const i = VP.indexOf('var _KK_KENTAT = ['), j = VP.indexOf('];', i);
    expect(i).toBeGreaterThan(0);
    const kentat = [...VP.slice(i, j).matchAll(/\{\s*f:\s*'([a-z_]+)'/g)].map((m) => m[1]);
    expect([...kentat].sort()).toEqual([...K.TM_K_MUOKATTAVAT].sort());
  });
  it('kenttien näyttölabelit kääntyvät — vpT(d.lbl) on DYNAAMINEN eikä näy resolvi-portille', () => {
    // Render-gate kerää vain vpT('literaali')-kutsut. _KK_KENTAT-labelit menevät vpT:hen
    // muuttujana → ne olisivat jääneet pysyvästi suomeksi sv-tilassa ilman tätä porttia
    // (huomattiin live-renderistä: 'PELITILANNE' jäi kääntymättä muiden kääntyessä).
    const i = VP.indexOf('var _KK_KENTAT = ['), j = VP.indexOf('];', i);
    const labelit = [...VP.slice(i, j).matchAll(/lbl:\s*'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1].replace(/\\'/g, "'"));
    expect(labelit.length).toBe(K.TM_K_MUOKATTAVAT.length);
    const sv = require_(join(ROOT, 'lib', 'tm_vp_i18n.js')).TM_VP_I18N.sv;
    const common = require_(join(ROOT, 'lib', 'tm_i18n_common.js')).TM_I18N_COMMON.sv || {};
    expect(labelit.filter((l) => !(l in sv) && !(l in common))).toEqual([]);
  });
  it('muokkauspinta EI kirjoita libiin — kaanon pysyy read-onlyna (reunaehto B)', () => {
    const i = VP.indexOf('SEURAKERROS TIER 1 · S2'), j = VP.indexOf('window._kkUusi = _kkUusi;');
    const blok = VP.slice(i, j);
    expect(i).toBeGreaterThan(0);
    expect(blok).not.toMatch(/TM_TT_(YOUTH|JOUKKUE|FUNDAMENTIT)\s*(\[[^\]]*\])?\s*=[^=]/);
    expect(blok).not.toMatch(/TM_TT_[A-Z_]+(\[[^\]]*\])?\s*\.(push|splice|sort|pop|shift|unshift)\(/);   // ei mutaatioita kaanonitaulukoihin
    // kirjoitukset menevät VAIN konseptit-kokoelmaan
    expect(blok).toContain("collection('konseptit')");
    expect((blok.match(/\.collection\(/g) || []).length).toBe((blok.match(/collection\('(seurat|konseptit)'\)/g) || []).length);
  });
  it('piilotus on kirjanpitokenttä → ei ohita sv-kerrosta eikä näytä "muokattu"', () => {
    expect(K.TM_K_META_KENTAT).toContain('piilotettu');
    K.tmKonseptiAsetaKerros(SID, { y_h0: { piilotettu: true } });
    const r = K.tmKonseptiResolvoi('y_h0', SID);
    expect(r._seura_kentat).toEqual([]);
    expect(K.tmKonseptiOnMuokattu(r)).toBe(false);
    expect(K.tmKonseptiOnPiilotettu('y_h0', SID)).toBe(true);
  });
});

describe('F — EI VACUOUS: portit havaitsevat aidon rikkomisen', () => {
  it('roolilistaportti punertaisi jos valmentaja lisättäisiin muokkaajiin', () => {
    const rikki = ['vp', 'urheilutoimenjohtaja', 'valmentaja'];
    const m = RULES.match(/function onKonseptiMuokkaaja[\s\S]*?rooli in \[([^\]]*)\]/);
    const rulesRoolit = m[1].split(',').map((x) => x.trim().replace(/^'|'$/g, '')).filter(Boolean);
    expect([...rikki].sort()).not.toEqual([...rulesRoolit].sort());
  });
  it('kenttälistaportti punertaisi jos lib ja UI eroaisivat', () => {
    expect([...K.TM_K_MUOKATTAVAT, 'koodi'].sort()).not.toEqual([...K.TM_K_MUOKATTAVAT].sort());
  });
  it('kopio-kaanoniin -bugi jäisi kiinni: patch ei koskaan aseta kaanonin arvoa', () => {
    K.tmKonseptiAsetaKerros(SID, { y_h0: { nimi: 'X' } });
    const p = K.tmKonseptiPatch('y_h0', { nimi: KAANON.nimi, pelitilanne: KAANON.pelitilanne }, SID);
    Object.keys(p.aseta).forEach((f) => expect(p.aseta[f]).not.toEqual(KAANON[f]));
    expect(Object.keys(p.aseta)).toEqual([]);
  });
  it('lib ei tunne Firestorea (puhtaus säilyy S2:n jälkeenkin)', () => {
    const koodi = LIB_SRC.split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
    expect(koodi).not.toMatch(/firebase|firestore|\.collection\(|document\./i);
  });
});
