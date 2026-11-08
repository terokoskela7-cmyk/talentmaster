/* sv-erä 100 (B12, PM 8.11.2026) — Seurahallinnan Kehitystilanne › "Kaikki luvut", 127 riviä. Code ei kirjoita ruotsia (§0): koodin sv = PM:n palautus
   (sha c901e72f…d0f3) merkki merkiltä. Kohde lib/tm_henkilosto_i18n.js (tmHT). Reititys: lib/tm_kehitystilanne.js renderNakyma (kutsujan T / _T, mallit _tv:llä,
   rivimäärä ennallaan) + Lohko 4:n kehotteet mallista ({k, p}, käännös renderöidessä). Lisäksi 10 jo kartassa olevaa tekstiä reititetty. Raportit pysyvät suomeksi. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const teksti = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const P = JSON.parse(teksti('docs/i18n/sv_kaannoserae_100_palautus.json')).osiot, G = JSON.parse(teksti('docs/i18n/sv_kaannoserae_100_gemini.json')).osiot;
const V = require('../scripts/i18n_vie_sv_era100.cjs'), H = require('../lib/tm_henkilosto_i18n.js').TM_HENKILOSTO_I18N.sv;
const C = (() => { const m = require('../lib/tm_i18n_common.js'); return (m.TM_I18N_COMMON || global.TM_I18N_COMMON).sv; })();
const KT = require('../lib/tm_kehitystilanne.js');
const rivit = P.seura_kaikki.rivit, JO_KARTASSA = G.seura_kaikki._lahde.jo_kartassa_vain_reititys;
const DATA = require('./helpers/kehitystilanne_demodata.cjs')(require('path').join(__dirname, '..')), NYT = '2026-10-02';
const svT = (k) => (typeof C[k] === 'string' ? C[k] : typeof H[k] === 'string' ? H[k] : k);
const TYHJA = { pelaajat: [], seura: DATA.seura || {}, joukkueet: [] };
const TILAT = (m) => { const auki = {}; m.lohko3.forEach((r) => { auki[r.nimi] = 1; }); return [{}, { saaKirjoittaa: true }, { saaKirjoittaa: true, kausikuvaSallittu: true }, { k1bRef: 'bio', auki }]; };
const renderoi = (t) => { let h = ''; for (const d of [DATA, TYHJA]) for (const jakso of [undefined, 'kevat']) { const m = KT.rakennaMalli(d, { nyt: NYT, jakso }); for (const o of TILAT(m)) h += KT.renderNakyma(m, Object.assign(t ? { t } : {}, o)); } return h; };
const FI = renderoi(null), SV = renderoi(svT);
const nakyy = (h, s) => h.includes(s) || h.includes(KT.esc(s));
/* Malli {x} täyttyy tekstissä: kiinteät osat peräkkäin ≤ 400 merkin sisällä (indexOf, ei regexiä → ei backtrackingia isossa HTML:ssä). */
const osuuMalli = (h, s) => { const o = s.split(/\{\w+\}/).filter(Boolean); for (let i = h.indexOf(o[0]); i >= 0; i = h.indexOf(o[0], i + 1)) { let p = i + o[0].length, ok = true; for (const x of o.slice(1)) { const j = h.indexOf(x, p); if (j < 0 || j - p > 400) { ok = false; break; } p = j + x.length; } if (ok) return true; } return false; };
const malliNakyy = (h, s) => osuuMalli(h, s) || osuuMalli(h, KT.esc(s));

describe('sv-erä 100 — vienti', () => {
  it('palautus = tarkistettu tiedosto (sha); 127 riviä = lähetetty erä; lähetetty sv tyhjä, palautettu täytetty, samat paikkamerkit', () => {
    expect(createHash('sha256').update(teksti('docs/i18n/sv_kaannoserae_100_palautus.json')).digest('hex')).toBe('c901e72f44960545da32064175f7460e2a1d8e4e05ba1ab00ba4266804efd0f3');
    expect(Object.keys(P)).toEqual(['seura_kaikki']); expect(Object.keys(rivit)).toHaveLength(127);
    expect(Object.keys(rivit).sort()).toEqual(Object.keys(G.seura_kaikki.rivit).sort());
    const pm = (s) => (s.match(/\{\w+\}/g) || []).sort().join();
    for (const [k, r] of Object.entries(rivit)) { expect(G.seura_kaikki.rivit[k].sv, k).toBe(''); expect(r.fi, k).toBe(k); expect(r.sv.trim(), k).not.toBe(''); expect(pm(r.sv), k).toBe(pm(k)); }
  });
  it('koodin sv = palautus merkki merkiltä (henkilöstökartta), eikä yhteinen kartta peitä riviä', () => {
    for (const [k, r] of Object.entries(rivit)) { expect(H[k], k).toBe(r.sv); expect(C[k], k).toBeUndefined(); }
  });
  it('idempotentti: uusintakuiva-ajo ei lisää mitään eikä löydä virheitä; jokainen avain koodissa lainausmerkeissä', () => {
    const t = V.vie({ kirjoita: false });
    expect(t.virheet).toEqual([]); expect(t.lisatty).toBe(0); expect(t.ohitettu).toHaveLength(127); expect(V.KOODISSA).toEqual({});
  });
});

