/**
 * JAETTU ALASIVU-SHELL (vaihe 1) — leveys, yksi vieritys, drift.
 *
 * LIVE-BUGI: "valmentajakortti aukeaa tosi pienenä". Vika oli SYSTEEMINEN:
 * jokainen VP-sisältömodaali rakensi oman `position:fixed;inset:0`-keskitetyn
 * laatikkonsa kapealla max-widthillä (~540–560px), joten leveyttä ei voinut
 * korjata yhdestä paikasta. Korjaus = yksi jaettu 840px alasivu-shell.
 *
 * Drift-vartija on tämän portin tärkein osa: ilman sitä seuraava sisältömodaali
 * rakennetaan taas ad-hoc-kapeana, ja shell rapautuu hiljaa. Pienet
 * varmistusdialogit ("jatketaanko?") ovat tietoinen poikkeus — 2 riviä
 * 840px-shellissä olisi yhtä väärin kuin raportti 540px-laatikossa.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const VP = readFileSync(join(__dir, '..', 'TalentMaster_VP_v25.html'), 'utf8');

/** CSS-säännön runko luokalle (ensimmäinen osuma). */
function saanto(valitsin) {
  const i = VP.indexOf(valitsin + ' {');
  if (i < 0) return null;
  return VP.slice(i, VP.indexOf('}', i));
}

function funktio(nimi) {
  const i = VP.indexOf(nimi);
  expect(i, nimi + ' puuttuu VP:stä').toBeGreaterThan(-1);
  let syv = 0, loppu = -1;
  for (let k = VP.indexOf('{', i); k < VP.length; k++) {
    if (VP[k] === '{') syv++;
    else if (VP[k] === '}') { syv--; if (syv === 0) { loppu = k + 1; break; } }
  }
  return VP.slice(i, loppu);
}

