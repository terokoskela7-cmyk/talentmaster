/* sv-erä 98 (B12, PM 8.11.2026) — Seurahallinnan 61 tekstiä. Code ei kirjoita ruotsia (§0): koodin sv = PM:n palautus (sha a6f0fc53…9653) merkki merkiltä.
   Kohde lib/tm_henkilosto_i18n.js (tmHT). Luku-/nimirivit malleina: esimerkkiarvot paikkamerkeiksi samoista kohdista fi:ssä ja sv:ssä, malli täyttyy takaisin riviksi.
   Selainhyväksyntä: sv-läpiajo fx_seura + fx_seura_lage → ainoa suomi "Jo Strand" (testihenkilön nimi, PM: ei käännetä); CI:n sv-läpiajo --kaada ilman Seuran baselineriviä. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const teksti = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const P = JSON.parse(teksti('docs/i18n/sv_kaannoserae_98_palautus.json')).osiot, G = JSON.parse(teksti('docs/i18n/sv_kaannoserae_98_gemini.json')).osiot;
const V = require('../scripts/i18n_vie_sv_era98.cjs'), H = require('../lib/tm_henkilosto_i18n.js').TM_HENKILOSTO_I18N.sv;
const C = (() => { global.window = undefined; const m = require('../lib/tm_i18n_common.js'); return (m.TM_I18N_COMMON || global.TM_I18N_COMMON).sv; })();
const rivit = P.seura.rivit;

describe('sv-erä 98 — vienti', () => {
  it('palautus = tarkistettu tiedosto (sha); 61 riviä = lähetetty erä; lähetetty sv tyhjä, palautettu täytetty', () => {
    expect(createHash('sha256').update(teksti('docs/i18n/sv_kaannoserae_98_palautus.json')).digest('hex')).toBe('a6f0fc53224f4cd58babc0b0d638ff7f9f5bbc469a2b560158d756fe8a899653');
    expect(Object.keys(P)).toEqual(['seura']); expect(Object.keys(rivit)).toHaveLength(61);
    expect(Object.keys(rivit).sort()).toEqual(Object.keys(G.seura.rivit).sort());
    for (const [k, r] of Object.entries(rivit)) { expect(G.seura.rivit[k].sv, k).toBe(''); expect(r.fi, k).toBe(k); expect(r.sv.trim(), k).not.toBe(''); }
  });
  it('idempotentti: uusintakuiva-ajo ei lisää mitään eikä löydä virheitä (reititys, yhteinen kartta, ristiriidat)', () => {
    const t = V.vie({ kirjoita: false });
    expect(t.virheet).toEqual([]); expect(t.lisatty).toBe(0);
    expect(t.tmLang).toEqual(['📨 Tuo pelaajat Excelistä']); expect(t.eiKaanneta).toEqual(['Jo Strand']);
  });
  it('koodin sv = palautus merkki merkiltä: jokainen rivi syntyy kartasta (suora rivi tai täytetty malli)', () => {
    const sv = (k) => (typeof C[k] === 'string' ? C[k] : H[k]);
    const kayty = new Set();
    for (const [k, r] of Object.entries(rivit)) {
      const e = V.ERIKOIS[k] || {};
      if (e.eiKaanneta || e.tmLang) continue;
      if (e.jako) { const fo = k.split(e.jako); const osat = fo.map((f, i) => { const o = e.osat[i]; if (!o.malli) return sv(f); const d = V.johda(o.malli, f, r.sv.split(e.jako)[i]); return V.tayta(sv(d.avain), arvot(o.malli, f)); }); expect(osat.join(e.jako), k).toBe(r.sv); kayty.add(k); continue; }
      let fi = k, etu = '';
      if (e.etu) { fi = k.slice(e.etu.length + 1); etu = V.tayta(sv(V.ERIKOIS[e.etu].malli), arvot(V.ERIKOIS[e.etu].malli, e.etu)) + ' '; }
      const tulos = e.malli ? V.tayta(sv(e.malli), arvot(e.malli, fi)) : sv(fi);
      expect(etu + tulos, k).toBe(r.sv); kayty.add(k);
    }
    expect(kayty.size).toBe(59);
  });
  it('"📨 Tuo pelaajat Excelistä" = "📨 " + tm_langin seura.tuo_pelaajat_excelista (sama kuin PM:n); "Jo Strand" sv = fi', () => {
    const L = require('../lib/tm_lang.js').TM_LANG;
    expect('📨 ' + L.sv.seura.tuo_pelaajat_excelista).toBe(rivit['📨 Tuo pelaajat Excelistä'].sv);
    expect(rivit['Jo Strand'].sv).toBe('Jo Strand');
  });
  it('mallin johto kieltäytyy, jos malli ei vastaa riviä tai arvo puuttuu sv:stä (ei arvailua)', () => {
    expect(V.johda('{n} pelaajaa', '4 pelaajaa', '4 spelare')).toEqual({ avain: '{n} pelaajaa', sv: '{n} spelare' });
    expect(V.johda('{n} pelaajaa', '4 joukkuetta', '4 lag').virhe).toBeTruthy();
    expect(V.johda('{n} pelaajaa', '4 pelaajaa', 'fyra spelare').virhe).toMatch(/ei löydy/);
  });
  it('rivit, joita erä 98 ei kattanut (yksikkö "joukkueelle", "tavoite"-variantti, LAAJENNETTU), tulivat PM:n erästä 99 eivätkä erästä 98', () => {
    const P99 = JSON.parse(teksti('docs/i18n/sv_kaannoserae_99_palautus.json')).osiot.seura_muodot.rivit;
    for (const k of ['LAAJENNETTU', 'Kirjaa testikierros joukkueelle {joukkue} – fyysisen kehityksen luku tarkentuu.', '{p} pelaajista kehittyy fyysisesti, tavoite {t}.']) { expect(rivit, k).not.toHaveProperty([k]); expect(H[k], k).toBe(P99[k].sv); }
  });
});

/* fi-mallin arvot rivistä (sama regex kuin vientiskriptissä) */
function arvot(malli, fi) {
  const nimet = [...malli.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
  const m = new RegExp('^' + malli.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\{(\w+)\\\}/g, '(.+?)') + '$').exec(fi);
  const v = {}; nimet.forEach((n, i) => { v[n] = m[i + 1]; }); return v;
}

