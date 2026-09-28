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

  /* PR 2B: tasovälilehdet ja erillinen pikatila poistuivat, joten poimimia ei ole enää kahta.
     Vartijan MERKITYS on sama: jokainen pelaajalistan rakentaja on kuljettava roolisuodatuksen
     läpi. Lista-rakentajat johdetaan LÄHTEESTÄ (`.plist`-merkkaus), jottei uusi lista voi
     ohittaa suodatusta hiljaa. */
  it('JOKAINEN pelaajalistan rakentaja käyttää roolisuodatusta', () => {
    const nimet = [...ADAR.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(/g)]
      .map((m) => ({ nimi: m[1], runko: funktio('function ' + m[1] + '(') }))
      .filter((f) => f.runko.includes('class="plist"'));
    expect(nimet.length, 'pelaajalistaa rakentavia funktioita ei löytynyt — vartija olisi tyhjä')
      .toBeGreaterThanOrEqual(2);
    nimet.forEach((f) => {
      expect(f.runko, f.nimi + ' rakentaa listan ilman roolisuodatusta').toContain('_adarNakyvatPelaajat(');
    });
  });

  it('SUODATUS on ainoa reitti _pelaajaMap:iin listaa rakennettaessa', () => {
    /* Suora `Object.keys(window._pelaajaMap)` listassa ohittaisi suodatuksen. Se sallitaan
       VAIN suodatinfunktiossa itsessään. */
    const suodatin = funktio('function _adarNakyvatPelaajat(');
    expect(suodatin).toContain('Object.keys(map)');
    const muualla = ADAR.split(suodatin).join('');
    expect(muualla, 'joku iteroi _pelaajaMap:ia suodatuksen ohi')
      .not.toMatch(/Object\.keys\(\s*window\._pelaajaMap/);
  });

  it('PELAAJAN joukkueet[] luetaan mappiin (sääntö täsmää ID:llä, ei nimellä)', () => {
    /* Ilman tätä suodatus vertaisi tyhjää taulukkoa ja kaikki putoaisi pois.
       PR 2B: rakentajia on nyt YKSI (`_adarLataaPelaajat`) — myös SA-polku kulkee sen kautta,
       joten kenttä ei voi unohtua toisesta kopiosta. */
    const osumat = (ADAR.match(/joukkueet:\s*Array\.isArray\(p\.joukkueet\)/g) || []).length;
    expect(osumat, '_pelaajaMap-rakentajia ei ole tasan yksi, tai joukkueet[] puuttuu').toBe(1);
    const rakentaja = funktio('async function _adarLataaPelaajat(');
    expect(rakentaja).toContain('joukkueet: Array.isArray(p.joukkueet)');
  });

  /* Virheteksti on nyt omassa funktiossaan, koska syitä on KAKSI ja ne vaativat eri ohjeen.
     Vartija AJAA funktion molemmilla haaroilla — pelkkä merkkijonohaku kertoisi vain, että
     jokin teksti on olemassa, ei että oikea teksti valitaan oikeassa tilanteessa. */
  function ajaEstonSyy(rooli, omatJoukkueet) {
    const store = {
      window: { _tmRooli: rooli, _omatJoukkueet: omatJoukkueet },
      ADAR_JOUKKUERAJAUS_OHITTAVAT: ['super_admin', 'superadmin', 'vp', 'urheilutoimenjohtaja', 'talenttivalmentaja'],
    };
    store.window.window = store.window;
    const ymp = new Proxy(store, {
      has: (t2, k) => (k in t2) || !(k in globalThis),
      get: (t2, k) => (k === Symbol.unscopables ? undefined : (k in t2 ? t2[k] : undefined)),
      set: (t2, k, v) => { t2[k] = v; return true; },
    });
    const poimi = (sig) => {
      const alku = ADAR.indexOf(sig);
      if (alku < 0) throw new Error('ei löydy: ' + sig);
      let syvyys = 0;
      for (let j = ADAR.indexOf('{', alku); j < ADAR.length; j++) {
        if (ADAR[j] === '{') syvyys++;
        else if (ADAR[j] === '}') { syvyys--; if (!syvyys) return ADAR.slice(alku, j + 1); }
      }
      throw new Error('sulkeet eivät täsmää');
    };
    const runko = [poimi('function _adarNakeeKaikki(rooli) {'), poimi('function _adarEstonSyy() {')].join('\n');
    // eslint-disable-next-line no-new-func
    return new Function('__ymp', 'with(__ymp){' + runko + '\nreturn _adarEstonSyy();}')(ymp);
  }

  it('SELKEÄ VIRHE: permission-denied kertoo syyn, ei "katso konsoli"', () => {
    const i = ADAR.indexOf("err.code === 'permission-denied'");
    expect(i, 'permission-denied-haaraa ei ole').toBeGreaterThan(-1);
    /* Lohko = permission-denied-haarasta sen else-haaraan. Kiinteä merkkimäärä olisi hauras:
       debug-rivit ovat pitkiä, ja haara kasvoi juuri yli 900 merkin. */
    const loppu = ADAR.indexOf('} else {', i);
    expect(loppu, 'haaran loppua ei löydy').toBeGreaterThan(i);
    const lohko = ADAR.slice(i, loppu);
    expect(lohko, 'syy on haettava funktiosta, ei kovakoodattava').toContain('_adarEstonSyy()');
    expect(lohko, 'kentällä ei ole konsolia — käyttäjälle on näytettävä teksti').toContain('_showToast(');
  });

  it('joukkuerajaus: syy on joukkuerajaus kun omia joukkueita ON', () => {
    expect(ajaEstonSyy('valmentaja', ['sibbo_p12'])).toBe('Voit havainnoida vain oman joukkueesi pelaajia');
  });

  /* Ilman joukkueita leikkaus on AINA tyhjä — valmentaja ei voi korjata sitä itse, joten
     "vain oman joukkueesi pelaajia" olisi harhaanjohtava ohje. */
  it('puuttuva joukkuetieto ohjaa pääkäyttäjälle', () => {
    expect(ajaEstonSyy('valmentaja', [])).toBe('Käyttäjätunnuksesi joukkuetieto puuttuu — ota yhteys seuran pääkäyttäjään');
  });

  it('koko seuran näkevällä roolilla syy EI ole joukkuetieto', () => {
    expect(ajaEstonSyy('vp', [])).toBe('Voit havainnoida vain oman joukkueesi pelaajia');
  });

  it('HAKUKENTTÄ on poimimessa ja se syöttää suodatusta', () => {
    /* Yksi poimin → yksi hakukenttä. Pelkkä kentän olemassaolo ei riitä: haun on
       päädyttävä samaan suodattimeen, muuten se näyttäisi suodattavan mutta ei suodattaisi. */
    const poimin = funktio('function _phRenderValitse(');
    expect(poimin, 'hakukenttä puuttuu poimimesta').toContain('id="ph-haku"');
    expect(poimin, 'haku ei kulje roolisuodatuksen läpi').toContain('_adarNakyvatPelaajat(S.haku)');
  });
});

