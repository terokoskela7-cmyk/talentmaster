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
    const sv30 = vm.runInContext('TM_LIB_I18N.sv.kka_v_lin30m', sb);   // erä 90 viety → PM:n sv
    expect(h).toContain('§SV§kka_kehityit'); expect(sv30).toBeTruthy(); expect(h).toContain(sv30); expect(h).not.toContain('30 m nopeutui');
    expect(vm.runInContext("_p7K1T('kka_v_lin30m')", sb)).toBe(sv30);
    // ilm_kertaa: sv on jo kartassa → P7:n lo.t-kääre löytää sen (ennen tm_lang-t → avain → FI '{n} kertaa')
    expect(vm.runInContext("TM_ILMOITUS_LISTA.tmIlmoitusRyhmaHTML({ id: 'g', nimi: 'X', jasenet: [{ n: { id: 'a' } }, { n: { id: 'b' } }] }, { esc: (s) => s, t: function (k) { var l = tmLibT(k); return l !== undefined ? l : k; }, teksti: () => '', ikoni: () => '', kuittaaRyhmaFn: 'f', tapFn: 'f' })", sb)).toContain(vm.runInContext("tmLibT('ilm_kertaa')", sb).replace('{n}', '2'));
  });
});

describe('erä 90 viety: kytketyt libit renderöivät PM:n sv:n', () => {
  it('jokainen erän rivi on jaetussa libikartassa (sv ei tyhjä) ja kehityskaari näyttää sen _p7K1T:n kautta', () => {
    const P = JSON.parse(lue('docs/i18n/sv_kaannoserae_90_palautus.json')).osiot, SV = require('../lib/tm_lib_i18n.js').TM_LIB_I18N.sv;
    const rivit = Object.values(P).flatMap((o) => Object.entries(o.rivit)); expect(rivit).toHaveLength(110);
    for (const [k, r] of rivit) expect(SV[k], k).toBe(r.sv);
    const h = K.tmKaariRenderPelaaja({}, { t: (k) => SV[k] || K.FI[k] }); expect(h).toContain(SV.kka_tyhja); expect(h).not.toContain(K.FI.kka_tyhja);
  });
});

describe('kohta 8 (PM 28.10.): taidon nimi taksonomian nimi_sv:stä, tuntematon sellaisenaan', () => {
  const TN = require('../lib/tm_taito_nimi.js'), TX = require('../lib/tm_arviointi_taksonomia.js').ARVIOINTI_TAKSONOMIA;
  it('nimiparit = taksonomia täsmälleen (generoitu, ei ajautumista)', () => {
    const odotettu = {}; for (const x of TX) odotettu[x.nimi_fi] = x.nimi_sv;
    expect(TN.SV).toEqual(odotettu);
  });
  it('sv: tunnettu → nimi_sv; tuntematon (valmentajan oma) → sellaisenaan; fi → ennallaan', () => {
    const x = TX.find((i) => i.nimi_fi !== i.nimi_sv);
    expect(TN.tmTaitoNimi(x.nimi_fi, 'sv')).toBe(x.nimi_sv); expect(TN.tmTaitoNimi(' ' + x.nimi_fi + ' ', 'sv')).toBe(x.nimi_sv);
    expect(TN.tmTaitoNimi('Oma tavoite', 'sv')).toBe('Oma tavoite'); expect(TN.tmTaitoNimi(x.nimi_fi, 'fi')).toBe(x.nimi_fi); expect(TN.tmTaitoNimi(null, 'sv')).toBe(null);
  });
  it('tm_idp_pelaaja: opts.taitoNimi kääntää otsikon; ilman ennallaan', () => {
    const t = { fokus: { nimi: 'Viimeistely' }, perustelu: {} };
    expect(IP.tmPelaajaKonsepti(t, {}).mika).toContain('Viimeistely');
    expect(IP.tmPelaajaKonsepti(t, { taitoNimi: (n) => TN.tmTaitoNimi(n, 'sv') }).mika).toContain(TN.SV.Viimeistely);
  });
  it('P7: näyttöpaikat kääntävät, TALLENNETTAVA fokus_nimi ei (Firestoreen ei ruotsia)', () => {
    expect(P7).toContain('<script src="lib/tm_taito_nimi.js"></script>'); expect(lue('sw_pelaaja.js')).toContain("'/lib/tm_taito_nimi.js'");
    for (const s of ["idpPelaajaKaari(t, { t: _p7K1T, taitoNimi: _p7TaitoNimi })", "idpPelaajaKonsepti(t, { t: _p7K1T, taitoNimi: _p7TaitoNimi })", 'var pikaFokus = _p7TaitoNimi(', 'kausitavoite: _p7TaitoNimi(', 'esc(_p7TaitoNimi(sit.fokus_nimi))']) expect(P7, s).toContain(s);
    const i = P7.indexOf('function _p7FokusNimi()'), f = P7.slice(i, P7.indexOf('\n}', i));
    expect(f).not.toMatch(/_p7TaitoNimi|_p7KonseptiNimi/); expect(P7).toContain('fokus_nimi: _p7FokusNimi(),');
  });
});

