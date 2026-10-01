/**
 * Henkilöstön joukkueet näyttöön (1.10.2026, #693-tuotantotestin löydös).
 * Valmentajalla kaksi joukkuetta (kayttajat.joukkueetNimet[]), mutta VP:n Valmentajatiimi, VP:n profiilikortti,
 * Seuran henkilöstö, UTJ ja Admin lukivat yksikkökenttää joukkueNimi/joukkue → näkyi vain "KPV T18".
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require_ = createRequire(import.meta.url);
const { tmHenkiloJoukkueNimet, tmHenkiloJoukkueTeksti } = require_(join(ROOT, 'lib', 'tm_joukkue.js'));
const lue = (f) => readFileSync(join(ROOT, f), 'utf8');

describe('tmHenkiloJoukkueNimet / tmHenkiloJoukkueTeksti', () => {
  it('kaksi joukkuetta kanonisesta kentästä → molemmat järjestyksessä', () => {
    const d = { joukkue: 'kpv_t18', joukkueNimi: 'KPV T18', joukkueet: ['kpv_t18', 'kpv_u13'], joukkueetNimet: ['KPV T18', 'KPV U13'] };
    expect(tmHenkiloJoukkueNimet(d)).toEqual(['KPV T18', 'KPV U13']);
    expect(tmHenkiloJoukkueTeksti(d, '—')).toBe('KPV T18 · KPV U13');
  });
  it('#693:n väärä kenttänimi joukkueNimet luetaan myös', () => {
    expect(tmHenkiloJoukkueTeksti({ joukkueNimi: 'KPV T18', joukkueNimet: ['KPV T18', 'KPV U13'] })).toBe('KPV T18 · KPV U13');
  });
  it('vain legacy-kentät → yksi joukkue; id:tä ei näytetä nimenä', () => {
    expect(tmHenkiloJoukkueNimet({ joukkueNimi: 'KPV U13', joukkueet: ['abc123XYZ'] })).toEqual(['KPV U13']);
    expect(tmHenkiloJoukkueNimet({ joukkue: 'SJK P15' })).toEqual(['SJK P15']);
  });
  it('duplikaatit ja tyhjät pois (kirjainkoko, välilyönnit)', () => {
    expect(tmHenkiloJoukkueNimet({ joukkueetNimet: ['KPV T18', ' kpv  t18', '', null, 'KPV U13'] })).toEqual(['KPV T18', 'KPV U13']);
  });
  it('ei joukkueita → oletusteksti; tyhjä lista ei estä legacy-fallbackia', () => {
    expect(tmHenkiloJoukkueTeksti({}, '—')).toBe('—');
    expect(tmHenkiloJoukkueTeksti(null)).toBe('');
    expect(tmHenkiloJoukkueTeksti({ joukkueetNimet: [], joukkueNimi: 'KPV U13' })).toBe('KPV U13');
  });
});

describe('henkilöstön näyttökohdat käyttävät koko listaa', () => {
  const VP = lue('TalentMaster_VP_v25.html');
  it.each([
    ['TalentMaster_VP_v25.html'], ['TalentMaster_Seura.html'], ['TalentMaster_UTJ_v1.html'], ['TalentMaster_Admin.html'],
  ])('%s lataa lib/tm_joukkue.js?v=4 ja kutsuu tmHenkiloJoukkueTeksti', (f) => {
    const s = lue(f);
    expect(s).toContain('<script src="lib/tm_joukkue.js?v=4"></script>');
    expect(s).toMatch(/tmHenkiloJoukkueTeksti\(/);
  });
  it('VP: Valmentajatiimin kortti, profiilikortti, paneelin otsikko ja roster näyttävät joukkueTeksti-kentän', () => {
    expect(VP).toContain("<div class=\"coach-team\">${rooliLabel} · ${_jsvEsc(v.joukkueTeksti || v.joukkue || '—')}</div>");
    expect(VP).toContain("_profRivi(vpT('Joukkue'), _jsvEsc(v.joukkueTeksti || v.joukkue || '—'))");
    expect(VP).toContain("rooliLabel + ' · ' + _jsvEsc(v.joukkueTeksti || v.joukkue || '—') + '</div></div></div>'");
    expect(VP).not.toMatch(/coach-team">\$\{rooliLabel\} · \$\{v\.joukkue/);
  });
  it('Seura, Admin ja UTJ eivät enää näytä henkilöstölle pelkkää yksikkökenttää', () => {
    expect(lue('TalentMaster_Seura.html')).not.toContain("${h.joukkueNimi||h.joukkue||'—'}");
    expect(lue('TalentMaster_Admin.html')).not.toContain("${esc(k.joukkueNimi || k.joukkue || '—')}");
    expect(lue('TalentMaster_UTJ_v1.html')).not.toContain("${e(u.joukkue||'')}");
  });
  it('ei vanhaa ?v=3-viittausta tm_joukkue.js:ään missään sivussa (stale cache)', () => {
    for (const f of ['TalentMaster_VP_v25.html', 'TalentMaster_Seura.html', 'TalentMaster_Admin.html', 'TalentMaster_UTJ_v1.html',
      'TalentMaster_Excel_Tuonti.html', 'TalentMaster_Pelihavainto_Kentta.html']) expect(lue(f)).not.toContain('tm_joukkue.js?v=3');
  });
});
