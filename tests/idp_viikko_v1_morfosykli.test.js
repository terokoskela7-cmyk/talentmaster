/**
 * TalentMaster™ — R5: Viikko v1 morfosykli-työpöytä (VIIKKO_KISS_design_kartta_v1).
 * 8 muutosta: rail-vapaa 860 · foc-header · morfosykli-korttinauha (Oura, MD kalenterista) · display-first/edit-on-tap ·
 * §28 ensin + ACWR yksi arvo+sana · läsnäolo K2 + pelaajan ääni honest-empty + cue · katselmus-rivi · lähteet ⓘ-tapin taakse.
 * Reuse: sRPE/ACWR/§28/tavoitejakauma/läsnäolo/kirjaus-tallennus ennallaan — vain esitys+järjestys+syöttö-paljastus.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const HTML = readFileSync(join(__dir, '..', 'TalentMaster_VP_v25.html'), 'utf8');

function extract(sig) {
  const lines = HTML.split('\n');
  const s = lines.findIndex((l) => l.includes(sig));
  let e = -1;
  for (let i = s + 1; i < lines.length; i++) { if (lines[i] === '}') { e = i; break; } }
  return lines.slice(s, e + 1).join('\n');
}

describe('(1) rail-vapaa Viikko (tab 4) + leveyskatto 860', () => {
  it('_jspVaihda togglaa railvapaan kaikille IDP-tabeille 0–4', () => {
    expect(HTML).toContain('_grid.classList.toggle(\'jsp-railvapaa\', n === 0 || n === 1 || n === 2 || n === 3 || n === 4)');
  });
  it('#_jspTab4 = 860px (kapein, kartan .wrap)', () => {
    expect(HTML).toContain('.jsp-grid.jsp-railvapaa #_jspTab4 { width: 100%; max-width: 860px; margin-left: auto; margin-right: auto; }');
  });
});

describe('(2) foc-header + (8) empty-state', () => {
  it('foc-header kannettu jaksofokuksesta (konsepti + Opittu kun + mono-lähde)', () => {
    const T = extract('function _vpViikkoHTML(p) {');
    expect(T).toContain('Tämän viikon fokus · kannettu jaksofokuksesta');
    expect(T).toContain('Opittu kun: ');
    expect(T).toContain('↳ Kehitys · jaksofokus (');
  });
  it('empty-state kun ei jaksofokusta → CTA _jspVaihda(3)', () => {
    const T = extract('function _vpViikkoHTML(p) {');
    expect(T).toContain('Ei viikkosuunnitelmaa vielä');
    expect(T).toContain('📍 Aseta jaksofokus (Kehitys) →');
    expect(T).toContain('_jspVaihda(3)');
  });
});

describe('(3) morfosykli-korttinauha + MD kalenterista (Oura-muotokoodaus)', () => {
  it('nauha korvaa pystylistan (jsp-wk-strip 7-kortti)', () => {
    const G = extract('function _vpViikkoGridHTML(p) {');
    expect(G).toContain('_vpViikkoNauhaHTML(p, st)');
    expect(extract('function _vpViikkoNauhaHTML(p, st) {')).toContain('class="jsp-wk-strip"');
  });
  it('MD JOHDETTU kalenterin ottelu-tapahtumista (ei kovakoodattu la)', () => {
    const O = extract('function _vpViikkoOttelut(p, st) {');
    expect(O).toContain("t.tyyppi !== 'ottelu'");
    expect(O).toContain('_kalenteriTapahtumat');
    expect(HTML).toContain('function _vpViikkoMdLeima(dayIso, ottelutIsot)');
  });
  it('ottelu = ⚽ + neutraalireuna (EI amber-täyttöä; kartan .wd.match ohitettu)', () => {
    const N = extract('function _vpViikkoNauhaHTML(p, st) {');
    expect(N).toContain('⚽ Ottelu');
    // ei amber-taustaa ottelukortille (Oura: teal ainoa vahva aksentti)
    expect(N).not.toContain('background:rgba(224,160,64');
    expect(N).toContain('┈ lepo');   // legenda muotokoodaus
  });
  it('honest-empty: 0 ottelua → ei MD-leimoja (paljas nauha)', () => {
    expect(extract('function _vpViikkoNauhaHTML(p, st) {')).toContain('ei ottelua tällä viikolla');
  });
});

describe('(4) display-first / edit-on-tap (reuse handlerit, vain mount muuttuu)', () => {
  it('napautus → _vpViikkoAvaaMuokkaus togglaa auki-tilan (ei muuta tallennusta)', () => {
    expect(HTML).toContain('window._vpViikkoAvaaMuokkaus = function (pid, iso) {');
    expect(HTML).toContain("st.auki = (st.auki === iso) ? null : iso;");
  });
  it('avattu editori reuse:aa _vpViikkoRiviHTML:n (samat handlerit)', () => {
    const N = extract('function _vpViikkoNauhaHTML(p, st) {');
    expect(N).toContain('_vpViikkoRiviHTML(pid, day, st.rows[st.auki], st.tavoitteet)');
    // tallennuskoneisto ennallaan
    expect(HTML).toContain('window._vpViikkoSetKesto = function');
    expect(HTML).toContain('window._vpViikkoCycleLasna = function');
  });
});

describe('(5) §28 ensin + ACWR yksi arvo+sana (laskenta ennallaan)', () => {
  it('kuorma restrukturoitu: §28 ennen ACWR:ää · ACWR yksi arvo+sana + guard', () => {
    const K = extract('function _vpViikkoKuormaHTML(p, st) {');
    expect(K).toContain('Kuorma · viikko + §28');
    expect(K).toContain("const acwrSana = acwr == null ? 'kertyy ~4 vk'");
    expect(K).toContain('linjassa');
    expect(K).toContain('koholla');
    expect(K).toContain('ACWR vaatii ~4 vk kroonista pohjaa');   // guard säilyy
    // laskenta koskematon (reuse)
    expect(K).toContain('_vpViikkoSrpe(r.rpe, r.kesto_min)');
    expect(K).toContain('viikkoAU / krono');
  });
  it('§7.22: kuorma = valmentajan työkalu, ei pelaajalle', () => {
    expect(extract('function _vpViikkoKuormaHTML(p, st) {')).toContain('ei pelaajalle (§7.22)');
  });
});

describe('(6) läsnäolo K2 + pelaajan ääni honest-empty + cue', () => {
  it('läsnäolo reuse _vkoLasnaByTila · honest-empty jos ei merkintöjä', () => {
    const L = extract('function _vpViikkoLasnaoloHTML(p, st) {');
    expect(L).toContain('_vkoLasnaByTila(st.rows[d.iso].lasna)');
    expect(L).toContain('Ei merkittyä läsnäoloa vielä');
  });
  it('pelaajan ääni honest-empty (EI fabrikoi) + cue tmTtKysymykset:stä', () => {
    const A = extract('function _vpViikkoAaniHTML(p, st) {');
    expect(A).toContain('Ei pelaajan refleksiota vielä');
    expect(A).toContain('tmTtKysymykset(jf.konsepti_avain)');
    expect(A).toContain('Cue-kysymys (§4b)');
  });
});

describe('(7) katselmus-rivi + (8) lähteet ⓘ-tapin taakse', () => {
  it('katselmus-rivi (EPPP) + Avaa katselmus → Kehitys', () => {
    const R = extract('function _vpViikkoKatselmusHTML(p, st) {');
    expect(R).toContain('Seuraava katselmus ~');
    expect(R).toContain('Avaa katselmus →');
    expect(R).toContain('_jspVaihda(3)');
  });
  it('lähdekortit + mokknote default piilossa (⓵-toggle)', () => {
    const S = extract('function _vpViikkoLahteetHTML() {');
    expect(S).toContain('Mistä viikko koostuu (3 lähdettä)');
    expect(S).toContain('id="_vpViikkoLahteet" style="display:none');
    expect(S).toContain('Muokattava, ei lukittu');
  });
});

describe('render-järjestys (_vpViikkoGridHTML): nauha → duo → duo → katselmus → lähteet', () => {
  it('kartan järjestys', () => {
    const G = extract('function _vpViikkoGridHTML(p) {');
    const iNauha = G.indexOf('_vpViikkoNauhaHTML(p, st)');
    const iDuo1 = G.indexOf('_vpViikkoTavoitejakaumaHTML(p, st)');
    const iDuo2 = G.indexOf('_vpViikkoLasnaoloHTML(p, st)');
    const iRev = G.indexOf('_vpViikkoKatselmusHTML(p, st)');
    const iSrc = G.indexOf('_vpViikkoLahteetHTML()');
    expect(iNauha).toBeGreaterThan(0);
    expect(iNauha).toBeLessThan(iDuo1);
    expect(iDuo1).toBeLessThan(iDuo2);
    expect(iDuo2).toBeLessThan(iRev);
    expect(iRev).toBeLessThan(iSrc);
  });
});

describe('_vpViikkoMdLeima suoritettuna (MD kalenterista, honest-empty)', () => {
  let md;
  beforeAll(() => { md = new Function(extract('function _vpViikkoMdLeima(dayIso, ottelutIsot) {') + '\n return _vpViikkoMdLeima;')(); });
  it('0 ottelua → null · ottelupäivä → MD · ±n', () => {
    expect(md('2025-04-12', [])).toBe(null);
    expect(md('2025-04-12', ['2025-04-12'])).toBe('MD');
    expect(md('2025-04-10', ['2025-04-12'])).toBe('MD-2');
    expect(md('2025-04-13', ['2025-04-12'])).toBe('MD+1');
    // 2 ottelua → lähin ankkuroi
    expect(md('2025-04-13', ['2025-04-12', '2025-04-16'])).toBe('MD+1');
  });
});

describe('brändi §5 — 0 pinkkiä Viikko-funktioissa', () => {
  it('ei #c060a8 uusissa Viikko-lohkoissa', () => {
    ['function _vpViikkoHTML(p) {', 'function _vpViikkoNauhaHTML(p, st) {', 'function _vpViikkoKuormaHTML(p, st) {',
      'function _vpViikkoLasnaoloHTML(p, st) {', 'function _vpViikkoAaniHTML(p, st) {'].forEach(function (sig) {
      expect(extract(sig)).not.toContain('c060a8');
    });
  });
});
