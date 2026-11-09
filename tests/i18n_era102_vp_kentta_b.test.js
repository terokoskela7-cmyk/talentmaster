/* sv-erä 102 (osio vp_kentta_b, PM 10.11.2026) — VP:n Kenttä-näkymän vierekkäiset tekstit + liikkuvuusliikkeiden nimet. Code ei kirjoita ruotsia (§0): erätiedoston sv on tyhjä, kunnes PM palauttaa.
   Portit: (1) erätiedosto = rakentajan tuotos (ajantasainen), kaikki avaimet koodissa reititinkutsun literaalina, ei yhtään valmista sv:tä rivillä;
   (2) MASTER.json = sidecar (1261/1261, ei tyhjiä) ja Kehitystyöpöydän render on kytketty siihen (_ttKaanonSv, _vpKonseptiNimiNimella); (3) kypsyyskortti ja kehityskaari kutsuvat reititintä
   jokaiselle erän avaimelle (stub-reititin "§"+teksti: ei suomea ilman reititinmerkkiä). */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import vm from 'vm';
const require = createRequire(import.meta.url);
const teksti = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const R = require('../scripts/i18n_era_vp_kentta_b.cjs');
const ERA = JSON.parse(teksti('docs/i18n/sv_kaannoserae_102_gemini.json'));

describe('erä 102 — erätiedosto', () => {
  const t = R.rivit({});
  it('rakentaja ei raportoi virheitä; erätiedosto = rakentajan tuotos (avaimet ja järjestys)', () => {
    expect(t.virheet).toEqual([]);
    expect(Object.keys(ERA.osiot.vp_kentta_b.rivit)).toEqual(Object.keys(t.rivit));
    expect(Object.keys(t.rivit).length).toBeGreaterThanOrEqual(50);
  });
  it('lähetetty sv on tyhjä; rivillä on lähde + näkymä; jo kartassa olevat tekstit eivät ole erässä', () => {
    for (const [k, r] of Object.entries(ERA.osiot.vp_kentta_b.rivit)) { expect(r.sv, k).toBe(''); expect(r.fi, k).toBe(k); expect(r.lahde, k).toBeTruthy(); expect(r.nakyma.length, k).toBeGreaterThan(0); }
    const res = R.ketju(new URL('..', import.meta.url).pathname);
    for (const k of Object.keys(ERA.osiot.vp_kentta_b.rivit)) expect(res(k), k).toBeNull();
  });
  it('liikkuvuusliikkeiden neljä nimeä ovat erässä (ei lukittua sanastoa common/MASTER:ssa)', () => {
    for (const n of ['Valakyykky', 'Askelkyykky', 'Hyvää huomenta', 'Etunojapunnerrus']) expect(ERA.osiot.vp_kentta_b.rivit[n], n).toBeTruthy();
    const C = require('../lib/tm_i18n_common.js').TM_I18N_COMMON.sv;
    for (const n of ['Valakyykky', 'Askelkyykky', 'Hyvää huomenta', 'Etunojapunnerrus']) expect(C[n], n).toBeUndefined();
  });
});

describe('MASTER.json = sidecar; render kytketty', () => {
  it('sidecar (TM_TT_SV) = MASTER.json avain avaimelta ja arvo arvolta; 1261 riviä; ei tyhjiä; kaikki irrotuksen avaimet katettu', () => {
    const sb = {}; vm.createContext(sb); vm.runInContext(teksti('lib/tm_teknistaktiset_sv.js') + ';this.T=TM_TT_SV', sb);
    const M = JSON.parse(teksti('docs/i18n/curriculum_kaannettava.sv.MASTER.json')), F = JSON.parse(teksti('docs/i18n/curriculum_kaannettava.sv.json'));
    expect(Object.keys(M)).toHaveLength(1261); expect(Object.keys(F).sort()).toEqual(Object.keys(M).sort());
    for (const k of Object.keys(M)) { expect(String(M[k]).trim(), k).not.toBe(''); expect(sb.T[k], k).toBe(M[k]); }
  });
  it('VP: tmTanaanOsat-kaanon (4 kutsua) ja Joukkue/Koti-rivien konseptinimi käyttävät sidecaria', () => {
    const v = teksti('TalentMaster_VP_v25.html');
    expect(v.match(/kaanon: \(typeof tmKonseptiKaanon === 'function'\) \? \(typeof _ttKaanonSv === 'function' \? _ttKaanonSv : tmKonseptiKaanon\) : null/g)).toHaveLength(4);
    expect(v).not.toMatch(/kaanon: \(typeof tmKonseptiKaanon === 'function'\) \? tmKonseptiKaanon : null/);
    expect(v).toContain('konseptiNimi: _vpKonseptiNimiNimella,');
    expect(v).toContain('esc(_vpKonseptiNimiNimella(jf.konsepti_nimi))');
    expect(teksti('lib/tm_vp_koti.js')).toContain("typeof opts.konseptiNimi === 'function' ? opts.konseptiNimi(r.teema)");
    expect(teksti('lib/tm_vp_koti_joukkueet.js').match(/o\.konseptiNimi\(r\.teema\)/g)).toHaveLength(2);
  });
});

