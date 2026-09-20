/**
 * ADAR — pelaajapoiminta roolin mukaan (#6 + #8).
 *
 * YKSI JUURISYY, KAKSI OIRETTA: poimin näytti KAIKKI seuran pelaajat, mutta
 * create-sääntö sallii pelkälle valmentajalle vain oman joukkueen pelaajat.
 *   #8 "poistin kuvan ja silti tallennus epäonnistui" → ei kuvaongelma vaan
 *      hiljainen sääntöhylkäys, joka näkyi raakana "Tallennusvirhe":nä
 *   #6 "100 pelaajan listalta on vaikea löytää oikeaa" → käytettävyys
 *
 * Portti ajaa AIDOT suodatusfunktiot ADARin lähteestä vm-sandboxissa ja
 * johtaa "näkee kaikki" -roolijoukon SÄÄNNÖISTÄ — client ja rules eivät voi
 * ajautua erilleen hiljaa (sama luokka kuin läsnäolo-/login-drift-vartijat).
 */
import { describe, it, expect } from 'vitest';
import vm from 'node:vm';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const lue = (p) => readFileSync(join(juuri, p), 'utf8');
const ADAR = lue('TalentMaster_ADAR_Pikakortti.html');
const RULES = lue('tm_admin/firestore.rules');

function funktio(nimi) {
  const i = ADAR.indexOf(nimi);
  expect(i, nimi + ' puuttuu ADAR:sta').toBeGreaterThan(-1);
  let syv = 0, loppu = -1;
  for (let k = ADAR.indexOf('{', i); k < ADAR.length; k++) {
    if (ADAR[k] === '{') syv++;
    else if (ADAR[k] === '}') { syv--; if (syv === 0) { loppu = k + 1; break; } }
  }
  return ADAR.slice(i, loppu);
}

/** Poimii rules-listan (esim. onJohtoRooli → ['vp','urheilutoimenjohtaja',…]). */
function roolitSaannosta(fnNimi) {
  const i = RULES.indexOf('function ' + fnNimi + '(');
  expect(i, fnNimi + ' puuttuu säännöistä').toBeGreaterThan(-1);
  const lohko = RULES.slice(i, i + 500);
  const m = lohko.match(/in\s*\[([^\]]+)\]/);
  expect(m, fnNimi + ': roolilistaa ei löytynyt').toBeTruthy();
  return m[1].split(',').map((s) => s.trim().replace(/^'|'$/g, '')).filter(Boolean);
}

function teeSandbox(opt) {
  const o = opt || {};
  const sandbox = {
    console, Date, Math, JSON, String, Number, Object, Array, Promise,
    document: { getElementById: () => null },
    _tmRooli: o.rooli || null,
    _pelaajaMap: o.pelaajat || {},
    _omatJoukkueet: o.omatJoukkueet === undefined ? null : o.omatJoukkueet,
    _adarHaku: '',
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(
    'const ADAR_JOUKKUERAJAUS_OHITTAVAT = ' + JSON.stringify(ohittavatClientista()) + ';', sandbox);
  ['function _adarNakeeKaikki(', 'function _adarSaaHavainnoida(', 'function _adarNakyvatPelaajat(']
    .forEach((n) => vm.runInContext(funktio(n), sandbox));
  return sandbox;
}

/** Clientin vakio lähteestä (ei uudelleenkirjoitettuna). */
function ohittavatClientista() {
  const m = ADAR.match(/const ADAR_JOUKKUERAJAUS_OHITTAVAT\s*=\s*\[([^\]]+)\]/);
  expect(m, 'roolipeili-vakio puuttuu ADAR:sta').toBeTruthy();
  return m[1].split(',').map((s) => s.trim().replace(/^'|'$/g, '')).filter(Boolean);
}

const PELAAJAT = {
  oma: { nimi: 'Oma Pelaaja', joukkue: 'KPV U13', joukkueet: ['j1'] },
  muu: { nimi: 'Muu Pelaaja', joukkue: 'KPV U15', joukkueet: ['j2'] },
  eiJoukkuetta: { nimi: 'Tyhjä Joukkue', joukkue: '', joukkueet: [] },
};

