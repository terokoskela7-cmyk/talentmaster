/**
 * TalentMaster™ — IDP R2 (pala 1): Mittaus v4 tulkinta-ensin -kehys (tab 1).
 * Kolme kääre-elementtiä f1/f2:n ympärille — data pikakentistä (§26), ei uutta laskentaa:
 *  (1) tuoreus + luotettavuus (§22), (2) §28 kypsyyslinssi, (3) nextstep + pelifoot. Tyhjä → rehellinen tyhjä.
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
  M = new Function(
    'var _jsvEsc = function(s){return String(s==null?"":s);};\n' +
    extract('function _vpMittausTuoreusHTML(p, ika) {') + '\n' +
    extract('function _vpMittausLinssiHTML(p, ika) {') + '\n' +
    extract('function _vpMittausNextStepHTML(p) {') + '\n' +
    'return { tuoreus: _vpMittausTuoreusHTML, linssi: _vpMittausLinssiHTML, next: _vpMittausNextStepHTML };'
  )();
});

describe('tuoreus + luotettavuus (§22)', () => {
  it('mittaus olemassa → pvm + patteristo + "1 testikerta — trendi vaatii 2" (ei _edellinen)', () => {
    const h = M.tuoreus({ hh_pvm: '2025-05-01' }, 13);
    expect(h).toContain('mit-fresh');
    expect(h).toContain('1.5.2025');
    expect(h).toContain('H-H-patteristo');
    expect(h).toContain('1 testikerta — trendi vaatii 2.');
    expect(h).toContain('samalla alustalla');   // §22
  });
  it('≥2 mittausta (hh_taso_edellinen) → "trendi käytettävissä"', () => {
    const h = M.tuoreus({ hh_pvm: '2025-05-01', hh_taso_edellinen: 2.2 }, 13);
    expect(h).toContain('trendi käytettävissä');
    expect(h).not.toContain('1 testikerta');
  });
  it('vanha data (>180 pv) → "yli 6 kk — suositellaan päivitystä"', () => {
    const h = M.tuoreus({ hh_pvm: '2020-01-01' }, 13);
    expect(h).toContain('yli 6 kk');
  });
  it('ei mittauksia → rehellinen tyhjä + Aloita mittaus (Testaus)', () => {
    const h = M.tuoreus({}, 13);
    expect(h).toContain('ei mittauksia vielä');
    expect(h).toContain('Aloita mittaus');
    expect(h).toContain('TalentMaster_Testaus_v9.html');
  });
  it('tk-tuloksin tuorein → tekniikkakilpailu-label', () => {
    const h = M.tuoreus({ tki_pvm: '2025-06-01' }, 13);
    expect(h).toContain('tekniikkakilpailu');
  });
});

describe('§28 kypsyyslinssi — PHV-tulkinta ohjaa fyysisen lukemista', () => {
  it('AN/POST → matala fyysinen = aito kehityskohde (§28)', () => {
    expect(M.linssi({ phv_tila: 'AN' })).toContain('aito kehityskohde');
    expect(M.linssi({ phv_tila: 'POST' })).toContain('aito kehityskohde');
  });
  it('PRE/LAH → odotettua, EI kehityskohde (§28 neutraali)', () => {
    expect(M.linssi({ phv_tila: 'PRE' })).toContain('odotettua, ei kehityskohde');
    expect(M.linssi({ phv_tila: 'LAH' })).toContain('odotettua, ei kehityskohde');
  });
  it('PH → kuormarajoitin', () => {
    expect(M.linssi({ phv_tila: 'PH' })).toContain('Kuormarajoitin');
  });
  it('ei PHV-dataa → kypsyys mittaamatta, ei tulkita kehityskohteeksi', () => {
    const h = M.linssi({});
    expect(h).toContain('kypsyys mittaamatta');
    expect(h).toContain('Kasvumittaus avaa');
  });
});

describe('nextstep + pelifoot', () => {
  it('3 CTA-riviä → oikeat tabit (Viikko/Kehitys/Arviointi) + peli-edellä-muistutus', () => {
    const h = M.next({});
    expect((h.match(/mit-nstep/g) || []).length).toBe(3);
    expect(h).toContain('_jspVaihda(4)');
    expect(h).toContain('_jspVaihda(3)');
    expect(h).toContain('_jspVaihda(2)');
    expect(h).toContain('Peli edellä testi');
  });
});

describe('kytkentä tab-1:een (rakenteellinen)', () => {
  it('tuoreus + §28-linssi ENNEN f1, nextstep f2:n jälkeen', () => {
    const iTuoreus = HTML.indexOf('_vpMittausTuoreusHTML(p, ika) :');
    const iLinssi = HTML.indexOf('_vpMittausLinssiHTML(p, ika) :');
    const iF1 = HTML.indexOf("_mSub('Fyysinen · mitattu') + f1");
    const iNext = HTML.indexOf('_vpMittausNextStepHTML(p) :');
    expect(iTuoreus).toBeGreaterThan(0);
    expect(iTuoreus).toBeLessThan(iLinssi);
    expect(iLinssi).toBeLessThan(iF1);
    expect(iF1).toBeLessThan(iNext);
  });
});
