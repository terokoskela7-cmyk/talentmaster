/**
 * TalentMaster™ — IDP R1.2 + R1.3: teknis-taktinen konsepti-ydin fokus-heron sisään.
 * R1.3-korjaukset: (A) origin-kohtainen otsikko · (B) chain AIDOSTA silta-lähteestä (palloliittokohde D2·nimi arvo/5,
 * EI hav[konsepti_avain] joka oli väärä avainavaruus) · (C) TEE TÄSTÄ osa b:n sisällä (cue = osan teksti) + reflektio = kys[0].
 * Honest-empty: ei silta-matchia → ei lukua/chainia; ei kpi → ei kactionia; ei kysymyksiä → ei reflektiota.
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

let K;
beforeAll(() => {
  const ITEM = { avain: 'y_h0', koodi: 'Y-H0', nimi: 'HAVAINNOINTI', pelitilanne: 'kaikki alkaa tiedosta – 99 % pelistä.', kpi: [{ koodi: 'a', teksti: 'Sijoitu diagonaalisesti' }, { koodi: 'b', teksti: 'Pidä peliasento avoimena' }, { koodi: 'c', teksti: 'Rytmitä skannaus' }] };
  K = new Function(
    'var _jsvEsc = function(s){return String(s==null?"":s);};\n' +
    'var _vpAloitusSentence = function(s){ s=String(s||""); return (s===s.toUpperCase()&&s!==s.toLowerCase())?(s.charAt(0)+s.slice(1).toLowerCase()):s; };\n' +
    'var _vpSiltaKonsepti = function(a){ return a==="y_h0" ? ' + JSON.stringify(ITEM) + ' : null; };\n' +
    // R1.3: aito silta-lähde (palloliittokohde) — match konsepti_avain
    'var _vpSiltaEhdotukset = function(p, opts){ return [{ palloliitto_avain:"ball_control", palloliitto_nimi:"Pallonhallinta", arvo:2, konsepti_avain:"y_h0", konsepti_nimi:"HAVAINNOINTI" }]; };\n' +
    'var tmTtHarjoitteet = function(a){ return a==="Y-H0" ? [{},{}] : []; };\n' +
    'var tmTtKysymykset = function(a){ return a==="y_h0" ? ["Mitä näit ennen kuin pallo tuli?","Missä oli lähin vastustaja?"] : []; };\n' +
    extract('function _vpAloitusKonseptiYdinHTML(p) {') + '\n return { yd: _vpAloitusKonseptiYdinHTML };'
  )().yd;
});

const JF = { konsepti_nimi: 'HAVAINNOINTI', konsepti_avain: 'y_h0', konsepti_koodi: 'Y-H0', domeeni: 'teknis_taktinen' };

describe('R1.3 A — origin-kohtainen otsikko', () => {
  it('silta/arviointi → "silta arvioinnista"', () => {
    expect(K({ jaksofokus: Object.assign({}, JF, { lahde: 'arviointi' }) })).toContain('↳ Miksi tämä · silta arvioinnista');
  });
  it('silta_d1/fyysinen → "silta mittauksesta"', () => {
    expect(K({ jaksofokus: Object.assign({}, JF, { lahde: 'silta_d1', domeeni: 'fyysinen' }) })).toContain('↳ Miksi tämä · silta mittauksesta');
  });
  it('käsin → "asetettu käsin"', () => {
    expect(K({ jaksofokus: Object.assign({}, JF, { lahde: 'vp' }) })).toContain('↳ Miksi tämä · asetettu käsin');
  });
});

describe('R1.3 B — chain AIDOSTA silta-lähteestä (palloliittokohde, ei konsepti; D2 vakio)', () => {
  it('silta-match → chain-lähdesolmu = "D2 · Pallonhallinta 2/5" (palloliitto_nimi + arvo, EI konsepti)', () => {
    const h = K({ jaksofokus: Object.assign({}, JF, { lahde: 'arviointi' }) });
    expect(h).toContain('D2 · Pallonhallinta 2/5');
    expect(h).toContain('idp-chain');
    expect(h).toContain('node c');
    // lähdesolmu on palloliittokohde, EI konseptin nimi
    expect(h).toContain('<span class="node h">D2 · Pallonhallinta 2/5</span>');
  });
  it('honest-empty: ei matchaavaa silta-ehdotusta → EI lukua eikä chainia (ei fabrikointia)', () => {
    // mismatch konsepti_avain → src null
    const h = K({ jaksofokus: Object.assign({}, JF, { konsepti_avain: 'ei_matchia', lahde: 'arviointi' }) });
    expect(h).toContain('Havaittu <b>Arviointi-välilehdellä</b> → silta ehdotti konseptin.');
    expect(h).not.toContain('idp-chain');
    expect(h).not.toContain('/5');
  });
  it('d1-haara pysyy fyysisenä (ei palloliittokohde/chain)', () => {
    const h = K({ jaksofokus: Object.assign({}, JF, { lahde: 'silta_d1', domeeni: 'fyysinen' }) });
    expect(h).toContain('fyysisestä mittauksesta');
    expect(h).not.toContain('idp-chain');
  });
});

describe('R1.3 C — TEE TÄSTÄ osa b:n sisällä + reflektio erikseen', () => {
  it('kaction osa b:n (idx 1) sisällä, cue = OSAN teksti (ei reflektiokysymys)', () => {
    const h = K({ jaksofokus: JF });
    expect(h).toContain('idp-kaction');
    // cue = kpi[1].teksti "Pidä peliasento avoimena", EI kys[0]
    expect(h).toContain('Pidä peliasento avoimena · 2 harjoitetta');
    expect(h).toContain('_jspVaihda(4)');
    // kaction on kpi-rivin sisällä (ennen sen sulkevaa) — ei globaalina lopussa
    const iKpiB = h.indexOf('Pidä peliasento avoimena');
    const iKaction = h.indexOf('idp-kaction');
    const iKpiC = h.indexOf('Rytmitä skannaus');
    expect(iKpiB).toBeLessThan(iKaction);
    expect(iKaction).toBeLessThan(iKpiC);   // kaction ennen osaa c → osa b:n sisällä
  });
  it('reflektio erikseen = kys[0] (cue vapautti sen)', () => {
    const h = K({ jaksofokus: JF });
    expect(h).toContain('Reflektio: ”Mitä näit ennen kuin pallo tuli?”');   // kys[0]
  });
  it('per-osa-tila rehellinen tyhjä "arvioi Kehityksessä" (R4 kaappaa; 3 osaa)', () => {
    const h = K({ jaksofokus: JF });
    expect((h.match(/arvioi Kehityksessä/g) || []).length).toBe(3);
    expect(h).not.toContain('näkyy <b>itsenäisesti</b>');   // ei fabrikoitua 1–3-tilaa
  });
});

describe('rehellinen tyhjä + kytkentä', () => {
  it('ei jaksofokusta → tyhjä', () => { expect(K({})).toBe(''); });
  it('miksi = pelitilanne', () => { expect(K({ jaksofokus: JF })).toContain('kaikki alkaa tiedosta'); });
  it('kutsuttu _vpAloitusJaksofokusHTML:n sisältä (additiivinen)', () => {
    expect(extract('function _vpAloitusJaksofokusHTML(p) {')).toContain('h += _vpAloitusKonseptiYdinHTML(p);');
  });
  it('_vpSiltaEhdotukset sai ohitaPortti-parametrin (SSOT-reuse jaksofokus-pelaajalle)', () => {
    expect(HTML).toContain('if (!p || (p.jaksofokus && !opts.ohitaPortti)) return [];');
    expect(HTML).toContain('_vpSiltaEhdotukset(p, { ohitaPortti: true })');
  });
});