/* ══ ROOLILÄHDE — KLIENTTI JA RULES SAMASTA PAIKASTA ══════════════════════
   Rules lukee roolin TOKENIN claimista. Jos klientti päättelee sen Firestore-dokumentista,
   lähteet voivat erota (dokumentissa 'vp', claimissa 'valmentaja') — poimin näyttää koko seuran
   ja Rules hylkää tallennuksen vasta kentällä. */
describe('ADAR · roolin yksi lähde (claim)', () => {
  const ADAR2 = readFileSync(join(juuri, 'TalentMaster_ADAR_Pikakortti.html'), 'utf8');
  const MASTER2 = readFileSync(join(juuri, 'TalentMaster_Master_v16.html'), 'utf8');

  it('pikakortti asettaa _tmRooli CLAIMISTA', () => {
    expect(ADAR2).toContain('window._tmRooli = token.claims.rooli');
  });

  it('itsenäinen avaus toimii: asetus ei vaadi Masterin injektiota', () => {
    /* Ennen tätä `_tmRooli` asetettiin VAIN Masterin upotuksessa, joten VP näki itsenäisessä
       pikakortissa vain oman joukkueensa ja `tekija_rooli` jäi nulliksi. */
    expect(ADAR2).toContain('if (!window._tmRooli) window._tmRooli = token.claims.rooli');
  });

  it('Master injektoi CLAIMIN roolin, ei dokumentin roolia', () => {
    expect(MASTER2).toContain('window._tmClaimRooli = claims.rooli');
    expect(MASTER2).toContain('w._tmRooli = window._tmClaimRooli');
    expect(MASTER2, 'dokumentin rooli ei saa mennä pikakorttiin').not.toContain('w._tmRooli = _rooli');
  });

  it('dokumentin rooli luetaan vain virheilmoitusta varten, ei oikeuspäättelyyn', () => {
    expect(ADAR2).toContain('window._tmDokRooli = data.rooli');
    /* _adarNakeeKaikki lukee _tmRooli:n (claim), ei _tmDokRooli:a. */
    const i = ADAR2.indexOf('function _adarNakeeKaikki(rooli) {');
    const lohko = ADAR2.slice(i, i + 300);
    expect(lohko).toContain('window._tmRooli');
    expect(lohko).not.toContain('_tmDokRooli');
  });
});

