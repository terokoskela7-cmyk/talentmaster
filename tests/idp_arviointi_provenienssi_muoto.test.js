/**
 * TalentMaster™ — Arviointi rauhallinen ilme: provenienssi MUOTOKOODAUKSEEN (teal ainoa aksentti, v3).
 * 3-väri (🟢 teal · 🔵 sininen · 👁 pinkki #c060a8) → muoto (● mit · ○ hav · ⊘ peli), teal. Off-palette pinkki poistettu näkyvistä.
 * Ei sisältölogiikkaa/arviointikoneistoa — vain väri/merkki.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const HTML = readFileSync(join(__dir, '..', 'TalentMaster_VP_v25.html'), 'utf8');

describe('provenienssi = muotokoodaus (v3 .pmark)', () => {
  it('CSS: .jsp-pmark shapes (mit teal disc · hav ontto rengas · peli katkoviiva)', () => {
    expect(HTML).toContain('.jsp-pmark.mit { background: var(--teal); }');
    expect(HTML).toContain('.jsp-pmark.hav { background: transparent; border: 1.5px solid var(--ink2); }');
    expect(HTML).toContain('.jsp-pmark.peli { background: transparent; border: 1.5px dashed var(--ink3); }');
  });
  it('näkyvät provenienssimerkit ovat muotoja, EI emojeita (🟢/🔵/👁 poistettu legendasta + otsikoista)', () => {
    // legenda + ryhmäotsikot käyttävät jsp-pmark-muotoa
    expect(HTML).toContain('<span class="jsp-pmark mit"></span> mitattu');
    expect(HTML).toContain('<div class="jsp-arv-ghd mit"><span class="jsp-pmark mit"></span> Mitattu');
    expect(HTML).toContain('<div class="jsp-arv-ghd hav"><span class="jsp-pmark hav"></span> Havaittu');
    expect(HTML).toContain('<div class="jsp-arv-ghd peli"><span class="jsp-pmark peli"></span> Pelihavainnosta');
    // ei enää emoji-provenienssia näkyvässä legendassa
    expect(HTML).not.toContain('🟢 mitattu</span> · <span style="color:var(--blue)">🔵 havaittu');
  });
});

describe('teal ainoa aksentti — sininen/pinkki pois provenienssista', () => {
  it('kattavuuspalkki teal (ent. sini-teal-liukuväri); aukko (<40%) amber', () => {
    expect(HTML).toContain('.jsp-arv-covfill { height: 100%; background: var(--teal);');
    expect(HTML).toContain('.jsp-arv-covfill.low { background: var(--amber); }');
    expect(HTML).toContain("(pct < 40 ? ' low' : '')");
    expect(HTML).not.toContain('linear-gradient(90deg,rgba(42,93,176,.7),rgba(40,176,144,.8))');
  });
  it('ryhmäotsikot: hav ink2 · peli ink3 (ei sininen/pinkki)', () => {
    expect(HTML).toContain('.jsp-arv-ghd.hav { color: var(--ink2); }');
    expect(HTML).toContain('.jsp-arv-ghd.peli { color: var(--ink3); }');
  });
  it('arvopalkit + seg-napit + pelih-chip: EI pinkkiä #c060a8 näkyvissä provenienssi-CSS:ssä (drift pois)', () => {
    expect(HTML).not.toContain('.jsp-arv-gfill.peli { background: linear-gradient(90deg,rgba(192,96,168,.5),#c060a8); }');
    expect(HTML).not.toContain('.jsp-arv-segbtn.on.peli { background: rgba(192,96,168,.28)');
    expect(HTML).not.toContain('.jsp-arv-pelih { display: inline-block; font-size: 8.5px; font-weight: 700; letter-spacing: .05em; color: #c060a8;');
  });
});
