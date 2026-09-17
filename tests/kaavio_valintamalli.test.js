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
    // Sulkufunktio on monirivinen (se päivittää nyt myös pankin) → ankkuroidaan runkoon.
    expect(runko('_kaavioSuljeEditori')).toContain('_kaavioTila.valittu = null');
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

// KORJATTU RAJANVETO: selite on KÄYTTÄJÄN VAPAATEKSTIÄ, ei kanonia. §32:n käännä-renderissä-kuri
// koskee curriculum-sisältöä (konseptien nimet, KPI-tekstit), joka tallennetaan kielineutraalina.
// Selite syntyy kirjoittajan omalla äidinkielellä kuten viesti — kolmen kielen pakko esti
// tallennuksen kokonaan eikä palvellut mitään. Nyt riittää että tekstiä ON.
describe('D — selite on vapaatekstiä: yksi kieli riittää', () => {
  it('luonti täyttää kirjoittajan kielen; tallennus onnistuu heti', () => {
    const s = E.kaavioLisaaSelite(POHJA(), 70, 30, 'Katso ennen').spec;
    expect(s.selitteet[0].t).toEqual({ fi: 'Katso ennen', sv: '', en: '' });
    expect(V.validoiKaavio(s).E).toEqual([]);
  });
  it('vain ruotsiksi kirjoitettu kelpaa yhtä lailla', () => {
    const s = E.kaavioLisaaSelite(POHJA(), 70, 30, 'x').spec;
    s.selitteet[0].t = { fi: '', sv: 'Titta först', en: '' };
    expect(V.validoiKaavio(s).E).toEqual([]);
  });
  it('täysin tyhjä selite on virhe (tekstiä pitää olla)', () => {
    const s = E.kaavioLisaaSelite(POHJA(), 70, 30, 'x').spec;
    s.selitteet[0].t = { fi: '  ', sv: '', en: '' };
    expect(V.validoiKaavio(s).E.join(' ')).toMatch(/teksti puuttuu \(vähintään yksi kieli\)/);
  });
  it('käännökset ovat VAPAAEHTOISIA lisäkenttiä, ei kolmea pakollista', () => {
    const fn = runko('_kaavioOminaisuudetHTML');
    expect(fn).toContain('_kaavioSeliteKirjoituskieli(se)');
    expect(fn).toMatch(/\+ Lisää käännös/);
    expect(fn).toMatch(/vpT\('valinnainen'\)/);
    expect(fn).not.toMatch(/tallennus estyy kunnes/);
  });
  it('muokkaus avautuu siihen kieleen jolla lappu on kirjoitettu', () => {
    const fn = runko('_kaavioSeliteKirjoituskieli');
    expect(fn).toMatch(/se\.t\[oma\]\) return oma/);
    expect(fn).toMatch(/\['fi', 'sv', 'en'\]\.filter/);
  });
  it('setteri toimii yhä kielikohtaisesti', () => {
    let s = E.kaavioLisaaSelite(POHJA(), 70, 30, 'Katso').spec;
    s = E.kaavioAsetaSeliteTeksti(s, 'S1', 'sv', 'Titta').spec;
    expect(s.selitteet[0].t).toEqual({ fi: 'Katso', sv: 'Titta', en: '' });
    expect(V.validoiKaavio(s).E).toEqual([]);
  });
});