describe('ADAR · pelaajapoiminta roolin mukaan', () => {
  it('EI VACUOUS: suodatus palauttaa pelaajia kun rooli ja joukkue täsmäävät', () => {
    const sb = teeSandbox({ rooli: 'valmentaja', omatJoukkueet: ['j1'], pelaajat: PELAAJAT });
    expect(sb._adarNakyvatPelaajat('')).toEqual(['oma']);
  });

  it('RAJATTU ROOLI: muun joukkueen pelaajaa EI tarjota (tämä oli #8:n juurisyy)', () => {
    const sb = teeSandbox({ rooli: 'valmentaja', omatJoukkueet: ['j1'], pelaajat: PELAAJAT });
    expect(sb._adarSaaHavainnoida('muu'), 'väärän joukkueen pelaaja tarjolla → hiljainen sääntöhylkäys').toBe(false);
    expect(sb._adarSaaHavainnoida('oma')).toBe(true);
    expect(sb._adarNakyvatPelaajat(''), 'poimin tarjoaa pelaajia joita sääntö ei salli').not.toContain('muu');
  });

  it('fysiikkavalmentaja on myös rajattu (ei ohittavissa rooleissa)', () => {
    const sb = teeSandbox({ rooli: 'fysiikkavalmentaja', omatJoukkueet: ['j1'], pelaajat: PELAAJAT });
    expect(sb._adarNakeeKaikki()).toBe(false);
    expect(sb._adarNakyvatPelaajat('')).toEqual(['oma']);
  });

  it('OHITTAVA ROOLI näkee kaikki ilman omien joukkueiden lukua', () => {
    ['vp', 'urheilutoimenjohtaja', 'talenttivalmentaja', 'super_admin'].forEach((rooli) => {
      const sb = teeSandbox({ rooli, omatJoukkueet: null, pelaajat: PELAAJAT });
      expect(sb._adarNakeeKaikki(), rooli + ': pitäisi nähdä kaikki').toBe(true);
      expect(sb._adarNakyvatPelaajat('').sort(), rooli + ': ei nähnyt kaikkia')
        .toEqual(['eiJoukkuetta', 'muu', 'oma']);
    });
  });

  it('FAIL-CLOSED: rajattu rooli ilman omia joukkueita ei tarjoa ketään', () => {
    /* Sama kuin sääntö: tyhjä joukkueet → hasAny false → estetty. Tyhjä lista
       EI saa tarkoittaa "näytä kaikki". */
    const sb = teeSandbox({ rooli: 'valmentaja', omatJoukkueet: [], pelaajat: PELAAJAT });
    expect(sb._adarNakyvatPelaajat('')).toEqual([]);
    expect(sb._adarSaaHavainnoida('oma')).toBe(false);
  });

  it('HAKU suodattaa nimellä ja joukkueella, roolisuodatuksen SISÄLLÄ', () => {
    const sb = teeSandbox({ rooli: 'vp', pelaajat: PELAAJAT });
    expect(sb._adarNakyvatPelaajat('muu')).toEqual(['muu']);
    expect(sb._adarNakyvatPelaajat('U13')).toEqual(['oma']);
    expect(sb._adarNakyvatPelaajat('ei osumia')).toEqual([]);
    /* Haku ei saa ohittaa roolirajausta. */
    const sb2 = teeSandbox({ rooli: 'valmentaja', omatJoukkueet: ['j1'], pelaajat: PELAAJAT });
    expect(sb2._adarNakyvatPelaajat('Muu'), 'haku ohitti roolirajauksen').toEqual([]);
  });

  it('DRIFT: clientin ohittava roolijoukko johdetaan säännöistä', () => {
    /* Sääntö: onOmanSeuranValmentaja(sid) && ( onJohtoRooli() || talenttivalmentaja || … )
       ULOMPI ehto vaatii onValmentajaRooli():n, joka EI sisällä seurasihteeriä —
       vaikka onJohtoRooli() sisältää. Efektiivinen ohittava joukko on siis
       LEIKKAUS + talenttivalmentaja (+ SA, joka ohittaa kaiken muualla).
       Jos kumpikaan roolilista muuttuu, tämä punertaa ennen kuin client ehtii
       luvata enemmän kuin sääntö sallii. */
    const johto = roolitSaannosta('onJohtoRooli');
    const valmentaja = roolitSaannosta('onValmentajaRooli');
    const odotettu = johto.filter((r) => valmentaja.includes(r)).concat(['talenttivalmentaja']);
    const client = ohittavatClientista().filter((r) => r !== 'super_admin' && r !== 'superadmin');
    expect(client.sort(), 'client ja firestore.rules ovat eri mieltä siitä kuka näkee kaikki')
      .toEqual(odotettu.sort());
    /* Seurasihteeri EI saa olla clientin listalla vaikka se on onJohtoRoolissa. */
    expect(client, 'seurasihteeri ei läpäise onValmentajaRooli-ehtoa').not.toContain('seurasihteeri');
  });

  it('MOLEMMAT POIMIMET käyttävät samaa suodatusta (grid + vision-select)', () => {
    /* Kaksi rakentajaa = kaksi paikkaa unohtaa. Molempien on kuljettava saman
       funktion läpi, muuten toinen tarjoaa kiellettyjä pelaajia. */
    const grid = funktio('function _paivitaPikaPelaajat(');
    expect(grid, 'pikagrid ei käytä roolisuodatusta').toContain('_adarNakyvatPelaajat(');
    expect(grid, 'pikagrid rakentaa yhä suodattamattomasta snapista').not.toContain('snap.docs.map');
    const sel = funktio('function _adarTaytaSelectit(');
    expect(sel, 'vision-selectit eivät käytä roolisuodatusta').toContain('_adarNakyvatPelaajat(');
  });

  it('PELAAJAN joukkueet[] luetaan mappiin (sääntö täsmää ID:llä, ei nimellä)', () => {
    /* Ilman tätä suodatus vertaisi tyhjää taulukkoa ja kaikki putoaisi pois. */
    const osumat = (ADAR.match(/joukkueet:\s*Array\.isArray\(p\.joukkueet\)/g) || []).length;
    expect(osumat, 'joukkueet[] puuttuu jommastakummasta _pelaajaMap-rakentajasta').toBe(2);
  });

  it('SELKEÄ VIRHE: permission-denied kertoo syyn, ei "katso konsoli"', () => {
    const i = ADAR.indexOf("err.code === 'permission-denied'");
    expect(i, 'permission-denied-haaraa ei ole').toBeGreaterThan(-1);
    const lohko = ADAR.slice(i, i + 900);
    expect(lohko, 'kentällä ei ole konsolia — virheen on kerrottava syy')
      .toContain('vain oman joukkueesi pelaajia');
  });

  it('HAKUKENTÄT ovat kaikissa poimimissa (t1/t2/t3 + pikagrid)', () => {
    ['t1', 't2', 't3', 'pika'].forEach((k) => {
      expect(ADAR, 'hakukenttä puuttuu: ' + k).toContain('id="adar-haku-' + k + '"');
    });
  });
});
