/**
 * TalentMaster™ — IDP R1 (pala 3b): v7:n loput additiiviset elementit _vpIdpNarratiiviHTML:ään.
 * Pelaajan peili (§4b cue reuse), Suunnitelman kaari + katselmusrytmi (EPPP), datatietoiset syvyys-kortit.
 * Kaikki pikakentistä (§26), ei uutta laskentaa; tyhjä → rehellinen tyhjä / CTA (§7.22).
 * (Molemmat teemat + render erikseen live-verifioitu headless-Chromella, ks. PR-kuvaus.)
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
  if (s < 0) throw new Error('ei löytynyt: ' + sig);
  let e = -1;
  for (let i = s + 1; i < lines.length; i++) { if (lines[i] === '}') { e = i; break; } }
  return lines.slice(s, e + 1).join('\n');
}

let M;
beforeAll(() => {
  const prelude =
    'var vpT = function(x){ return x; };\n' +
    'var _jsvEsc = function(s){return String(s==null?"":s);};\n' +
    // stub tmTtPelaaja (§4b) — palauttaa cue+miksi vain tunnetulle avaimelle
    'var tmTtPelaaja = function(a){ return a === "y_h0" ? { cue: "Mitä näit ennen kuin pallo tuli?", miksi: "Kun katsot ympärille, ehdit ennen muita." } : null; };\n' +
    'var window = { TM_JAKSOFOKUS: { tmJfKonsepti: function(dom, a){ return a === "attitude" ? { cue: "Mikä sai sinut yrittämään kovemmin?" } : null; } } };\n';
  M = new Function(
    prelude +
    extract('function _vpAloitusSentence(s) {') + '\n' +
    extract('function _vpAloitusPeiliHTML(p) {') + '\n' +
    extract('function _vpAloitusKaariHTML(p, ika) {') + '\n' +
    extract('function _vpAloitusSyvyysKortitHTML(p) {') + '\n' +
    'return { sc: _vpAloitusSentence, peili: _vpAloitusPeiliHTML, kaari: _vpAloitusKaariHTML, syvyys: _vpAloitusSyvyysKortitHTML };'
  )();
});

describe('_vpAloitusSentence — näyttönormalisointi', () => {
  it('HALTUUNOTTO → Haltuunotto; sekakirjaimet ennallaan', () => {
    expect(M.sc('HALTUUNOTTO')).toBe('Haltuunotto');
    expect(M.sc('Pallonhallinta')).toBe('Pallonhallinta');
  });
});

describe('pelaajan peili — §4b cue reuse, §7.22 rehellinen tyhjä', () => {
  it('teknis-taktinen jaksofokus (tmTtPelaaja) → .idp-mirror + lapsen cue + §7.22-note', () => {
    const h = M.peili({ jaksofokus: { konsepti_nimi: 'HAVAINNOINTI', konsepti_avain: 'y_h0', domeeni: 'teknis_taktinen' } });
    expect(h).toContain('idp-mirror');
    expect(h).toContain('Mitä näit ennen kuin pallo tuli?');
    expect(h).toContain('§7.22');
    expect(h).not.toMatch(/taso\s*\d|\/5/);   // ei tasolukuja pelaajalle
  });
  it('muu domeeni → jaksofokus-lib cue fallback', () => {
    const h = M.peili({ jaksofokus: { konsepti_nimi: 'Asenne', konsepti_avain: 'attitude', domeeni: 'psyykkinen' } });
    expect(h).toContain('idp-mirror');
    expect(h).toContain('Mikä sai sinut yrittämään kovemmin?');
  });
  it('ei jaksofokusta → tyhjä (ei keksitä)', () => {
    expect(M.peili({})).toBe('');
  });
  it('tuntematon avain (ei cueta) → tyhjä (§7.22 ei keksitä)', () => {
    expect(M.peili({ jaksofokus: { konsepti_nimi: 'Custom', konsepti_avain: 'tuntematon', domeeni: 'teknis_taktinen' } })).toBe('');
  });
});

describe('suunnitelman kaari + katselmusrytmi (EPPP)', () => {
  it('täysi: kausitavoite + jaksofokus + kehityskaari-rivit + nextrev', () => {
    const h = M.kaari({ idp_fokus: { nimi: 'Havainnointi', dim: 'D4' }, jaksofokus: { konsepti_nimi: 'HAVAINNOINTI' }, jaksofokus_historia: [{ konsepti_nimi: 'Pallonhallinta' }, { konsepti_nimi: 'Ketteryys' }] }, 13);
    expect(h).toContain('Suunnitelman kaari');
    expect(h).toContain('Havainnointi');
    expect(h).toContain('2 suljettua jaksoa');
    expect(h).toContain('Seuraava katselmus');
    expect(h).toContain('6 vk (EPPP ≥12 v)');   // ika 13 → 6 vk
  });
  it('EPPP-rytmi ikäportilla: 9–11 v → 12 vk', () => {
    expect(M.kaari({}, 10)).toContain('12 vk (EPPP 9–11 v)');
  });
  it('tyhjä: rehelliset tyhjät (ei asetettu / ei fokusta / ei suljettuja)', () => {
    const h = M.kaari({}, 13);
    expect(h).toContain('ei asetettu');
    expect(h).toContain('ei fokusta');
    expect(h).toContain('ei suljettuja jaksoja vielä');
  });
});

describe('datatietoiset syvyys-kortit — näytä mitä on, piilota mitä ei', () => {
  it('täysi data → 4 korttia data-tilassa (ei empty-luokkaa), klik → _jspVaihda', () => {
    const h = M.syvyys({ hh_pvm: '2025-05-01', d3_taso: 3, jaksofokus: { konsepti_nimi: 'X' } });
    expect((h.match(/idp-dcard/g) || []).length).toBe(4);
    expect(h).toContain('_jspVaihda(1)');
    expect(h).toContain('fokus aktiivinen');
    expect(h).not.toContain('idp-dstat empty');   // kaikki data → ei CTA-tilaa
  });
  it('tyhjä pelaaja → kaikki 4 korttia CTA-tilassa (toimintakehote, ei "ei dataa")', () => {
    const h = M.syvyys({});
    expect((h.match(/idp-dstat empty/g) || []).length).toBe(4);
    expect(h).toContain('0 mittausta · aloita');
    expect(h).toContain('ei fokusta · aseta');
  });
});

describe('kytkentä _vpIdpNarratiiviHTML:ään (rakenteellinen)', () => {
  it('peili fokus-heron alle · kaari statin jälkeen · syvyys ennen loppu-CTA:ta', () => {
    const iFokus = HTML.indexOf('h += _vpAloitusJaksofokusHTML(p);');
    const iPeili = HTML.indexOf('h += _vpAloitusPeiliHTML(p);');
    const iKaari = HTML.indexOf('h += _vpAloitusKaariHTML(p, ika);');
    const iSyvyys = HTML.indexOf('+ _vpAloitusSyvyysKortitHTML(p) +');
    const iCta = HTML.indexOf('→ Avaa Kehitys-työpöytä');
    expect(iFokus).toBeLessThan(iPeili);
    expect(iPeili).toBeLessThan(iKaari);
    expect(iKaari).toBeLessThan(iSyvyys);
    expect(iSyvyys).toBeLessThan(iCta);
  });
});
