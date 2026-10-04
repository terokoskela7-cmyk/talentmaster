/**
 * TALLENNETTAVAT PÄIVÄT PAIKALLISINA (PR 2/2, #722:n jatko). Suomessa klo 00:00–02:59 (EEST) / 00:00–01:59 (EET) UTC-päivä on
 * EDELLINEN päivä → dokumentti-ID:t (kirjaukset/{pvm}, reviewit/{pvm}) ja pvm-kentät menivät väärälle päivälle.
 *  1) tmPaivaIso klo 23:59 / 00:30 / 02:59 Helsingin aikaa (kesä, talvi, kellonsiirtopäivät 29.3. ja 25.10.2026)
 *  2) oikeat libit (tm_idp, tm_pikakentat) ajettuna kiinnitetyllä kellolla 00:30 Helsinki → paikallinen päivä
 *  3) Vanhempi_v2 ja Pelaaja_v7 muodostavat klo 00:30 SAMAN kirjaukset/{pvm}-avaimen (sama dokumentti)
 *  4) lähdekontrakti: tallentavat kohdat käyttävät tmPaivaIso/_paivaIso, eivät UTC-päivää
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const lue = (p) => readFileSync(join(juuri, p), 'utf8');
const PVM = JSON.stringify(join(juuri, 'lib/tm_pvm.js'));
const ajaTz = (koodi, tz = 'Europe/Helsinki') => execFileSync(process.execPath, ['-e', koodi], { env: { ...process.env, TZ: tz }, encoding: 'utf8' }).trim();
/* Kiinnitetty kello: new Date() = FIXED, TZ säilyy (tmPaivaIso lukee paikallisen ajan). */
const KELLO = (iso) => `const R=Date;const F=R.parse(${JSON.stringify(iso)});global.Date=class extends R{constructor(...a){if(a.length===0)super(F);else super(...a);}static now(){return F;}};`;

describe('tmPaivaIso Helsingin aikaa — 23:59 / 00:30 / 02:59 ja kellonsiirrot', () => {
  const T = [
    // [UTC-hetki, odotettu paikallinen päivä, selite]
    ['2026-07-15T20:59:00Z', '2026-07-15', 'kesä 23:59 EEST'],
    ['2026-07-15T21:30:00Z', '2026-07-16', 'kesä 00:30 EEST'],
    ['2026-07-15T23:59:00Z', '2026-07-16', 'kesä 02:59 EEST'],
    ['2026-01-15T21:59:00Z', '2026-01-15', 'talvi 23:59 EET'],
    ['2026-01-15T22:30:00Z', '2026-01-16', 'talvi 00:30 EET'],
    ['2026-01-16T00:59:00Z', '2026-01-16', 'talvi 02:59 EET'],
    ['2026-03-28T22:00:00Z', '2026-03-29', 'kevään siirtopäivä 29.3.: 00:00 EET'],
    ['2026-03-29T00:59:00Z', '2026-03-29', 'kevään siirtopäivä: 02:59 EET (ennen 03→04)'],
    ['2026-03-29T20:59:00Z', '2026-03-29', 'kevään siirtopäivä: 23:59 EEST'],
    ['2026-10-24T20:59:00Z', '2026-10-24', 'syksyn siirtopäivää edeltävä 23:59 EEST'],
    ['2026-10-24T21:30:00Z', '2026-10-25', 'syksyn siirtopäivä 25.10.: 00:30 EEST'],
    ['2026-10-25T00:59:00Z', '2026-10-25', 'siirtopäivä: 03:59 EEST (ennen 04→03)'],
    ['2026-10-25T01:30:00Z', '2026-10-25', 'siirtopäivä: 03:30 EET (toistuva tunti)'],
    ['2026-10-25T21:59:00Z', '2026-10-25', 'siirtopäivä: 23:59 EET'],
    ['2026-10-25T22:00:00Z', '2026-10-26', 'siirtopäivän jälkeen 00:00 EET'],
  ];
  it.each(T)('%s → %s (%s)', (utc, odotettu) => {
    expect(ajaTz(`const {tmPaivaIso}=require(${PVM});console.log(tmPaivaIso(new Date(${JSON.stringify(utc)})))`)).toBe(odotettu);
  });
  it('vertailu: vanha UTC-tapa antaisi väärän päivän 00:30:lla (EI VACUOUS)', () => {
    expect(ajaTz(`console.log(new Date('2026-07-15T21:30:00Z').toISOString().slice(0,10))`)).toBe('2026-07-15');   // paikallinen päivä on 16.
  });
});

