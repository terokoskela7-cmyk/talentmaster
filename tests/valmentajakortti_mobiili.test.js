/**
 * VALMENTAJAKORTTI: YKSI VIERIVÄ KONTAINERI + LUOKKAPOHJAINEN SYNTEESI.
 *
 * HUOM (shell-migraatio): luokat ovat nyt JAETUN alasivu-shellin (.sh-*),
 * ei valmentajakorttikohtaisia (.cm-*). INVARIANTTI ON SAMA: yksi vierivä
 * kontaineri, synteesi sen sisällä, ei sisäkkäisiä scrollereita.
 *
 * MIKSI: `#cmKehityskortti` (Oura-synteesi) oli `.cm-body`:n ULKOPUOLELLA
 * `.cm-box`:n flex-lapsena ilman korkeuskattoa, ja `.cm-box` on `overflow:hidden`.
 * Ainoa vierivä alue oli `.cm-body`. Mobiilissa synteesi söi pystytilan →
 * alaosa (välilehtien sisältö + tallennusnapit) jäi tavoittamattomiin. Vika on
 * hiljainen: mitään ei kaadu, sisältö on DOM:ssa, se ei vain ole saavutettavissa.
 *
 * Toinen puoli: synteesi oli rakennettu INLINE-TYYLEILLÄ. Inline voittaa media
 * queryn, joten mobiililayoutia oli mahdoton korjata niiden päälle — kiinteä
 * 108px nimisarake ja oikealle tasattu teksti leikkautuivat 360px:llä. Siksi
 * portti vaatii myös että rakenne on luokissa.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const VP = readFileSync(join(juuri, 'TalentMaster_VP_v25.html'), 'utf8');

/** CSS-säännön runko selektorille (ensimmäinen osuma). */
function saanto(selektori) {
  const i = VP.indexOf('\n' + selektori + ' {');
  if (i < 0) return null;
  const j = VP.indexOf('}', i);
  return j > i ? VP.slice(i, j) : null;
}

describe('Valmentajakortti · mobiilirakenne', () => {
  it('EI VACUOUS: modaalipohja ja synteesikortti löytyvät', () => {
    expect(VP).toContain('class="sh-box"');
    expect(VP).toContain('id="cmKehityskortti"');
    expect(VP).toContain('class="sh-scroll"');
  });

  it('#cmKehityskortti on vierivän kontainerin SISÄLLÄ (ei .cm-box:n suorana lapsena)', () => {
    /* Tämä on koko korjaus. Jos synteesi siirtyy takaisin scroll-kontainerin
       ulkopuolelle, mobiilin alaosa katoaa uudelleen. */
    const iScroll = VP.indexOf("'<div class=\"sh-scroll\">'");
    const iKk = VP.indexOf('id="cmKehityskortti"');
    const iBody = VP.indexOf("'<div class=\"sh-body\">'");
    expect(iScroll, 'sh-scroll-kääre puuttuu modaalipohjasta').toBeGreaterThan(-1);
    expect(iKk, 'synteesikortti ennen scroll-kääreen avausta').toBeGreaterThan(iScroll);
    expect(iBody, 'sh-body pitää tulla synteesin jälkeen samassa kääreessä').toBeGreaterThan(iKk);
  });

  it('.cm-scroll on ainoa vierivä alue — .cm-body EI saa olla sisäkkäinen scrolleri', () => {
    const scroll = saanto('.sh-scroll');
    expect(scroll, '.sh-scroll-sääntö puuttuu').not.toBeNull();
    expect(scroll, 'overflow-y puuttuu').toMatch(/overflow-y:\s*auto/);
    /* min-height:0 on pakollinen: ilman sitä flex-lapsi ei kutistu sisältönsä
       alle, ja kontaineri kasvaa ulos .cm-box:sta jolloin overflow:hidden leikkaa. */
    expect(scroll, 'min-height:0 puuttuu → flex-lapsi ei kutistu').toMatch(/min-height:\s*0/);

    const body = saanto('.sh-body');
    expect(body, '.sh-body-sääntö puuttuu').not.toBeNull();
    expect(body, '.sh-body on taas oma scrollerinsa → kaksi sisäkkäistä vierivää aluetta').not.toMatch(/overflow-y:\s*auto/);
  });

  it('synteesi renderöidään LUOKILLA, ei inline-tyyleillä (muuten media query ei pure)', () => {
    expect(VP, 'rivi ei käytä .cm-kk-rivi-luokkaa').toContain('class="cm-kk-rivi"');
    expect(VP).toContain('class="cm-kk-nimi"');
    expect(VP).toContain('class="cm-kk-txt"');
    /* Vanha muoto: kiinteä 108px nimisarake inline-tyylissä → leikkautui 360px:llä
       eikä ollut ylikirjoitettavissa media queryllä. */
    expect(VP, 'kiinteä inline-leveys palasi synteesiriville').not.toContain('flex:0 0 108px;font-size:11px');
  });

  it('mobiilissa rivi rivittyy eikä nimisarake ole kiinteä', () => {
    const i = VP.indexOf('.cm-kk-rivi { flex-wrap: wrap; }');
    expect(i, 'mobiilin flex-wrap puuttuu').toBeGreaterThan(-1);
    expect(VP).toMatch(/\.cm-kk-nimi\s*\{\s*flex:\s*1 1 auto;\s*\}/);
    expect(VP, 'kuvaus ei siirry omalle rivilleen mobiilissa').toMatch(/\.cm-kk-txt\s*\{[^}]*flex:\s*1 1 100%/);
  });

  it('progressive disclosure: kuvaukset piilossa kunnes .auki', () => {
    expect(VP).toMatch(/\.cm-kk:not\(\.auki\)\s*\.cm-kk-intro/);
    expect(VP).toMatch(/\.cm-kk:not\(\.auki\)\s*\.cm-kk-txt\s*\{\s*display:\s*none/);
    expect(VP, 'laajennusnappi puuttuu').toContain('_cmSynteesiLaajenna');
  });

  it('välilehdet pysyvät näkyvissä ja valittu vieritetään esiin', () => {
    const t = saanto('.sh-tabs-sticky');
    expect(t, '.sh-tabs-sticky puuttuu').not.toBeNull();
    expect(t).toMatch(/position:\s*sticky/);
    /* 5 välilehteä + vaakavieritys mobiilissa → valittu voi jäädä näkymättä. */
    expect(VP, 'aktiivista välilehteä ei vieritetä esiin').toContain('scrollIntoView');
  });

  it('§6: mobiilisäännöt ovat SAMASSA lohkossa kuin muut .cm-säännöt', () => {
    /* Kaksi @media(max-width:768px) -lohkoa samoille selektoreille kumoaisi
       toisensa (Seura.html:n bugi, §6). Uudet .cm-kk-säännöt lisättiin olemassa
       olevaan lohkoon — todiste: niiden välissä ei aloiteta uutta @mediaa. */
    const iBox = VP.indexOf('.sh-box { width: 100vw');
    const iKk = VP.indexOf('.cm-kk { padding: 0 14px;');
    expect(iBox, 'mobiilin .sh-box-sääntö puuttuu').toBeGreaterThan(-1);
    expect(iKk, 'mobiilin .cm-kk-sääntö puuttuu').toBeGreaterThan(iBox);
    expect(VP.slice(iBox, iKk), 'välissä alkaa uusi @media → kaksi lohkoa').not.toMatch(/@media/);
  });
});
