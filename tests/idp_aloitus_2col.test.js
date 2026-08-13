/**
 * TalentMaster™ — IDP R1.4: Aloitus v7 2-sarakeasettelu (kartta .cols 1.5fr 1fr).
 * Rakenteellinen uudelleenasettelu (ei uutta dataa): täysleveä ylä (ääni + X-factor) → cols
 * [VASEN 1.5fr: fokus-hero + peili + kausitavoite + sitoumus · OIKEA 1fr: stat + kaari] → täysleveä ala.
 * Tutka on modaalin profiilirailissa → ei toisteta oikeassa sarakkeessa. Selkäranka korvattu 2-sarakkeella.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const HTML = readFileSync(join(__dir, '..', 'TalentMaster_VP_v25.html'), 'utf8');

function narratiivi() {
  const lines = HTML.split('\n');
  const s = lines.findIndex((l) => l.includes('function _vpIdpNarratiiviHTML(p) {'));
  let e = -1;
  for (let i = s + 1; i < lines.length; i++) { if (lines[i] === '}') { e = i; break; } }
  return lines.slice(s, e + 1).join('\n');
}

describe('R1.4 — 2-sarakerakenne (kartta .cols)', () => {
  const N = narratiivi();

  it('CSS: .idp-cols = grid 1.5fr 1fr + mobiili-stack + orpo-solmut piiloon', () => {
    expect(HTML).toContain('.idp-cols { display: grid; grid-template-columns: 1.5fr 1fr;');
    expect(HTML).toMatch(/@media \(max-width: 1000px\) \{ \.idp-cols \{ grid-template-columns: 1fr;/);
    expect(HTML).toContain('.idp-node { display: none; }');
  });

  it('selkäranka (.idp-spine-kääre) poistettu — ei enää IDP_SPINE-marker/replace', () => {
    expect(N).not.toContain('<!--IDP_SPINE-->');
    expect(N).not.toContain("h.replace('<!--IDP_SPINE-->'");
    expect(N).toContain('<div class="idp-cols"><div class="idp-col-l">');
  });

  it('VASEN sarake (1.5fr): fokus-hero → peili → kausitavoite → sitoumus', () => {
    const iColL = N.indexOf('<div class="idp-cols"><div class="idp-col-l">');
    const iColR = N.indexOf("h += '</div><div class=\"idp-col-r\">'");
    const iFokus = N.indexOf('h += _vpAloitusJaksofokusHTML(p);');
    const iPeili = N.indexOf('h += _vpAloitusPeiliHTML(p);');
    const iTav = N.indexOf('h += _vpAloitusTavoiteHTML(p);');
    const iSit = N.indexOf("_stitle('🤝 Sitoumus')");
    // järjestys vasemmassa sarakkeessa, kaikki ennen col-r:ää
    expect(iColL).toBeLessThan(iFokus);
    expect(iFokus).toBeLessThan(iPeili);
    expect(iPeili).toBeLessThan(iTav);
    expect(iTav).toBeLessThan(iSit);
    expect(iSit).toBeLessThan(iColR);
  });

  it('OIKEA sarake (1fr): stat + Suunnitelman kaari (EI tutkaa — se on profiilirailissa)', () => {
    const iColR = N.indexOf("h += '</div><div class=\"idp-col-r\">'");
    const iStat = N.indexOf('h += _vpStatTiivisteHTML(p);');
    const iKaari = N.indexOf('h += _vpAloitusKaariHTML(p, ika);');
    const iClose = N.indexOf("h += '</div></div>';");
    expect(iColR).toBeLessThan(iStat);
    expect(iStat).toBeLessThan(iKaari);
    expect(iKaari).toBeLessThan(iClose);
    // tutkaa ei renderöidä narratiivissa (profiilirailissa)
    expect(N).not.toContain('_tmRadar5D');
  });

  it('TÄYSLEVEÄ ala (cols:n jälkeen): pelipaikkafund. + syvyys-kortit + loppu-CTA', () => {
    const iClose = N.indexOf("h += '</div></div>';");
    const iPfund = N.indexOf('_vpPelipaikkaFundamentitHTML');
    const iDepth = N.indexOf('_vpAloitusSyvyysKortitHTML(p)');
    const iCta = N.indexOf('→ Avaa Kehitys-työpöytä');
    expect(iClose).toBeLessThan(iPfund);
    expect(iPfund).toBeLessThan(iDepth);
    expect(iDepth).toBeLessThan(iCta);
  });

  it('data-loss-vartija: kaikki apurikutsut tallella (vain sijoittelu muuttui)', () => {
    ['_vpPelaajanAaniHTML(p)', '_vpXFactorAse(p)', '_vpAloitusJaksofokusHTML(p)', '_vpAloitusPeiliHTML(p)',
     '_vpAloitusTavoiteHTML(p)', '_vpStatTiivisteHTML(p)', '_vpAloitusKaariHTML(p, ika)',
     '_vpSitoumusHTML(p, pid)', '_vpAloitusSyvyysKortitHTML(p)'].forEach((c) => expect(N).toContain(c));
  });
});