describe('B12: Seuran kieli auki (1.10.-linjaus purettu) ja kehitystilanteen reititys', () => {
  const KT = require('../lib/tm_kehitystilanne.js');
  it('kirjaston erän tekstit kulkevat reitittimen kautta (fi-tulos tavutarkasti ennallaan: sv-läpiajon fi-dump = main 8 näkymässä)', () => {
    const src = teksti('lib/tm_kehitystilanne.js');
    for (const k of ['Kehitystilanne', 'koko vuosi {v}', 'päivitetty {pvm}', '{a} / {b} tavoitetta raiteilla.', '{p} pelaajista kehittyy fyysisesti.', 'Kirjaa testikierros joukkueille {lista} ja {viim} – fyysisen kehityksen luku tarkentuu.', 'Ei tavoitetta']) expect(src.includes("T('" + k + "')"), k).toBe(true);   // T( tai _T( (kutsujan reititin)
    expect(src).toContain("T(auki ? 'Sulje ‹' : 'Avaa ›')"); expect(src).toContain("T(o.kaikki ? 'Piilota kaikki luvut ‹' : 'Kaikki luvut ›')");   // erä 99: avattu muoto samaan reitittimeen
    expect(typeof KT.ensinakymaMalli).toBe('function'); expect(KT.ensinakymaMalli.length).toBe(2);
  });
});

describe('B12: kehitystilanne ajettuna sv-reitittimellä', () => {
  it('renderEnsinakyma(o.t = kartta) → erän rivit ruotsiksi; ilman o.t:tä sama malli suomeksi', () => {
    const KT = require('../lib/tm_kehitystilanne.js');
    const src = teksti('lib/tm_kehitystilanne.js');
    expect(src).toMatch(/var T = _T = \(typeof o\.t === 'function' \? o\.t : _id\), e = ensinakymaMalli\(m, T\)/);
    const sv = (k) => (typeof H[k] === 'string' ? H[k] : k);
    expect(sv('{a} / {b} tavoitetta raiteilla.').replace('{a}', 0).replace('{b}', 0)).toBe(rivit['0 / 0 tavoitetta raiteilla.'].sv);
    expect(typeof KT.renderEnsinakyma).toBe('function');
  });
});
