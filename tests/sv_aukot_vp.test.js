/* sv-aukot kohdat 10–15 (PM 28.10.2026, .briefit/CODE_BRIEF_SV_AUKOT_P7.md lisäys): VP:n Koti + Kehitystyöpöydän nimet sv-tilassa.
 * Code EI kirjoita ruotsia (CLAUDE.md §0): odotetut sv-arvot luetaan koodin omista lähteistä (tm_lib_i18n, taksonomian nimi_sv,
 * TM_FYYSTEEMAT nimi_sv); uusien avainten sv on tyhjä erässä 91 ja odotuslistalla. Funktiot ajetaan vm-sandboxissa tuotantonimillä. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import vm from 'vm';
const require = createRequire(import.meta.url);
const lue = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const SV = require('../lib/tm_lib_i18n.js').TM_LIB_I18N.sv;
const TAKS = require('../lib/tm_arviointi_taksonomia.js').ARVIOINTI_TAKSONOMIA;
const FYYS = require('../lib/tm_fyysteemat.js').TM_FYYSTEEMAT;
const E91 = JSON.parse(lue('docs/i18n/sv_kaannoserae_91_gemini.json'));
const P91 = JSON.parse(lue('docs/i18n/sv_kaannoserae_91_palautus.json')), KORJ = P91._pm_era19_tarkistus.korjaukset;
const KTP = lue('TalentMaster_Kehitystyopoyta.html'), VP = lue('TalentMaster_VP_v25.html');
function pura(src, alku) { const i = src.indexOf(alku); if (i < 0) throw new Error('ei löydy: ' + alku); let d = 0, j = src.indexOf('{', i); for (; j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}' && --d === 0) break; } return src.slice(i, j + 1); }

describe('erä 91: PM:n palautus viety (17 riviä + 3 erän 19 korjausta)', () => {
  const avaimet = Object.values(E91.osiot).flatMap((o) => Object.keys(o.rivit));
  it('lähetetyssä erässä 17 riviä sv tyhjänä; palautuksessa samat avaimet ja sama fi', () => {
    expect(avaimet).toHaveLength(17);
    expect(Object.values(E91.osiot).flatMap((o) => Object.values(o.rivit)).filter((r) => r.sv !== '')).toEqual([]);
    const pa = Object.values(P91.osiot).flatMap((o) => Object.keys(o.rivit)); expect(pa.sort()).toEqual([...avaimet].sort());
    for (const [o, x] of Object.entries(P91.osiot)) for (const [k, r] of Object.entries(x.rivit)) expect(r.fi, k).toBe(E91.osiot[o].rivit[k].fi);
  });
  it('koodin sv = palautus merkki merkiltä; korjaukset korvasivat erän 19 arvon; vienti idempotentti', () => {
    for (const x of Object.values(P91.osiot)) for (const [k, r] of Object.entries(x.rivit)) expect(SV[k], k).toBe(r.sv);
    expect(Object.keys(KORJ)).toHaveLength(3); for (const [k, sv] of Object.entries(KORJ)) expect(SV[k], k).toBe(sv);
    const t = require('../scripts/i18n_vie_sv_era91.cjs').vie({}); expect(t.virheet).toEqual([]); expect(t.lisatty).toBe(0); expect(t.korjattu).toEqual([]); expect(t.ohitettu).toHaveLength(20);
    const src = lue('lib/tm_lib_i18n.js'); for (const k of Object.keys(KORJ)) expect(src.split("'" + k + "':").length - 1, 'yksi rivi: ' + k).toBe(1);
  });
  it('VP Kodin libien FI-kartat: avain = fi-teksti ja jokainen on lähteessä t()-, k:- tai taulukkoarvona', () => {
    for (const l of ['tm_vp_koti', 'tm_vp_koti_palsta', 'tm_vp_navi']) {
      const F = require('../lib/' + l + '.js').FI, src = lue('lib/' + l + '.js').split('var FI = {')[0] + lue('lib/' + l + '.js').split('};').slice(1).join('};');
      for (const [k, v] of Object.entries(F)) { expect(v, l + ' ' + k).toBe(k); expect(src.includes("'" + k.replace(/'/g, "\\'") + "'"), l + ' käytössä: ' + k).toBe(true); }
    }
  });
});

describe('k15: Geminin erän 19 sv viety (VP Koti + navi), johtolause ilman suomen päätettä', () => {
  const VIE = require('../scripts/i18n_vie_sv_era19_vp_koti.cjs');
  it('vienti on tehty ja idempotentti: 121 riviä merkki merkiltä palautuksesta, ei uusia', () => {
    const t = VIE.vie({}); expect(t.virheet).toEqual([]); expect(t.lisatty).toBe(0); expect(t.ohitettu).toHaveLength(121);
    const P = {}; for (const [f, os] of VIE.LAHTEET) for (const o of os) Object.assign(P, Object.fromEntries(Object.entries(JSON.parse(lue(f)).osiot[o].rivit).filter(([k]) => !(k in P))));
    for (const k of t.ohitettu) expect(SV[k], k).toBe(KORJ[k] != null ? KORJ[k] : P[k].sv);   // PM korjasi 3 riviä (erä 91 palautus)
  });
  it('fi ennallaan ("15:stä"), sv-tilassa johtolause ei sisällä suomen elatiivia', () => {
    const KK = require('../lib/tm_vp_koti.js');
    expect(KK.johtolause((s) => s, 1, 15)).toBe('Yhdellä joukkueella 15:stä on jakso.');
    for (const [a, b] of [[0, 8], [1, 15], [3, 2]]) { const l = KK.johtolause((k) => SV[k] || k, a, b); expect(l, a + '/' + b).not.toMatch(/:st[aä]|\{e\}/); expect(l).toContain(String(b)); }
  });
});

describe('k11 + k12: kausi ja domeeni avaimella (Polku + raportti)', () => {
  const P = require('../lib/tm_kt_polku.js'), T = (k) => (k in P.FI ? '«' + k + '»' : k);
  it('tmKtPolkuKausiNaytto: syksy/kevät + vuosi → avain, muu muoto ennallaan, fi ennallaan', () => {
    expect(P.tmKtPolkuKausiNaytto('syksy 2026', T)).toBe('«ktp_kausi_syksy»');
    expect(P.tmKtPolkuKausiNaytto('syksy 2026', (k) => P.FI[k])).toBe('syksy 2026');
    expect(P.tmKtPolkuKausiNaytto('kevät 2027', (k) => P.FI[k])).toBe('kevät 2027');
    expect(P.tmKtPolkuKausiNaytto('2026–27', T)).toBe('2026–27');
  });
  it('Polku ja raportti kutsuvat kausi- ja domeenimuotoilua, ei raakaa arvoa', () => {
    const pol = lue('lib/tm_kt_polku.js'), pr = lue('lib/tm_pelaajaraportti.js');
    expect(pol).toContain("esc(tmKtPolkuKausiNaytto(K.kausi, t))"); expect(pol).toContain('_label(jf.domeeni, t)');
    expect(pr).toContain('esc(_kausi(c, m.kausi))'); expect(pr).toContain('_label(j.domeeni, c)'); expect(pr).toContain('esc(_taito(c, m.nimi))');
    for (const k of ['ktp_dom_teknis_taktinen', 'ktp_dom_fyysinen', 'ktp_dom_psyykkinen', 'ktp_dom_sosiaalinen', 'ktp_kausi_syksy', 'ktp_kausi_kevat']) expect(P.FI[k], k).toBeTruthy();
  });
});

describe('k10 + k13 + k14: Kehitystyöpöydän näyttönimet (vm, sv-tila)', () => {
  const SN = require('../lib/tm_sanasto.js');
  const aja = (kieli) => {
    const sb = { SN, ARVIOINTI_TAKSONOMIA: TAKS, window: { TM_FYYSTEEMAT_LIB: { TM_FYYSTEEMAT: FYYS } }, _kieli: () => kieli, TT: (k) => (kieli !== 'fi' && typeof SV[k] === 'string') ? SV[k] : k };
    vm.createContext(sb); vm.runInContext(pura(KTP, 'function _ktTaitoNimi(') + '\n' + pura(KTP, 'function _ktKonseptiNimi(') + '\nthis._ktTaitoNimi = _ktTaitoNimi; this._ktKonseptiNimi = _ktKonseptiNimi;', sb); return sb;
  };
  it('sv: y_h4 → sanaston sn_-avaimen sv, fyysinen konsepti → nimi_sv, taito → taksonomian nimi_sv, tuntematon ennallaan', () => {
    const S = aja('sv'), nop = TAKS.find((x) => x.nimi_fi === 'Nopeus'), ly = TAKS.find((x) => x.nimi_fi === 'Lyhyt syöttö'), fy = FYYS.find((x) => x.avain === 'fy_nopeus');
    expect(SV.sn_y_h4).toBeTruthy();
    expect(S._ktKonseptiNimi('y_h4', 'HARHAUTTAMINEN', 'teknis_taktinen')).toBe(SV.sn_y_h4);
    expect(S._ktKonseptiNimi('Y_H1', 'x')).toBe(SV.sn_y_h1);
    expect(S._ktKonseptiNimi('fy_nopeus', 'Nopeus', 'fyysinen')).toBe(fy.nimi_sv);
    expect(S._ktTaitoNimi('Nopeus')).toBe(nop.nimi_sv); expect(S._ktTaitoNimi('Lyhyt syöttö')).toBe(ly.nimi_sv);
    expect(S._ktTaitoNimi('Seuran oma taito')).toBe('Seuran oma taito'); expect(S._ktKonseptiNimi('oma_x', 'Oma jakso')).toBe('Oma jakso');
  });
  it('fi: D248-nimi ennallaan, taito ennallaan', () => {
    const S = aja('fi');
    expect(S._ktKonseptiNimi('y_h4', 'vanha')).toBe(SN.tmSanastoKonseptiNimi('y_h4', 'vanha')); expect(S._ktTaitoNimi('Nopeus')).toBe('Nopeus');
  });
  it('KTP kytkee: _naytto, nimiFn, historiaNimiFn, taitoNimiFn ja ikävaihe käännöksen kautta (data ei muutu)', () => {
    expect(KTP).toContain('const n = _ktKonseptiNimi(jf.konsepti_avain, jf.konsepti_nimi, jf.domeeni);');
    expect(KTP).toContain('historiaNimiFn: _ktKonseptiNimi, taitoNimiFn: _ktTaitoNimi');
    expect(KTP).toContain('ikavaihe: TT(K.tmKtIkavaihe(isp.ika)), taitoNimiFn: _ktTaitoNimi,');
    expect(KTP).not.toMatch(/nimiFn: function \(a, n\) \{ return SN\.tmSanastoKonseptiNimi/);
  });
});

describe('k12 + k13: VP domeeni ja jaksokortti', () => {
  it('_vpTaitoNimiNaytto: sv → taksonomian nimi_sv, fi ja tuntematon ennallaan', () => {
    const mk = (l) => { const sb = { ARVIOINTI_TAKSONOMIA: TAKS, _vpTaksLang: () => l }; vm.createContext(sb); vm.runInContext(pura(VP, 'function _vpTaitoNimiNaytto(') + '\nthis.f = _vpTaitoNimiNaytto;', sb); return sb.f; };
    const ly = TAKS.find((x) => x.nimi_fi === 'Lyhyt syöttö');
    expect(mk('sv')('Lyhyt syöttö')).toBe(ly.nimi_sv); expect(mk('fi')('Lyhyt syöttö')).toBe('Lyhyt syöttö'); expect(mk('sv')('Oma')).toBe('Oma');
  });
  it('domeeni vpT:n kautta (molemmat paikat), jaksokortin taito + tukiosa näyttökopiona', () => {
    expect(VP).toContain("const domLbl = vpT(dom ? String(dom.nimi).toLowerCase()");
    expect((VP.match(/_dm\.ikoni \+ ' ' \+ vpT\(_dm\.nimi\)/g) || []).length).toBe(2);
    expect(VP).toContain('k.taito = _vpKonseptiNimiNaytto(p.jaksofokus) || k.taito; if (k.tukiosa && k.tukiosa.alue) k.tukiosa = Object.assign({}, k.tukiosa, { alue: _vpTaitoNimiNaytto(k.tukiosa.alue) });');
  });
});
