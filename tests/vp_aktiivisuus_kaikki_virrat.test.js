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

  /* ── KONTAKTI (n4) · TYHJÄ ≠ 0 ────────────────────────────────────────────
     `viimeisinKirjautuminen` oli koodipohjassa VAIN lukuna — mikään ei
     kirjoittanut sitä. n4 = 0 kaikilla → VAI+ 15 p liian matala ja punainen
     "Ei kirjautunut 30pv" JOKAISELLA kortilla, myös aktiivisimmalla.
     Kirjoituspiste on nyt `lib/tm_aktiivisuus.js`, mutta migraatiota ei ole:
     kenttä täyttyy vasta kun käyttäjä kirjautuu. Siksi puuttuva arvo on
     "ei dataa" (null), ei nolla. */

  it('KONTAKTI: puuttuva kirjautuminen = null, EI 0 eikä punaista hälytystä', async () => {
    const r = await aja({});
    expect(r.kontakti, 'ei dataa → null, muuten jokainen valmentaja näyttää passiiviselta').toBeNull();
    const tekstit = (r.halytykset || []).map((h) => h.teksti).join(' | ');
    expect(tekstit, 'väärä hälytys ilman dataa').not.toContain('Ei kirjautunut');
  });

  it('KONTAKTI: tuore kirjautuminen → korkea n4, ei hälytystä', async () => {
    const r = await aja({ kayttaja: { viimeisinKirjautuminen: iso(0) } });
    expect(r.kontakti).toBeGreaterThan(90);
    expect((r.halytykset || []).map((h) => h.teksti).join(' | ')).not.toContain('Ei kirjautunut');
  });

  it('KONTAKTI: vanha kirjautuminen → 0 + hälytys (aito signaali säilyy)', async () => {
    /* Vaimennus ei saa hukata oikeaa signaalia: 40 pv sitten on aito passiivisuus. */
    const r = await aja({ kayttaja: { viimeisinKirjautuminen: iso(40) } });
    expect(r.kontakti).toBe(0);
    expect((r.halytykset || []).map((h) => h.teksti).join(' | ')).toContain('Ei kirjautunut');
  });

  it('VAI+ normalisoi painot kun komponentilta puuttuu data', async () => {
    /* Ilman n4:ää indeksi lasketaan jäljelle jäävällä painosummalla (0.85),
       EI niin että puuttuva komponentti vetäisi 15 p pois. */
    const r = await aja({
      havainnot: [{ valmentajaUid: 'c1', tyyppi: 'adar', luotu: iso(2) }],
      harjoitusarvioinnit: [{ valmentajaUid: 'c1', arviointitapa: 'havainnointi', malli: 'palloliitto', pvm: pvm(3), vastaukset: { a1: 4 } }],
    });
    expect(r.kontakti, 'fixture ilman kirjautumisaikaa').toBeNull();
    const odotettu = Math.round(
      (0.30 * r.adar + 0.20 * r.kaynti + 0.20 * r.harjoittelu + 0.15 * r.kehitys) / 0.85
    );
    expect(r.vai, 'painoja ei normalisoitu — puuttuva n4 rankaisee valmentajaa').toBe(odotettu);
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

  /**
   * Laskurin SIJAINTI tarkistetaan MOLEMMISTA apeista.
   *
   * Ensimmäinen versio tarkisti vain Masterin, ja VP:stä puuttui laskuri
   * kokonaan — aukko jäi vihreäksi. Portti, joka katsoo vain toista
   * toteutusta kahdesta, on täsmälleen yhtä hyödytön kuin ei porttia
   * lainkaan sille toiselle.
   */
  const LASNAOLO_POLUT = [
    { nimi: 'Master', src: MASTER, kutsu: "_tmLaskuri(muid, 'lasnaolo')" },
    { nimi: 'VP', src: VP, kutsu: "_tmLaskuriVP(muid, 'lasnaolo')" },
  ];

  it('VP:llä on laskuri-apuri ja läsnäolokutsu (ei vain Masterilla)', () => {
    expect(VP, 'VP:n laskuri-apuri puuttuu').toMatch(/function _tmLaskuriVP\(uid, kentta\)/);
    expect(VP, 'VP ei inkrementoi').toMatch(/increment\(1\)/);
    expect(VP, 'VP:n läsnäololaskurin kutsu puuttuu').toContain("_tmLaskuriVP(muid, 'lasnaolo')");
  });

  it('VIIKKOPOLKU ei inflatoi: per-pelaaja-toggle EI kasvata laskuria', () => {
    /* Yhden pelaajan yksi sessio kerrallaan → inkrementti tekisi 15 pelaajan
       merkinnästä 15 tapahtumaa. Rajaus on lukittu, ei vain kommentoitu. */
    const i = VP.indexOf('async function _vpViikkoTallennaLasna(');
    expect(i, 'viikkopolku puuttuu').toBeGreaterThan(-1);
    let syvyys = 0, loppu = -1;
    for (let k = VP.indexOf('{', i); k < VP.length; k++) {
      if (VP[k] === '{') syvyys++;
      else if (VP[k] === '}') { syvyys--; if (syvyys === 0) { loppu = k + 1; break; } }
    }
    const runko = VP.slice(i, loppu);
    expect(runko, 'viikkopolku inflatoi laskuria').not.toMatch(/lasnaolo['"]?\s*\)/);
    expect(runko, 'viikkopolku inkrementoi').not.toContain('increment(');
  });

  it('läsnäolo lasketaan KERRAN per sessio, ei per pelaajarivi', () => {
    /* 15 pelaajan joukkue tuottaisi 15 "aktiivisuustapahtumaa" yhdestä
       merkinnästä, ja joukkueen koko vääristäisi luvun. Laskurin on oltava
       batch.commit():n jälkeen, ei batch.set()-silmukan sisällä. */
    LASNAOLO_POLUT.forEach((polku) => {
      const i = polku.src.indexOf(polku.kutsu);
      expect(i, polku.nimi + ': läsnäololaskuri puuttuu').toBeGreaterThan(-1);
      const ennen = polku.src.slice(Math.max(0, i - 600), i);
      expect(ennen, polku.nimi + ': laskuri ei ole batch.commit():n jälkeen').toContain('batch.commit()');
      expect(ennen, polku.nimi + ': laskuri on batch.set-silmukan sisällä').not.toMatch(/batch\.set\([^;]*$/);
    });
  });

  /**
   * DRIFT-VARTIJA — läsnäoloa MERKITSEVIEN appien joukko on lukittu.
   *
   * `LASNAOLO_POLUT` (yllä) lukitsee KAHDEN TUNNETUN polun laskurikytkennän,
   * mutta se on staattinen lista: uusi appi joka alkaa merkitä läsnäoloa ei
   * näy siinä ennen kuin ihminen muistaa lisätä sen. Juuri se muistinvarainen
   * lista päästi alkuperäisen aukon läpi (VP ei ollut listalla). Tämä portti
   * ei luota muistiin: se SKANNAA kaikki apit ja punertaa itse.
   *
   * KAKSI TASOA, koska `lasnaolijat`-kokoelmaan kirjoitetaan kahta eri asiaa:
   *   · `tila`      = HENKILÖKUNNAN toteutunut läsnäolomerkintä  → laskuri
   *   · `saatavuus` = pelaajan/vanhemman oma RSVP (§35 K2b)      → EI laskuria
   * Yksitasoinen allowlist punertaisi heti, koska Pelaaja_v7 ja Vanhempi_v2
   * kirjoittavat samaan kokoelmaan — mutta vain RSVP:n. Molemmat joukot on
   * lukittu, jottei RSVP ala koskaan valua valmentajan aktiivisuuslaskuriin.
   */
  it('DRIFT: läsnäoloa merkitsevät apit lukittu — uusi kirjoittaja punertaa', () => {
    const MERKITSIJAT = ['TalentMaster_Master_v16.html', 'TalentMaster_VP_v25.html'];
    const RSVP = ['TalentMaster_Pelaaja_v7.html', 'TalentMaster_Vanhempi_v2.html'];
    const apit = readdirSync(juuri).filter((f) => /^TalentMaster_.*\.html$/.test(f));
    expect(apit.length, 'ei löytynyt appeja — skanneri osoittaa väärään hakemistoon').toBeGreaterThan(5);

    const merkitsijat = [], rsvp = [];
    apit.forEach((f) => {
      /* Normalisoi välit: `.set(` voi olla eri rivillä kuin
         `collection('lasnaolijat')` (VP:n viikkopolku), ja batch-polussa
         `batch.set(` on ENNEN kokoelmaa. */
      const src = lue(f).replace(/\s+/g, ' ');
      const avain = "collection('lasnaolijat')";
      let k = src.indexOf(avain), merk = false, rs = false;
      while (k > -1) {
        const ennen = src.slice(Math.max(0, k - 80), k);
        const jalkeen = src.slice(k + avain.length, k + avain.length + 400);
        /* (a) kirjoitus kokoelman JÄLKEEN: `.doc(x).set({…})`
           (b) kirjoitus kokoelmaa ENNEN:   `batch.set(base.collection(…)` */
        const kirjoitus = /^[\w.$'"[\]() ]{0,120}\.(set|add)\(/.test(jalkeen)
          || /\.(set|add)\([\w.$ ]*$/.test(ennen);
        if (kirjoitus) { if (/\btila\s*:/.test(jalkeen)) merk = true; else rs = true; }
        k = src.indexOf(avain, k + 1);
      }
      if (merk) merkitsijat.push(f);
      if (rs) rsvp.push(f);
    });

    expect(merkitsijat.sort(), 'läsnäoloa MERKITSEVIEN appien joukko muuttui — kytke laskuri (LASNAOLO_POLUT) ja päivitä tämä allowlist')
      .toEqual(MERKITSIJAT.slice().sort());
    expect(rsvp.sort(), 'RSVP-kirjoittajien joukko muuttui — `saatavuus` ei kuulu aktiivisuuslaskuriin')
      .toEqual(RSVP.slice().sort());

    /* Ja jokainen merkitsijä on oikeasti kytketty laskuriin. */
    LASNAOLO_POLUT.forEach((polku) => {
      expect(polku.src, polku.nimi + ': laskurikutsu puuttuu').toContain(polku.kutsu);
    });
    expect(LASNAOLO_POLUT.length, 'LASNAOLO_POLUT ja allowlist eivät ole synkassa')
      .toBe(MERKITSIJAT.length);
  });
});
