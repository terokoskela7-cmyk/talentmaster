/**
 * AKTIIVISUUS = KAIKKI VALMENTAJA-AKTIIVISUUDEN VIRRAT.
 *
 * MIKSI: `laskeVAI` luki aiemmin n2/n3:een VAIN SPL-`mentoroinnit`-kenttäkäyntejä.
 * Kun SPL poistettiin, aktiivisuus olisi jäänyt nollaan vaikka valmentajaa
 * arvioidaan aktiivisesti — ja "+ Arvioi harjoitus" -arvioinnit eivät koskaan
 * laskeneet mukaan. Lisäksi n1 laski `havainnot`-dokit ILMAN tyyppisuodatusta,
 * joten "Pelihavainto" sisälsi myös perheelle lähetetyt viestit
 * (`tyyppi:'valmentaja_viesti'`) — kaksi eri asiaa yhdessä luvussa.
 *
 * Testi ajaa AIDON `laskeVAI`:n: funktiot poimitaan VP_v25:n lähteestä ja
 * suoritetaan vm-sandboxissa, jossa `db` on fixture-tynkä. Näin portti mittaa
 * laskentaa, ei merkkijonoja.
 */
import { describe, it, expect } from 'vitest';
import vm from 'node:vm';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const lue = (p) => readFileSync(join(juuri, p), 'utf8');
const VP = lue('TalentMaster_VP_v25.html');
const MASTER = lue('TalentMaster_Master_v16.html');
const REFLEKTIO = lue('lib/tm_reflektio.js');

/** Poimii funktion lähteestä sulkeita laskemalla. */
function funktio(nimi) {
  const i = VP.indexOf(nimi);
  expect(i, nimi + ' puuttuu VP:stä').toBeGreaterThan(-1);
  let syvyys = 0, loppu = -1;
  for (let k = VP.indexOf('{', i); k < VP.length; k++) {
    if (VP[k] === '{') syvyys++;
    else if (VP[k] === '}') { syvyys--; if (syvyys === 0) { loppu = k + 1; break; } }
  }
  return VP.slice(i, loppu);
}

/** Poimii funktion MISTÄ TAHANSA lähteestä sulkeita laskemalla. */
function funktioLahteesta(src, nimi, mista) {
  const i = src.indexOf(nimi);
  expect(i, nimi + ' puuttuu (' + mista + ')').toBeGreaterThan(-1);
  let syvyys = 0, loppu = -1;
  for (let k = src.indexOf('{', i); k < src.length; k++) {
    if (src[k] === '{') syvyys++;
    else if (src[k] === '}') { syvyys--; if (syvyys === 0) { loppu = k + 1; break; } }
  }
  return src.slice(i, loppu);
}

const paivaaSitten = (n) => new Date(Date.now() - n * 86400000);
const iso = (n) => paivaaSitten(n).toISOString();
const pvm = (n) => iso(n).slice(0, 10);

/** Fixture-db: palauttaa kokoelmakohtaiset dokumentit. */
function teeDb(data) {
  const snap = (arr) => ({ docs: (arr || []).map((d) => ({ data: () => d })) });
  const ketju = (nimi) => {
    const api = {
      where: () => api, orderBy: () => api, limit: () => api,
      get: () => Promise.resolve(snap(data[nimi])),
      doc: (id) => ({
        get: () => Promise.resolve({ exists: !!data.kayttaja, data: () => data.kayttaja || {} }),
        collection: ketju,
      }),
    };
    return api;
  };
  return { collection: () => ({ doc: () => ({ collection: ketju }) }) };
}

