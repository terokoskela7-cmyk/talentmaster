/**
 * Admin P2 (1.10.2026) · datan eheys ja KISS. Brief: Claude outputs/CODE_BRIEF_ADMIN_KOKONAISUUS.md §P2.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const lue = (f) => readFileSync(join(ROOT, f), 'utf8');
const ADMIN = lue('TalentMaster_Admin.html');

describe('Admin P2', () => {
  it('Massakutsu poissa: ei navia, näkymää eikä "Massakutsu tälle seuralle" -nappia', () => {
    expect(ADMIN).not.toContain("vaihdaNakyma('massakutsu'");
    expect(ADMIN).not.toContain('renderMassakutsu');
    expect(ADMIN).not.toContain('lataaMassakutsuSivu');
  });
  it('seuran poisto korvattu arkistoinnilla; seuradokumenttia ei poisteta selaimesta', () => {
    expect(ADMIN).not.toMatch(/collection\('seurat'\)\.doc\(seuraId\)\.delete\(\)/);
    expect(ADMIN).not.toContain('vahvistaPoistaSeura');
    expect(ADMIN).toContain("tila: 'arkistoitu'");
    expect(ADMIN).toContain("tila.seurat = tila.seurat.filter(s => s.tila !== 'arkistoitu');");
  });
  it('arkistoitu seura suodattuu listasta ja näkyy Arkistoidut-osiossa palautusnapilla (ajettu)', () => {
    const i = ADMIN.indexOf('function _arkistoidutSeuratHTML()');
    const src = ADMIN.slice(i, ADMIN.indexOf('function renderSeurat(', i));
    const ctx = { tila: { seuratArkistoidut: [{ id: 'x<', nimi: 'Vanha <b>FC</b>', tila: 'arkistoitu' }] },
      esc: (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') };
    vm.createContext(ctx); vm.runInContext(src, ctx);
    const h = ctx._arkistoidutSeuratHTML();
    expect(h).toContain('Arkistoidut seurat (1)');
    expect(h).toContain('palautaSeura(');
    expect(h).toContain('Vanha &lt;b&gt;FC&lt;/b&gt;');
    ctx.tila.seuratArkistoidut = [];
    expect(ctx._arkistoidutSeuratHTML()).toBe('');
  });
  it('Joukkueet vain luku: ei joukkueen poistoa Adminissa', () => {
    expect(ADMIN).not.toContain('poistaJoukkueAdmin');
    expect(ADMIN).not.toMatch(/collection\('joukkueet'\)\.doc\([^)]*\)\.delete\(\)/);
  });
  it('kirjautumisen VP-fallback poistettu (ei kaikkien seurojen lukua roolittomalle); admins-fallback säilyy', () => {
    expect(ADMIN).not.toContain('VP-tarkistus epäonnistui');
    expect(ADMIN).not.toMatch(/doc\.data\(\)\.vp_uid === kayttaja\.uid/);
    expect(ADMIN).toContain("db.collection('admins').doc(kayttaja.uid).get()");
  });
  it('Hallinnoi-modaalissa ei Pelaajan PIN -osiota', () => {
    expect(ADMIN).not.toContain('Pelaajan PIN (jos pelaaja-rooli)');
    expect(ADMIN).not.toContain('tallennaKayttajaPin');
  });
});

describe('setup-skriptit arkistossa, kovakoodattu SA-uid poissa', () => {
  it('tm_admin/setup_*.js → archive/tm_admin/', () => {
    for (const f of ['setup_admin.js', 'setup_seurat.js', 'setup_demo_fc.js']) {
      expect(existsSync(join(ROOT, 'tm_admin', f)), f).toBe(false);
      expect(existsSync(join(ROOT, 'archive', 'tm_admin', f)), f).toBe(true);
    }
  });
  // UTJ_v1 arkistoitu 2026-10 (docs/UTJ_TALTEEN.md) → poistettu listalta.
  it.each([['TalentMaster_VP_v25.html'], ['TalentMaster_Agent_v1.html'], ['functions/valmennusapuri.js']])(
    '%s ei sisällä vanhaa SA-uid:tä', (f) => { expect(lue(f)).not.toContain('dqUzvJA61Wb9fgj5UiK0riSA4NI2'); });
  it('valmennusapuri tunnistaa SA:n admins-dokumentista (UTJ_v1 arkistoitu 2026-10)', () => {
    expect(lue('functions/valmennusapuri.js')).toContain('const onSA = adminSnap.exists;');
  });
});
