/**
 * TalentMaster - i18n V4-B: Vanhempi_v2 reachable-näkymät sv.
 * 8 render-funktiota (rLogin/rKoti/rViikko/rKirjaa/rValmentaja/rVanhempiTekniikka/rKortti/rAsetukset) +
 * login-/kirjaus-virheviestit + datakartat reititetty t('vanhempi.*'):n läpi. Käännökset spec-taulukosta
 * (docs/CODE_BRIEF_I18N_V4B_VANHEMPI_SV.md) — fi sanatarkasti, sv/en täydelliset. S7.22: perhesävy neutraali,
 * ei tasolukuja/vertailua/painostusta; ei nimen taivutusta sv/en (V1-B2). Glossaari kanoninen.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const __dir = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const L = require('../lib/tm_lang.js');
const V = readFileSync(join(__dir, '..', 'TalentMaster_Vanhempi_v2.html'), 'utf8');

const KIELLETTY = /\bTKI\b|\bT[1-5]\b|percentil|better than|worse than/;
// avainjoukko V4-B:stä (edustava otos joka näkymästä)
const V4B_AVAIMET = [
  'login_otsikko', 'login_vaara_salasana', 'viim_tapahtumat', 'paaseeko_paikalle', 'ei_tapahtumia',
  'koti_kehitys', 'koti_viikossa', 'koti_treenitiedot_tyhja', 'viikko_tama', 'viikko_mita_teki',
  'tyyppi_T', 'tyyppi_lepo', 'tyyppi_harjoitus', 'akt_pihapeli_l', 'akt_muu_l', 'kirjaa_fii_iloinen',
  'kirjaa_mita_teki_nimi', 'kirjaa_pallohuom', 'kirjaa_virhe_oikeus', 'valm_viestit', 'valm_info_u19',
  'laji_ponnauttelu', 'laji_syotto', 'laji_pujottelu', 'laji_kuljetus_laukaus', 'laji_pituuspotku',
  'tuki_syotto', 'tek_mittaukset_tulossa', 'tek_vahvin_laji', 'tek_tarkeinta',
  'kortti_kausi', 'kortti_selite_numero', 'kortti_selite_stage',
  'aset_pin_ohje', 'aset_rooli_u12', 'aset_rooli_u19', 'aset_gdpr_u15',
];

describe('tm_lang vanhempi.* V4-B — kaikki 3 kieltä täydelliset', () => {
  it('V4-B-avaimet olemassa ei-tyhjinä fi/sv/en', () => {
    ['fi', 'sv', 'en'].forEach((k) => V4B_AVAIMET.forEach((a) => {
      expect(typeof L.TM_LANG[k].vanhempi[a]).toBe('string');
      expect(L.TM_LANG[k].vanhempi[a].trim().length).toBeGreaterThan(0);
    }));
  });
  it('vanhempi sv/en 0 puuttuvaa (deep vs fi) — fallback ehjä', () => {
    const fi = L.TM_LANG.fi.vanhempi;
    const puuttuu = [];
    ['sv', 'en'].forEach((lang) => Object.keys(fi).forEach((k) => {
      if (typeof fi[k] === 'string' && typeof L.TM_LANG[lang].vanhempi[k] !== 'string') puuttuu.push(lang + '.' + k);
    }));
    expect(puuttuu).toEqual([]);
  });
});

describe('V4-B2 addendum: A–L klusterit fi/sv/en + typo-fix + MM-substantiivit', () => {
  const ADD = ['valmentajalta', 'src_kirjasit', 'hero_tervetuloa', 'vinkki_u12', 'kirjaa_otsikko',
    'tek_profiili', 'tek_mitattu', 'tek_seuraava_askel', 'tek_nyt_tavoite', 'tek_matka',
    'mm_kulta', 'kortti_kausipassi', 'ilmoitukset', 'ilm1_l', 'toast_reset_linkki',
    'osat_pisin', 'mikro_bola', 'aika_juuri_nyt', 'hero_tyhja', 'synttari_tanaan', 'rsvp_tulossa', 'pwa_ios'];
  it('addendum-avaimet ei-tyhjinä fi/sv/en', () => {
    ['fi', 'sv', 'en'].forEach((k) => ADD.forEach((a) => expect(L.TM_LANG[k].vanhempi[a].trim().length).toBeGreaterThan(0)));
  });
  it('V4-B3 micro-fix: koti_kehityskaari_otsikko + aika_h/pv_sitten fi/sv/en', () => {
    ['koti_kehityskaari_otsikko', 'aika_h_sitten', 'aika_pv_sitten'].forEach((a) =>
      ['fi', 'sv', 'en'].forEach((k) => expect(L.TM_LANG[k].vanhempi[a].trim().length).toBeGreaterThan(0)));
    expect(L.TM_LANG.sv.vanhempi.koti_kehityskaari_otsikko).toBe('Utvecklingskurva');
    L.tmAsetaKieli('sv', false);
    expect(L.t('vanhempi.aika_h_sitten', { n: 2 })).toBe('2 h sedan');
    expect(L.t('vanhempi.aika_pv_sitten', { n: 3 })).toBe('3 dagar sedan');
    L.tmAsetaKieli('fi', false);
  });
  it('typo-fix: mikro_bola fi = "Bola Siempre" (ei "Sempre")', () => {
    expect(L.TM_LANG.fi.vanhempi.mikro_bola).toContain('Bola Siempre');
    expect(L.TM_LANG.fi.vanhempi.mikro_bola).not.toContain('Bola Sempre ');
  });
  it('MM-mitalikartta = substantiivit sv/en (guld/gold, ei illatiivia)', () => {
    expect(L.TM_LANG.sv.vanhempi.mm_kulta).toBe('guld');
    expect(L.TM_LANG.en.vanhempi.mm_kulta).toBe('gold');
    expect(L.TM_LANG.sv.vanhempi.tek_matka).toContain('Väg till {mitali}');
  });
  it('S7.22 D-lohko: mitalimatka/nyt-tavoite positiivisia, ei tasolukuja/vertailua/menetystä', () => {
    ['sv', 'en'].forEach((k) => ['tek_matka', 'tek_nyt_tavoite', 'tek_seuraava_askel', 'tek_profiili'].forEach((a) => {
      const v = L.TM_LANG[k].vanhempi[a];
      expect(KIELLETTY.test(v)).toBe(false);
      expect(/förlora|worse|sämre|jämför|better than|lose\b/i.test(v)).toBe(false);
    }));
    expect(L.TM_LANG.sv.vanhempi.tek_matka).toContain('💪');   // positiivinen kehys säilyy
  });
});

describe('S7.22 + glossaari + nimen taivutus (V1-B2)', () => {
  it('sv/en: ei kiellettyä S7.22-kieltä (koko vanhempi-kategoria)', () => {
    const osumat = [];
    ['sv', 'en'].forEach((lang) => Object.entries(L.TM_LANG[lang].vanhempi).forEach(([k, v]) => {
      if (typeof v === 'string' && KIELLETTY.test(v)) osumat.push(lang + '.' + k);
    }));
    expect(osumat).toEqual([]);
  });
  it('glossaari KANONINEN (ei Kimin VP-termejä)', () => {
    expect(L.TM_LANG.sv.vanhempi.laji_ponnauttelu).toBe('Jonglering');   // ei "Utkast"
    expect(L.TM_LANG.sv.vanhempi.laji_syotto).toBe('Passning');
    expect(L.TM_LANG.sv.vanhempi.laji_pujottelu).toBe('Slalom');          // ei "Dribbling"
    expect(L.TM_LANG.sv.vanhempi.laji_kuljetus_laukaus).toBe('Föring och skott');
    expect(L.TM_LANG.sv.vanhempi.laji_pituuspotku).toBe('Längdspark');
  });
  it('sv/en placeholder-avaimissa EI {gen}-genetiiviä (nimen taivutus poistettu)', () => {
    ['sv', 'en'].forEach((lang) => Object.entries(L.TM_LANG[lang].vanhempi).forEach(([k, v]) => {
      if (typeof v === 'string') expect(/\{gen\}/.test(v)).toBe(false);
    }));
    // fi säilyttää {gen}:n (koodi korvaa _genetiivi:llä)
    expect(/\{gen\}/.test(L.TM_LANG.fi.vanhempi.tek_vahvin_laji)).toBe(true);
  });
  it('S7.22-perhesävy: "matka ei arvosana" säilyy sv/en (kortti_selite_numero)', () => {
    expect(/resa/.test(L.TM_LANG.sv.vanhempi.kortti_selite_numero)).toBe(true);
    expect(/journey/.test(L.TM_LANG.en.vanhempi.kortti_selite_numero)).toBe(true);
  });
});

describe('fi-regressio: fi = nykyiset stringit sanatarkasti', () => {
  it('otos fi-arvoista identtinen lähteeseen', () => {
    expect(L.TM_LANG.fi.vanhempi.login_otsikko).toBe('KIRJAUDU SISÄÄN');
    expect(L.TM_LANG.fi.vanhempi.tyyppi_T).toBe('Pallotreeni');
    expect(L.TM_LANG.fi.vanhempi.laji_syotto).toBe('Syöttö');
    expect(L.TM_LANG.fi.vanhempi.kirjaa_pallohuom).toContain('Bola Sempre');   // fi-typo säilyy (regressio)
    expect(L.TM_LANG.sv.vanhempi.kirjaa_pallohuom).toContain('Bola Siempre');  // sv korjattu
  });
});

describe('Vanhempi_v2 kytkenta + cache-bust', () => {
  it('t(vanhempi.*)-kutsuja lisätty runsaasti (näkymät reititetty)', () => {
    expect((V.match(/t\('vanhempi\./g) || []).length).toBeGreaterThanOrEqual(60);
  });
  it('datakartat reititetty avaimiksi (_VANH_LAJINIMI, tyyppiLabel arvot = vanhempi.*-avaimia)', () => {
    expect(V).toContain("ponnauttelu:'vanhempi.laji_ponnauttelu'");
    expect(V).toContain("t(_VANH_LAJINIMI[");
  });
  it('keskeisiä kovakoodattuja fi-stringejä EI enää render-koodissa', () => {
    expect(V).not.toContain('>KIRJAUDU SISÄÄN<');
    expect(V).not.toContain("l:'Pihapeli'");
    expect(V).not.toContain("l:'Iloinen'");
  });
  it('tm_lang ?v>=7 + SW tm-vanhempi >=v10', () => {
    expect(V).toMatch(/lib\/tm_lang\.js\?v=([7-9]|\d\d)/);
    expect(readFileSync(join(__dir, '..', 'sw_vanhempi.js'), 'utf8')).toMatch(/tm-vanhempi-v(1[0-9]|[2-9]\d)/);
  });
});
