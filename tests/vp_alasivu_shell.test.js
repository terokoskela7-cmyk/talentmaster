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
      /* VAIHE 2 -ARVIO: `_vpBrandiModal` = 3 pikakysymystä (Kyllä/Osittain/Ei)
         + vapaa teksti. Se on LOMAKE, ei alasivu: 840px-shellissä kolme lyhyttä
         riviä kelluisi tyhjässä laatikossa — sama antipatterni kuin
         "jatketaanko?" leveässä shellissä. Luokiteltu pieneksi dialogiksi
         SISÄLLÖN perusteella, ei migroitu. */
      '_vpBrandiModal',
    ];
    /* VAIHE 2 TEHTY: jono on TYHJÄ. `hotRaporttiModal` (sisältörikas raportti)
       migroitiin shelliin. Tyhjä lista + tarkka yhtäsuuruus = uusi kapea
       sisältömodaali punertaa heti, ilman armonaikaa. */
    const VAIHE2_JONO = [];

    const loydot = new Set();
    /* (a) style-attribuutilla rakennetut */
    const reA = /id="([\w-]+)"[^>]*style="[^"]*position:\s*fixed;\s*inset:\s*0[^"]*"/g;
    let m;
    while ((m = reA.exec(VP))) {
      const mw = VP.slice(m.index, m.index + 1200).match(/max-width:\s*(\d+)px/);
      if (mw && Number(mw[1]) < 720) loydot.add(m[1]);
    }
    /* (b) cssText-rakennetut (dynaamiset modaalit) */
    const reB = /cssText\s*=\s*'[^']*position:fixed;inset:0[^']*'/g;
    while ((m = reB.exec(VP))) {
      const ymp = VP.slice(Math.max(0, m.index - 400), m.index + 1500);
      const idm = ymp.match(/\.id\s*=\s*'([\w-]+)'/);
      const mw = ymp.match(/max-width:\s*(\d+)px/);
      if (idm && mw && Number(mw[1]) < 720) loydot.add(idm[1]);
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
