/* sv-läpiajo PR 3 (Master) — reititys- ja kielivalintatestit.
 * (1) Gemini-erä: jokainen Masterin masterT-/data-i18n-avain ilman sv-riviä on erässä (osio master_kartta) — Code ei kirjoita ruotsia (CLAUDE.md §0).
 * (2) Curriculum-sidecar (tm_tt_sv_valinta.js): fi ennallaan, sv-kopio vain näyttöön, seuran oma teksti ei käänny, kirjoituspolut pysyvät fi:nä.
 * (3) Jakson tilakone: tmJaksoTila-tekstit fi ennallaan; yhdistelmät käännetään mallina (tmJaksoTeksti).
 * (4) Kulutuskohdat: datataulukot (DEMO, PROTOKOLLAT, …) joiden suomi on sallittu skannerissa reititetään masterT:llä näyttöhetkellä — rakenne lukittu tässä. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const lue = (f) => readFileSync(join(juuri, f), 'utf8');
const HTML = lue('TalentMaster_Master_v16.html');
const ERA = JSON.parse(lue('docs/i18n/sv_kaannoserae_2.json'));
const { masterAvaimet } = require('../tools/i18n/master_avaimet.cjs');

describe('Gemini-erä 2 — master_kartta', () => {
  const rivit = ERA.osiot.master_kartta.rivit;
  it('jokainen sv-riviä vailla oleva Masterin avain on erässä (avain = fi-teksti)', () => {
    const { puuttuu } = masterAvaimet(juuri);
    expect(puuttuu.filter((fi) => !rivit[fi]), 'aja: node scripts/i18n_luo_gemini_era.cjs').toEqual([]);
    Object.entries(rivit).forEach(([avain, r]) => expect(r.fi).toBe(avain));
  });
  it('erässä ei vanhentuneita rivejä: rivi jolle sv on jo koodissa on täytetty (vie erä, älä jätä tyhjänä)', () => {
    const { puuttuu } = masterAvaimet(juuri);
    const vanhentuneet = Object.keys(rivit).filter((fi) => !puuttuu.includes(fi) && !rivit[fi].sv);
    expect(vanhentuneet).toEqual([]);
  });
  it('EI VACUOUS: poiminta löytää satoja avaimia ja uudet PR 3 -avaimet', () => {
    const { kaikki } = masterAvaimet(juuri);
    expect(kaikki.length).toBeGreaterThan(800);
    expect(Object.keys(rivit)).toEqual(expect.arrayContaining(['Viesti · {nimi}:n perhe', 'Jakso käynnissä · vk {n}/{yht}', 'Pelaaja valitsi {kirjain}']));
  });
});

describe('tmTtSv — curriculumin kielivalinta (vain näyttöön)', () => {
  const { tmTtSv } = require('../lib/tm_tt_sv_valinta.js');
  const SV = require('../lib/tm_teknistaktiset_sv.js').TM_TT_SV;
  const TT = require('../lib/tm_teknistaktiset.js');
  const item = () => TT.tmTtItems({ ika: 13, joukkue: 'P13', positio: null, tt_positio_aktiivinen: null, syntymaVuosi: 2013 })[0];

  it('fi: kaikki palautuu sellaisenaan (sama viite)', () => {
    const S = tmTtSv('fi', SV), it0 = item();
    expect(S.paalla).toBe(false);
    expect(S.konsepti(it0)).toBe(it0);
    expect(S.kys('x', ['a'])).toEqual(['a']);
    expect(S.ppNimi('KH', 'Kärkihyökkääjä')).toBe('Kärkihyökkääjä');
  });
  it('en: sidecarissa ei ole en-lähdettä → sisältö jää suomeksi', () => {
    const S = tmTtSv('en', SV), it0 = item();
    expect(S.paalla).toBe(false);
    expect(S.konsepti(it0)).toBe(it0);
  });
  it('sv: teksti vaihtuu KOPIOSSA, alkuperäistä ei mutatoida; avain/koodi/enum-kentät ennallaan', () => {
    const S = tmTtSv('sv', SV), it0 = item(), nimiEnnen = it0.nimi, avainEnnen = it0.avain;
    const k = S.konsepti(it0);
    expect(k).not.toBe(it0);
    expect(it0.nimi).toBe(nimiEnnen);               // lib-data jaettu → ei mutaatiota
    expect(k.avain).toBe(avainEnnen);
    expect(k.koodi).toBe(it0.koodi);
    expect(k.faasi).toBe(it0.faasi);
    expect(k.nimi).not.toBe(nimiEnnen);             // oikeasti käännetty
    expect(k.nimi).toBe(SV[it0.avain + '.nimi']);
  });
  it('seuran oma kenttä (_seura_kentat) EI ylikirjoitu kaanonin ruotsilla — seuran teksti on dataa', () => {
    const S = tmTtSv('sv', SV), it0 = Object.assign({}, item(), { nimi: 'Seuran oma nimi', _seura_kentat: ['nimi'] });
    expect(S.konsepti(it0).nimi).toBe('Seuran oma nimi');
    expect(S.nimiAvaimella(it0.avain, 'x')).not.toBe('x');   // tallennetun nimen sv avaimella (kutsuja päättää _seura_kentat-tarkistuksen)
  });
  it('puuttuva käännös → fi (ei tyhjää)', () => {
    const S = tmTtSv('sv', {});
    expect(S.konsepti({ avain: 'tuntematon', nimi: 'Fi nimi' }).nimi).toBe('Fi nimi');
    expect(S.kys('tuntematon', ['Kysymys?'])).toEqual(['Kysymys?']);
    expect(S.nimiAvaimella('tuntematon', 'Tallennettu')).toBe('Tallennettu');
    expect(S.ppNimi('XX', 'Fi pp')).toBe('Fi pp');
  });
  it('cue-kysymykset: indeksit säilyvät; pelipaikan näyttönimi käännetään, koodi ei', () => {
    const S = tmTtSv('sv', SV), it0 = item(), kys = TT.tmTtKysymykset(it0.avain);
    const sv = S.kys(it0.avain, kys);
    expect(sv.length).toBe(kys.length);
    expect(sv[0]).toBe(SV[it0.avain.toLowerCase().replace(/-/g, '_') + '.kysymys.0'] || kys[0]);
    expect(S.ppNimi('KH', 'Kärkihyökkääjä')).toBe(SV['pelipaikka.KH.nimi']);
  });
  it('harjoitteet: lista- ja yksittäisobjektimuoto', () => {
    const S = tmTtSv('sv', { 'harjoite.KH-H0.0.teema': 'SV-teema', 'harjoite.KH-H1.teema': 'SV-yksi' });
    expect(S.harj('kh_h0', [{ teema: 'fi' }], [{}])[0].teema).toBe('SV-teema');
    expect(S.harj('kh_h1', [{ teema: 'fi' }], {})[0].teema).toBe('SV-yksi');
  });
});

describe('Master — curriculum: sv vain näyttöpolulla, kirjoituspolut kielineutraaleja', () => {
  it('kirjoituspolut käyttävät _mTtItems/_mKonseptiByAvain:ia (EI _ttS-näyttökopiota)', () => {
    // _ttVieTreeniin: konsepti_nimi: item.nimi tallennetaan Firestoreen → item oltava fi
    const a = HTML.indexOf('konsepti_nimi: item ? item.nimi : avain');
    expect(a).toBeGreaterThan(0);
    const lohko = HTML.slice(Math.max(0, a - 1500), a);
    expect(lohko).toMatch(/_mTtItems\(/);
    expect(lohko).not.toMatch(/_ttS\(\)/);
    // jakson aloitus (AJ.tmAloitaJaksoTiedot / syote / tmJoukkoRivi): items = _mTtItems(pp) ilman näyttökopiointia
    const aloitusItems = [...HTML.matchAll(/items: [^,]*_mTtItems\(pp\)[^,]*,/g)];
    expect(aloitusItems.length).toBeGreaterThanOrEqual(2);   // EI VACUOUS
    for (const m of aloitusItems) expect(m[0]).not.toMatch(/_ttS|\.map\(/);
    expect(HTML).toMatch(/konsepti_nimi: item \? item\.nimi : null/);
    const rivi = HTML.split('\n').find((r) => r.includes('konsepti_nimi: item ? item.nimi : null'));
    expect(rivi).not.toMatch(/_ttS/);
  });
  it('näyttöpolut kulkevat *Nayta-apureiden läpi', () => {
    expect(HTML).toMatch(/items = items\.map\(function \(it\) \{ return _ttS\(\)\.konsepti\(it\); \}\)/);   // _ttHTML
    expect(HTML).toMatch(/const kys = _mTtKysNayta\(item\.avain\)/);
    expect(HTML).toMatch(/const harj = _mTtHarjNayta\(item\.avain\)/);
    expect(HTML).toMatch(/_mKonseptiNimiNayta\(jf\.konsepti_avain, jf\.konsepti_nimi\)/);
    expect(HTML).toMatch(/_mPpNimi\(_posCode\)/);
  });
  it('seuran oma nimi-override ei käänny (_mKonseptiNimiNayta tarkistaa _seura_kentat)', () => {
    const a = HTML.indexOf('function _mKonseptiNimiNayta');
    expect(HTML.slice(a, a + 500)).toMatch(/_seura_kentat\.indexOf\('nimi'\) >= 0/);
  });
  it('sidecar + valinta-lib ladataan ennen pääskriptiä', () => {
    expect(HTML).toMatch(/<script src="lib\/tm_teknistaktiset_sv\.js\?v=\d+"><\/script>/);
    expect(HTML).toMatch(/<script src="lib\/tm_tt_sv_valinta\.js\?v=\d+"><\/script>/);
  });
});

describe('tmJaksoTila — rivitilan käännös', () => {
  const AJ = require('../lib/tm_aloita_jakso.js');
  const NYT = Date.parse('2026-10-14T10:00:00Z');
  const p = (jf) => ({ id: 'p1', jaksofokus: jf });
  const jakso = { konsepti_avain: 'j_e1', konsepti_nimi: 'X', alkoi: '2026-10-07T00:00:00Z', kesto_vk: 4, tila: 'aktiivinen' };
  it('fi: teksti ennallaan (S1/palvelin + fi-näkymät)', () => {
    const t = AJ.tmJaksoTila(p(jakso), { nyt: NYT });
    expect(t.rivitila.teksti).toMatch(/^Jakso käynnissä( · vk \d\/4)?$/);
    expect(AJ.tmJaksoTila(p(null), { nyt: NYT }).rivitila.teksti).toBe('Ei jaksoa');
  });
  it('tmJaksoTeksti: sv-malli osuu → paikkamerkit täytetään; ei osumaa → t(teksti) kuten ennen', () => {
    const t = AJ.tmJaksoTila(p(jakso), { nyt: NYT }), r = t.rivitila;
    expect(r.muoto).toBe('Jakso käynnissä · vk {n}/{yht}');
    const id = (k) => k;
    expect(AJ.tmJaksoTeksti(r, id)).toBe(r.teksti);                                   // fi: t palauttaa avaimen → teksti
    const tx = (k) => (k === 'Jakso käynnissä · vk {n}/{yht}' ? 'MALLI {n}/{yht}' : '[' + k + ']');
    expect(AJ.tmJaksoTeksti(r, tx)).toBe('MALLI ' + r.arvot.n + '/' + r.arvot.yht);   // käännetty malli
    const puuttuu = (k) => (k === r.muoto ? k : '[' + k + ']');
    expect(AJ.tmJaksoTeksti(r, puuttuu)).toBe('[' + r.teksti + ']');                  // malli puuttuu → teksti t():n läpi
    expect(AJ.tmJaksoTeksti(r)).toBe(r.teksti);                                       // ei t:tä
    expect(AJ.tmJaksoTeksti(null, id)).toBe('');
  });
  it('yksinkertaiset tilat eivät saa muotoa; ei jaksoa → yksi avain', () => {
    expect(AJ.tmJaksoTila(p(null), { nyt: NYT }).rivitila.muoto).toBeUndefined();
  });
  it('kuluttajat käyttävät tmJaksoTekstiä (kehitystyöpöytä: otsikkorivi + Tänään; joukkoaloitus: rivin tila)', () => {
    expect(lue('lib/tm_kehitystyopoyta.js')).toMatch(/esc\(_rt\(opts, tila\.rivitila\)\)/);
    expect(lue('lib/tm_kehitystyopoyta.js')).toMatch(/esc\(_rt\(opts, y\.rivitila\)\)/);
    expect(lue('lib/tm_joukkoaloitus.js')).toMatch(/tmJaksoTeksti\(r\.tilakone\.rivitila, t\)/);
  });
  it('functions/-kopio identtinen (deploy pakkaa vain functions/)', () => {
    expect(lue('functions/tm_aloita_jakso.js')).toBe(lue('lib/tm_aloita_jakso.js'));
  });
});

describe('data-i18n-aria — jaettu sweep', () => {
  const C = require('../lib/tm_i18n_common.js');
  it('aria-label vaihtuu sv:ksi kartan mukaan, fi pysyy', () => {
    const el = (fi) => { const a = { 'data-i18n-aria': fi }; return { getAttribute: (k) => a[k], setAttribute: (k, v) => { a[k] = v; }, a }; };
    const e1 = el('Ilmoitukset');
    const root = { querySelectorAll: (sel) => (sel === '[data-i18n-aria]' ? [e1] : []) };
    C.tmLokalisoiCommon(root, { sv: {} });
    expect(e1.a['aria-label']).toBe('Ilmoitukset');
  });
});

describe('Master — datataulukot reititetään kulutuskohdassa (skannerin allowlist nojaa tähän)', () => {
  const on = (re, viesti) => expect(HTML, viesti).toMatch(re);
  it('DEMO-kentät: Tänään (toimenpiteet, mittarit, ADAR-syöte, pelaajat), Kehitys (narratiivi), Kausi, Kalenteri', () => {
    on(/masterT\(a\.title\)/, 'actions.title'); on(/masterT\(a\.sub\)/, 'actions.sub'); on(/masterT\(a\.aika\)/, 'actions.aika');
    on(/masterT\(m\.lbl\)/, 'metrics.lbl'); on(/masterT\(m\.delta\)/, 'metrics.delta'); on(/masterT\(m\.ctx\)/, 'metrics.ctx');
    on(/masterT\(a\.date\)/, 'adar.date'); on(/masterT\(a\.text\)/, 'adar.text'); on(/masterT\(p\.note\)/, 'players.note');
    on(/kk: masterT\(n\.kk\), txt: masterT\(n\.txt\)/, 'narrative'); on(/masterT\(s\.fiilinki\.info\)/, 'season.fiilinki'); on(/masterT\(s\.acwr\.info\)/, 'season.acwr');
    on(/masterT\(e\.title\|\|''\)/, 'cal.title'); on(/masterT\(e\.meta\|\|''\)/, 'cal.meta');
    on(/masterT\('Kuormitus nousussa viikon kolmannella päivällä —'\)/, 'signal.title');
  });
  it('PROTOKOLLAT.nimi, M_VERKKO_*, _HH_SUOSITUS, _HA_KRIT_*, _D3_DIMS, CP_BASE', () => {
    on(/masterT\(PROTOKOLLAT\[viimTesti\.protokolla\]\?\.nimi/, 'testit-yhteenveto');
    on(/masterT\(t\.nimi \|\| PROTOKOLLAT\[t\.protokolla\]\?\.nimi/, 'signal-title');
    on(/masterT\(PROTOKOLLAT\[t\.protokolla\]\?\.nimi/, 'signal-sub');
    on(/masterT\(M_VERKKO_ILMOITUS\)/, 'verkko-ilmoitus'); on(/masterT\(M_VERKKO_TALLENNUS\)/, 'verkko-tallennus');
    on(/masterT\(_HH_SUOSITUS\[heikoin\.key\]/, 'hh-suositus');
    on(/masterT\(_HA_KRIT_B\[/, 'krit-b'); on(/masterT\(_HA_KRIT_NIMI\[/, 'krit-nimi');
    on(/masterT\(d\.nimi\)/, 'd3-nimi'); on(/masterT\(d\.vQ\)/, 'd3-vq');
    on(/\$\{masterT\(sec\)\}/, 'cp-section'); on(/\$\{masterT\(c\.label\)\}/, 'cp-label');
    on(/\$\{masterT\(suositus\)\}/, 'tsi-suositus'); on(/masterT\(NIMET\[g\.laji\]/, 'tki-nimet');
  });
  it('syy-koodit, loading-tekstit ja toastit reititetty', () => {
    on(/syy: masterT\('ei yhteyttä'\)/, 'syy'); on(/masterT\('Ladataan pelaajia\.\.\.'\)/, 'loading'); on(/toast\(masterT\('VP vahvisti IDP-näkemyksesi'\)/, 'toast');
  });
});
