/**
 * TalentMaster - i18n V4-A3 täydennys: kotinäyttö 100% sv + Osa B (seura.kieli, reitti 1).
 * Osa A: Bola Siempre (getTHarjoiteWhy → _hT, 21 paria pelaaja-alikartassa) · _streakViesti (4 tilaa, t()+{n})
 * · _signaaliLabel (Piilohelmi/PHV/putki) · fiilis (kysymys + labelit) → t(). S7.22 EHDOTON: streak positiivinen
 * putki-kehys, ei menetystä/vertailua/tasolukuja. Osa B: pelaajadokin kieli → tmKieliInitSeura (manuaali voittaa).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const __dir = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const H = require('../harjoitelogiikka_v4.js');
const WL = require('../tm_why_lauseet.js');
const L = require('../lib/tm_lang.js');
const PEL = readFileSync(join(__dir, '..', 'TalentMaster_Pelaaja_v7.html'), 'utf8');
const VAN = readFileSync(join(__dir, '..', 'TalentMaster_Vanhempi_v2.html'), 'utf8');

const KIELLETTY = /\bTKI\b|\bT[1-5]\b|percentil|better than|worse than/;

function withLang(lang, fn) {
  const prev = global.tmNykyinenKieli;
  global.tmNykyinenKieli = () => lang;
  try { return fn(); } finally { if (prev === undefined) delete global.tmNykyinenKieli; else global.tmNykyinenKieli = prev; }
}
afterEach(() => { delete global.tmNykyinenKieli; });

describe('Bola Siempre (getTHarjoiteWhy) sv — 21 paria pelaaja-alikartassa', () => {
  it('kaikki getTHarjoiteWhy-tulokset (3 stagea) resolvoituvat sv:ksi _hT:llä (0 puuttuvaa)', () => {
    withLang('sv', () => {
      ['1_leikkija', '2_rakentaja', '3_showcase'].forEach((st) => {
        const fi = WL.getTHarjoiteWhy(st);
        const sv = H._hT(fi);
        expect(typeof sv).toBe('string');
        expect(sv).not.toBe(fi);   // kaantyi
      });
    });
  });
  it('esimerkki: "Mene pihalle pelaamaan…" → sv', () => {
    withLang('sv', () => {
      expect(H._hT('Mene pihalle pelaamaan! Pihapelit kavereiden kanssa tekevät sinusta taiturin.'))
        .toBe('Gå ut på gården och spela! Gårdsspel med kompisar gör dig till en bollkonstnär.');
    });
  });
});

describe('tm_lang: streak/signaali/fiilis fi/sv/en täydelliset + S7.22-turvalliset', () => {
  const streakit = ['streak_0', 'streak_1_6', 'streak_7_13', 'streak_14'];
  const signaalit = ['sig_piilohelmi', 'sig_phv', 'sig_putki'];
  const fiilikset = ['fiilis_kysymys', 'fiilis_vahan_vasynyt', 'fiilis_mahtavaa'];
  it('kaikki avaimet ei-tyhjia stringeja kaikissa kielissa', () => {
    ['fi', 'sv', 'en'].forEach((k) => [...streakit, ...signaalit, ...fiilikset].forEach((a) => {
      expect(typeof L.TM_LANG[k].pelaaja[a]).toBe('string');
      expect(L.TM_LANG[k].pelaaja[a].trim().length).toBeGreaterThan(0);
    }));
  });
  it('streak {n}-interpolaatio toimii + positiivinen kehys (ei menetystä/vertailua)', () => {
    L.tmAsetaKieli('sv', false);
    expect(L.t('pelaaja.streak_1_6', { n: 5 })).toBe('🔥 5 dagars svit — fortsätt imorgon!');
    ['sv', 'en'].forEach((k) => streakit.forEach((a) => {
      const v = L.TM_LANG[k].pelaaja[a];
      expect(KIELLETTY.test(v)).toBe(false);
      expect(/förlora|miste|förlorar|you (will )?lose|tappa/i.test(v)).toBe(false);   // ei menetyskehystä
    }));
    L.tmAsetaKieli('fi', false);
  });
  it('sig/fiilis sv oikeasti kaannetty', () => {
    expect(L.TM_LANG.sv.pelaaja.sig_piilohelmi).toBe('Dold pärla');
    expect(L.TM_LANG.sv.pelaaja.fiilis_kysymys).toBe('Hur känns det?');
    expect(L.TM_LANG.sv.pelaaja.fiilis_mahtavaa).toBe('Toppen');
  });
  it('fi ei rikkoudu', () => {
    L.tmAsetaKieli('fi', false);
    expect(L.t('pelaaja.streak_0')).toBe('Aloita tänään — ensimmäinen askel on tärkein.');
    expect(L.t('pelaaja.fiilis_kysymys')).toBe('Miltä sinusta tuntuu?');
  });
});

describe('Pelaaja_v7 kytkenta (Osa A) — kaikki reititetty, ei kovakoodattua', () => {
  it('_streakViesti reititetty t():hen (4 tilaa)', () => {
    expect(PEL).toContain("return t('pelaaja.streak_0');");
    expect(PEL).toContain("return t('pelaaja.streak_1_6',  { n: streak });");
    expect(PEL).toContain("return t('pelaaja.streak_14', { n: streak });");
    expect(PEL).not.toContain('päivän putki — jatka huomenna');
  });
  it('_signaaliLabel reititetty (Piilohelmi/PHV/putki)', () => {
    expect(PEL).toContain("t('pelaaja.sig_piilohelmi')");
    expect(PEL).toContain("t('pelaaja.sig_phv')");
    expect(PEL).toContain("t('pelaaja.sig_putki', { n: _streak })");
    expect(PEL).not.toContain('💎 Piilohelmi</div>');
    expect(PEL).not.toContain('⚠ PHV — kevennä kuormaa</div>');
  });
  it('fiilis-osio reititetty (kysymys + labelit T():lla)', () => {
    expect(PEL).toContain("T('fiilis_kysymys')");
    expect(PEL).toContain("T('fiilis_vahan_vasynyt')");
    expect(PEL).toContain("T('fiilis_mahtavaa')");
    expect(PEL).not.toContain('>Miltä sinusta tuntuu?</div>');
  });
  it('Bola Siempre tWhy reititetty _hT:llä', () => {
    expect(PEL).toContain('const tWhy = (typeof _hT === \'function\') ? _hT(_tw) : _tw;');
  });
});

describe('Osa B — seura.kieli (reitti 1): pelaajadokin kieli → tmKieliInitSeura', () => {
  it('Pelaaja _kaynnistaAppUI soveltaa p.kieli (manuaali voittaa yha)', () => {
    expect(PEL).toContain("tmKieliInitSeura(p && p.kieli ? p.kieli : null)");
  });
  it('Vanhempi _kasitteleLapsi soveltaa lapsi.kieli', () => {
    expect(VAN).toContain("tmKieliInitSeura(lapsi && lapsi.kieli ? lapsi.kieli : null)");
  });
  it('migraatioskripti kirjoittaa kielen myos pelaajadokeille', () => {
    const S = readFileSync(join(__dir, '..', 'scripts', 'i18n_set_kieli_sv.js'), 'utf8');
    expect(S).toContain('async function asetaPelaajienKieli');
    expect(S).toContain('/pelaajat?');
    expect(S).toContain('updateMask.fieldPaths=kieli');
  });
});

describe('cache-bust', () => {
  it('harjoitelogiikka ?v>=12 · tm_lang ?v>=5 (Pelaaja+Vanhempi) · SW v19/v9', () => {
    expect(PEL).toMatch(/harjoitelogiikka_v4\.js\?v=(1[2-9]|[2-9]\d)/);
    expect(PEL).toMatch(/lib\/tm_lang\.js\?v=([5-9]|\d\d)/);
    expect(VAN).toMatch(/lib\/tm_lang\.js\?v=([5-9]|\d\d)/);
    expect(readFileSync(join(__dir, '..', 'sw_pelaaja.js'), 'utf8')).toMatch(/tm-pelaaja-v(19|[2-9]\d)/);
    expect(readFileSync(join(__dir, '..', 'sw_vanhempi.js'), 'utf8')).toMatch(/tm-vanhempi-v(9|\d\d)/);
  });
});