describe('kohta 9 (PM 28.10.): konseptin nimi kirjaston sv:stä avaimella Tänään-, sitoumus- ja Minä-näkymissä', () => {
  const TK = require('../lib/tm_tanaan_kentta.js'), VK = require('../lib/tm_viikkokatsaus.js');
  const p = { jaksofokus: { konsepti_avain: 'y_h4', konsepti_nimi: 'HARHAUTTAMINEN', alkoi: '2026-10-19', kesto_vk: 4 } };
  it('tmTanaanTila: ctx.konseptiNimi → käännetty; puuttuu / tyhjä / heittää → tallennettu', () => {
    expect(TK.tmTanaanTila(p, { tanaan: '2026-10-28' }).nimi).toBe('HARHAUTTAMINEN');
    expect(TK.tmTanaanTila(p, { tanaan: '2026-10-28', konseptiNimi: (a, n) => (a === 'y_h4' ? '§SV§' + a : n) }).nimi).toBe('§SV§y_h4');
    expect(TK.tmTanaanTila(p, { tanaan: '2026-10-28', konseptiNimi: () => '' }).nimi).toBe('HARHAUTTAMINEN');
    expect(TK.tmTanaanTila(p, { tanaan: '2026-10-28', konseptiNimi: () => { throw new Error('x'); } }).nimi).toBe('HARHAUTTAMINEN');
  });
  it('Minä (tmMinaTavoiteRivit) ja jakson päätös (tmVkPaatos) välittävät konseptiNimen', () => {
    const r = TK.tmMinaTavoiteRivit(p, { tanaan: '2026-10-28', konseptiNimi: (a) => '§SV§' + a }, { t: (k) => (TK.FI[k] || k) });
    expect(r.nyt).toContain('§SV§y_h4'); expect(r.nytHTML).toContain('§SV§y_h4');
    const loppu = { jaksofokus: null, jaksofokus_historia: [{ konsepti_avain: 'y_h4', konsepti_nimi: 'HARHAUTTAMINEN', lause: '' }] };
    expect(VK.tmVkPaatos(loppu, { tanaan: '2026-12-01', konseptiNimi: (a) => '§SV§' + a }).nimi).toBe('§SV§y_h4');
    expect(VK.tmVkPaatos(loppu, { tanaan: '2026-12-01' }).nimi).toBe('HARHAUTTAMINEN');
  });
  it('P7 _p7KonseptiNimi (29.10.): sv-tilassa SAMA lähde kuin Kehitystyöpöytä (sn_y_h4, tm_lib_i18n); seuran oma avain / fi → tallennettu', () => {
    const sb = { console: { log() {}, warn() {}, error() {} } }; sb.window = sb; vm.createContext(sb);
    vm.runInContext(lue('lib/tm_teknistaktiset_sv.js'), sb); vm.runInContext(lue('lib/tm_lib_i18n.js'), sb);
    const pala = (n) => { const i = P7.indexOf('function ' + n + '('); let d = 0, j = P7.indexOf('{', i); for (; j < P7.length; j++) { if (P7[j] === '{') d++; else if (P7[j] === '}' && --d === 0) break; } return P7.slice(i, j + 1); };
    vm.runInContext("var KIELI = 'sv'; function _p7Kieli() { return KIELI; }\n" + pala('_p7TtSv') + '\n' + pala('_p7KonseptiNimi'), sb);
    const sv = vm.runInContext("tmLibT('sn_y_h4', 'sv')", sb); expect(sv).toBeTruthy(); expect(sv).not.toBe(vm.runInContext("TM_TT_SV['y_h4.nimi']", sb));   // KTP:n nimi, ei kirjaston pitkä nimi
    expect(lue('TalentMaster_Kehitystyopoyta.html')).toMatch(/const k = 'sn_' \+ String\(avain \|\| ''\)\.toLowerCase\(\);\s*if \(\/\^sn_y_\[hp\]\\d\$\/\.test\(k\)\) \{ const v = TT\(k\)/);   // KTP:n lähde ennallaan
    expect(vm.runInContext("_p7KonseptiNimi('y_x9_ei', 'Muu')", sb)).toBe('Muu');
    expect(vm.runInContext("_p7KonseptiNimi('y_h4', 'HARHAUTTAMINEN')", sb)).toBe(sv);
    expect(vm.runInContext("_p7KonseptiNimi('Y-H4', 'HARHAUTTAMINEN')", sb)).toBe(sv);
    expect(vm.runInContext("_p7KonseptiNimi('seuran_oma', 'Oma konsepti')", sb)).toBe('Oma konsepti');
    expect(vm.runInContext("_p7KonseptiNimi(null, 'Oma konsepti')", sb)).toBe('Oma konsepti');
    vm.runInContext("KIELI = 'fi'", sb); expect(vm.runInContext("_p7KonseptiNimi('y_h4', 'HARHAUTTAMINEN')", sb)).toBe('HARHAUTTAMINEN');
  });
  it('P7-kytkennät: Tänään (tila + päätös), Minä, sitoumus', () => {
    for (const s of ['K.tmTanaanTila(_pelaaja, { tanaan, konseptiNimi: _p7KonseptiNimi })', 'K4.tmVkPaatos(_pelaaja, { tanaan, konseptiNimi: _p7KonseptiNimi })', 'konseptiNimi: _p7KonseptiNimi, tanaan: _paivaIso()', '_p7KonseptiNimi(d.jaksofokus.konsepti_avain, d.jaksofokus.konsepti_nimi)']) expect(P7, s).toContain(s);
  });
});

describe('P7 viimeiset sv (PM 29.10.): ydinasiat, vahvuus ja tukiosa samoilla hauilla kuin Kehitystyöpöytä', () => {
  const pala = (n) => { const i = P7.indexOf('function ' + n + '('); expect(i, n).toBeGreaterThan(-1); let d = 0, j = P7.indexOf('{', i); for (; j < P7.length; j++) { if (P7[j] === '{') d++; else if (P7[j] === '}' && --d === 0) break; } return P7.slice(i, j + 1); };
  const hiekka = (kieli) => {
    const sb = { console: { log() {}, warn() {}, error() {} } }; sb.window = sb; vm.createContext(sb);
    ['lib/tm_teknistaktiset.js', 'lib/tm_teknistaktiset_sv.js', 'lib/tm_tt_sv_valinta.js', 'lib/tm_konsepti_resolve.js', 'lib/tm_lib_i18n.js', 'lib/tm_kielletyt.js', 'lib/tm_viikon_osa.js', 'lib/tm_tanaan_kentta.js', 'lib/tm_taito_nimi.js', 'lib/tm_tukitavoitteet.js', 'lib/tm_kotiharjoitteet.js', 'lib/tm_taman_tueksi.js'].forEach((f) => vm.runInContext(lue(f), sb));
    vm.runInContext("var KIELI = '" + kieli + "'; function _p7Kieli() { return KIELI; }\n" + ['_p7TaitoNimi', '_p7TtSv', '_p7KonseptiNimi', '_p7KaanonNaytto', '_p7KaanonFn'].map(pala).join('\n'), sb);
    return sb;
  };
  const jf = { konsepti_avain: 'y_h4', konsepti_nimi: 'HARHAUTTAMINEN', alkoi: '2026-10-19', kesto_vk: 4 };
  it('ydinasiat A–C: sv-tilassa = Kehitystyöpöydän _kaanon (tmTtSv(kieli).konsepti(tmKonseptiKaanon)) — ei fi-tekstiä; koodit samat', () => {
    const sb = hiekka('sv'); sb.JF = jf;
    const p7 = vm.runInContext('TM_TANAAN_KENTTA.tmTanaanOsat(JF, { kaanon: _p7KaanonFn() })', sb);
    const ktp = vm.runInContext("TM_TANAAN_KENTTA.tmTanaanOsat(JF, { kaanon: function (a) { return tmTtSv('sv').konsepti(tmKonseptiKaanon(a)); } })", sb);
    const fi = vm.runInContext('TM_TANAAN_KENTTA.tmTanaanOsat(JF, { kaanon: tmKonseptiKaanon })', sb);
    expect(p7.length).toBe(3); expect(p7).toEqual(ktp);
    p7.forEach((o, i) => { expect(o.koodi).toBe(fi[i].koodi); expect(o.teksti).not.toBe(fi[i].teksti); expect(o.teksti).toBe(vm.runInContext("TM_TT_SV['y_h4.kpi." + o.koodi + ".teksti']", sb)); });
    expect(lue('TalentMaster_Kehitystyopoyta.html')).toContain("const _kaanon = function (avain) { return (typeof tmKonseptiKaanon === 'function') ? (tmTtSv(typeof tmNykyinenKieli === 'function' ? tmNykyinenKieli() : 'fi').konsepti(tmKonseptiKaanon(avain))) : null; };");
  });
  it('fi-tila ennallaan: osat = raaka kaanon', () => {
    const sb = hiekka('fi'); sb.JF = jf;
    expect(vm.runInContext('TM_TANAAN_KENTTA.tmTanaanOsat(JF, { kaanon: _p7KaanonFn() })', sb)).toEqual(vm.runInContext('TM_TANAAN_KENTTA.tmTanaanOsat(JF, { kaanon: tmKonseptiKaanon })', sb));
  });
  it('Minä: "Nyt harjoittelet" + "Tällä viikolla harjoittelet: …" sv-kaanonista', () => {
    const sb = hiekka('sv'); sb.P = { jaksofokus: jf };
    const r = vm.runInContext("TM_TANAAN_KENTTA.tmMinaTavoiteRivit(P, { tanaan: '2026-10-28', konseptiNimi: _p7KonseptiNimi, kaanon: _p7KaanonFn() }, { t: function (k) { var l = tmLibT(k); return l !== undefined ? l : k; } })", sb);
    expect(r.nytHTML).toContain(vm.runInContext("tmLibT('sn_y_h4', 'sv')", sb));
    expect(r.nytHTML).toContain(vm.runInContext("TM_TT_SV['y_h4.kpi.a.teksti']", sb).split(':')[0]);
    expect(r.nytHTML).not.toContain(vm.runInContext("tmKonseptiKaanon('y_h4').kpi[0].teksti", sb).split(':')[0]);
  });
  it('Tämän tueksi: otsikko ja perustelun nimet nimiFn:llä (iso/pieni alkukirjain), tuntematon nimi ja ilman nimiFn:ää ennallaan', () => {
    const TN = require('../lib/tm_taito_nimi.js'), f = (n) => TN.tmTaitoNimi(n, 'sv'), sv = TN.SV['Lyhyt syöttö'], svN = TN.SV.Nopeus;
    const rv = (per) => [{ kuvaus: 'Lyhyt syöttö', perustelu: per, harjoitteet: [] }];
    const tK = (k) => (k === 'k1_tukee_vahvuuttasi' ? '[{vahvuus}|{kuvaus}]' : k);
    const h = teksti(TT.tmTamanTueksiHTML(rv('Tukee vahvuuttasi (Nopeus): lyhyt syöttö.'), { t: tK, nimiFn: f }));
    expect(h).toContain(sv); expect(h).toContain('[' + svN + '|' + sv.charAt(0).toLowerCase() + sv.slice(1) + ']'); expect(h).not.toContain('Lyhyt syöttö');
    expect(teksti(TT.tmTamanTueksiHTML(rv('Tukee vahvuuttasi (Pallon kuljettaminen): lyhyt syöttö.'), { t: tK, nimiFn: f }))).toContain('[Pallon kuljettaminen|');   // valmentajan oma teksti → sellaisenaan
    expect(teksti(TT.tmTamanTueksiHTML(rv('Tukee vahvuuttasi (Nopeus): lyhyt syöttö.'), { t: tK }))).toContain('[Nopeus|lyhyt syöttö]');
    expect(teksti(TT.tmTamanTueksiHTML(rv(null), { t: tK, nimiFn: () => { throw new Error('x'); } }))).toContain('Lyhyt syöttö');
  });
  it('P7-kytkennät: Tänään (osat, viikon fokus, vahvuus, Tämän tueksi) + Minä; tallennusolio käyttää yhä raakaa kaanonia', () => {
    for (const s of ["K.tmTanaanOsat(jf, { kaanon: _p7KaanonFn() })", "K.tmTanaanOsat(jf, { kaanon: _p7KaanonFn(), max: 26 })", 'if (x.vahvuus) x.vahvuus = _p7TaitoNimi(x.vahvuus);', 'TU.tmTamanTueksiHTML(TU.tmTamanTueksiRivit(jf), Object.assign({ nimiFn: _p7TaitoNimi }, o))', "kaanon: _p7KaanonFn() }, { esc: esc, t: _p7K1T })"]) expect(P7, s).toContain(s);
    expect(P7).toMatch(/K4\.tmVkTallennusolio\(_pelaaja, V\.valinnat, V\.lause, \{ tanaan: V\.pvm, kaanon: \(typeof tmKonseptiKaanon === 'function'\) \? tmKonseptiKaanon : null \}\)/);
    expect(P7).toContain('<script src="lib/tm_tt_sv_valinta.js"></script>'); expect(lue('sw_pelaaja.js')).toContain("'/lib/tm_tt_sv_valinta.js'");
    expect(P7.indexOf('lib/tm_tt_sv_valinta.js')).toBeGreaterThan(P7.indexOf('lib/tm_teknistaktiset_sv.js'));
  });
});
