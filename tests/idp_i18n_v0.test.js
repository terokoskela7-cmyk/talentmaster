/**
 * TalentMaster™ — i18n V0: infra + baseline (putkitus, ei merkkijonojen irrotusta appeissa).
 * lib/tm_lang.js (siirretty src/lib→lib) node-turvallinen + exportit + tmKieliInitSeura + väri-fix.
 * Kytketty 6 tiedostoon (script-tag) + Rekisterointin 404-korjaus + kieli-init seurat/{id}.kieli:stä.
 * INVARIANTIT: fallback pitää fi:n ehjänä (aktiivinen→en→fi→avain) · sv 0 puuttuvaa avainta · §5 ei kiellettyä väriä.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const __dir = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const L = require('../lib/tm_lang.js');
const root = (f) => readFileSync(join(__dir, '..', f), 'utf8');

describe('lib/tm_lang.js — node-turva + exportit + fallback (fi ei rikkoudu)', () => {
  it('require OK, exportit paikallaan', () => {
    expect(typeof L.t).toBe('function');
    expect(typeof L.tmAsetaKieli).toBe('function');
    expect(typeof L.tmKieliInitSeura).toBe('function');
    expect(L.TM_LANG.fi && L.TM_LANG.sv && L.TM_LANG.en).toBeTruthy();
  });
  it('sv-käännös toimii · fi säilyy · puuttuva avain → fallback avain itse (ei kaadu)', () => {
    L.tmAsetaKieli('sv', false); expect(L.t('nav.yhteenveto')).toBe('Översikt');
    L.tmAsetaKieli('fi', false); expect(L.t('nav.yhteenveto')).toBe('Yhteenveto');
    expect(L.t('ei.ole.avainta.xyz')).toBe('ei.ole.avainta.xyz');
  });
  it('fi aktiivisena: puuttuva sv EI vaikuta — fi pysyy (fallback fi:hin)', () => {
    L.tmAsetaKieli('fi', false);
    // jokaiselle fi-avaimelle t() palauttaa fi-arvon (ei tyhjää/undefined)
    expect(L.t('yleiset.sovellus_nimi')).toBe(L.TM_LANG.fi.yleiset.sovellus_nimi);
  });
});

describe('lib/tm_lang.js — sv 0 puuttuvaa avainta (kattavuus vs fi)', () => {
  it('jokaiselle fi-merkkijonoavaimelle löytyy sv-merkkijono', () => {
    const puuttuu = [];
    const walk = (fi, sv, polku) => {
      Object.keys(fi).forEach((k) => {
        const p = polku ? polku + '.' + k : k;
        if (typeof fi[k] === 'string') { if (typeof (sv && sv[k]) !== 'string') puuttuu.push(p); }
        else if (fi[k] && typeof fi[k] === 'object') walk(fi[k], sv && sv[k], p);
      });
    };
    walk(L.TM_LANG.fi, L.TM_LANG.sv, '');
    expect(puuttuu).toEqual([]);
  });
});

describe('lib/tm_lang.js — §5 väri-fix + tmKieliInitSeura-prioriteetti', () => {
  it('emaileissa #28B090, EI kiellettyä #3EC9A7', () => {
    const src = root('lib/tm_lang.js');
    expect(src.includes('#3EC9A7')).toBe(false);
    expect(L.tmEmailTervetuloa({ kieli: 'sv', etunimi: 'X', rooli: 'valmentaja', resetLinkki: '#' })).toContain('#28B090');
  });
  it('tmKieliInitSeura: seura.kieli → aktivoi · null → fi · invalid → fi (ei persistoi seuraa)', () => {
    if (typeof localStorage !== 'undefined') localStorage.removeItem('tm_kieli');
    expect(L.tmKieliInitSeura('sv')).toBe('sv');
    expect(L.tmKieliInitSeura(null)).toBe('fi');
    expect(L.tmKieliInitSeura('klingon')).toBe('fi');
  });
});

describe('i18n V0 — putkitus kytketty 6 tiedostoon + 404-korjaus', () => {
  const apit = ['TalentMaster_VP_v25.html', 'TalentMaster_Master_v16.html', 'TalentMaster_Pelaaja_v7.html', 'TalentMaster_Vanhempi_v2.html', 'TalentMaster_Seura.html', 'TalentMaster_Rekisterointi_Suostumus.html'];
  it('kaikki 6 lataavat versioidun lib/tm_lang.js (?v=N)', () => {
    apit.forEach((f) => expect(root(f)).toMatch(/<script src="lib\/tm_lang\.js\?v=\d+">/));
  });
  it('Rekisterointi EI enää lataa rikkinäistä root-URLia (/talentmaster/tm_lang.js 404)', () => {
    expect(root('TalentMaster_Rekisterointi_Suostumus.html')).not.toContain('https://terokoskela7-cmyk.github.io/talentmaster/tm_lang.js');
  });
});

describe('i18n V0 — keskitetty kieli-init seurat/{id}.kieli:stä', () => {
  it('Rekisterointi: tmKieliInitSeura + laajennettu kartta (sibbovargarna/eif) + seura.kieli-luku', () => {
    const r = root('TalentMaster_Rekisterointi_Suostumus.html');
    expect(r).toContain('tmKieliInitSeura(');
    expect(r).toContain('sibbovargarna: \'sv\', eif: \'sv\'');
    expect(r).toContain("collection('seurat').doc(_seuraId).get()");
    expect(r).not.toContain("var kieliKartta = { 'vifk': 'sv', 'grifk': 'sv' };");   // vanha kovakoodattu poistettu
  });
  it('Seura: kieli-init seura-dokumentin kieli-kentästä', () => {
    expect(root('TalentMaster_Seura.html')).toContain('tmKieliInitSeura(data.kieli)');
  });
});

describe('i18n V0 — SW-cache + allowlist + re-export + migraatioskripti', () => {
  it('SW cachet bumpattu + tm_lang allowlistissa (offline)', () => {
    const p = root('sw_pelaaja.js'), v = root('sw_vanhempi.js');
    expect(p).toMatch(/const CACHE = 'tm-pelaaja-v(1[2-9]|[2-9]\d)'/);   // ≥v12 (löysä: kestää V1-A→v13 ym. bumpit)
    expect(v).toContain("const CACHE = 'tm-vanhempi-v6'");
    expect(p).toContain('/talentmaster/lib/tm_lang.js');
    expect(v).toContain('/talentmaster/lib/tm_lang.js');
  });
  it('src/lib/tm_lang.js on re-export (kanoninen = lib/)', () => {
    expect(root('src/lib/tm_lang.js')).toContain("require('../../lib/tm_lang.js')");
  });
  it('migraatioskripti idempotentti + oikeat sv-seurat + kuivaajo-oletus', () => {
    const s = root('scripts/i18n_set_kieli_sv.js');
    expect(s).toContain("RUOTSISEURAT = ['sibbovargarna', 'vifk', 'grifk', 'eif']");
    expect(s).toContain("updateMask.fieldPaths=kieli");
    expect(s).toContain('idempotentti skip');
    expect(s).toContain("DRY_RUN = !process.argv.includes('--apply')");
  });
});