/* ══ OFFLINE-JONO ═════════════════════════════════════════════════════════
   Jonoon `luotu` päätyi ISO-merkkijonona tai serverTimestamp-sentinelinä, joka ei serialisoidu
   IndexedDB:hen. Rules vaatii `luotu is timestamp`, joten jonon merkintä hylättiin AINA ja
   `break` pysäytti koko jonon pysyvästi. */
describe('ADAR · offline-jonon synkronointi', () => {
  const ADAR3 = readFileSync(join(juuri, 'TalentMaster_ADAR_Pikakortti.html'), 'utf8');

  function ajaSynkka(jono, virheet) {
    const lisatyt = [];
    const poistetut = [];
    const toastit = [];
    const sentinel = { __sentinel: 'serverTimestamp' };
    const store = {
      console: { log() {}, warn() {} },
      _idbHaeKaikki: async () => jono,
      _idbPoista: async (id) => { poistetut.push(id); },
      _paivitaOfflineBadge: () => {},
      _showToast: (s) => toastit.push(s),
      window: {
        _tmDB: {
          collection: () => ({
            doc: () => ({
              collection: () => ({
                doc: () => ({
                  collection: () => ({
                    add: async (d) => {
                      const v = (virheet || {})[d.pelaaja_id];
                      if (v) { const e = new Error('nope'); e.code = v; throw e; }
                      lisatyt.push(d);
                      return { id: 'x' };
                    },
                  }),
                }),
              }),
            }),
          }),
        },
        _tmAuth: { currentUser: { uid: 'u1' } },
        firebase: { firestore: { FieldValue: { serverTimestamp: () => sentinel } } },
      },
    };
    store.window.window = store.window;
    const ymp = new Proxy(store, {
      has: (t2, k) => (k in t2) || !(k in globalThis),
      get: (t2, k) => (k === Symbol.unscopables ? undefined : (k in t2 ? t2[k] : undefined)),
      set: (t2, k, v) => { t2[k] = v; return true; },
    });
    const alku = ADAR3.indexOf('async function _synkronoiOfflineJono() {');
    let syvyys = 0, runko = '';
    for (let j = ADAR3.indexOf('{', alku); j < ADAR3.length; j++) {
      if (ADAR3[j] === '{') syvyys++;
      else if (ADAR3[j] === '}') { syvyys--; if (!syvyys) { runko = ADAR3.slice(alku, j + 1); break; } }
    }
    // eslint-disable-next-line no-new-func
    const fn = new Function('__ymp', 'with(__ymp){' + runko + '\nreturn _synkronoiOfflineJono;}')(ymp);
    return fn().then(() => ({ lisatyt, poistetut, toastit, sentinel }));
  }

  const merkinta = (id, luotu) => ({
    localId: id, seura_id: 'sibbovargarna', pelaaja_id: 'p' + id,
    tyyppi: 'adar_pikakirjaus', luotu,
  });

  it('luotu lähetetään serverTimestampina, ei ISO-merkkijonona', async () => {
    const r = await ajaSynkka([merkinta(1, '2026-09-28T10:00:00.000Z')]);
    expect(r.lisatyt.length).toBe(1);
    expect(r.lisatyt[0].luotu, 'Rules vaatii timestampin').toBe(r.sentinel);
    expect(typeof r.lisatyt[0].luotu).not.toBe('string');
  });

  it('alkuperäinen kirjausaika säilyy omassa kentässään', async () => {
    const r = await ajaSynkka([merkinta(1, '2026-09-28T10:00:00.000Z')]);
    expect(r.lisatyt[0].luotu_laitteella).toBe('2026-09-28T10:00:00.000Z');
  });

  it('serialisoitumaton sentinel jonossa ei päädy kirjoitukseen', async () => {
    const r = await ajaSynkka([merkinta(1, { rikki: true })]);
    expect(r.lisatyt[0].luotu).toBe(r.sentinel);
    expect(r.lisatyt[0].luotu_laitteella, 'vain merkkijono kelpaa').toBeNull();
  });

  it('localId ei vuoda Firestoreen', async () => {
    const r = await ajaSynkka([merkinta(1, '2026-09-28T10:00:00.000Z')]);
    expect(r.lisatyt[0].localId).toBeUndefined();
  });

  it('onnistunut merkintä poistetaan jonosta', async () => {
    const r = await ajaSynkka([merkinta(1, 'x'), merkinta(2, 'y')]);
    expect(r.poistetut).toEqual([1, 2]);
  });

  /* Yksi kelvoton merkintä ei saa jumittaa koko jonoa — se oli oireen ydin. */
  it('permission-denied ohitetaan, loput synkronoituvat', async () => {
    const r = await ajaSynkka([merkinta(1, 'x'), merkinta(2, 'y'), merkinta(3, 'z')],
      { p2: 'permission-denied' });
    expect(r.lisatyt.length, 'kelvolliset menivät läpi').toBe(2);
    expect(r.poistetut).toEqual([1, 3]);
    expect(r.toastit.join(' ')).toContain('ei kelvannut');
  });

  it('verkkovirhe pysäyttää jonon (yritetään myöhemmin uudelleen)', async () => {
    const r = await ajaSynkka([merkinta(1, 'x'), merkinta(2, 'y'), merkinta(3, 'z')],
      { p2: 'unavailable' });
    expect(r.lisatyt.length, 'vain ennen virhettä ollut').toBe(1);
    expect(r.poistetut).toEqual([1]);
  });

  it('tyhjästä jonosta ei tule toastia', async () => {
    const r = await ajaSynkka([]);
    expect(r.toastit).toEqual([]);
  });

  it('lähdevartija: synkronointi EI lähetä jonon luotu-kenttää sellaisenaan', () => {
    const i = ADAR3.indexOf('async function _synkronoiOfflineJono() {');
    const lohko = ADAR3.slice(i, i + 2600);
    expect(lohko, 'koko merkintä levitettynä veisi rikkinäisen luotu-kentän mukanaan')
      .not.toMatch(/add\(\{\s*\.\.\.m,/);
    expect(lohko).toContain('luotu: window.firebase.firestore.FieldValue.serverTimestamp()');
  });
});
