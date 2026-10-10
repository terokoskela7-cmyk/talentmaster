/**
 * D2-bugi (8.10.2026): joukkueen D2-taso laskettiin kolmella tavalla — pulssikortti/poikkeamat TKI/20 ensin (2.7 "Tekniikka alle normin"), joukkuekortti d2_taso ensin (3.6).
 * Nyt YKSI lähde: tmJoukkueD2 (lib/tm_mittarit.js) = pelaajien laskeD2Taso-keskiarvo (d2_taso ensin, TKI/20 varalla). Tämä portti ajaa VP:n oikean renderTeamPulse-funktion vm:ssä.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import vm from 'vm';
const require = createRequire(import.meta.url);
const lue = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const VP = lue('TalentMaster_VP_v25.html');
const M = require('../lib/tm_mittarit.js');
function funktio(src, alku) { const i = src.indexOf(alku); if (i < 0) throw new Error('ei löydy ' + alku); let d = 0; for (let j = src.indexOf('{', i); j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}' && --d === 0) return src.slice(i, j + 1); } throw new Error('ei sulje'); }

function ymp() {
  const sb = { console: { log() {}, warn() {}, error() {} }, document: { getElementById: (id) => (id === 'joukkuekortit' ? sb.__el : null) }, __el: { innerHTML: '' } }; sb.window = sb; vm.createContext(sb);
  for (const f of ['lib/tm_phv_tila.js', 'lib/tm_mittarit.js', 'lib/tm_eerikkila_normit.js']) vm.runInContext(lue(f), sb);
  Object.assign(sb, { vpT: (x) => x, joukkueJarjestys: () => 0, lyhennaNimi: (x) => x, tmOnVanhaMittaus: () => false, tmPvmFi: (x) => x, tmKuukausiaMittauksesta: () => 0, onNeutraaliPrePHV: () => false, raeJoukkueJakauma: () => ({ n_kvartaalillisia: 0 }), _jsvJoukkueIkaSp: () => ({ ika: 10, sp: 'P' }) });
  for (const n of ['laskeJoukkueSuunta', '_pJNimet', '_pOnJoukkueessa', '_pRyhmiteltyJoukkueittain']) vm.runInContext(funktio(VP, 'function ' + n + '('), sb);
  vm.runInContext(funktio(VP, 'function renderTeamPulse('), sb);
  return sb;
}
const sb = ymp();
const kortti = (pelaajat) => { sb._pelaajat = pelaajat; sb.renderTeamPulse(); return sb.__el.innerHTML; };
const teksti = (html) => html.replace(/<[^>]+>/g, '|').replace(/\|+/g, '|');

// P10-tyyppinen joukkue: d2_taso ka 3.6 (3.625), TKI ka 54 (TKI/20 = 2.7), H-H 3.2
const P10 = [3, 4, 3.5, 4, 3.5, 4, 3.5, 3.5].map((d, i) => ({ id: 'p' + i, joukkue: 'Testi P10', d2_taso: d, tki_viimeisin: 54, hh_taso: 3.2 }));
const TKI_VAIN = [50, 60, 40, 70].map((t, i) => ({ id: 't' + i, joukkue: 'Testi P11', tki_viimeisin: t, hh_taso: 3.2 }));

describe('P10-tyyppinen joukkue: d2_taso ka 3.6, TKI ka 54 — pulssi, poikkeamat ja joukkuekortti antavat KAIKKI 3.6', () => {
  it('jaettu tmJoukkueD2 → 3.6 (lähde sm); on sama kuin pelaajien laskeD2Taso-keskiarvo', () => {
    const d = M.tmJoukkueD2(P10); expect(d).toMatchObject({ arvo: 3.6, lahde: 'sm', n: 8 });
    expect(Math.round(P10.reduce((s, p) => s + M.laskeD2Taso(p), 0) / P10.length * 10) / 10).toBe(3.6);
  });
  it('PULSSIKORTTI (VP renderTeamPulse): D2-rivi 3.6¹, ei "alle normin" -tilaa; TKI omana lukunaan "TKI ka 54 · tavoite 60"', () => {
    const t = teksti(kortti(P10));
    expect(t).toContain('|D2|3.6¹|'); expect(t).not.toMatch(/alle normin/i); expect(t).toContain('TKI ka 54 · tavoite 60'); expect(t).toContain('Vakaa');
  });
  it('pulssikortin D2-rivin yksikkö on TASO: lähde-teksti ei ole pelkkä "TKI" (SM-testi), palkki 3.6/5 = 72 %', () => {
    const html = kortti(P10); expect(html).toMatch(/jk-dim-label">D2<\/span>[\s\S]*?width:72%/); expect(html).toContain('<span class="jk-dim-ctx">SM-testi</span>'); expect(html).not.toContain('<span class="jk-dim-ctx">TKI</span>');
  });
  it('POIKKEAMAT (laskeJoukkuePoikkeamat): ei Tekniikka alle normin -poikkeamaa (aiemmin 2.7)', () => {
    const x = sb.laskeJoukkuePoikkeamat(P10, 10, 'M'); expect(x.filter((w) => w.osaAlue === 'tekniikka')).toEqual([]);
  });
  it('JOUKKUEKORTIN syvänäkymä: _dimKa(laskeD2Taso) = 3.6 — sama arvo kuin tmJoukkueD2', () => {
    const ka = (a) => { const v = a.filter((x) => x != null); return v.length ? Math.round((v.reduce((s, x) => s + x, 0) / v.length) * 10) / 10 : null; };
    expect(ka(P10.map((p) => M.laskeD2Taso(p)))).toBe(M.tmJoukkueD2(P10).arvo);
  });
});

describe('vain TKI: TKI/20-varalaskenta toimii edelleen kaikissa kolmessa paikassa', () => {
  it('tmJoukkueD2: (2.5+3+2+3.5)/4 → 2.8, lähde tki', () => { expect(M.tmJoukkueD2(TKI_VAIN)).toMatchObject({ arvo: 2.8, lahde: 'tki', n: 4 }); });
  it('pulssikortti: D2 2.8 ilman ¹, lähde "TKI-pohjainen"; poikkeamat: Tekniikka alle normin (2.8) — TKI-pohjainen taso on edelleen käytössä', () => {
    const t = teksti(kortti(TKI_VAIN)); expect(t).toContain('|D2|2.8|TKI-pohjainen|'); expect(t).toContain('TKI ka 55 · tavoite 60');
    const x = sb.laskeJoukkuePoikkeamat(TKI_VAIN, 11, 'M').filter((w) => w.osaAlue === 'tekniikka' && w.tyyppi === 'alle_normin'); expect(x.length).toBe(1); expect(x[0].arvo).toBe(2.8);
  });
  it('laskeD2Taso: d2_taso ensin, TKI/20 vain varalla; kumpaakaan ei → null', () => {
    expect(M.laskeD2Taso({ d2_taso: 3.6, tki_viimeisin: 54 })).toBe(3.6); expect(M.laskeD2Taso({ tki_viimeisin: 54 })).toBe(2.7); expect(M.laskeD2Taso({ hh_taso: 3 })).toBeNull();
  });
});

describe('tmJoukkueD2: raja ja lähde', () => {
  it('alle 3 pelaajaa → null (rivi piiloon); minN:1 sallii; tyhjä/virheellinen syöte → null', () => {
    expect(M.tmJoukkueD2(P10.slice(0, 2))).toBeNull(); expect(M.tmJoukkueD2(P10.slice(0, 2), { minN: 1 }).n).toBe(2); expect(M.tmJoukkueD2([])).toBeNull(); expect(M.tmJoukkueD2(null)).toBeNull(); expect(M.tmJoukkueD2([{ hh_taso: 3 }, null, {}])).toBeNull();
  });
  it('sekajoukko: yleisin lähde voittaa (sm/tk/hh = d2_lahde, TKI-varalaskenta = tki); tasatilanteessa ensin esiintynyt', () => {
    const jk = [{ d2_taso: 3, d2_lahde: 'tk' }, { d2_taso: 3, d2_lahde: 'tk' }, { tki_viimeisin: 60 }, { d2_taso: 4 }];
    expect(M.tmJoukkueD2(jk)).toMatchObject({ lahde: 'tk', n: 4 });
    expect(M.tmJoukkueD2([{ tki_viimeisin: 60 }, { d2_taso: 3 }, { d2_taso: 3 }, { tki_viimeisin: 40 }]).lahde).toBe('tki');   // 2–2 → ensin esiintynyt (tki)
  });
});

describe('comp() (talenttiydin, hajonta) käyttää laskeD2Tasoa, ei TKI/20:tä', () => {
  it('PR 3: talenttiydin-huomio poistettu — d2_taso 2.0 + TKI 90 ei tuota Kärkipelaajat-poikkeamaa (comp-lähdevartija alla säilyy)', () => {
    const jk = Array.from({ length: 6 }, (_, i) => ({ id: 'c' + i, d2_taso: 2.0, tki_viimeisin: 90 }));
    expect(sb.laskeJoukkuePoikkeamat(jk, 12, 'M').filter((w) => w.tyyppi === 'talenttiydin').length).toBe(0);
  });
  it('kalibraatio-chipit (toinen comp): lähdekoodissa ei tki_viimeisin / 20 -laskentaa', () => {
    const src = lue('lib/tm_eerikkila_normit.js'); const rivit = src.split('\n').filter((r) => /var comp = function/.test(r) || /var teknArvo/.test(r));
    expect(rivit.length).toBe(2); for (const r of rivit) expect(r).not.toMatch(/tki_viimeisin\s*\/\s*20/);
  });
});

describe('vartija: VP_v25 ei laske joukkuetason D2:ta TKI/20:stä — se tulee libistä', () => {
  const rivit = VP.split('\n');
  it('ei omaa laskeJoukkueD2-funktiota; joukkuekortti, hero ja KPI-kortti kutsuvat tmJoukkueD2:ta', () => {
    expect(VP).not.toMatch(/function laskeJoukkueD2\b/); expect(VP).not.toMatch(/laskeJoukkueD2\(/);
    expect(VP).toContain('const d2 = tmJoukkueD2(pelaajat);'); expect(VP).toContain('tmJoukkueD2(KP, { minN: 1 })'); expect(VP).toContain('const _d2T = tmJoukkueD2(pool);');
  });
  it('ei `tki_viimeisin / 20` -laskentaa — ainoa poikkeus on _pLvl (laskeD2Joustava, "lähimpänä tavoitetta", raportoitu erikseen)', () => {
    const osumat = rivit.map((r, i) => [i + 1, r]).filter(([, r]) => /tki_viimeisin\s*\/\s*20|tki_viimeisin\s*\)\s*\/\s*20/.test(r));
    expect(osumat.filter(([, r]) => !/laskeD2Joustava/.test(r))).toEqual([]);
  });
  it('joukkuetason reduce-keskiarvo ei summaa tki_viimeisin / 20 (aiempi laskeJoukkueD2-kuvio)', () => { expect(VP).not.toMatch(/reduce\([^)]*tki_viimeisin\s*\/\s*20/); });
  it('Rules-/kirjastoriippuvuus: tm_mittarit.js ladataan VP:ssä ENNEN tm_eerikkila_normit.js:n käyttöä ja ?v nostettu', () => { expect(VP).toMatch(/<script src="lib\/tm_mittarit\.js\?v=(\d+)"/); expect(+/tm_mittarit\.js\?v=(\d+)/.exec(VP)[1]).toBeGreaterThanOrEqual(6); });
});