describe('oikeat libit kiinnitetyllä kellolla 00:30 Helsinki (16.7.2026) → paikallinen päivä', () => {
  const KESA = '2026-07-15T21:30:00Z';   // 00:30 EEST 16.7. (UTC-päivä olisi 15.7.)
  it('tm_pikakentat: oletus-"tänään" (ei pvm-argumenttia) → hh_pvm/d1_pvm = 2026-07-16; annettu pvm ennallaan', () => {
    const koodi = KELLO(KESA) + `const {tmLaskePikakentat}=require(${JSON.stringify(join(juuri, 'lib/tm_pikakentat.js'))});
      const d={syntymaVuosi:2013,sukupuoli:'M',joukkue:'KPV U13'};
      const a=tmLaskePikakentat(d,{lin_30m:{paras:5.0}},undefined);const b=tmLaskePikakentat(d,{lin_30m:{paras:5.0}},'2026-05-02');
      console.log([a.hh_pvm,a.d1_pvm,b.hh_pvm].join(','))`;
    expect(ajaTz(koodi)).toBe('2026-07-16,2026-07-16,2026-05-02');
  });
  it('tm_idp: arvion oletus-pvm ja aikaraami.arvio_pvm paikallisia', () => {
    const koodi = KELLO(KESA) + `const I=require(${JSON.stringify(join(juuri, 'lib/tm_idp.js'))});
      const t={mittari:{yksikko:'s',suunta:'pienempi'},lahto:{arvo:46},tavoitearvo:44,arviot:[]};
      I.idpLisaaArvio(t,{arvo:45},{});
      console.log(t.arviot[0].pvm)`;
    expect(ajaTz(koodi)).toBe('2026-07-16');
  });
  it('tm_reflektio: kirjoittava doc.pvm muodostetaan tmPaivaIso(new Date()):lla', () => {
    expect(lue('lib/tm_reflektio.js')).toContain("var doc = { pvm: tmPaivaIso(new Date()), lahde: 'oma',");
  });
});