describe('VP · jaettu alasivu-shell', () => {
  it('LEVEYS: shell on 840px desktopilla (ei ~540px kelluva laatikko)', () => {
    const box = saanto('.sh-box');
    expect(box, '.sh-box-sääntö puuttuu').not.toBeNull();
    const m = box.match(/width:\s*(\d+)px/);
    expect(m, 'leveyttä ei määritelty').toBeTruthy();
    expect(Number(m[1]), 'shell on yhä kapea — juuri tämä oli raportoitu bugi')
      .toBeGreaterThanOrEqual(840);
    expect(box, 'ei rajaa kapeisiin näyttöihin').toContain('max-width: 96vw');
  });

  it('YKSI VIERITYS: sh-scroll vierii, sh-body EI ole sisäkkäinen scrolleri', () => {
    /* Kaksi sisäkkäistä vierivää aluetta leikkaa alaosan napit mobiilissa —
       sama vika joka korjattiin .cm-scroll:lla aikanaan. */
    const scroll = saanto('.sh-scroll');
    expect(scroll, '.sh-scroll puuttuu').not.toBeNull();
    expect(scroll, 'vieritys puuttuu').toMatch(/overflow-y:\s*auto/);
    expect(scroll, 'min-height:0 puuttuu → flex-lapsi ei kutistu').toMatch(/min-height:\s*0/);
    const body = saanto('.sh-body');
    expect(body, '.sh-body on oma scrollerinsa → kaksi sisäkkäistä vierivää aluetta')
      .not.toMatch(/overflow-y:\s*auto/);
  });

  it('MOBIILI: shell täyttää ruudun ja 2-sarake romahtaa yhteen', () => {
    const i = VP.indexOf('.sh-box { width: 100vw');
    expect(i, 'mobiilisääntö puuttuu').toBeGreaterThan(-1);
    const i2 = VP.indexOf('.sh-2col { grid-template-columns: 1fr;');
    expect(i2, '2-sarake ei romahda mobiilissa').toBeGreaterThan(-1);
  });

  it('VALMENTAJAKORTTI käyttää jaettua shelliä, ei omaa laatikkoa', () => {
    expect(VP, 'coachModal ei käytä shell-overlayta').toContain('id="coachModal" class="sh-overlay"');
    expect(VP, 'coachModal rakentaa yhä oman .cm-box-laatikkonsa').not.toContain('<div class="cm-box"');
  });

  it('PROFIILI on kahdessa sarakkeessa (shellin koko pointti = vaakatila)', () => {
    const sarake = saanto('.sh-2col');
    expect(sarake, '.sh-2col puuttuu').not.toBeNull();
    expect(sarake, 'ei ole kaksisarakkeinen').toMatch(/grid-template-columns:\s*1fr 1fr/);
    expect(VP, 'Profiili-välilehti ei käytä 2-saraketta').toMatch(/var t1 = '<div class="sh-2col"/);
  });

  it('HELPER on olemassa ja sulkeutuu kolmella tavalla (× · backdrop · Esc)', () => {
    const f = funktio('function avaaAlasivu(');
    expect(f, 'Esc-sulku puuttuu').toContain("'Escape'");
    expect(f, 'backdrop-sulku puuttuu').toContain('e.target === el');
    expect(f, '×-sulku puuttuu').toContain('.sh-close');
    expect(f, 'kuuntelija jää vuotamaan sulkemisen jälkeen').toContain('removeEventListener');
  });

  it('VÄLILEHDET kytketty: _cmTab lukee shellin luokkia', () => {
    /* Luokkanimen vaihto ilman tätä olisi rikkonut välilehtien vaihdon
       hiljaa — modaali aukeaisi, mutta tabit eivät toimisi. */
    expect(funktio('function _cmTab('), '_cmTab kyselee yhä vanhaa .cm-tab-luokkaa')
      .toContain(".querySelectorAll('.sh-tab')");
  });

  it('DRIFT: sisältörikkaat modaalit eivät rakenna ad-hoc-kapeaa laatikkoa', () => {
    /* Datavetoinen: etsii KAIKKI inline-rakennetut fixed-overlay-laatikot
       (sekä `style="…"`-attribuutti että `cssText = '…'`) ja tarkistaa
       max-widthin. Kapea (<720px) sisältömodaali = jaettu shell ohitettu.

       KAKSI ERI LISTAA, tietoisesti:
       · SALLITUT_PIENET = PYSYVÄ poikkeus. 2-rivinen "jatketaanko?" ei kuulu
         840px-shelliin.
       · VAIHE2_JONO    = TUNNETTU VELKA. Briiffi vaiheistaa migraation, ja
         nämä ovat sen listalla. Lista on tässä näkyvänä, ei hiljaisena
         poikkeuksena — ja koska vertailu on tarkka yhtäsuuruus, UUSI kapea
         sisältömodaali punertaa silti. */
    const SALLITUT_PIENET = [
      '_vpSulkuModal', '_korjModal', '_tmInfoModal', '_vpJatkuuModal', 'hylkaysModal',
      '_kvUusi', '_kvVirhe',
      /* LOMAKKEET JA VALINTADIALOGIT — pysyvä poikkeus, sama peruste kaikille:
         muutama kenttä tai yksi valinta. 840px-shellissä ne kelluisivat
         tyhjässä laatikossa, mikä on sama antipatterni kuin raportti 540px:ssä,
         vain toisinpäin. Luokiteltu SISÄLLÖN perusteella (otsikko suluissa). */
      '_vpBrandiModal',    // 3 pikakysymystä + vapaa teksti (brändipalaute)
      'vpSkooppiModal',    // "Vain tämä / Tämä ja seuraavat" (toistuvan tapahtuman skooppi)
      'vpTapModal',        // "Uusi tapahtuma" — luontilomake
      'vpTapEditModal',    // "Muokkaa tapahtumaa" — sama lomake muokkaustilassa
      'notifAsModal',      // "Ilmoitusasetukset" — kaksi kytkintä
      'vpSegModal',        // "Akatemia-/kilpajoukkueet" — valintaruudut
      'vpTkModal',         // seuran KPI-tavoiteluvut (taso ≥3 -osuus, MDR)
      'hlTbModal',         // "Seuran tavoitetaso (B)"
      'hlBmModal',         // "Kansalliset vertailuarvot"
      'hlTapModal',        // vertailuarvot ikävaiheittain
      'hlLinkModal',       // "Linkitä kalibraatiopari" — valitse yksi pari
      '_vpD3Modal',        // "D3 VP-kalibraatio" — yksi arvio + tallennus
      '_vpReviewModal',    // "＋ Kirjaa review" — 4-vaiheinen syöttölomake (asteikko + 2 tekstikenttää + arvo)
    ];
    /* VAIHE 2 -JONO = TUNNETTU VELKA, oma pieni PR per kohde (ei yhtä jättiä).
       Nämä ovat aitoja alasivuja: monirivisiä listoja tai editoreita, joissa
       vaakatila on hyödyksi. Lista on näkyvä, ei hiljainen poikkeus, ja koska
       vertailu on tarkka yhtäsuuruus, UUSI kapea sisältömodaali punertaa silti.

       HUOM: tämä jono syntyi vasta kun vartijan leveysmittaus korjattiin (ks.
       alla) — aiemmin nämä eivät punertaneet lainkaan, joten vaiheen 1 "jono on
       tyhjä" oli väärää turvallisuutta, ei saavutus. */
    const VAIHE2_JONO = [
      'kkModal',        // Konseptikirjasto — lista + editori; viimeinen `.cm-*`-vanhan kehyksen käyttäjä
      '_vpOhjModal',    // Ohjelmakirjasto — ohjelmakortit + sisään avautuva analytiikka
      '_pmpModal',      // VP:n muistiinpanot — historiavirta + lisäyslomake
      '_jfModal',       // Jaksofokus-editori — kolme dynaamista lohkoa
      'vpDayModal',     // Kalenterin päivänäkymä — päivän tapahtumalista
      'vpTapDetailModal', // Tapahtuman tiedot + läsnäolo
    ];

    /* EFEKTIIVINEN LEVEYS — VARTIJAN AUKKO, löydetty vaiheessa 2.
       Aiempi versio luki VAIN `max-width:<N>px`. Talon valtatyyli on kuitenkin
       `width:480px; max-width:94vw`, jossa ei ole ainuttakaan max-widthia
       pikseleinä — eikä `.jsp-rv-box`-tyyppisillä luokkalaatikoilla mitään
       inline-leveyttä. Niinpä 22 kapeaa modaalia (380–640px) ohitti vartijan
       hiljaa. Nyt leveys luetaan ENSIMMÄISESTÄ leveysilmaisusta laatikon
       kohdalla (inline tai CSS-luokasta); vw-rajat ohitetaan, koska ne
       kaventavat vain pientä ruutua, eivät desktop-leveyttä.
       Ensimmäinen, ei pienin: pienin poimisi sisäkkäisen ikonin `width:16px`. */
    function leveysTekstista(teksti) {
      const m2 = teksti.match(/(?:max-)?width:\s*(?:min\(\s*)?(\d+)px/);
      return m2 ? Number(m2[1]) : null;
    }
    /** Laatikon leveys: inline-tyyli tai ensimmäinen luokka jolla on px-leveys. */
    function laatikonLeveys(ikkuna) {
      const inline = leveysTekstista(ikkuna);
      if (inline !== null) return inline;
      for (const c of [...ikkuna.matchAll(/class="([\w-]+(?:\s+[\w-]+)*)"/g)]) {
        for (const luokka of c[1].split(/\s+/)) {
          const r = saanto('.' + luokka);
          const lev = r && leveysTekstista(r);
          if (lev != null) return lev;
        }
      }
      return null;
    }

    const loydot = new Set();
    let m;
    /* (a) style-attribuutilla rakennetut overlayt */
    const reA = /id="([\w-]+)"[^>]*style="[^"]*position:\s*fixed;\s*inset:\s*0[^"]*"/g;
    while ((m = reA.exec(VP))) {
      /* Ikkuna alkaa VASTA overlayn oman style-attribuutin jälkeen, jotta
         overlayn omat arvot eivät sekoitu laatikon leveyteen. */
      const jalkeen = VP.indexOf('"', VP.indexOf('style="', m.index) + 7);
      const lev = laatikonLeveys(VP.slice(jalkeen, jalkeen + 1200));
      if (lev !== null && lev < 720) loydot.add(m[1]);
    }
    /* (b) cssText-rakennetut (dynaamiset modaalit) */
    const reB = /cssText\s*=\s*'[^']*position:fixed;inset:0[^']*'/g;
    while ((m = reB.exec(VP))) {
      const ymp = VP.slice(Math.max(0, m.index - 400), m.index + 1800);
      const idm = ymp.match(/\.id\s*=\s*'([\w-]+)'/);
      const lev = laatikonLeveys(ymp.slice(ymp.indexOf('position:fixed;inset:0')));
      if (idm && lev !== null && lev < 720) loydot.add(idm[1]);
    }

    /* (c) overlay jonka `position:fixed;inset:0` tulee CSS-ID-SÄÄNNÖSTÄ, ei
       inline-tyylistä (esim. `#kkModal { position: fixed; inset: 0; … }`).
       Ilman tätä haaraa tuollainen modaali jää kokonaan mittaamatta. */
    const reC = /#([\w-]+)\s*\{[^}]*position:\s*fixed[^}]*inset:\s*0[^}]*\}/g;
    while ((m = reC.exec(VP))) {
      const id = m[1];
      const i = VP.indexOf('<div id="' + id + '">');
      if (i < 0) continue;
      const lev = laatikonLeveys(VP.slice(i, i + 1200));
      if (lev !== null && lev < 720) loydot.add(id);
    }

    const jaljella = [...loydot].filter((id) => SALLITUT_PIENET.indexOf(id) < 0).sort();
    expect(jaljella, 'uusi kapea sisältömodaali jaetun shellin ohi — migroi avaaAlasivu():hin, '
      + 'tai lisää SALLITUT_PIENET/VAIHE2_JONO-listaan perusteluineen')
      .toEqual(VAIHE2_JONO.slice().sort());
  });

  it('VAIHE 2: hotRaporttiModal käyttää jaettua shelliä', () => {
    /* Sisältörikas raportti: 560px katkoi pitkät monospace-rivit kesken. */
    expect(VP, 'HoT-raportti ei käytä jaettua shelliä')
      .toMatch(/avaaAlasivu\(\{[\s\S]{0,80}id: 'hotRaporttiModal'/);
    expect(VP, 'HoT-raportti rakentaa yhä oman fixed-laatikkonsa')
      .not.toMatch(/modal\.id = 'hotRaporttiModal'/);
  });

  it('EI VACUOUS: drift-vartija löytää oikeasti fixed-laatikoita', () => {
    /* Jos regex ei osu mihinkään, edellinen testi läpäisisi aina. */
    const kaikki = (VP.match(/position:\s*fixed;\s*inset:\s*0/g) || []).length;
    expect(kaikki, 'fixed-overlay-kuviota ei löydy → vartija ei mittaa mitään').toBeGreaterThan(5);
  });
});