async function aja(data) {
  const sandbox = {
    console, Date, Math, JSON, String, Number, Object, Array, Promise, isNaN, parseInt, parseFloat,
    db: teeDb(data),
    _seuraId: 'testiseura',
    _valmentajat: [{ id: 'c1', joukkue: 'FCL P13' }],
    _pelaajat: [],
    vpT: (s) => s,
    laskeHarjoituslaatuPalloliitto: () => ({ ka_0_10: 8 }),
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(funktio('function _vpKaudenAlku()'), sandbox);
  vm.runInContext(funktio('function _vpAikaMs('), sandbox);
  vm.runInContext(funktio('async function laskeVAI('), sandbox);
  return sandbox.laskeVAI('c1');
}

describe('Aktiivisuus · kaikki virrat', () => {
  it('EI VACUOUS: laskeVAI ajautuu sandboxissa ja palauttaa kausi-objektin', async () => {
    const r = await aja({});
    expect(r, 'laskeVAI palautti null').toBeTruthy();
    expect(r.kausi, 'kausi-objekti puuttuu').toBeTruthy();
  });

  it('ARVIOINNIT LASKETAAN — ilman yhtäkään mentorointia', async () => {
    /* Juuri tämä oli rikki: n2/n3 lukivat vain SPL-kenttäkäyntejä, joten
       "+ Arvioi harjoitus" ei nostanut aktiivisuutta lainkaan. */
    const r = await aja({
      harjoitusarvioinnit: [0, 3, 10].map((d) => ({
        valmentajaUid: 'c1', arviointitapa: 'havainnointi', malli: 'palloliitto',
        pvm: pvm(d), vastaukset: { a1: 4 },
      })),
      mentoroinnit: [],
    });
    expect(r.kaynti, 'n2 = 0 vaikka kolme arviointia 30 pv sisällä').toBeGreaterThan(0);
    expect(r.harjoittelu, 'n3 = 0 vaikka malli A -arviointeja on').toBeGreaterThan(0);
    expect(r.kausi.arvioitu).toBe(3);
  });

  it('HAVAINNOT ERITELTY TYYPEITTÄIN — pelihavainto ei sisällä perhepalautetta', async () => {
    const havainnot = []
      .concat(Array.from({ length: 5 }, () => ({ valmentajaUid: 'c1', tyyppi: 'adar', luotu: iso(5) })))
      .concat(Array.from({ length: 3 }, () => ({ valmentajaUid: 'c1', tyyppi: 'valmentaja_viesti', luotu: iso(5) })));
    const r = await aja({ havainnot });
    expect(r.kausi.pelihavainnot, 'pelihavainnot sisältää perhepalautteet').toBe(5);
    expect(r.kausi.perhepalaute, 'perhepalaute ei erotu').toBe(3);
  });

  it('KAUSI-KERTYMÄ kattaa kaikki kymmenen virtaa', async () => {
    const r = await aja({
      havainnot: [
        { valmentajaUid: 'c1', tyyppi: 'adar', luotu: iso(40) },
        { valmentajaUid: 'c1', tyyppi: 'valmentaja_viesti', luotu: iso(40) },
      ],
      harjoitusarvioinnit: [
        { valmentajaUid: 'c1', arviointitapa: 'havainnointi', malli: 'palloliitto', pvm: pvm(40), vastaukset: {} },
        { valmentajaUid: 'c1', arviointitapa: 'itsearvio', malli: 'valmennustaidot', pvm: pvm(40), vastaukset: {} },
      ],
      mentoroinnit: [{ valmentajaId: 'c1', aika: paivaaSitten(40) }],
      ohjelmat: [{ laatija_uid: 'c1', paivitetty: paivaaSitten(40) }],
      kayttaja: { lasnaolo_n: 31, tavoitteet_n: 12, palautteet_n: 27, reflektiot_n: 12 },
    });
    const k = r.kausi;
    const nollat = Object.keys(k).filter((avain) => !k[avain]);
    expect(nollat, 'nämä virrat eivät laskeneet: ' + nollat.join(', ')).toEqual([]);
    expect(Object.keys(k).length, 'virtoja pitää olla kymmenen').toBe(10);
  });

  it('kauden ulkopuolinen tapahtuma EI laske (ikkuna on aito)', async () => {
    /* Ilman tätä "kaikki > 0" läpäisisi myös silloin kun ikkunaa ei ole. */
    const r = await aja({ havainnot: [{ valmentajaUid: 'c1', tyyppi: 'adar', luotu: iso(900) }] });
    expect(r.kausi.pelihavainnot).toBe(0);
  });

  it('YKSITYISYYS: laskeVAI ei lue reflektiot-alikokoelmaa, vain laskurin', async () => {
    const src = funktio('async function laskeVAI(');
    expect(src, 'VP lukee yksityistä reflektiopäiväkirjaa').not.toMatch(/collection\('reflektiot'\)/);
    expect(src, 'laskuria ei lueta').toContain('reflektiot_n');
  });

  it('laskurien kirjoittajat ovat olemassa (hajautetut/privaatit virrat)', () => {
    /* Master rakentaa kenttänimen `kentta + '_n'`, joten portti tarkistaa
       KUTSUPAIKAT — ne ovat se mikä voi kadota refaktorissa. */
    expect(MASTER, 'laskuri-apufunktio puuttuu').toMatch(/function _tmLaskuri\(uid, kentta\)/);
    expect(MASTER, 'laskuri ei inkrementoi').toMatch(/increment\(1\)/);
    ['palautteet', 'tavoitteet', 'lasnaolo'].forEach((k) => {
      /* Argumentissa voi olla sisäkkäisiä sulkeita (_uid || (cu ? cu.uid : null)). */
      expect(MASTER, k + '-laskurin kutsu puuttuu').toMatch(new RegExp("_tmLaskuri\\([\\s\\S]{0,60}'" + k + "'"));
    });
    expect(REFLEKTIO, 'reflektiot_n-inkrementti puuttuu').toContain('reflektiot_n');
  });

  it('läsnäolo lasketaan KERRAN per sessio, ei per pelaajarivi', () => {
    /* 15 pelaajan joukkue tuottaisi 15 "aktiivisuustapahtumaa" yhdestä
       merkinnästä, ja joukkueen koko vääristäisi luvun. Laskurin on oltava
       batch.commit():n jälkeen, ei batch.set()-silmukan sisällä. */
    const i = MASTER.indexOf("_tmLaskuri(muid, 'lasnaolo')");
    expect(i, 'läsnäololaskuri puuttuu').toBeGreaterThan(-1);
    const ennen = MASTER.slice(Math.max(0, i - 600), i);
    expect(ennen, 'laskuri ei ole batch.commit():n jälkeen').toContain('batch.commit()');
    const lohko = MASTER.slice(i - 600, i);
    expect(lohko, 'laskuri on batch.set-silmukan sisällä').not.toMatch(/batch\.set\([^;]*$/);
  });

  /* ── VP-KATTAVUUS (PR2:n aukko) ──────────────────────────────────────────
     Master kasvatti `lasnaolo_n`:ää oikein, mutta VP ei kasvattanut MITÄÄN
     laskuria — ja tämä portti katsoi vain Masteria, joten aukko jäi vihreäksi.
     VP-valmennuspäälliköt joilla on oma joukkue merkitsevät läsnäolot, ja sen
     on kerryttävä HEIDÄN omaa aktiivisuuttaan. */

  it('VP:llä on läsnäololaskuri (apuri + kutsu kanonisessa batch-polussa)', () => {
    expect(VP, 'VP:n laskuri-apufunktio puuttuu').toMatch(/function _tmLaskuriVP\(uid, kentta\)/);
    expect(VP, 'VP:n laskuri ei inkrementoi').toMatch(/increment\(1\)/);
    const batchPolku = funktioLahteesta(VP, 'async function _vpTallennaLasnaolo(', 'VP');
    expect(batchPolku, 'VP:n lasnaolo-laskurikutsu puuttuu batch-polusta')
      .toMatch(/_tmLaskuriVP\([\s\S]{0,60}'lasnaolo'/);
  });

  it('VP: läsnäolo lasketaan KERRAN per sessio, ei per pelaajarivi', () => {
    /* Sama invariantti kuin Masterille: laskurin on oltava batch.commit():n
       jälkeen, ei batch.set()-silmukan sisällä. */
    const i = VP.indexOf("_tmLaskuriVP(muid, 'lasnaolo')");
    expect(i, 'VP:n läsnäololaskuri puuttuu').toBeGreaterThan(-1);
    const ennen = VP.slice(Math.max(0, i - 600), i);
    expect(ennen, 'VP:n laskuri ei ole batch.commit():n jälkeen').toContain('batch.commit()');
    expect(ennen, 'VP:n laskuri on batch.set-silmukan sisällä').not.toMatch(/batch\.set\([^;]*$/);
  });

  it('VP:n viikkoruudukon per-pelaaja-polku EI inflatoi laskuria (lukittu rajaus)', () => {
    /* `_vpViikkoTallennaLasna` kirjoittaa yhden pelaajan yhden session
       kerrallaan. Inkrementti täällä = 15 tapahtumaa yhdestä sessiosta, eikä
       per-sessio-dedup ole luotettava clientissä (sivulataus nollaa setin). */
    const viikko = funktioLahteesta(VP, 'async function _vpViikkoTallennaLasna(', 'VP');
    expect(viikko, 'viikkopolku inflatoi lasnaolo-laskuria').not.toMatch(/_tmLaskuri/);
    expect(viikko, 'viikkopolku inkrementoi laskuria').not.toMatch(/increment\(/);
    expect(viikko, 'viikkopolku kirjoittaa lasnaolo_n:ää').not.toContain('lasnaolo_n');
  });

  it('DRIFT: läsnäoloa MERKITSEVÄT apit lukittu allowlistiin (laskurikytkentä)', () => {
    /* Ydin: aukko syntyi koska lista "ketkä merkitsevät läsnäoloa" oli vain
       muistissa — Master oli kytketty, VP ei, eikä portti katsonut VP:tä.
       Nyt lista on testissä. KAKSI TASOA, koska `lasnaolijat`-kokoelmaan
       kirjoittaa kahdenlaista dataa:
         · `tila`      = HENKILÖKUNNAN toteutunut läsnäolomerkintä  → laskuri
         · `saatavuus` = pelaajan/vanhemman oma RSVP (K2b)              → EI laskuria
       Jos uusi appi alkaa MERKITÄ läsnäoloa, tämä punertuu kunnes appi on
       (a) lisätty allowlistiin JA (b) kytketty `lasnaolo`-laskuriin. */
    const MERKITSIJAT = ['TalentMaster_Master_v16.html', 'TalentMaster_VP_v25.html'];
    const RSVP = ['TalentMaster_Pelaaja_v7.html', 'TalentMaster_Vanhempi_v2.html'];
    const apit = readdirSync(juuri).filter((f) => /^TalentMaster_.*\.html$/.test(f));
    expect(apit.length, 'ei löytynyt yhtään TalentMaster-appia').toBeGreaterThan(5);

    const merkitsijat = [], rsvp = [];
    apit.forEach((f) => {
      /* Normalisoi rivinvaihdot: `.set(` voi olla eri rivillä kuin
         `collection('lasnaolijat')` (VP:n viikkopolku), ja batch-polussa
         `batch.set(` on ENNEN kokoelmaa. */
      const src = lue(f).replace(/\s+/g, ' ');
      const avain = "collection('lasnaolijat')";
      let k = src.indexOf(avain), merk = false, rs = false;
      while (k > -1) {
        const ennen = src.slice(Math.max(0, k - 80), k);
        const jalkeen = src.slice(k + avain.length, k + avain.length + 400);
        /* (a) kirjoitus kokoelman JÄLKEEN: `.doc(x).set({...})`
           (b) kirjoitus kokoelmaa ENNEN:   `batch.set(base.collection(...)` */
        const kirjoitus = /^[\w.$'"\[\]() ]{0,120}\.(set|add)\(/.test(jalkeen)
          || /\.(set|add)\([\w.$ ]*$/.test(ennen);
        if (kirjoitus) {
          if (/\btila\s*:/.test(jalkeen)) merk = true; else rs = true;
        }
        k = src.indexOf(avain, k + 1);
      }
      if (merk) merkitsijat.push(f);
      if (rs) rsvp.push(f);
    });

    expect(merkitsijat.sort(), 'läsnäoloa MERKITSEVIEN appien joukko muuttui — kytke laskuri ja päivitä allowlist')
      .toEqual(MERKITSIJAT.slice().sort());
    expect(rsvp.sort(), 'RSVP-kirjoittajien joukko muuttui (saatavuus — EI laskuria)')
      .toEqual(RSVP.slice().sort());

    /* Ja jokainen merkitsijä on kytketty laskuriin. */
    expect(MASTER).toMatch(/_tmLaskuri\([\s\S]{0,60}'lasnaolo'/);
    expect(VP).toMatch(/_tmLaskuriVP\([\s\S]{0,60}'lasnaolo'/);
  });
});