/* Stub-reititin: jokainen reititinkutsun läpi kulkenut teksti saa "§"-merkin. Suomea, jolla ei ole merkkiä, ei saa jäädä näkyviin. */
function lataaLib(f) {
  const sb = { module: { exports: {} }, console }; sb.window = sb; sb.vpT = (s) => '§' + s; vm.createContext(sb);
  vm.runInContext(teksti('lib/' + f), sb);
  return sb.module.exports && Object.keys(sb.module.exports).length ? sb.module.exports : sb;
}
const el = () => ({ innerHTML: '', ownerDocument: null, querySelector() { return null; } });
describe('kypsyyskortti (lib/tm_kypsyys.js) — jokainen erän avain kulkee reitittimen kautta', () => {
  const KY = lataaLib('tm_kypsyys.js');
  const KYP = Object.values(R.LISTA).filter((r) => /Kypsyyskortti/.test(r[1])).map((r) => r[0]);
  const ajo = (data, opts) => { const e = el(); KY.tmKypsyys(e, data, opts || {}); return e.innerHTML; };
  const hist = [{ pvm: '2026-01-01', pituus_cm: 150 }, { pvm: '2026-04-01', pituus_cm: 152 }, { pvm: '2026-08-01', pituus_cm: 155 }];
  const H = [
    ajo({}), ajo({ phv_tila_koodi: 'PRE' }, { muoto: 'siru' }),
    ajo({ phv_tila_koodi: 'PH', maturity_offset: 1.2, phv_ika: 13.6, kronologinen_ika: 12.8, mittaus_pvm: '2026-03-14', kasvutahti_cm_v: 8, kasvuhistoria: hist, yli_ikaisyys: { poikkeuslupa: true } }),
    ajo({ phv_tila_koodi: 'POST', maturity_offset: -0.4, mittaus_pvm: '2026-03-14', kasvutahti_cm_v: 5, kasvuhistoria: hist }, {}),
    ajo({ phv_tila_koodi: 'LAH', maturity_offset: 0.1, kasvuhistoria: [hist[0]] }), ajo({ phv_tila_koodi: 'PRE', maturity_offset: -1, kasvutahti_cm_v: 2, kasvuhistoria: hist }),
    ajo({ phv_tila_koodi: 'AN', maturity_offset: 2 }, { muoto: 'siru' }), ajo({ maturity_offset: 0.2 }), ajo({ phv_tila_koodi: 'POST', maturity_offset: 1, kasvutahti_cm_v: 6, kasvuhistoria: hist, kronologinen_ika: 14, phv_ika: 14 }),
  ].join('\n');
  it('kaikki kypsyyskortin avaimet (paitsi tilan mukaan poissa olevat) näkyvät "§"-merkittyinä', () => {
    const puuttuu = KYP.filter((k) => !H.includes('§' + k) && !H.includes('§' + k.replace(/&/g, '&amp;')));
    expect(puuttuu).toEqual(['kasvutahti: kerätään', 'v edellä'].filter((k) => puuttuu.includes(k)));   // kaksi haaraa vaatii erikoistilan (alla erikseen)
  });
  it('erikoishaarat: kasvutahti kerätään (siru ilman tahtia) ja "v edellä" (varhaiskypsä + offset)', () => {
    expect(ajo({ phv_tila_koodi: 'PRE', maturity_offset: 0.5 }, { muoto: 'siru' })).toContain('§kasvutahti: kerätään');
    expect(ajo({ phv_tila_koodi: 'PH', maturity_offset: 1.2, phv_ika: 14, kronologinen_ika: 12.8, kasvutahti_cm_v: 6, kasvuhistoria: hist })).toContain('§v edellä');
  });
  it('ei suomenkielisiä tulkinta- tai otsikkotekstejä ilman reititinmerkkiä', () => {
    for (const k of ['Pre-PHV — fyysinen neutraali:', 'Fyysiset ikkunat auki:', 'Kypsyyttä ei mitattu', 'Kuormarajoitin (§28):', 'Mitä kypsyys tarkoittaa · §28', 'Mirwald 2002 · biologinen kypsyys', '📍 Tee kasvumittaus →']) expect(H.split('§' + k).join(''), k).not.toContain(k);
  });
});

describe('kehityskaari (lib/tm_kehityskaari.js) — alustat, selitteet ja nimet reitittimen kautta', () => {
  it('lähdekoodissa jokainen erän Kehityskaari-avain on _T-kutsun literaali (tai nimen/alustan taulukossa, jonka kutsupaikka kutsuu _T:tä)', () => {
    const src = teksti('lib/tm_kehityskaari.js');
    for (const [k] of R.LISTA.filter((r) => /Kehityskaari/.test(r[1]))) expect(src.includes("'" + k + "'") || src.includes('"' + k + '"') || (/ \(H-H\)$/.test(k) && src.includes("' (H-H)'")), k).toBe(true);
    expect(src.match(/_T\(_alustaLyhyt\(/g)).toHaveLength(2);
    expect(src).toContain("_esc(_T(tmKaariNimi(tk)), ctx.esc)");
  });
});
