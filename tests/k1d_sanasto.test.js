/**
 * K1d (Tero 20.10.2026) · SANASTOPORTTI: käyttäjälle näkyvissä fi-teksteissä ei esiinny "katselmus", "review", "Syvennä", "jakson arviointi", "IDP", "MDT" eikä "Raportointi"
 * (korvaajat: Kehityssuunnitelma · Jakson yhteenveto · Kehityskeskustelu · Pelaajaraportti · Seuran tilannekuva). Laajuus: Master, VP v25, Kehitystyöpöytä, Pelaaja, Vanhempi, ADAR-pikakortti ja niiden libit.
 * Skannaus: lib-FI-kartat (arvot) + merkkijonoliteraalit ja HTML-tekstit lähteistä; kommentit, tunnisteet (setWs('reviewit'), review_* …) ja konsolilokit ohitetaan.
 * SALLITUT POIKKEUKSET (nimetty, perusteltu — lista saa vain pienentyä):
 *   · kaaviopankin kaavioiden HYVÄKSYNTÄPROSESSI ("katselmus" = eri käsite kuin jakson yhteenveto): tm_i18n_common.js:n kaavioavaimet + Taktiikkataulu-tooltip (VP, Master)
 *   · sisäiset tunnisteet ja kehittäjälokit/-virheet: setWs('raportointi'|'reviewit'), "[polku] reviewit:", "[historia] reviewit:", "_vpKirjoitaReview: …" (heitetty virhe), tm_idp.js 'review ' (tallennettu idp_edistyma-arvo; näkyy muodossa "kehityskeskustelu N" idpEdistymaNayta:n kautta)
 *   · Seura/Admin/hinnoittelu (tm_henkilosto_i18n, tm_lang seura-ryhmä) ja Plan-Do-Review (tm_reflektio) eivät kuulu laajuuteen (brief 0: kehitystyöpöytä, Master, VP v25, pikakortti-upotukset, pelaaja/perhe).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { createRequire } from 'module';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url), JUURI = join(dirname(fileURLToPath(import.meta.url)), '..');
const POIS = /^lib\/tm_(henkilosto_i18n|kaavio_ui|kaavio_policy|reflektio|teknistaktiset|teknistaktiset_sv|lang|vp_i18n|master_i18n|lib_i18n)\.js$/;   // i18n-kartat: sv-arvot sisältävät vanhaa termiä (erä 80 korvaa); avaimet katetaan alla
const SIVUT = ['TalentMaster_VP_v25.html', 'TalentMaster_Master_v16.html', 'TalentMaster_Kehitystyopoyta.html', 'TalentMaster_Pelaaja_v7.html', 'TalentMaster_Vanhempi_v2.html', 'TalentMaster_ADAR_Pikakortti.html'];
const LIBIT = readdirSync(join(JUURI, 'lib')).filter((f) => f.endsWith('.js') && !POIS.test('lib/' + f)).map((f) => 'lib/' + f);
const KIELLETTY = /(?<![\w_.\-])(?:[Kk]atselmu\w*|Review\w*|review(?:it|in|iä|ia|i)?(?![\w_])|Syvennä|IDP(?![\w_])|[Rr]aportointi\w*|MDT(?![\w_\-]))|[Jj]akson arviointi/;
const SALLITTU = [
  /Taktiikkataulu — teknis-taktiset kuvat, katselmus ja hyväksyntä/,
  /setWs\(\\?'(?:raportointi|reviewit)\\?'\)/, /\[(?:polku|historia|vpTallennaReview[^\]]*)\]/, /_vpKirjoitaReview: pid/,
  /^Katselmus$/,   // kaaviopankin välilehti (tm_i18n_common.js)
  /Perustelu näkyy valmentajalle katselmuslangassa|Seuratason kaavion asettaa valmennuspäällikkö katselmuksessa|muokkaus vie takaisin katselmukseen|seuran omat kulkevat katselmuksen kautta|menee katselmukseen|tarkentaa katselmuksessa/,   // kaaviopankki (tm_i18n_common.js)
];
function segmentit(rivi) {
  const ulos = []; let m; const r = /'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g;
  while ((m = r.exec(rivi))) ulos.push(m[1] !== undefined ? m[1] : (m[2] !== undefined ? m[2] : m[3]));
  const r2 = />([^<>]{2,})</g; while ((m = r2.exec(rivi))) ulos.push(m[1]);
  return ulos;
}
function loydot(tiedosto) {
  const rivit = readFileSync(join(JUURI, tiedosto), 'utf8').split('\n'), ulos = []; let lohko = false;
  rivit.forEach((l, i) => {
    const t = l.trim();
    if (lohko) { if (t.includes('*/')) lohko = false; return; }
    if (t.startsWith('/*') && !t.includes('*/')) { lohko = true; return; }
    if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*') || t.startsWith('<!--')) return;
    const x = l.replace(/<!--.*?-->/g, '').replace(/\s\/\/ .*$/, '').replace(/\/\*.*?\*\//g, '');
    segmentit(x).forEach((s) => {
      if (!KIELLETTY.test(s) || /^[a-z_][\w.\-]*$/.test(s) || SALLITTU.some((a) => a.test(s))) return;
      if (tiedosto === 'lib/tm_idp.js' && /^review $/.test(s)) return;
      ulos.push(tiedosto + ':' + (i + 1) + ' ' + JSON.stringify(s.slice(0, 90)));
    });
  });
  return ulos;
}
describe('K1d · sanastoportti: ei kiellettyjä termejä käyttäjälle näkyvissä fi-teksteissä', () => {
  it('sivut ja libit (literaalit + HTML-tekstit)', () => {
    expect([].concat(...SIVUT.concat(LIBIT).map(loydot))).toEqual([]);
  });
  it('lib-FI-kartat (arvot)', () => {
    const rikkojat = [];
    for (const f of LIBIT) { let FI; try { FI = require('../' + f).FI; } catch (e) { continue; } if (!FI || typeof FI !== 'object') continue; for (const [k, v] of Object.entries(FI)) if (typeof v === 'string' && KIELLETTY.test(v) && !SALLITTU.some((a) => a.test(v))) rikkojat.push(f + ' ' + k + ': ' + v.slice(0, 60)); }
    expect(rikkojat).toEqual([]);
  });
  it('fi-avaimiset kartat (VP, Master, yhteiset): AVAIMISSA ei kiellettyjä termejä (sv-arvot ovat erän 80 korvattavia)', () => {
    const rikkojat = [];
    for (const [f, nimi] of [['lib/tm_vp_i18n.js', 'TM_VP_I18N'], ['lib/tm_master_i18n.js', 'TM_MASTER_I18N'], ['lib/tm_i18n_common.js', 'TM_I18N_COMMON']]) for (const k of Object.keys(require('../' + f)[nimi].sv)) if (KIELLETTY.test(k) && !SALLITTU.some((a) => a.test(k)) && !/^(?:[a-z_][\w.\-]*|\$\{.*)$/.test(k) && !/Observera|IDP-|förslag|väntar|Stäng|Skapa|Starta/.test(k)) rikkojat.push(f + ': ' + k.slice(0, 70));
    expect(rikkojat).toEqual([]);
  });
  it('EI VACUOUS: skanneri tunnistaa kielletyn sanan (negatiivitesti) ja poikkeukset ovat edelleen tarpeen', () => {
    expect(KIELLETTY.test('Tallenna review')).toBe(true); expect(KIELLETTY.test('Sulje jakso ja katselmus')).toBe(true); expect(KIELLETTY.test('IDP-tavoite')).toBe(true); expect(KIELLETTY.test('Syvennä')).toBe(true);
    expect(KIELLETTY.test('Jakson yhteenveto')).toBe(false); expect(KIELLETTY.test('Kehityskeskustelu')).toBe(false); expect(KIELLETTY.test('syvennytään siihen')).toBe(false); expect(KIELLETTY.test('review_viimeisin_pvm')).toBe(false);
    expect(readFileSync(join(JUURI, 'lib/tm_i18n_common.js'), 'utf8')).toMatch(/katselmuksessa|katselmukseen/);
  });
  it('uudet sanastotermit löytyvät kuoresta/libeistä (jakson yhteenveto, kehityskeskustelu, Seuran tilannekuva, Kehityssuunnitelma)', () => {
    const SJ = require('../lib/tm_tanaan_signaali.js').FI, KK = require('../lib/tm_kevyt_katselmus.js').FI, SI = require('../lib/tm_sanasto_info.js').FI, VP = readFileSync(join(JUURI, 'TalentMaster_VP_v25.html'), 'utf8');
    expect(SJ.ts_rytmi_otsikko).toBe('Jakson yhteenveto tai kehityskeskustelu viimeistään {pvm}'); expect(SJ.ts_rytmi_yhteenveto_nappi).toBe('Tee jakson yhteenveto'); expect(KK.kk_otsikko).toBe('Tee jakson yhteenveto'); expect(KK.kk_syvenna).toBe('Kehityskeskustelu');
    expect(SI.si_kehityssuunnitelma).toBe('Pelaajan kauden tavoite ja sen alla etenevät 6 viikon jaksot.'); expect(VP).toContain('data-i18n="Seuran tilannekuva"');
  });
});

/* K1d (21.10.2026): UUSILLE ruotsinkielisille teksteille (erä 80: PM:n kirjoittama, vietiin karttoihin) kielletyt sanat granskning · review · IDP.
   Termistö: docs/i18n/termisto.fi-sv.json (Utvecklingsplan · Periodsammanfattning · Utvecklingssamtal · Spelarrapport · Föreningens lägesbild). Vanhat, erän 80 ulkopuoliset sv-rivit eivät kuulu tähän. */
describe('K1d · sv-sanastoportti: erän 80 sv-tekstit', () => {
  const SV_KIELLETTY = /granskning|review|\bIDP\b/i;
  const P = JSON.parse(readFileSync(join(JUURI, 'docs/i18n/sv_kaannoserae_80_palautus.json'), 'utf8')).osiot;
  const rivit = Object.entries(P).flatMap(([o, x]) => Object.entries(x.rivit).map(([k, r]) => [o, k, r.sv]));
  it('palautuksen 240 riviä: ei granskning / review / IDP', () => {
    expect(rivit).toHaveLength(240); expect(rivit.filter(([, , sv]) => SV_KIELLETTY.test(sv)).map(([o, k]) => o + ':' + k)).toEqual([]);
  });
  it('samat rivit koodin sv-kartoissa (viety): ei kiellettyjä sanoja, arvo = palautus', () => {
    const VPL = 'lib/tm_vp_i18n.js', KARTTA = { vp_kartta: VPL, master_kartta: 'lib/tm_master_i18n.js', yhteiset_kartta: 'lib/tm_i18n_common.js', 'lib.tm_seuran_pulssi': VPL, 'lib.tm_vp_koti': VPL, 'lib.tm_vp_tilanne': VPL }, nimet = { vp_kartta: 'TM_VP_I18N', master_kartta: 'TM_MASTER_I18N', yhteiset_kartta: 'TM_I18N_COMMON', 'lib.tm_seuran_pulssi': 'TM_VP_I18N', 'lib.tm_vp_koti': 'TM_VP_I18N', 'lib.tm_vp_tilanne': 'TM_VP_I18N' };
    const LIB = require('../lib/tm_lib_i18n.js').TM_LIB_I18N.sv, rikkojat = [];
    for (const [o, k, sv] of rivit) { const m = KARTTA[o] ? require('../' + KARTTA[o])[nimet[o]].sv : (o === 'tm_lang' ? null : LIB); if (!m) continue; if (m[k] !== sv) rikkojat.push(o + ':' + k + ' ≠ palautus'); if (SV_KIELLETTY.test(String(m[k]))) rikkojat.push(o + ':' + k + ' kielletty'); }
    expect(rikkojat).toEqual([]);
  });
  it('EI VACUOUS: sv-portti tunnistaa kielletyn sanan; sovitut termit on tilassa "sovittu" termistössä (11 K1d-termiä)', () => {
    expect(SV_KIELLETTY.test('Granskning av perioden')).toBe(true); expect(SV_KIELLETTY.test('IDP-mål')).toBe(true); expect(SV_KIELLETTY.test('Periodsammanfattning')).toBe(false);
    const T = JSON.parse(readFileSync(join(JUURI, 'docs/i18n/termisto.fi-sv.json'), 'utf8')).termit, ODOTETUT = { Kehityssuunnitelma: 'Utvecklingsplan', 'Jakson yhteenveto': 'Periodsammanfattning', 'Tee jakson yhteenveto': 'Gör periodsammanfattning', Kehityskeskustelu: 'Utvecklingssamtal', Pelaajaraportti: 'Spelarrapport', 'Seuran tilannekuva': 'Föreningens lägesbild', Yhteenvetorytmi: 'sammanfattningsrytm', Yhteenvetoikkuna: 'sammanfattningsfönster', Ydinasiat: 'Nyckelpunkter', Päätöksenteko: 'Beslutsfattande', Reagointi: 'Reagering' };
    for (const [fi, sv] of Object.entries(ODOTETUT)) { const t = T.find((x) => x.fi === fi); expect(t, fi).toBeTruthy(); expect(t.tila, fi).toBe('sovittu'); expect(t.kaannokset.sv, fi).toBe(sv); }
    expect(T.filter((x) => x.tila === 'odottaa')).toEqual([]);
    expect(require('../lib/tm_master_i18n.js').TM_MASTER_I18N.sv.Kehittyvä).toBe('under utveckling');   // Masterin käännösmuisti (Teron korjaus 21.10.)
  });
});
