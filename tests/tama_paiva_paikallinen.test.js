/**
 * "TÄMÄ PÄIVÄ" = PAIKALLINEN PÄIVÄ, EI UTC (auditin löydös 29.9.).
 * Suomessa (EET UTC+2 / EEST UTC+3) UTC-päivä on EDELLINEN päivä klo 00:00–01:59 (talvi) / 00:00–02:59 (kesä).
 * 1) tmPaivaIso + Timestamp-muunnos oikein Europe/Helsinki-ajassa (ajetaan lapsiprosessissa TZ=Europe/Helsinki)
 * 2) PORTTI: elävissä sivuissa/libeissä (ei archive/, ei tests/) ei uusia `toISOString().slice(0,10)`-tyyppisiä päiväjohdannaisia.
 *    Sallitut poikkeukset alla, jokainen perusteltuna. B = tallennettava avain/kenttä → PR 2 (fix/tama-paiva-tallennus) poistaa
 *    nämä listalta. C = tarkoituksella UTC (tiedostonimi, UTC-päivälaskenta merkkijonosta, fallback, kommentti).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const lue = (p) => readFileSync(join(juuri, p), 'utf8');

function ajaTz(tz, koodi) {
  return execFileSync(process.execPath, ['-e', koodi], { env: { ...process.env, TZ: tz }, encoding: 'utf8' }).trim();
}
const PVM = join(juuri, 'lib/tm_pvm.js');

describe('tmPaivaIso Europe/Helsinki-ajassa', () => {
  // [UTC-hetki, odotettu paikallinen päivä, selite]
  const TAPAUKSET = [
    ['2026-07-15T20:30:00Z', '2026-07-15', 'kesä 23:30 EEST — sama päivä (ei ylikorjata)'],
    ['2026-07-15T21:30:00Z', '2026-07-16', 'kesä 00:30 EEST — UTC-päivä olisi edellinen'],
    ['2026-07-15T23:59:00Z', '2026-07-16', 'kesä 02:59 EEST'],
    ['2026-01-15T21:30:00Z', '2026-01-15', 'talvi 23:30 EET — sama päivä'],
    ['2026-01-15T22:30:00Z', '2026-01-16', 'talvi 00:30 EET — UTC-päivä olisi edellinen'],
    ['2026-01-15T23:59:00Z', '2026-01-16', 'talvi 01:59 EET'],
  ];
  it.each(TAPAUKSET)('%s → %s (%s)', (utc, odotettu) => {
    expect(ajaTz('Europe/Helsinki', `const {tmPaivaIso}=require(${JSON.stringify(PVM)});console.log(tmPaivaIso(new Date(${JSON.stringify(utc)})))`)).toBe(odotettu);
  });
  it('vanha tapa (toISOString().slice) antaa väärän päivän 00:30:lla — regressiovertailu', () => {
    expect(ajaTz('Europe/Helsinki', `console.log(new Date('2026-07-15T21:30:00Z').toISOString().slice(0,10))`)).toBe('2026-07-15');
  });
  it('A*-muunnos Timestamp → päivä: ts.toDate() klo 00:30 paikallista → paikallinen päivä', () => {
    const koodi = `const {tmPaivaIso}=require(${JSON.stringify(PVM)});
      const ts=(iso)=>({toDate:()=>new Date(iso)});
      console.log([ts('2026-07-15T21:30:00Z'),ts('2026-01-15T22:30:00Z'),ts('2026-07-15T20:30:00Z')].map(t=>tmPaivaIso(t.toDate())).join(','))`;
    expect(ajaTz('Europe/Helsinki', koodi)).toBe('2026-07-16,2026-01-16,2026-07-15');
  });
  it('tm_kehitystilanne/tm_mittarit: Timestamp → päivä paikallisena, merkkijono-pvm sellaisenaan', () => {
    const koodi = `
      const M=require(${JSON.stringify(join(juuri, 'lib/tm_mittarit.js'))});
      const ts={toDate:()=>new Date('2026-07-15T21:30:00Z')};
      const f=M.onValilla; // onValilla(x,alku,loppu) käyttää _iso:a
      console.log([f(ts,'2026-07-16','2026-07-16'), f(ts,'2026-07-15','2026-07-15'), f('2026-07-15','2026-07-15','2026-07-15')].join(','))`;
    expect(ajaTz('Europe/Helsinki', koodi)).toBe('true,false,true');
  });
});

/* ── PORTTI ───────────────────────────────────────────────────────────────── */
const KUVIO = /toISOString\(\)\s*\.\s*(slice|substring|substr|split)\(/;
const KOHTEET = [
  ...readdirSync(juuri).filter((f) => /\.(html|js)$/.test(f) && !/^(eslint|vitest)\.config\.js$/.test(f)),
  ...readdirSync(join(juuri, 'lib')).filter((f) => f.endsWith('.js')).map((f) => 'lib/' + f),
];

/* [tiedosto, rivin tunnistava osa, luokka, perustelu] */
const SALLITTU = [
  // ── C: tarkoituksella UTC ──
  ['TalentMaster_Admin.html', "'audit_' +", 'C', 'tiedostonimi'],
  ['TalentMaster_Excel_Tuonti.html', "'TM_pohja_' +", 'C', 'tiedostonimi'],
  ['TalentMaster_Excel_Tuonti.html', "console.log('PDF-parseri", 'C', 'konsoliloki'],
  ['TalentMaster_Harjoitettavuus_Lomake_v4.html', 'pvmSlug', 'C', 'tiedostonimen fallback (kaksi riviä)'],
  ['TalentMaster_Seura.html', "const pvm = new Date().toISOString().slice(0,10);", 'C', 'tiedostonimi (rivi ennen XLSX.writeFile)'],
  ['TalentMaster_Seura.html', 'syntymaaika.seconds', 'C', 'syntymäaika Timestampista — EI muutosta (selvitys erikseen: vain luku -skripti)'],
  ['TalentMaster_VP_v25.html', 'alkoi ? loppuD.toISOString()', 'C', 'UTC-päivälaskenta merkkijonosta alkoi; fallback on jo tmPaivaIso'],
  ['TalentMaster_Master_v16.html', 'alkoi ? loppuD.toISOString()', 'C', 'sama kuin VP'],
  ['lib/tm_arviointi_historia.js', 'graceful', 'C', 'fallback Intl-aikavyöhykkeen puuttuessa (ensisijainen käyttää Europe/Helsinki)'],
  ['lib/tm_bioika.js', 'mittauspaiva.toISOString().split', 'C', 'lähtee YYYY-MM-DD-merkkijonosta (UTC-keskiyö) → sama päivä'],
  ['TalentMaster_Testaus_v9.html', "new Date(_aktiivinenTapahtuma.pvm || new Date()).toISOString().split", 'C', 'merkkijono → UTC-keskiyö → sama päivä'],
  ['lib/tm_kehitystilanne.js', "Date.parse(nyt + 'T00:00:00Z')", 'C', 'UTC-aritmeettinen päivälaskenta nyt-merkkijonosta (kolme riviä)'],
  ['lib/tm_kehitystilanne.js', "Date.parse(m.nyt + 'T00:00:00Z')", 'C', 'sama'],
  ['lib/tm_pvm.js', 'EI toISOString', 'C', 'kommentti'],
  ['TalentMaster_Pelaaja_v7.html', 'Korvaa toISOString', 'C', 'kommentti'],
  // ── B: tallennettava avain/kenttä → PR 2 (fix/tama-paiva-tallennus) ──
  ['TalentMaster_ADAR_Pikakortti.html', "pvm: new Date().toISOString().split('T')[0]", 'B', 'havainnon pvm-kenttä (PR 2)'],
  ['TalentMaster_Excel_Tuonti.html', 'tsi_pvm', 'B', 'tsi_pvm-fallback (PR 2, kaksi riviä)'],
  ['TalentMaster_Seura.html', "_ktLisaaKirjaus(tid, { pvm:", 'B', 'omat_tavoitteet/kirjaukset.pvm (PR 2)'],
  ['TalentMaster_Vanhempi_v2.html', 'nyt.toISOString().slice', 'B', 'kirjaukset/{pvm}-doc-ID (PR 2)'],
  ['TalentMaster_Master_v16.html', 'd3v = {', 'B', 'd3_viimeisin.pvm (PR 2)'],
  ['TalentMaster_Pelaaja_v7.html', 'd3v = {', 'B', 'd3_viimeisin.pvm (PR 2)'],
  ['TalentMaster_VP_v25.html', 'const pvm = new Date().toISOString().slice(0,10);', 'B', 'd3_viimeisin.pvm (PR 2)'],
  ['TalentMaster_VP_v25.html', 'var pvm = new Date().toISOString().slice(0, 10);', 'B', 'reviewit/{pvm} + review_viimeisin_pvm (PR 2, kaksi riviä)'],
  ['TalentMaster_TalentID_v1.html', 'var tanaan=', 'B', 'localStorage-snapshotin päiväavain (PR 2)'],
  ['TalentMaster_Testaus_v9.html', '_aktiivinenTapahtuma.pvm', 'B', 'tallennettavan pvm:n fallback (PR 2, kolme riviä)'],
  ['lib/tm-kortit.js', '_tanaanISO()', 'B', 'ansaintapäivät (localStorage) (PR 2)'],
  ['lib/tm-kortit.js', 'return d.toISOString().slice', 'B', '_eilenISO (PR 2, yhdessä _tanaanISO:n kanssa)'],
  ['lib/tm_pikakentat.js', 'new Date().toISOString().slice', 'B', 'pikakenttien pvm-fallback (PR 2; parikentät atomisesti §26)'],
  ['lib/tm_reflektio.js', 'doc = { pvm:', 'B', 'reflektiomerkinnän pvm (PR 2)'],
  ['lib/tm_idp.js', 'arvio_pvm:', 'B', 'IDP aikaraami.arvio_pvm (PR 2)'],
  ['lib/tm_idp.js', 'pvm: arvio.pvm ||', 'B', 'IDP arviot[].pvm-fallback (PR 2)'],
];

describe('PORTTI: ei uusia toISOString().slice(0,10) -päiväjohdannaisia (ei archive/)', () => {
  const osumat = [];
  for (const f of KOHTEET) lue(f).split('\n').forEach((rivi, i) => { if (KUVIO.test(rivi)) osumat.push({ f, n: i + 1, rivi }); });
  const sallittuRivi = (o) => SALLITTU.find(([f, osa]) => f === o.f && o.rivi.includes(osa));

  it('EI VACUOUS: kohdejoukko on iso ja löytää tunnetut poikkeukset', () => {
    expect(KOHTEET.length).toBeGreaterThan(80);
    expect(osumat.length).toBeGreaterThan(20);
  });
  it('jokainen osuma on sallitulla listalla (uusi "tänään = UTC" ei pääse läpi)', () => {
    const luvattomat = osumat.filter((o) => !sallittuRivi(o)).map((o) => o.f + ':' + o.n + '  ' + o.rivi.trim().slice(0, 110));
    expect(luvattomat, 'käytä tmPaivaIso(new Date()) / tmPaivaIso(ts.toDate()); jos UTC on tarkoituksella, lisää SALLITTU-listalle perustelun kanssa').toEqual([]);
  });
  it('sallittu lista ei vanhene: jokaiselle merkinnälle on vähintään yksi osuma', () => {
    const kuolleet = SALLITTU.filter(([f, osa]) => !osumat.some((o) => o.f === f && o.rivi.includes(osa))).map((s) => s[0] + ' :: ' + s[1]);
    expect(kuolleet).toEqual([]);
  });
  it('archive/ ja tests/ eivät ole kohteissa', () => {
    expect(KOHTEET.some((f) => /^(archive|tests)\//.test(f))).toBe(false);
  });
});

describe('sivut, jotka käyttävät tmPaivaIso(), lataavat lib/tm_pvm.js ENNEN käyttöä', () => {
  const sivut = readdirSync(juuri).filter((f) => /^TalentMaster_.*\.html$/.test(f));
  const kayttajat = sivut.filter((f) => /\btmPaivaIso\(/.test(lue(f)));
  it('EI VACUOUS: käyttäjiä vähintään 6', () => { expect(kayttajat.length).toBeGreaterThanOrEqual(6); });
  it.each(kayttajat)('%s', (f) => {
    const s = lue(f);
    const iLataus = s.indexOf('lib/tm_pvm.js');
    const iKaytto = s.search(/\btmPaivaIso\(/);
    expect(iLataus, 'tm_pvm.js-lataus puuttuu').toBeGreaterThan(-1);
    expect(iLataus, 'ladattava ennen ensimmäistä käyttöä').toBeLessThan(iKaytto);
  });
  it('lib/tm_kehitystilanne + tm_mittarit: sivu lataa tm_pvm.js (libit kutsuvat tmPaivaIso:a vasta ajossa → järjestys ei ratkaise)', () => {
    for (const f of ['TalentMaster_Seura.html', 'TalentMaster_VP_v25.html']) expect(lue(f), f).toContain('lib/tm_pvm.js');
  });
});
