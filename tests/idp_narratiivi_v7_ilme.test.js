/**
 * TalentMaster™ — IDP R1 (pala 3a): _vpIdpNarratiiviHTML → v7-selkärangan ILME.
 * Rakenne+spine ensin (brief-jako). Data/apurikutsut säilyvät; vain esitys (kääre/tyylit/järjestys) muuttuu.
 *
 * Lukitaan:
 *  A) Fokus-hero: _vpAloitusJaksofokusHTML = .idp-focal, iso serif-konsepti, TEAL-aksentti (ei amber CTA/eyebrow;
 *     amber vain 🟠 umpeutunut = aito varoitus, §5). "Yksi prioriteetti".
 *  B) Ääni-kortti: _vpPelaajanAaniHTML = .idp-voice + serif-lainaus (.idp-vq).
 *  C) Narratiivi: fokus-hero JOHTAA (ennen kausitavoitetta), kausitavoite calmed (.idp-sec), SÄILYTÄ-kutsut kaikki
 *     tallella (data-loss-vartija), spine + header ennallaan.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const HTML = readFileSync(join(__dir, '..', 'TalentMaster_VP_v25.html'), 'utf8');

// Grabaa top-level-funktio: alkuriviltä ensimmäiseen riviin joka on tasan "}" (funktion sulkeva aaltosulje col 0).
function extract(fnSignature) {
  const lines = HTML.split('\n');
  const s = lines.findIndex((l) => l.includes(fnSignature));
  if (s < 0) throw new Error('ei löytynyt: ' + fnSignature);
  let e = -1;
  for (let i = s + 1; i < lines.length; i++) { if (lines[i] === '}') { e = i; break; } }
  if (e < 0) throw new Error('sulkevaa } ei löytynyt: ' + fnSignature);
  return lines.slice(s, e + 1).join('\n');
}

let JF, AANI;
beforeAll(() => {
  JF = new Function(
    'var _jsvEsc = function(s){return String(s==null?"":s);};\n' +
    'var window = { TM_JAKSOFOKUS: { tmJfDomeeni: function(d){ return { ikoni:"⚽", nimi:"Teknis-taktinen", dim:"D2/D4" }; }, tmJfUmpeutunut: function(jf){ return !!(jf && jf.umpeutunut); } } };\n' +
    extract('function _vpAloitusJaksofokusHTML(p) {') + '\n return { _vpAloitusJaksofokusHTML: _vpAloitusJaksofokusHTML };'
  )();

  AANI = new Function(
    'var _jsvEsc = function(s){return String(s==null?"":s);};\n' +
    extract('function _vpPelaajanAaniHTML(p) {') + '\n return { _vpPelaajanAaniHTML: _vpPelaajanAaniHTML };'
  )();
});

describe('A — jaksofokus = teal fokus-hero (v7)', () => {
  it('renderöi .idp-focal + iso serif-konsepti + "Yksi prioriteetti" (Topias-pseudonyymi)', () => {
    const h = JF._vpAloitusJaksofokusHTML({ id: 'x1', jaksofokus: { konsepti_nimi: 'HALTUUNOTTO', domeeni: 'teknis_taktinen', kesto_vk: 6 } });
    expect(h).toContain('idp-focal');
    expect(h).toContain('idp-konsepti');
    expect(h).toContain('Yksi prioriteetti');
    expect(h).toContain('Haltuunotto');   // isoista → sentence case säilyy
  });

  it('aksentti TEAL, EI amber (§5: amber vain varoitukseen) — eyebrow + CTA teal', () => {
    const h = JF._vpAloitusJaksofokusHTML({ id: 'x1', jaksofokus: { konsepti_nimi: 'Haltuunotto', kesto_vk: 4 } });
    // eyebrow-luokka on teal (.idp-eyebrow → CSS teal). CTA-nappi teal rgba(40,176,144), ei amber rgba(224,160,64).
    expect(h).toContain('rgba(40,176,144,.12)');       // CTA teal-tausta
    expect(h).not.toContain('rgba(224,160,64,.1)');    // ei amber CTA-taustaa (vanha)
    expect(h).not.toContain('color:var(--amber);margin-bottom:4px');  // ei amber-eyebrowia (vanha)
  });

  it('🟠 umpeutunut säilyy amberina (aito varoitus)', () => {
    const h = JF._vpAloitusJaksofokusHTML({ id: 'x1', jaksofokus: { konsepti_nimi: 'Haltuunotto', umpeutunut: true } });
    expect(h).toContain('🟠 umpeutunut');
    expect(h).toContain('var(--amber)');
  });

  it('tyhjä jaksofokus → rehellinen tyhjä (ei kaadu)', () => {
    const h = JF._vpAloitusJaksofokusHTML({ id: 'x1' });
    expect(h).toContain('idp-focal');
    expect(h).toContain('Aseta jaksofokus');
  });
});

describe('B — pelaajan ääni = .idp-voice serif-lainaus (v7)', () => {
  it('renderöi .idp-voice + serif-lainaus (.idp-vq) kun miksi asetettu', () => {
    const h = AANI._vpPelaajanAaniHTML({ miksi_pelaan: 'Haluan ratkaista 1v1', pelaajatyyppi: 'Rohkea laituri' });
    expect(h).toContain('idp-voice');
    expect(h).toContain('idp-vq');
    expect(h).toContain('Haluan ratkaista 1v1');
    expect(h).toContain('Rohkea laituri');
  });
  it('tyhjä ääni → rehellinen tyhjä', () => {
    const h = AANI._vpPelaajanAaniHTML({});
    expect(h).toContain('idp-voice');
    expect(h).toContain('ei vielä asetettu');
  });
});

describe('C — narratiivin järjestys + data-loss-vartija + CSS', () => {
  it('v7-CSS-luokat määritelty (idp-focal/idp-voice/idp-eyebrow/idp-sec)', () => {
    ['.idp-focal', '.idp-voice', '.idp-eyebrow', '.idp-sec'].forEach((c) => expect(HTML).toContain(c + ' '));
  });

  it('fokus-hero JOHTAA: _vpAloitusJaksofokusHTML kutsutaan ENNEN _vpAloitusTavoiteHTML + stat-glance', () => {
    const iJf = HTML.indexOf('h += _vpAloitusJaksofokusHTML(p);');
    const iTav = HTML.indexOf('h += _vpAloitusTavoiteHTML(p);');
    const iStat = HTML.indexOf('h += _vpStatTiivisteHTML(p);');
    expect(iJf).toBeGreaterThan(0);
    expect(iJf).toBeLessThan(iTav);     // fokus ennen kausitavoitetta (yksi prioriteetti nostettuna)
    expect(iTav).toBeLessThan(iStat);   // stat-glance viimeisenä
  });

  it('SÄILYTÄ — kaikki Aloituksen apurikutsut tallella (ei sisältöhukkaa)', () => {
    ['_vpPelaajanAaniHTML(p)', '_vpXFactorAse(p)', '_vpStatTiivisteHTML(p)', '_vpAloitusTavoiteHTML(p)',
     '_vpAloitusJaksofokusHTML(p)', '_vpSitoumusHTML(p, pid)', '_vpPelipaikkaFundamentitHTML'].forEach((call) =>
      expect(HTML).toContain(call));
    // ⭐ Erottava ase (X-factor) + Kehityssuunnitelma-header ennallaan
    expect(HTML).toContain('⭐ Erottava ase');
    expect(HTML).toContain('TalentMaster · Kehityssuunnitelma');
    // R1.4: selkäranka korvattu v7 2-sarakkeella (.idp-cols) — spine-kääre poistettu
    expect(HTML).toContain('<div class="idp-cols"><div class="idp-col-l">');
    expect(HTML).not.toContain("h.replace('<!--IDP_SPINE-->'");
  });

  it('kausitavoite calmed .idp-sec (ei kilpaile fokus-heron kanssa)', () => {
    // _vpAloitusTavoiteHTML avaa nyt .idp-sec-kääreellä, ei teal-vasenreunakortilla
    expect(HTML).toContain("let h = '<div class=\"idp-seg idp-sec\"><span class=\"idp-node\"></span>';");
    expect(HTML).not.toContain('border-left:2px solid var(--teal);border-radius:10px;padding:16px 20px;margin-bottom:22px"><span class="idp-node"></span>');
  });
});
