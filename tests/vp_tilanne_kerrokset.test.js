/**
 * TILANNE — KISS-kartan kolme kerrosta (SSOT: TILANNE_KISS_design_kartta_v1).
 *
 * JUURISYY: näkymä pinosi YHDEKSÄN aina-auki-osiota allekkain, joten VP selasi
 * paljon ennen kuin näki mihin tarttua. KV-verrokit ratkaisevat saman
 * RAG-liikennevaloilla → alert-fatigue; meidän vastaliike on rauhoittaa.
 *
 * Portti lukitsee ne asiat jotka rapautuvat hiljaa: syvennys romahdettuna,
 * §26 (ei uutta kyselyä), jaettu signaalilaskenta, `_valmiusLahde`-sauma ja
 * RAG-kielto (ei punaista hälytystäyttöä).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const VP = readFileSync(join(__dir, '..', 'TalentMaster_VP_v25.html'), 'utf8');

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

/** `ws-tilanne`-näkymän HTML-lohko. */
function tilanneHtml() {
  const a = VP.indexOf('id="ws-tilanne"');
  expect(a, 'ws-tilanne puuttuu').toBeGreaterThan(-1);
  const b = VP.indexOf('<div class="ws-view" id="ws-valmentajat"', a);
  return VP.slice(a, b > 0 ? b : a + 12000);
}

describe('VP · Tilanne-näkymän kolme kerrosta', () => {
  it('EI VACUOUS: kerrosrenderöijä on olemassa ja kytketty renderTilanteeseen', () => {
    expect(VP, 'kerrosrenderöijä puuttuu').toContain('function _tilanneRenderKerrokset(');
    expect(funktio('function renderTilanne('), 'kerroksia ei renderöidä')
      .toContain('_tilanneRenderKerrokset()');
  });

  it('KERROS 3 on ROMAHDETTU oletuksena (details ilman open)', () => {
    const h = tilanneHtml();
    expect(h, 'syvennystä ei ole').toContain('<details id="tilanneSyvennys"');
    expect(h, 'syvennys on auki oletuksena — kartta vaatii romahdetun')
      .not.toMatch(/<details id="tilanneSyvennys"[^>]*\sopen/);
  });

  it('KERROS 3: status-lohkot SIIRRETÄÄN syvennykseen, ei renderöidä uudelleen', () => {
    /* Siirto säilyttää olemassa olevat renderöijät ja kuuntelijat. Uudelleen-
       renderöinti olisi rikkonut ne hiljaa. */
    /* HUOM: väite kohdistuu KUTSUUN, ei sanaan. Funktion oma dokumentaatio-
       kommentti sisältää sanan "appendChild", joten pelkkä `toContain` menisi
       läpi vaikka siirto olisi poistettu — todettu mutaatiotestissä. */
    const f = funktio('function _tilanneRenderKerrokset(');
    expect(f, 'siirtoa ei tehdä').toMatch(/sisalto\.appendChild\(el\)/);
    ['season-bar-wrap', 'sec-signaalit', 'section-poikkeamat', 'section-joukkueet',
     'kehitysKortti', 'talentitLohko', 'section-toimenpiteet', 'tilanneKpis',
     'tilanneIdpJono'].forEach((id) => {
      expect(f, id + ' ei siirry syvennykseen').toContain("'" + id + "'");
      expect(VP, id + ' puuttuu HTML:stä → siirto ei löydä sitä').toContain('id="' + id + '"');
    });
  });

  it('UUDELLEENKÄYTTÖ: päätöspino käyttää jaettua _vpSignaaliKortit():ta', () => {
    /* Rinnakkainen signaalilaskenta ajautuisi erilleen — sama vikaluokka kuin
       lasnaolo_n. Kolme pintaa, yksi laskenta. */
    const f = funktio('function _tilanneRenderKerrokset(');
    expect(f, 'Tilanne laskee signaalit itse').toContain('_vpSignaaliKortit()');
    expect(funktio('function renderKotiVP('), 'Koti ei käytä jaettua laskentaa').toContain('_vpSignaaliKortit()');
    expect(VP, 'jaettua funktiota ei ole').toContain('function _vpSignaaliKortit(');
  });

  it('§26: kerrosrenderöinti EI tee Firestore-kyselyä', () => {
    const f = funktio('function _tilanneRenderKerrokset(');
    ['.get()', '.onSnapshot(', 'db.collection('].forEach((k) => {
      expect(f, 'render-polku tekee kyselyn: ' + k).not.toContain(k);
    });
  });

  it('SAUMA: päätöspino ei lue flei_viimeisin:iä suoraan', () => {
    /* Valmius kulkee `_valmiusLahde`:n kautta, jotta tuleva GPS/HR/Taso
       kytkeytyy yhdestä paikasta. */
    expect(funktio('function _tilanneRenderKerrokset('), 'sauma ohitettu')
      .not.toContain('flei_viimeisin');
    expect(funktio('function _vpSignaaliKortit('), 'signaalilaskenta ohittaa sauman')
      .not.toContain('flei_viimeisin');
  });

  it('RAG-KIELTO: päätöspinossa ei punaista hälytystäyttöä', () => {
    /* KV-verrokkien alert-fatigue syntyy juuri tästä. Vakavuus näkyy reunana
       (teal/amber) + ikonina + tekstinä, ei punaisena täyttönä. */
    const f = funktio('function _tilanneRenderKerrokset(');
    expect(f, 'punainen väri päätöspinossa').not.toContain('--red');
    expect(f, 'ikoni puuttuu → väri jäisi ainoaksi signaaliksi').toContain('vkk-ik');
    expect(f, 'amber-reuna puuttuu → vakavuutta ei eroteta').toContain('var(--amber)');
  });

  it('HONEST-EMPTY: tyhjä tila kertoo tilanteen, ei näytä nollia', () => {
    const f = funktio('function _tilanneRenderKerrokset(');
    expect(f, 'tyhjä tila puuttuu').toContain('Ei kriittisiä signaaleja juuri nyt.');
    expect(f, 'tyhjässä tilassa näytetään nollalukuja').not.toMatch(/vpkoti-kortit[^]{0,200}0\s*\+/);
  });

  it('I18N: ei uusia avaimia — kaikki koostettu olemassa olevista', () => {
    /* Sibbo-pilotti on ruotsinkielinen, eikä ruotsia arvata. Kerrosrenderöijän
       jokaisella vpT-avaimella on oltava sv-rivi jo valmiina. */
    const f = funktio('function _tilanneRenderKerrokset(');
    const avaimet = [...f.matchAll(/vpT\('([^']+)'\)/g)].map((m) => m[1]);
    expect(avaimet.length, 'ei yhtään käännettyä merkkijonoa → portti ei mittaa mitään')
      .toBeGreaterThan(3);
    const I18N = readFileSync(join(__dir, '..', 'lib/tm_vp_i18n.js'), 'utf8')
      + readFileSync(join(__dir, '..', 'lib/tm_i18n_common.js'), 'utf8');
    avaimet.forEach((k) => {
      expect(I18N.indexOf("'" + k + "':"), 'avaimelle ei ole sv-riviä: ' + k).toBeGreaterThan(-1);
    });
  });
});
