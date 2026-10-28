/**
 * sv-aukot P7 (.briefit/CODE_BRIEF_SV_AUKOT_P7.md, 28.10.2026; kaista: Tero). Pelaajan appi (P7) sv-tilassa: kirjastot, jotka renderöivät suomea koska
 * P7 ei antanut kääntäjää ({} / x => x) tai teksti oli kovakoodattu. Tämä PR = kytkentä + FI-avaimet; sv tulee PM:n erästä 90 (Code ei kirjoita ruotsia).
 * Testit EIVÄT sisällä ruotsia: sv-tilaa simuloidaan merkkiarvoilla ("§SV§…") jaettuun libikarttaan.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import vm from 'vm';
const require = createRequire(import.meta.url);
const lue = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const P7 = lue('TalentMaster_Pelaaja_v7.html'), VA = lue('TalentMaster_Vanhempi_v2.html');
const K = require('../lib/tm_kehityskaari.js'), IP = require('../lib/tm_idp_pelaaja.js'), IDP = require('../lib/tm_idp.js');
const TT = require('../lib/tm_taman_tueksi.js'), KH = require('../lib/tm_kotiharjoitteet.js'), TL = require('../lib/tm_kalenteri_tilaus_ui.js'), HN = require('../lib/tm_harjoituskertyma_nakyma.js');
const merkki = (k) => '§SV§' + k;   // "käännös" = avaimen merkki → näkyy tulosteessa jos reititys toimii
const tMerkki = (k) => merkki(k);
const teksti = (h) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

describe('kehityskaari (löydös 1): pelaajapinta avaimista', () => {
  const p = { hh_historia: [{ pvm: '2026-01-01', lin30m: 5.2, pujottelu: 12 }, { pvm: '2026-06-01', lin30m: 5.0, pujottelu: 11 }], adar_viimeisin: { a: 3 }, adar_edellinen: { a: 2 } };
  it('ilman t:tä teksti on ennallaan (fi)', () => {
    expect(teksti(K.tmKaariRenderPelaaja(p, { ika: 14 }))).toBe('Kehityit! 🎉 📈 30 m nopeutui 📈 Pujottelu (H-H-testi) parani Peliäly kehittyy 🧠 📈 Havainnointi kehittyi');
    expect(teksti(K.tmKaariRenderPelaaja({}, {}))).toBe('Kehityskaari täyttyy kun sinulla on ≥2 mittausta 🌱');
  });
  it('t:llä jokainen pelaajan lause tulee avaimesta (ei fi-literaalia jäljellä)', () => {
    const h = teksti(K.tmKaariRenderPelaaja(p, { ika: 14, t: tMerkki }));
    for (const k of ['kka_kehityit', 'kka_v_lin30m', 'kka_parani_hh', 'kka_pelialy', 'kka_dim_kehittyi']) expect(h).toContain(merkki(k));
    expect(h.replace(/§SV§\w+/g, '')).not.toMatch(/Kehityit|nopeutui|parani|kehittyy|kehittyi/);
  });
  it('tyhjä ja rakentumassa-tila avaimista', () => {
    expect(teksti(K.tmKaariRenderPelaaja({}, { t: tMerkki }))).toBe(merkki('kka_tyhja'));
    const ei = { hh_historia: [{ pvm: '2026-01-01', lin30m: 5.0 }, { pvm: '2026-06-01', lin30m: 5.2 }] };
    expect(teksti(K.tmKaariRenderPelaaja(ei, { t: tMerkki }))).toBe(merkki('kka_rakentumassa'));
  });
  it('jokainen VERBI-avain on FI:ssä ja jokainen FI-avain esiintyy libissä', () => {
    const src = lue('lib/tm_kehityskaari.js');
    for (const k of Object.keys(K.FI)) expect(src.split(k).length - 1, k).toBeGreaterThanOrEqual(1);
    expect(Object.keys(K.FI).filter((k) => /^kka_v_/.test(k))).toHaveLength(13);
  });
});

describe('tm_idp_pelaaja (löydös 7): "Näkyy pelissä" -lause avaimella', () => {
  it('ip_pl_* = täsmälleen tm_idp.js:n generoimat lauseet (ei ajautumista)', () => {
    const src = lue('lib/tm_idp.js'), avaimet = [...src.slice(src.indexOf('var IDP_PELILAUSE = {'), src.indexOf('var IDP_PELILAUSE_DIM')).matchAll(/^\s+(\w+): '/gm)].map((m) => m[1]);
    expect(avaimet.length).toBeGreaterThan(25);
    for (const a of avaimet) expect(IP.FI['ip_pl_' + a], a).toBe(IDP.idpPelilause({ avain: a }));
    for (const d of ['D1', 'D2', 'D3', 'D4', 'D5']) expect(IP.FI['ip_pl_dim_' + d]).toBe(IDP.idpPelilause({ avain: '__ei__', dim: d }));
    expect(IP.FI.ip_pl_oletus).toBe(IDP.idpPelilause(null));
  });
  it('tallennettu generoitu lause → käännös; valmentajan oma teksti → sellaisenaan', () => {
    const t = { fokus: { nimi: 'x' }, perustelu: { pelilause: IDP.idpPelilause({ avain: 'finishing' }) } };
    expect(IP.tmPelaajaKonsepti(t, {}).miksi).toBe(IDP.idpPelilause({ avain: 'finishing' }));
    expect(IP.tmPelaajaKonsepti(t, { t: tMerkki }).miksi).toBe(merkki('ip_pl_finishing'));
    expect(IP.tmPelaajaKonsepti({ fokus: { nimi: 'x' }, perustelu: { pelilause: 'Oma lause.' } }, { t: tMerkki }).miksi).toBe('Oma lause.');
  });
});

describe('Tämän tueksi + kotiharjoitteet (löydökset 5–6)', () => {
  const rivit = (perustelu) => [{ kuvaus: 'Lyhyt syöttö', perustelu, harjoitteet: KH.tmKotiharjoitteet({ tukiosa: { harjoitteet: [{ nimi: 'Pomppulaskuri', pelaajan_ohje: 'Ohje', lahde: 'tm' }, { nimi: 'Seuran oma', pelaajan_ohje: 'Seuran ohje', lahde: 'seura' }] } }) }];
  it('generoidun perustelun kehys käännetään, sisältö säilyy; ilman käännöstä ennallaan', () => {
    expect(teksti(TT.tmTamanTueksiHTML(rivit('Tukee vahvuuttasi (Nopeus): lyhyt syöttö.'), { t: (k) => (k === 'k1_tukee_vahvuuttasi' ? '[{vahvuus}|{kuvaus}]' : k) }))).toContain('[Nopeus|lyhyt syöttö]');
    expect(teksti(TT.tmTamanTueksiHTML(rivit('Tukee vahvuuttasi: lyhyt syöttö.'), { t: (k) => (k === 'k1_tukee_vahvuuttasi_ilman' ? '[{kuvaus}]' : k) }))).toContain('[lyhyt syöttö]');
    expect(teksti(TT.tmTamanTueksiHTML(rivit('Tukee vahvuuttasi (Nopeus): lyhyt syöttö.'), { t: (k) => k }))).toContain('Tukee vahvuuttasi (Nopeus): lyhyt syöttö.');
    expect(teksti(TT.tmTamanTueksiHTML(rivit('Valmentajan oma perustelu.'), { t: tMerkki }))).toContain('Valmentajan oma perustelu.');
  });
  it('sisaltoT kääntää VAIN TM:n oletusharjoitteen (lahde tm), ei seuran omaa', () => {
    const h = teksti(TT.tmTamanTueksiHTML(rivit(null), { t: (k) => k, sisaltoT: (x) => merkki(x) }));
    expect(h).toContain(merkki('Pomppulaskuri')); expect(h).toContain(merkki('Ohje'));
    expect(h).toContain('Seuran oma'); expect(h).not.toContain(merkki('Seuran oma')); expect(h).not.toContain(merkki('Seuran ohje'));
  });
  it('koti_oletus: harjoitteiden nimi/ohje löytyy HARJOITE_I18N.sv:stä (yksi tunnettu aukko → erän 90 pohja)', () => {
    const sb = { console: { log() {}, warn() {}, error() {} }, window: {} }; sb.window = sb; vm.createContext(sb); vm.runInContext(lue('harjoitelogiikka_v4.js') + ';this.__H=HARJOITE_I18N;', sb);
    const H = sb.__H.sv, D = require('../lib/tm_koti_oletus.js'), puuttuu = [];
    for (const arr of Object.values(D)) for (const h of arr) for (const k of ['nimi', 'ohje_leikkija', 'ohje_rakentaja', 'ohje_showcase']) if (typeof h[k] === 'string' && typeof H.sisalto[h[k]] !== 'string' && typeof (H.pelaaja || {})[h[k]] !== 'string') puuttuu.push(h[k]);
    expect(puuttuu.length).toBeLessThanOrEqual(1);
  });
});

describe('kalenteri + kertymä (löydökset 2–3): FI-kartta kattaa libin tekstit', () => {
  it('tm_kalenteri_tilaus_ui: jokainen t()/nappi()-literaali + ESTO/VIRHE on FI:ssä', () => {
    const src = lue('lib/tm_kalenteri_tilaus_ui.js'), FI = TL.FI, puuttuu = [];
    for (const m of src.matchAll(/\b(?:t|C\.t|nappi)\('((?:[^'\\]|\\.)+)'/g)) if (!(m[1] in FI) && !/^(Apple \(iPhone\/Mac\)|Outlook|Google)$/.test(m[1])) puuttuu.push(m[1]);
    for (const x of [...Object.values(TL.ESTO_TEKSTI), ...Object.values(TL.VIRHE_TEKSTI)]) if (!(x in FI)) puuttuu.push(x);
    expect(puuttuu).toEqual([]);
  });
  it('kevyt-kortti: kaikki tekstit t:n kautta (t:llä ei fi-literaalia)', () => {
    const k = { kausi: { treeni: { lasna: 3 }, ryhma: { lasna: 1 }, aamu: { lasna: 2 }, ottelu: { lasna: 1 }, omatoimi: { n: 5 } }, viikot: [] };
    const h = teksti(HN.tmKertymaKevytHTML(k, { t: (x) => (x in HN.FI ? merkki(x) : x) }));
    expect(h).toContain(merkki('Tällä kaudella')); expect(h).toContain('5 ' + merkki('omatoimista'));
    expect(Object.keys(HN.FI).reduce((a, x) => a.split(merkki(x)).join(''), h)).not.toMatch(/Tällä|treeniä|aamutreeniä|ottelua|omatoimista|Ohjattu|Omatoiminen/);
  });
});

describe('kytkennät P7:ssä ja Vanhemmassa', () => {
  it('P7 antaa kääntäjän kirjastoille (ennen {} / x => x / tm_lang-t)', () => {
    expect(P7).toContain('tmKaariRenderPelaaja(p, { ika: _ika, t: _p7K1T })');
    expect(P7).toContain('N.tmKertymaKevytHTML(window._p7Kertyma, { t: _p7K1T })');
    expect(P7).toContain("tmTilausPainikeHTML({ t: _p7K1T, onclick: '_p7TilausAvaa()' })");
    expect(P7).toMatch(/TM_KALENTERI_TILAUS_UI\.tmTilausAsenna\(\{ t: _p7K1T,/);
    expect(P7).toMatch(/var lo = \{ esc: esc2, t: function \(k\) \{ var l = \(typeof window\.tmLibT === 'function'\) \? window\.tmLibT\(k\)/);
    expect(P7).toContain("o = { esc: _thEsc, t: _p7K1T, sisaltoT: (typeof _hT === 'function') ? _hT : null }");
    expect(P7).toContain("tmKotiharjoitteetHTML(L.tmKotiharjoitteet(_pelaaja.jaksofokus), { esc: _thEsc, t: _p7K1T, sisaltoT: (typeof _hT === 'function') ? _hT : null })");
    expect(P7).not.toMatch(/tmTilausPainikeHTML\(\{ t: function \(x\) \{ return x; \}/);
  });
  it('Vanhempi: kertymä + kalenteri _vKpT:n kautta', () => {
    expect(VA).toContain('N.tmKertymaKevytHTML(window._vanhKertyma, { vanhempi: true, t: _vKpT })');
    expect(VA).toContain("tmTilausPainikeHTML({ t: _vKpT, onclick: '_vanhTilausAvaa()' })");
    expect(VA).toMatch(/TM_KALENTERI_TILAUS_UI\.tmTilausAsenna\(\{ t: _vKpT,/);
  });
  it('päästä päähän: P7:n _p7K1T + jaettu libikartta → kirjasto renderöi kartan tekstin (sv simuloitu merkillä)', () => {
    const sb = { console: { log() {}, warn() {}, error() {} } }; sb.window = sb; vm.createContext(sb);
    ['lib/tm_lang.js', 'lib/tm_lib_i18n.js', 'lib/tm_kehityskaari.js', 'lib/tm_ilmoitus_lista.js'].forEach((f) => vm.runInContext(lue(f), sb));
    vm.runInContext("tmAsetaKieli('sv', false); TM_LIB_I18N.sv.kka_kehityit = '§SV§kka_kehityit';", sb);
    const i = P7.indexOf('function _p7K1T('), f = P7.slice(i, P7.indexOf('\n', i));
    vm.runInContext("const _TMAP = {}; const T = (k, m) => (typeof t === 'function' ? t(k.indexOf('.') >= 0 ? k : (_TMAP[k] || ('pelaaja.' + k)), m) : k);\n" + f, sb);
    const h = vm.runInContext("tmKaariRenderPelaaja({ hh_historia: [{ pvm: '2026-01-01', lin30m: 5.2 }, { pvm: '2026-06-01', lin30m: 5.0 }] }, { ika: 14, t: _p7K1T })", sb);
    expect(h).toContain('§SV§kka_kehityit'); expect(h).toContain('30 m nopeutui');   // ei sv:tä → FI-oletus (ei raakaa avainta)
    expect(vm.runInContext("_p7K1T('kka_v_lin30m')", sb)).toBe('kka_v_lin30m');
    // ilm_kertaa: sv on jo kartassa → P7:n lo.t-kääre löytää sen (ennen tm_lang-t → avain → FI '{n} kertaa')
    expect(vm.runInContext("TM_ILMOITUS_LISTA.tmIlmoitusRyhmaHTML({ id: 'g', nimi: 'X', jasenet: [{ n: { id: 'a' } }, { n: { id: 'b' } }] }, { esc: (s) => s, t: function (k) { var l = tmLibT(k); return l !== undefined ? l : k; }, teksti: () => '', ikoni: () => '', kuittaaRyhmaFn: 'f', tapFn: 'f' })", sb)).toContain(vm.runInContext("tmLibT('ilm_kertaa')", sb).replace('{n}', '2'));
  });
});

describe('erä 90: odotuslista = erän JSON (sv tyhjä, Code ei kirjoita ruotsia)', () => {
  const E = JSON.parse(lue('docs/i18n/sv_kaannoserae_90_gemini.json')), O = require('./helpers/sv_era90_odottaa.cjs');
  it('jokainen erän rivi on odotuslistalla ja päinvastoin; sv tyhjä', () => {
    const rivit = Object.values(E.osiot).flatMap((o) => Object.entries(o.rivit));
    expect(rivit.map(([k]) => k).sort()).toEqual([...O].sort());
    expect(rivit.filter(([, r]) => r.sv !== '')).toEqual([]);
    expect(E._rivit_yhteensa).toBe(O.length);
  });
});