// Rivitys + kielifallback ovat JAETUSSA renderöijässä → koskevat VP:tä, reviewia ja pelaaja-appia.
// Valinnan hit-rect sen sijaan on vain editorin overlayssa.
describe('F — pitkä selite: rivitys ja klikattavuus', () => {
  const wrap = (() => {
    const src = readFileSync(join(ROOT, 'lib', 'tm_kaavio_render.js'), 'utf8');
    // eslint-disable-next-line no-new-func
    return new Function(src + '; return wrapText;')();
  })();
  it('lyhyt selite pysyy YHDELLÄ rivillä (vanhat kaaviot eivät muutu)', () => {
    expect(wrap('Näet molemmat', 24, 3)).toEqual(['Näet molemmat']);
  });
  it('pitkä selite katkeaa SANARAJALTA, ei keskeltä sanaa', () => {
    const rivit = wrap('Katso ympärille ennen kuin pallo tulee niin tiedät mihin pelaat', 24, 3);
    expect(rivit.length).toBeGreaterThan(1);
    rivit.forEach((r) => expect(r.length).toBeLessThanOrEqual(25));
    expect(rivit.join(' ')).toBe('Katso ympärille ennen kuin pallo tulee niin tiedät mihin pelaat');
  });
  it('ylipitkä lyhennetään ellipsillä (lappu ei kasva esseeksi)', () => {
    const rivit = wrap('sana '.repeat(40), 24, 3);
    expect(rivit.length).toBe(3);
    expect(rivit[2].endsWith('…')).toBe(true);
  });
  it('yhtä pitkä sana kuin rivi ei jää tyhjäksi', () => {
    expect(wrap('pitkäsanajokaonhyvinpitkä', 10, 3)).toEqual(['pitkäsanajokaonhyvinpitkä']);
  });
  it('renderöijä piirtää rivit tspan-elementteinä', () => {
    const r = readFileSync(join(ROOT, 'lib', 'tm_kaavio_render.js'), 'utf8');
    expect(r).toMatch(/rivit\.forEach\(\(rv,i\)=>\{const ts=el\("tspan"/);
    expect(r).toContain('wrapText(teksti,SELITE_MERKIT,SELITE_RIVIT)');
  });
  it('KIELIFALLBACK: ruotsiksi kirjoitettu näkyy fi-näkymässä, ei tyhjänä', () => {
    const r = readFileSync(join(ROOT, 'lib', 'tm_kaavio_render.js'), 'utf8');
    expect(r).toMatch(/se\.t\[lang\]\|\|se\.t\.fi\|\|se\.t\.sv\|\|se\.t\.en/);
    expect(r).toMatch(/if\(!teksti\) return;/);   // täysin tyhjä ei piirrä orpoa viivaa
  });
  it('OSUMA-ALUE kattaa tekstin, ei vain ankkuria (tämä esti muokkauksen)', () => {
    const fn = runko('_kaavioPiirraEditori');
    expect(fn).toMatch(/selitteet \|\| \[\]\)\.forEach/);
    expect(fn).toContain("hr.setAttribute('fill', 'transparent')");
    expect(fn).toMatch(/_kaavioAsetaValinta\(\{ kind: 'selite', id: se\.id \}\)/);
  });
  it('hit-rect kunnioittaa työkalutilaa (työkalu voittaa, kuten muuallakin)', () => {
    expect(runko('_kaavioPiirraEditori')).toMatch(/if \(_kaavioTila\.tyokalu\) return;/);
  });
  it('hit-rect on VAIN editorissa — jaettu renderöijä pysyy puhtaana', () => {
    expect(readFileSync(join(ROOT, 'lib', 'tm_kaavio_render.js'), 'utf8')).not.toContain('transparent');
  });
  it('selitteen korostus on LAATIKKO, ei rengas (rengas ei kertoisi mitä on valittu)', () => {
    expect(runko('_kaavioPiirraEditori')).toMatch(/_val\.kind === 'selite'[\s\S]*createElementNS\('http:\/\/www\.w3\.org\/2000\/svg', 'rect'\)/);
  });
});

// Tallenna JÄTTÄÄ EDITORIN AUKI. Ennen: molemmat haarat sulkivat editorin ja avasivat pankin joka
// tallennuksella → käyttäjä ei voinut tallentaa välissä ja jatkaa. Koodin oma kommentti lupasi jo
// "seuraava Tallenna päivittää samaa dokumenttia", mutta sulkeminen esti sen.
describe('H — Tallenna jättää editorin auki', () => {
  const fn = () => runko('_kaavioTallenna');
  it('kumpikaan haara ei sulje editoria eikä avaa pankkia', () => {
    expect(fn()).not.toContain('_kaavioSuljeEditori()');
    expect(fn()).not.toContain('avaaKaaviopankki()');
  });
  it('molemmat haarat piirtävät editorin uudelleen ja päivittävät tallennusrivin', () => {
    const f = fn();
    expect((f.match(/_kaavioPiirraEditori\(\)/g) || []).length).toBe(2);
    expect((f.match(/_kaavioTyokaluPaivita\(\)/g) || []).length).toBe(2);
  });
  it('VERSIOLUKKO: paikallinen review synkataan kirjoitetun kanssa', () => {
    // Ilman tätä toinen peräkkäinen Tallenna lähettäisi SAMAN version (kaavioSeuraavaVersio lukee
    // m.review.versio) ja optimistinen lukko hylkäisi sen. Auki jättäminen paljasti tämän.
    const f = fn();
    expect(f).toMatch(/m\.review\.versio = uusiVersio/);
    expect(f).toMatch(/m\.review\.status = uusiTila/);
    expect(f).toMatch(/m\.review = \{[\s\S]*versio: 0[\s\S]*\};/);   // luontihaara
  });
  it('luonnin jälkeen m.id säilyy → seuraava tallennus PÄIVITTÄÄ, ei luo uutta', () => {
    expect(fn()).toMatch(/m\.id = ref\.id; m\._uusi = false;/);
    expect(fn()).toMatch(/if \(m\._uusi \|\| !m\.id\)/);
  });
  it('sulkeminen on ainoa poistumispolku ja päivittää pankin', () => {
    expect(runko('_kaavioSuljeEditori')).toContain('avaaKaaviopankki()');
  });
  it('historia ja valinta säilyvät tallennuksessa (vain sulku nollaa)', () => {
    const f = fn();
    expect(f).not.toMatch(/_kaavioTila\.historia = \[\]/);
    expect(f).not.toMatch(/_kaavioTila\.valittu = null/);
    expect(runko('_kaavioSuljeEditori')).toContain('_kaavioTila.valittu = null');
  });
  it('tilakoneisto ennallaan: luonnos pysyy luonnoksena toistuvassa tallennuksessa', () => {
    const P = require_(join(ROOT, 'lib', 'tm_kaavio_policy.js'));
    const luonnos = { seuraId: 'A', review: { status: 'luonnos', joukkueId: 'u13' } };
    const ctx = { rooli: 'valmentaja', seuraId: 'A', joukkueet: ['u13'] };
    expect(P.kaavioTilaMuokkauksenJalkeen(luonnos, ctx)).toBe('luonnos');
    expect(P.kaavioTilaMuokkauksenJalkeen(luonnos, ctx)).toBe('luonnos');   // toistokin
  });
  it('sulkunappi kertoo totuuden: Peruuta vain tallentamattomalle', () => {
    const f = runko('_kaavioSulkuNappiTeksti');
    expect(f).toMatch(/m\.id && !m\._uusi\) \? vpT\('Valmis'\) : vpT\('Peruuta'\)/);
    expect(runko('_kaavioTyokaluPaivita')).toContain('_kaavioSulkuNappiTeksti()');
  });
  it('tallentamattomat muutokset merkitään, mutta eivät estä sulkemista', () => {
    expect(runko('_kaavioTallentamattomia')).toMatch(/JSON\.stringify\(m\.spec\) !== _kaavioTila\.tallennettuSpec/);
    expect(runko('_kaavioTallennusKohdeHTML')).toMatch(/tallentamattomia muutoksia/);
    expect(runko('_kaavioSuljeEditori')).not.toContain('_kaavioTallentamattomia');   // ei estä
  });
  it('leima nollataan editoria avattaessa (edellisen kaavion leima ei vuoda)', () => {
    expect(runko('_kaavioAvaaEditori')).toContain('_kaavioTila.tallennettuSpec = null');
    expect(runko('_kaavioSuljeEditori')).toContain('_kaavioTila.tallennettuSpec = null');
  });
  it('uudet tekstit sv-kartassa', () => {
    const sv = readFileSync(join(ROOT, 'lib', 'tm_vp_i18n.js'), 'utf8');
    ['Tallennettu luonnoksena', 'tallentamattomia muutoksia', 'Valmis'].forEach((k) =>
      expect(sv, k).toContain("'" + k + "':"));
  });
});

describe('G — vahvemmat värit (yhdessä totuudessa)', () => {
  const PEL = readFileSync(join(ROOT, 'TalentMaster_Pelaaja_v7.html'), 'utf8');
  const lohko = (src, alku) => {
    const i = src.indexOf(alku);
    expect(i, alku).toBeGreaterThan(0);
    return src.slice(i, src.indexOf('}', i));
  };
  const arvo = (l, tk) => {
    const m = l.match(new RegExp('--' + tk + ':\\s*([^;]+);'));
    return m ? m[1].trim() : null;
  };
  it('VP ja Pelaaja jakavat SAMAT tumman teeman arvot (eivät saa ajautua erilleen)', () => {
    const v = lohko(VP, '.tm-kaavio {'), p = lohko(PEL, '.tm-kaavio {');
    ['cone', 'halo', 'line', 'teal-brd', 'fade'].forEach((tk) => {
      expect(arvo(p, tk), tk).toBe(arvo(v, tk));
    });
  });
  it('opasiteetit ovat nousseet mutta pysyvät himmennettyinä (ei neon)', () => {
    const v = lohko(VP, '.tm-kaavio {');
    const op = (tk) => Number((arvo(v, tk).match(/,\s*\.(\d+)\)/) || [])[1] ? '0.' + arvo(v, tk).match(/,\s*\.(\d+)\)/)[1] : 1);
    expect(op('cone')).toBeGreaterThan(0.09);
    expect(op('cone')).toBeLessThanOrEqual(0.35);
    expect(op('line')).toBeGreaterThan(0.20);
    expect(op('teal-brd')).toBeGreaterThan(0.30);
    expect(op('teal-brd')).toBeLessThanOrEqual(0.7);
  });
  it('vaalea teema päivitetty samalla (VP:llä on molemmat)', () => {
    const l = lohko(VP, ':root[data-theme="light"] .tm-kaavio {');
    ['cone', 'halo', 'line', 'teal-brd', 'fade'].forEach((tk) => expect(arvo(l, tk), tk).toBeTruthy());
  });
  it('katve-opasiteetti nostettu renderöijässä (ei token)', () => {
    const r = readFileSync(join(ROOT, 'lib', 'tm_kaavio_render.js'), 'utf8');
    expect(r).toMatch(/"fill-opacity":\.15/);
    expect(r).toMatch(/"stroke-opacity":\.6/);
  });
  it('--line on kaavion oma token — muutos ei vuoda muualle sovellukseen', () => {
    // Jos --line olisi jaettu muiden komponenttien kanssa, vahvennus muuttaisi niitäkin.
    const kaytto = (src) => (src.match(/var\(--line\)/g) || []).length;
    expect(kaytto(VP)).toBe(0);
    expect(kaytto(PEL)).toBe(0);
    expect(kaytto(readFileSync(join(ROOT, 'lib', 'tm_kaavio_render.js'), 'utf8'))).toBeGreaterThan(0);
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
     'Tallentuu: seuran kaaviopankki', 'näkyvyys', 'Teksti', 'valinnainen'].forEach((k) =>
      expect(sv, k).toContain("'" + k + "':"));
  });
});