describe('Vanhempi_v2 ja Pelaaja_v7 kirjoittavat klo 00:30 SAMAAN kirjaukset/{pvm}-dokumenttiin', () => {
  function pura(lahde, alku) {
    const i = lahde.indexOf(alku); if (i < 0) throw new Error('ei löydy: ' + alku);
    let sy = 0;
    for (let j = lahde.indexOf('{', i); j < lahde.length; j++) { if (lahde[j] === '{') sy++; else if (lahde[j] === '}') { sy--; if (!sy) return lahde.slice(i, j + 1); } }
    throw new Error('sulkeet');
  }
  const P = lue('TalentMaster_Pelaaja_v7.html'), V = lue('TalentMaster_Vanhempi_v2.html');
  function avain(iso) {
    // Pelaaja: oikea _paivaIso(); Vanhempi: oikea kaksirivinen päivämuodostus + kirjaukset.doc(pvm)
    const vanhempiRivit = V.slice(V.indexOf('  const nyt = new Date();'), V.indexOf('const pvm = tmPaivaIso(nyt);') + 'const pvm = tmPaivaIso(nyt);'.length);
    const koodi = KELLO(iso) + `const {tmPaivaIso}=require(${PVM});
      ${pura(P, 'function _paivaIso(').replace('function _paivaIso(', 'function paivaIsoPelaaja(')}
      ${vanhempiRivit}
      console.log(JSON.stringify({pelaaja:paivaIsoPelaaja(),vanhempi:pvm}))`;
    return JSON.parse(ajaTz(koodi));
  }
  it.each([['2026-07-15T21:30:00Z', '2026-07-16'], ['2026-01-15T22:30:00Z', '2026-01-16'], ['2026-10-24T21:30:00Z', '2026-10-25'], ['2026-07-15T20:59:00Z', '2026-07-15']])('%s → molemmat %s', (iso, odotettu) => {
    expect(avain(iso)).toEqual({ pelaaja: odotettu, vanhempi: odotettu });
  });
  it('Vanhempi kirjoittaa kirjaukset-dokumentin tällä pvm:llä (doc(pvm)); Vanhempi lataa tm_pvm.js ja SW cachettaa sen', () => {
    expect(V).toMatch(/\.collection\('kirjaukset'\)\.doc\(pvm\)\s*\n?\s*\.set\(/);
    expect(V).toContain('lib/tm_pvm.js');
    expect(lue('sw_vanhempi.js')).toContain("/lib/tm_pvm.js");
  });
});

describe('lähdekontrakti — tallentavat kohdat eivät käytä UTC-päivää', () => {
  const S = (p) => lue(p);
  it.each([
    ['TalentMaster_VP_v25.html', "var pvm = tmPaivaIso(new Date());   // reviewit/{pvm}-doc-ID + review_viimeisin_pvm: paikallinen päivä", 2, 'reviewit/{pvm} + review_viimeisin_pvm (kaksi kohtaa)'],
    ['TalentMaster_VP_v25.html', "const pvm = tmPaivaIso(new Date());   // paikallinen päivä (ei UTC)\n  const d3v", 1, 'd3_viimeisin.pvm + d3_vp_pvm'],
    ['TalentMaster_Master_v16.html', "pvm: tmPaivaIso(new Date()), lahteet: lahteet };", 1, 'd3_viimeisin.pvm (+ d3_pvm samassa set():ssä)'],
    ['TalentMaster_Pelaaja_v7.html', "pvm: _paivaIso(), lahteet: lahteet, jakso_alkoi", 1, 'd3_viimeisin.pvm (sivun oma paikallinen _paivaIso)'],
    ['TalentMaster_ADAR_Pikakortti.html', "pvm: tmPaivaIso(new Date()),   // havainnon päivä", 1, 'havainnon pvm'],
    ['TalentMaster_Excel_Tuonti.html', "tsi_pvm: m.pvm || tmPaivaIso(new Date())", 1, 'tsi_pvm-fallback'],
    ['TalentMaster_Excel_Tuonti.html', "pvm: p.tsi_pvm || tmPaivaIso(new Date()) });", 1, 'TSI-recalc pvm-fallback'],
    ['TalentMaster_Seura.html', "{ pvm: tmPaivaIso(new Date()), arvo: null, pelaajaId: null, huomio: 'Kumottu kirjaus'", 1, 'omat_tavoitteet/kirjaukset kumoamis-pvm'],
    ['TalentMaster_TalentID_v1.html', "var tanaan=tmPaivaIso(new Date());", 1, 'snapshotin päiväavain (localStorage)'],
    ['TalentMaster_Testaus_v9.html', "|| tmPaivaIso(new Date());", 2, 'lomakkeen oletuspäivä (#722) + ennätykset: oletus tänään'],
    ['lib/tm_idp.js', "_tmPaivaIso(new Date(nyt.getTime() + kestoVk * 7 * 86400000))", 1, 'aikaraami.arvio_pvm'],
    ['lib/tm_idp.js', "pvm: arvio.pvm || _tmPaivaIso(nyt),", 1, 'arviot[].pvm-fallback'],
  ])('%s: %s', (tiedosto, osa, n) => { expect(S(tiedosto).split(osa).length - 1, 'kohta puuttuu/kaksinkertaistui').toBe(n); });
  it('Testaus_v9: käyttäjän syöttämä testipvm (3191) ennallaan, vain oletus "tänään" paikalliseksi; fallbackit kaksi kohtaa', () => {
    const t = S('TalentMaster_Testaus_v9.html');
    expect(t).toContain("const mittPvmStr = _aktiivinenTapahtuma.pvm ? new Date(_aktiivinenTapahtuma.pvm).toISOString().split('T')[0] : tmPaivaIso(new Date());");
    expect(t.split("String(_aktiivinenTapahtuma.pvm).slice(0, 10) : tmPaivaIso(new Date());").length - 1).toBe(2);
  });
  it('§26-parit samassa kirjoituksessa: d3 (Master/Pelaaja: d3_viimeisin+d3_pvm), VP (d3_viimeisin+d3_vp_pvm), review_viimeisin_pvm+_tyyppi', () => {
    expect(S('TalentMaster_Master_v16.html')).toContain(".set({ d3_viimeisin: d3v, d3_taso: d3_taso, d3_pvm: d3v.pvm, d3_varmuus: d3_varmuus }, { merge: true });");
    expect(S('TalentMaster_Pelaaja_v7.html')).toContain(".set({ d3_viimeisin: d3v, d3_taso: d3_taso, d3_pvm: d3v.pvm, d3_varmuus: d3_varmuus }, { merge: true });");
    expect(S('TalentMaster_VP_v25.html')).toContain(".set({ d3_viimeisin: d3v, d3_vp_pvm: pvm }, { merge: true });");
    // review: pari yhdessä set-kutsussa atomisen batch-apurin sisällä (§26), jota MDT-review + bulk kutsuvat
    // R6.2a: pari rakentuu lib/tm_kehityssilmukka.js tmKirjaaKatselmus:ssa (kummallekin polulle sama) ja kirjoitetaan YHDESSÄ set-kutsussa batchissa
    expect(S('lib/tm_kehityssilmukka.js')).toContain("pk.review_viimeisin_pvm = pvm; pk.review_viimeisin_tyyppi = tyyppi;");
    expect(S('TalentMaster_VP_v25.html')).toContain("b.set(pRef, plan.pikakentat, { merge: true });");
    expect(S('TalentMaster_VP_v25.html').split('await _vpKirjoitaReview(').length - 1).toBe(3);   // MDT + bulk + cockpit (R6.2a)
  });
  it('kirjaukset/{pvm}-lukijat vertaavat samaan paikalliseen päivään (Pelaaja _paivaIso; VP-viikkonäkymä paikallinen iso; PHV-raja _paivaIso)', () => {
    expect(S('TalentMaster_VP_v25.html')).toContain("'>=', _paivaIso(new Date(PHV_RAJA_MS))");
    expect(S('TalentMaster_Pelaaja_v7.html')).toContain('.doc(_paivaIso()).get()');
  });
  it('SW:t: ADAR allowlistaa tm_pvm.js ja CACHE nostettu; Vanhempi sama', () => {
    expect(lue('sw_adar.js')).toContain("'/lib/tm_pvm.js'");
    expect(lue('sw_adar.js')).toMatch(/const CACHE = 'tm-adar-v([5-9]|\d\d+)'/);
    expect(lue('sw_vanhempi.js')).toMatch(/const CACHE = 'tm-vanhempi-v(3[8-9]|[4-9]\d)'/);
  });
});
