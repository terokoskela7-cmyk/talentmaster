/**
 * TalentMaster™ — valintamalli + "Valitun ominaisuudet" + tallennuksen näkyvyys.
 *
 * Kaksi kipupistettä tuotannosta: "kun valitsin pelaajan, en tiedä kenelle se menee" ja
 * "mihin se tallentuu?". Editori oli puhtaasti tila-pohjainen: pysyvää valintaa ei ollut,
 * mitään ei korostettu, eikä paneeli kertonut mitä muokataan. Tallennus toimi oikein mutta
 * siitä kerrottiin vain ohimenevällä toastilla.
 *
 *   A) VALINTA — pysyvä {kind,id}; klikkaus valitsee, raahaus ei vie sitä
 *   B) KOROSTUS — editorin overlayssa, EI jaetussa renderöijässä (pelaaja ei näe kehyksiä)
 *   C) OMINAISUUDET — kaikki kentät jo §3:ssa valideja; toiminnot osuvat VALITTUUN
 *   D) §32 — selite kolmikielisenä; luonti ei enää kopioi suomea sv/en-kenttiin
 *   E) TALLENNUS — pysyvä rivi kertoo mihin ja missä tilassa
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const __dir = dirname(fileURLToPath(import.meta.url));
const require_ = createRequire(import.meta.url);
const ROOT = join(__dir, '..');
const VP = readFileSync(join(ROOT, 'TalentMaster_VP_v25.html'), 'utf8');
const RENDER = readFileSync(join(ROOT, 'lib', 'tm_kaavio_render.js'), 'utf8');
const E = require_(join(ROOT, 'lib', 'tm_kaavio_editori.js'));
const V = require_(join(ROOT, 'lib', 'tm_kaavio_validate.js'));
const RIVIT = VP.split('\n');
const runko = (nimi) => {
  const a = RIVIT.findIndex((l) => new RegExp('^(?:async\\s+)?function ' + nimi + '\\s*\\(').test(l));
  if (a < 0) throw new Error('ei löytynyt: ' + nimi);
  for (let i = a + 1; i < RIVIT.length; i++) if (RIVIT[i] === '}') return RIVIT.slice(a, i + 1).join('\n');
  throw new Error('sulku puuttuu: ' + nimi);
};
const POHJA = () => ({
  avain: 'y_h0', suunta: 'ylos', pelimuoto: '8v8',
  pelaajat: [
    { id: 'O1', joukkue: 'oma', rooli: 'vastaanottaja', x: 50, y: 50 },
    { id: 'O2', joukkue: 'oma', rooli: 'tuki', x: 30, y: 70 }
  ]
});

describe('A — valinta on pysyvä ja klikkaus valitsee', () => {
  it('valinta on {kind,id}, ei pelkkä id', () => {
    expect(runko('_kaavioValittuId')).toMatch(/v\.kind === kind/);
    expect(VP).toMatch(/_kaavioTila\.valittu = \{ kind: 'player', id: os\.ref \}/);
  });
  it('klikkaus erotetaan raahauksesta liikkeen perusteella', () => {
    const pd = runko('_kaavioPointerDown');
    expect(pd).toContain('_kaavioTila.klikAlku = { x: sx, y: sy, liikkui: false }');
    expect(runko('_kaavioPointerMove')).toMatch(/>= 3\) _kaavioTila\.klikAlku\.liikkui = true/);
    const pu = runko('_kaavioPointerUp');
    expect(pu).toMatch(/_kaavioTila\.klikAlku\.liikkui\) \{[\s\S]*kaavioHistoriaLisaa/);
  });
  it('klikkaus tyhjään tyhjentää valinnan (ei jää roikkumaan)', () => {
    expect(runko('_kaavioPointerUp')).toMatch(/_kaavioTila\.valittu = osui \? \{[^}]*\} : null/);
  });
  it('valinta toimii VAIN kun työkalu ei ole aktiivinen (ei riko #526/#528-työkaluja)', () => {
    expect(runko('_kaavioPointerUp')).toMatch(/else if \(!_kaavioTila\.tyokalu && m\)/);
  });
  it('valinta EI nollaudu työkalua vaihtaessa (se on pysyvä tila)', () => {
    expect(runko('_kaavioValitseTyokalu')).not.toContain('_kaavioTila.valittu = null');
  });
  it('valinta nollautuu editorin avauksessa ja sulussa', () => {
    expect(runko('_kaavioAvaaEditori')).toContain('_kaavioTila.valittu = null');
    expect(VP).toMatch(/function _kaavioSuljeEditori\(\)[^\n]*valittu = null/);
  });
  it('osumatestin lajit kartoitetaan valinnan lajeiksi', () => {
    // kaavioOsuma palauttaa 'pelaaja' | 'selite' | 'liike'; valinta käyttää 'player'-nimeä
    expect(runko('_kaavioPointerUp')).toMatch(/osui\.tyyppi === 'pelaaja' \? 'player' : osui\.tyyppi/);
  });
});

describe('B — korostus on editorin overlayssa, ei jaetussa renderöijässä', () => {
  it('jaettu drawSpec ei tiedä valinnasta (pelaaja-appi ei näytä kehyksiä)', () => {
    expect(RENDER).not.toMatch(/valittu|valinta|selected/i);
  });
  it('korostus piirretään drawSpecin JÄLKEEN editorin omaan svg:hen', () => {
    const fn = runko('_kaavioPiirraEditori');
    const iDraw = fn.indexOf('drawSpec('), iVal = fn.indexOf('_kaavioTila.valittu');
    expect(iDraw).toBeGreaterThan(0);
    expect(iVal).toBeGreaterThan(iDraw);
    expect(fn).toContain("setAttribute('stroke', 'var(--amber)')");
    expect(fn).toContain('svg.appendChild(_r)');
  });
  it('korostus käyttää editorin koordinaattimuunnosta (osuu kohdakkain)', () => {
    const fn = runko('_kaavioPiirraEditori');
    expect(fn).toContain('kaavioEdPX(_kohde.x)');
    expect(fn).toContain('kaavioEdPY(_kohde.y)');
  });
  it('liikkeen korostus osuu janan keskelle (ei päätepisteeseen)', () => {
    expect(runko('_kaavioPiirraEditori')).toMatch(/\(_a\.x \+ _b\.x\) \/ 2/);
  });
});

describe('C — ominaisuudet osuvat valittuun', () => {
  it('jokainen toiminto lukee valinnan, ei "viimeksi kosketettua"', () => {
    ['_kaavioOmJoukkue', '_kaavioOmLippu', '_kaavioOmPallo', '_kaavioOmSuunta',
     '_kaavioOmNakokentta', '_kaavioOmSelite', '_kaavioOmLiiketyyppi'].forEach((f) => {
      expect(runko(f), f).toMatch(/_kaavioValittuId\(|_kaavioValittuPelaaja\(/);
    });
  });
  it('joukkueen vaihto siirtää roolin järkevästi ja siivoaa gk:n', () => {
    let s = E.kaavioAsetaJoukkue(POHJA(), 'O2', 'vastustaja').spec;
    expect(s.pelaajat[1].rooli).toBe('paine');
    s = E.kaavioAsetaLippu(s, 'O2', 'gk', true).spec;
    s = E.kaavioAsetaJoukkue(s, 'O2', 'oma').spec;
    expect(s.pelaajat[1].gk).toBeUndefined();          // lippu ei jää roikkumaan
    expect(s.pelaajat[1].rooli).toBe('vaihtoehto');
    expect(V.validoiKaavio(s).E).toEqual([]);
  });
  it('gk on vain vastustajan ominaisuus (renderöijä piirtää sen vain sinne)', () => {
    expect(E.kaavioAsetaLippu(POHJA(), 'O1', 'gk', true).virhe).toBe('gk_vain_vastustajalle');
  });
  it('joukkueen vaihto kunnioittaa pelimuotokattoa', () => {
    const s = POHJA(); s.pelimuoto = '5v5';
    for (let i = 0; i < 5; i++) s.pelaajat.push({ id: 'V' + i, joukkue: 'vastustaja', rooli: 'paine', x: 10 + i, y: 10 });
    expect(E.kaavioAsetaJoukkue(s, 'O1', 'vastustaja').virhe).toBe('pelimuoto_taynna');
  });
  it('liput poistetaan kentästä kun ne menevät pois päältä (spec pysyy siistinä)', () => {
    let s = E.kaavioAsetaLippu(POHJA(), 'O1', 'korostus', true).spec;
    expect(s.pelaajat[0].korostus).toBe(true);
    s = E.kaavioAsetaLippu(s, 'O1', 'korostus', false).spec;
    expect('korostus' in s.pelaajat[0]).toBe(false);
  });
  it('liiketyypin vaihto rajattu enumiin', () => {
    const s = E.kaavioLisaaLiike(POHJA(), 'syotto', 'O2', 'O1').spec;
    expect(E.kaavioAsetaLiiketyyppi(s, 'L1', 'juoksu').spec.liikkeet[0].tyyppi).toBe('juoksu');
    expect(E.kaavioAsetaLiiketyyppi(s, 'L1', 'lentopallo').virhe).toBe('tuntematon_tyyppi');
  });
  it('paneeli nimeää valinnan (tämä yksin poistaa "en tiedä kenelle")', () => {
    const fn = runko('_kaavioValinnanNimi');
    expect(fn).toMatch(/oma pelaaja/);
    expect(fn).toMatch(/vastustaja/);
    expect(runko('_kaavioOminaisuudetHTML')).toMatch(/vpT\('Valittu'\)/);
  });
  it('tyhjä valinta ohjaa toimintaan, ei jätä tyhjää paneelia', () => {
    expect(runko('_kaavioOminaisuudetHTML')).toContain('Klikkaa kentältä pelaajaa, liikettä tai selitettä.');
  });
});

describe('D — §32: selite kolmikielisenä', () => {
  it('luonti täyttää VAIN fi:n — suomi sv/en-kentässä olisi väärää dataa', () => {
    expect(E.kaavioLisaaSelite(POHJA(), 70, 30, 'Katso ennen').spec.selitteet[0].t)
      .toEqual({ fi: 'Katso ennen', sv: '', en: '' });
  });
  it('validaattori estää tallennuksen kunnes käännökset on kirjoitettu', () => {
    const s = E.kaavioLisaaSelite(POHJA(), 70, 30, 'Katso ennen').spec;
    expect(V.validoiKaavio(s).E.join(' ')).toMatch(/kieli sv puuttuu[\s\S]*kieli en puuttuu/);
  });
  it('kolme erillistä arvoa: sv ≠ fi', () => {
    let s = E.kaavioLisaaSelite(POHJA(), 70, 30, 'Katso ennen').spec;
    s = E.kaavioAsetaSeliteTeksti(s, 'S1', 'sv', 'Titta först').spec;
    s = E.kaavioAsetaSeliteTeksti(s, 'S1', 'en', 'Look first').spec;
    expect(s.selitteet[0].t.sv).not.toBe(s.selitteet[0].t.fi);
    expect(V.validoiKaavio(s).E).toEqual([]);
  });
  it('tuntematon kieli hylätään (ei uusia kielikenttiä ohi skeeman)', () => {
    const s = E.kaavioLisaaSelite(POHJA(), 70, 30, 'x').spec;
    expect(E.kaavioAsetaSeliteTeksti(s, 'S1', 'de', 'Schau').virhe).toBe('tuntematon_kieli');
  });
  it('vajaat raportoidaan ENNEN tallennusta (paneelin varoitus)', () => {
    const s = E.kaavioLisaaSelite(POHJA(), 70, 30, 'x').spec;
    expect(E.kaavioSeliteVajaat(s)).toEqual([{ id: 'S1', puuttuu: ['sv', 'en'] }]);
    const t = E.kaavioAsetaSeliteTeksti(E.kaavioAsetaSeliteTeksti(s, 'S1', 'sv', 'y').spec, 'S1', 'en', 'z').spec;
    expect(E.kaavioSeliteVajaat(t)).toEqual([]);
  });
  it('paneeli näyttää kolme kenttää ja varoittaa puuttuvista', () => {
    const fn = runko('_kaavioOminaisuudetHTML');
    expect(fn).toMatch(/\['fi', 'sv', 'en'\]\.forEach/);
    expect(fn).toContain('kaavioSeliteVajaat');
    expect(fn).toMatch(/Käännös puuttuu:/);
  });
});

describe('E — tallennuksen näkyvyys', () => {
  const fn = () => runko('_kaavioTallennusKohdeHTML');
  it('kertoo kohteen, tilan ja näkyvyyden', () => {
    expect(fn()).toContain('Tallentuu: seuran kaaviopankki');
    expect(fn()).toMatch(/_kaavioTilaLbl\(/);
    expect(fn()).toMatch(/_kaavioNakyvyysLbl\(/);
  });
  it('arvot luetaan SAMASTA review-objektista jonka tallennus kirjoittaa', () => {
    expect(fn()).toMatch(/m\.review && m\.review\.status/);
    expect(fn()).toMatch(/m\.review && m\.review\.nakyvyys/);
  });
  it('uusi kaavio kertoo tallentuvansa luonnoksena', () => {
    expect(fn()).toMatch(/uusi — tallentuu luonnoksena/);
    expect(fn()).toMatch(/m\._uusi \|\| !m\.id/);
  });
  it('hyväksytyn muokkaus varoittaa paluusta katselmukseen', () => {
    expect(fn()).toMatch(/kaavioTilaMuokkauksenJalkeen\(m, _kaavioCtxNyt\(\)\) === 'odottaa'/);
    expect(fn()).toMatch(/muokkaus vie takaisin katselmukseen/);
  });
  it('rivi on editorissa ja päivittyy tilan muuttuessa', () => {
    expect(runko('_kaavioAvaaEditori')).toContain('_kvKohde');
    expect(runko('_kaavioTyokaluPaivita')).toContain('_kaavioTallennusKohdeHTML()');
  });
  it('kaikki uudet tekstit ovat sv-kartassa', () => {
    const sv = readFileSync(join(ROOT, 'lib', 'tm_vp_i18n.js'), 'utf8');
    ['Valitun ominaisuudet', 'Valittu', '— ei valintaa', 'Korostus', 'Poista valittu',
     'Tallentuu: seuran kaaviopankki', 'näkyvyys', 'Käännös puuttuu:'].forEach((k) =>
      expect(sv, k).toContain("'" + k + "':"));
  });
});
