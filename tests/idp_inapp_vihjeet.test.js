/**
 * TalentMaster™ — IDP in-app-vihjeet: kontekstuaaliset ⓘ tap-behind -vihjeet IDP-flow'hun (Oura-tyyli).
 * Reuse: olemassa oleva TM_TESTI_OHJEET-rekisteri (yksi totuuslähde) + window._tmIBtn (ⓘ-affordanssi → _tmInfo-paneeli).
 * Vihjetekstit linjassa ihmisohjeen kanssa (docs/design/idp-kortti/IDP-kortti.dc.html). §7.22: eivät paljasta pelaajalle piilotettua.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const HTML = readFileSync(join(__dir, '..', 'TalentMaster_VP_v25.html'), 'utf8');

describe('vihjerekisteri (TM_TESTI_OHJEET) — 5 uutta IDP-flow-vihjettä, linjassa ihmisohjeen kanssa', () => {
  it('idp_kausitavoite: pitkä horisontti 6–12 kk + §37-roolit', () => {
    expect(HTML).toContain('idp_kausitavoite: {');
    expect(HTML).toContain('Kauden ankkuri (6–12 kk)');
    expect(HTML).toContain('kausitavoite (makro) sovitaan yhdessä');
  });
  it('idp_jaksofokus: meso 4–8 vk + kolme valintaa (domeeni/painopiste/teema) + yliajettavissa', () => {
    expect(HTML).toContain('idp_jaksofokus: {');
    expect(HTML).toContain('1 · Domeeni</b>');
    expect(HTML).toContain('teema on aina yliajettavissa');
    expect(HTML).toContain('less is more');
  });
  it('idp_moottori: ei pakota + 70/30 + §28-portti', () => {
    expect(HTML).toContain('idp_moottori: {');
    expect(HTML).toContain('ei pakota</strong>');
    expect(HTML).toContain('70/30');
    expect(HTML).toContain('vahvuustavoite jaksoon');
  });
  it('idp_tavoitejakauma: tasapaino — vähintään yksi vahvuustavoite', () => {
    expect(HTML).toContain('idp_tavoitejakauma: {');
    expect(HTML).toContain('vähintään yksi vahvuustavoite');
  });
  it('idp_pelaajan_aani: pelaajan ääni + sitoumus + VP vahvistaa (autonomia)', () => {
    expect(HTML).toContain('idp_pelaajan_aani: {');
    expect(HTML).toContain('pelaajan sitoumus jaksoon');
    expect(HTML).toContain('kysy, älä käske');
  });
  it('kukin vihje = otsikko + mita + tulkinta (rekisterirakenne)', () => {
    ['idp_kausitavoite', 'idp_jaksofokus', 'idp_moottori', 'idp_tavoitejakauma', 'idp_pelaajan_aani'].forEach(function (k) {
      const seg = HTML.slice(HTML.indexOf(k + ': {'), HTML.indexOf(k + ': {') + 900);
      expect(seg).toContain('otsikko:');
      expect(seg).toContain('mita:');
      expect(seg).toContain('tulkinta:');
    });
  });
});

describe('⓵-injektiot IDP-flow-osioihin (reuse window._tmIBtn, tap-behind)', () => {
  it('Kausitavoite (Kehitys TASO 1) + Jaksofokus (TASO 2) haitariotsikot', () => {
    expect(HTML).toContain("'Kausitavoite' + ((typeof window._tmIBtn === 'function') ? window._tmIBtn('idp_kausitavoite') : '')");
    expect(HTML).toContain("'Jaksofokus' + ((typeof window._tmIBtn === 'function') ? window._tmIBtn('idp_jaksofokus') : '')");
  });
  it('Moottori-otsikko + Tavoitejakauma-otsikko + Aloituksen Pelaajan ääni', () => {
    expect(HTML).toContain("Moottorin ehdotus · valitse polku' + ((typeof window._tmIBtn === 'function') ? window._tmIBtn('idp_moottori')");
    expect(HTML).toContain("🎯 Tavoitejakauma · sessiot → IDP' + ((typeof window._tmIBtn === 'function') ? window._tmIBtn('idp_tavoitejakauma')");
    expect(HTML).toContain("🗣 Pelaajan ääni' + ((typeof window._tmIBtn === 'function') ? window._tmIBtn('idp_pelaajan_aani')");
  });
});

describe('Oura / brändi §5 — ⓘ neutraali, ei uutta väriä, 0 pinkkiä', () => {
  it('_tmIBtn = neutraali ink3 ⓘ (ei teal-spämmiä)', () => {
    const seg = HTML.slice(HTML.indexOf('window._tmIBtn = function'), HTML.indexOf('window._tmIBtn = function') + 500);
    expect(seg).toContain('border:.5px solid var(--ink3)');
    expect(seg).toContain('color:var(--ink3)');
  });
  it('uusissa idp_-vihjeissä ei off-palette-pinkkiä (#c060a8)', () => {
    const seg = HTML.slice(HTML.indexOf('idp_kausitavoite: {'), HTML.indexOf('idp_pelaajan_aani: {') + 900);
    expect(seg).not.toContain('c060a8');
  });
});

describe('§7.22 — vihjeet eivät paljasta pelaajalle piilotettua (kuorma/ACWR/tasoluvut)', () => {
  it('uudet vihjeet eivät sisällä ACWR-lukua/kuormarankingia', () => {
    const seg = HTML.slice(HTML.indexOf('idp_kausitavoite: {'), HTML.indexOf('idp_pelaajan_aani: {') + 900);
    expect(seg).not.toContain('ACWR');
    expect(seg).not.toContain('kuormaranking');
  });
});

describe('_tmIBtn suoritettuna — renderöi ⓘ-napin uusille avaimille', () => {
  let iBtn;
  beforeAll(() => {
    const lines = HTML.split('\n');
    const s = lines.findIndex((l) => l.includes('window._tmIBtn = function(avain) {'));
    let e = -1;
    for (let i = s + 1; i < lines.length; i++) { if (lines[i] === '};') { e = i; break; } }
    const src = 'var window = { TM_TESTI_OHJEET: { idp_kausitavoite: { otsikko: "x" }, idp_jaksofokus: { otsikko: "y" } } };\n'
      + lines.slice(s, e + 1).join('\n') + '\n return window._tmIBtn;';
    iBtn = new Function(src)();
  });
  it('tunnettu avain → ⓘ-nappi joka avaa _tmInfo; tuntematon → tyhjä', () => {
    const b = iBtn('idp_kausitavoite');
    expect(b).toContain("window._tmInfo('idp_kausitavoite')");
    expect(b).toContain('<button');
    expect(iBtn('ei_ole')).toBe('');
  });
});
