/**
 * VP-SIVUJEN LUKUMITTA — desktopilla sisältö ei saa venyä reunasta reunaan.
 *
 * LIVE-HAVAINTO: "skaalautuu erinomaisesti kännykässä mutta tietokoneella
 * jotenkin huono — pitkää viivaa ja leveää."
 *
 * JUURISYY: `#main`illa ei ole `max-width`ia, joten kaikki lukunäkymät perivät
 * rajattoman leveyden. Raportointi-infografiikan bullet-palkit, viiteviivat ja
 * trendiviivat pitenivät → huono lukumielikuva. Mobiilissa viewport on mittaa
 * kapeampi, joten siellä layout oli aina kunnossa — siksi vika näkyi vain
 * desktopilla.
 *
 * KORJAUS laajentaa olemassa olevaa LUKUMITTA-konventiota (`.jsp-railvapaa`)
 * sivutasolle. Tämä portti lukitsee kolme asiaa: mitta on olemassa, mobiili
 * pysyy koskemattomana (EI mediakyselyä), ja uusi lohko ei kierrä mittaa.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const VP = readFileSync(join(__dir, '..', 'TalentMaster_VP_v25.html'), 'utf8');

/** CSS-säännön runko (ensimmäinen osuma annetulle valitsimelle). */
function saanto(valitsin) {
  const i = VP.indexOf(valitsin + ' {');
  if (i < 0) return null;
  return VP.slice(i, VP.indexOf('}', i));
}

/** Kaikki `.ws-view`-näkymät lähteestä: { id, luokat }. */
function nakymat() {
  const out = [];
  const re = /<div class="(ws-view[^"]*)"[^>]*id="(ws-[\w-]+)"/g;
  let m;
  while ((m = re.exec(VP))) out.push({ id: m[2], luokat: m[1] });
  return out;
}

describe('VP · sivujen lukumitta', () => {
  it('EI VACUOUS: näkymät löytyvät lähteestä', () => {
    const n = nakymat();
    expect(n.length, 'ws-view-näkymiä ei löytynyt → portti ei mittaa mitään').toBeGreaterThan(5);
    expect(n.map((x) => x.id)).toContain('ws-raportointi');
  });

  it('LUKUMITTA on olemassa ja keskittää sarakkeen', () => {
    const s = saanto('.ws-view');
    /* `.ws-view { display:none }` on eri sääntö — haetaan se jossa on mitta. */
    const i = VP.indexOf('.ws-view { width: 100%; max-width:');
    expect(i, 'lukumitta-sääntöä ei ole').toBeGreaterThan(-1);
    const mitta = VP.slice(i, VP.indexOf('}', i));
    const mw = mitta.match(/max-width:\s*(\d+)px/);
    expect(mw, 'max-width puuttuu').toBeTruthy();
    expect(Number(mw[1]), 'lukumitta on liian leveä — rivi jää pitkäksi').toBeLessThanOrEqual(1040);
    expect(Number(mw[1]), 'lukumitta on liian kapea kartta-SSOT:iin nähden').toBeGreaterThanOrEqual(940);
    expect(mitta, 'saraketta ei keskitetä').toMatch(/margin-left:\s*auto/);
    expect(mitta, 'saraketta ei keskitetä').toMatch(/margin-right:\s*auto/);
    expect(s, '.ws-view-perussääntö katosi').not.toBeNull();
  });

  it('MOBIILI ENNALLAAN: lukumitta ei tuo uutta mediakyselyä', () => {
    /* Kännykkänäkymä oli se osa joka toimi — sitä ei saa koskea. max-width
       romahtaa itsestään kun viewport < mitta, joten mediakyselyä ei tarvita.
       Jos joku lisää `.ws-view`-säännön mediakyselyn sisään, mobiililayout
       muuttuu hiljaa. */
    const media = VP.match(/@media\s*\([^)]*max-width:\s*768px[^)]*\)\s*\{[\s\S]*?\n\}/g) || [];
    media.forEach((lohko) => {
      expect(lohko, 'mobiilimediakysely koskee .ws-view-lukumittaan')
        .not.toMatch(/\.ws-view\s*\{[^}]*max-width/);
    });
  });

  it('SYSTEEMINEN: yksi jaettu sääntö, ei per-sivu ad-hoc max-widthiä', () => {
    /* Yksi `.ws-view`-sääntö kattaa kaikki lukunäkymät. Per-sivu-säännöt
       (esim. `#ws-raportointi { max-width: … }`) ajautuisivat erilleen. */
    nakymat().forEach((n) => {
      const oma = saanto('#' + n.id);
      if (oma) {
        expect(oma, n.id + ': per-sivu max-width kiertää jaetun lukumitan')
          .not.toMatch(/max-width/);
      }
    });
  });

  it('OPT-OUT: kalenteri on merkitty leveäksi, muut lukumitassa', () => {
    const n = nakymat();
    const leveat = n.filter((x) => x.luokat.indexOf('ws-view--') >= 0).map((x) => x.id);
    expect(leveat, 'kalenteriruudukko puristuisi lukumittaan').toEqual(['ws-kalenteri']);
    /* Opt-out-sääntö on oikeasti olemassa — pelkkä luokka ilman sääntöä ei tee mitään. */
    const optOut = saanto('.ws-view--leveä');
    expect(optOut, 'opt-out-sääntö puuttuu → kalenteri jäisi silti 980px:ään').not.toBeNull();
    expect(optOut).toMatch(/max-width:\s*none/);
  });

  it('DRIFT: lukunäkymän sisältölohko ei kierrä mittaa 100vw-leveydellä', () => {
    /* Sisältölohko joka asettaa itselleen `width:100vw` tai leveämmän
       max-widthin kumoaisi lukumitan ilman että mikään muu rikkoutuu —
       tyypillinen hiljainen regressio. Modaalit (.sh-overlay/fixed) ovat eri
       asia: ne eivät ole `.ws-view`:n sisällä. */
    const osumat = [];
    nakymat().forEach((n) => {
      const alku = VP.indexOf('id="' + n.id + '"');
      const seuraava = VP.indexOf('<div class="ws-view', alku + 10);
      const lohko = VP.slice(alku, seuraava > 0 ? seuraava : alku + 6000);
      if (/width:\s*100vw/.test(lohko)) osumat.push(n.id + ' (100vw)');
      const mw = lohko.match(/max-width:\s*(\d{4,})px/);
      if (mw && Number(mw[1]) > 1040) osumat.push(n.id + ' (max-width ' + mw[1] + 'px)');
    });
    expect(osumat, 'sisältölohko kiertää lukumitan — käytä .ws-view--leveä-opt-outia '
      + 'perusteluineen tai pidä lohko mitassa').toEqual([]);
  });

  it('EI REGRESSIOTA: infografiikan kirjastoon ei koskettu', () => {
    /* Tämä on ULOMPI leveysrajaus. Jos korjaus olisi valunut kirjastoon,
       periaatelukot (teal-only, honest-empty) olisivat vaarassa. */
    const LIB = readFileSync(join(__dir, '..', 'lib/tm_infografiikka.js'), 'utf8');
    expect(LIB, 'lukumitta valui jaettuun kirjastoon').not.toContain('980');
    expect(LIB, 'kirjasto ei saa määrätä sivun leveyttä').not.toContain('margin-left: auto');
  });
});