describe('reititys ajettuna: sv-reititin → PM:n rivit, ilman reititintä suomi', () => {
  it('jokainen staattinen teksti, joka näkyy suomeksi, näkyy ruotsiksi PM:n muodossa (eikä suomeksi)', () => {
    const st = Object.keys(rivit).filter((k) => !/\{\w+\}/.test(k) && k.length > 3), nahty = st.filter((k) => nakyy(FI, k));
    expect(nahty.length).toBeGreaterThanOrEqual(80);
    for (const k of nahty) expect(nakyy(SV, rivit[k].sv), k).toBe(true);
    for (const k of ['Saavutammeko tavoitteemme ja kehittyvätkö pelaajat?', 'Lohko 3 · Joukkueet', 'Lohko 4 · Datan kattavuus', 'Mitä kirjaamalla luku paranee', 'Hidden Gem -tunnistukset']) expect(nakyy(SV, k), k).toBe(false);
  });
  it('paikkamerkilliset mallit: jokainen fi:ssä näkyvä malli täyttyy sv:ssä PM:n muodossa', () => {
    const mallit = Object.keys(rivit).filter((k) => /\{\w+\}/.test(k)), nahty = mallit.filter((k) => malliNakyy(FI, k));
    expect(nahty.length).toBeGreaterThanOrEqual(30);
    for (const k of nahty) expect(malliNakyy(SV, rivit[k].sv), k).toBe(true);
    const m = KT.rakennaMalli(DATA, { nyt: NYT }), h = KT.renderNakyma(m, { t: svT });
    expect(h).toContain(rivit['Lohko 1 · Seuran tavoitteet {v}'].sv.replace('{v}', m.vuosi));
  });
  it('Lohko 4:n kehotteet käännetään renderöidessä; Kori 3 -kehotteen mittarin nimi myös (erä 99)', () => {
    const m = KT.rakennaMalli(TYHJA, { nyt: NYT }), kori = m.lohko4.kehotteet.filter((k) => k.k === '{mittari}: kirjaa Kori 3 -tiedot.');
    expect(kori.length).toBeGreaterThan(0);
    const h = KT.renderNakyma(m, { t: svT });
    for (const k of kori) expect(h).toContain(KT.esc(rivit['{mittari}: kirjaa Kori 3 -tiedot.'].sv.replace('{mittari}', svT(k.p.mittari))));
    expect(KT.renderNakyma(m, {})).toContain(KT.esc(kori[0].p.mittari + ': kirjaa Kori 3 -tiedot.'));
    for (const k of m.lohko4.kehotteet) expect(Object.keys(rivit), k.k).toContain(k.k);
  });
  it('10 jo kartassa olevaa tekstiä reititetty: näkyvät sv:nä kartan muodossa', () => {
    expect(JO_KARTASSA).toHaveLength(10);
    for (const k of JO_KARTASSA) { expect(typeof svT(k) === 'string' && svT(k) !== k, k).toBe(true); expect(nakyy(SV, svT(k)), k).toBe(true); }
    for (const k of ['Sukupuoli', 'Ikävaihe', 'Jakso', 'Talenttiohjelma', 'Pelaajia, joilla testi alle 12 kk']) expect(nakyy(SV, k), k).toBe(false);
    expect(SV).toContain("ktSuodata('sukupuoli',this.value)"); expect(SV).toContain("ktSuodata('jakso',this.value)");   // suodatinavain pysyy suomeksi
  });
  it('raportit pysyvät suomeksi myös ruotsinkielisen Kaikki luvut -näkymän jälkeen (_T nollataan)', () => {
    const m = KT.rakennaMalli(DATA, { nyt: NYT }), ennen = [KT.raporttiHTML(m, 'seura'), KT.raporttiHTML(m, 'palloliitto')];
    KT.renderNakyma(m, { t: svT });
    expect([KT.raporttiHTML(m, 'seura'), KT.raporttiHTML(m, 'palloliitto')]).toEqual(ennen);
  });
  it('ilman reititintä suomi: fi-tekstit sellaisinaan', () => {
    for (const k of ['Saavutammeko tavoitteemme ja kehittyvätkö pelaajat?', 'Lohko 3 · Joukkueet', 'Mitä kirjaamalla luku paranee', 'Sukupuoli']) expect(nakyy(FI, k), k).toBe(true);
  });
  it('kirjaston rivimäärä ennallaan (katto 684): reititys olemassa oleville riveille', () => {
    expect(teksti('lib/tm_kehitystilanne.js').split('\n').length - 1).toBe(684);
  });
});
