/* HAVAINTOHISTORIA — jaettu komponentti (PR A)
 *
 * MIKSI JAETTU: sama lista tarvitaan VP:n pelaajakortilla ja valmentajan sovelluksessa.
 * Kaksi toteutusta ajautui erilleen: valmentaja näki tekstin katkaistuna 110 merkkiin ja
 * VP ei nähnyt tekstejä lainkaan, vaikka molemmat lukevat samaa `havainnot`-kokoelmaa.
 *
 * ⚠ XSS: valmentajan kirjoittama teksti päätyy myös lapsen sovellukseen. Escapointi on
 * turvaominaisuus, ei kosmetiikkaa — siksi sille on oma vartijaryhmänsä.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const vaadi = createRequire(import.meta.url);
const HH = vaadi('../lib/tm_havaintohistoria.js');
const VP = readFileSync(join(juuri, 'TalentMaster_VP_v25.html'), 'utf8');
const MASTER = readFileSync(join(juuri, 'TalentMaster_Master_v16.html'), 'utf8');

const ilmanKommentteja = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')
  .replace(/<!--[\s\S]*?-->/g, ' ');

function pura(lahde, tunniste) {
  const alku = lahde.indexOf(tunniste);
  if (alku < 0) throw new Error('ei löydy: ' + tunniste);
  let syvyys = 0;
  for (let j = lahde.indexOf('{', alku); j < lahde.length; j++) {
    if (lahde[j] === '{') syvyys++;
    else if (lahde[j] === '}') { syvyys--; if (!syvyys) return lahde.slice(alku, j + 1); }
  }
  throw new Error('sulkeet eivät täsmää: ' + tunniste);
}

/* ── 1 · NORMALISOINTI ────────────────────────────────────────────────── */

describe('(1) tmHhRivit — normalisointi ja järjestys', () => {
  it('EI VACUOUS: rivit syntyvät ja kentät täyttyvät', () => {
    const r = HH.tmHhRivit([{
      id: 'h1', tyyppi: 'adar_pikakortti', porras: 2, konteksti: 'ottelu',
      pisteet: { A: 3, D: 2 }, havaitut: ['A:Katsoo ylös'], narratiivi: 'Hyvä havainnointi.',
      nakyvyys: 'pelaaja', tekija_nimi: 'Tero Koskela', luotu: new Date('2026-09-28T10:00:00Z'),
    }]);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({
      id: 'h1', laji: 'havainto', porras: 2, konteksti: 'ottelu',
      teksti: 'Hyvä havainnointi.', nakyvyys: 'pelaaja', tekija: 'Tero Koskela', peruttu: false,
    });
    expect(r[0].pisteet).toEqual({ A: 3, D: 2 });
    expect(r[0].pvm).toBe('28.09.2026');
  });

  it('JÄRJESTYS: uusin ensin, vaikka aikaleimat ovat eri tyyppiä', () => {
    /* Kentässä on ollut Timestamp, ISO-merkkijono ja pelkkä pvm. Yksikin väärä oletus
       rikkoisi järjestyksen hiljaa — lista näyttäisi vanhimman ensin. */
    const r = HH.tmHhRivit([
      { id: 'iso', teksti: 'b', luotu: '2026-09-20T12:00:00Z' },
      { id: 'ts', teksti: 'c', luotu: { toDate: () => new Date('2026-09-28T09:00:00Z') } },
      { id: 'pvm', teksti: 'a', pvm: '2026-09-10' },
      { id: 'sec', teksti: 'd', luotu: { seconds: Math.floor(new Date('2026-09-25T00:00:00Z').getTime() / 1000) } },
    ]);
    expect(r.map((x) => x.id)).toEqual(['ts', 'sec', 'iso', 'pvm']);
  });

  it('SÄHKÖPOSTI EI päädy tekijäksi (vanhat havainnot)', () => {
    const r = HH.tmHhRivit([{ id: 'a', teksti: 'x', tekija_nimi: 'talentmasterid@gmail.com' }]);
    expect(r[0].tekija).toBe('Valmentaja');
  });

  it('tekijä luetaan myös vanhasta valmentajaNimi-kentästä', () => {
    const r = HH.tmHhRivit([{ id: 'a', teksti: 'x', valmentajaNimi: 'Valle Valmentaja' }]);
    expect(r[0].tekija).toBe('Valle Valmentaja');
  });

  it('PERUTTU merkitään (tila:peruttu)', () => {
    const r = HH.tmHhRivit([{ id: 'a', teksti: 'x', tila: 'peruttu' }]);
    expect(r[0].peruttu).toBe(true);
  });

  it('vanha `tilanne`-kenttä luetaan kontekstiksi', () => {
    const r = HH.tmHhRivit([{ id: 'a', teksti: 'x', tilanne: 'Ottelu' }]);
    expect(r[0].konteksti).toBe('Ottelu');
  });

  it('valmentaja_viesti on laji "viesti"', () => {
    const r = HH.tmHhRivit([{ id: 'a', tyyppi: 'valmentaja_viesti', teksti: 'Hei' }]);
    expect(r[0].laji).toBe('viesti');
  });

  it('NÄKYVYYS on fail-closed kuten Rules: puuttuva kenttä ei ole "pelaaja"', () => {
    /* Rules v3.22 hylkää puuttuvan kentän. Jos lista väittäisi "Pelaaja näkee",
       valmentaja luulisi tekstin menneen perille vaikka sääntö estää sen. */
    const r = HH.tmHhRivit([{ id: 'a', teksti: 'x' }]);
    expect(r[0].nakyvyys).toBe('valmentajat');
  });

  it('tyhjä rivi (ei pisteitä eikä tekstiä) jätetään pois', () => {
    const r = HH.tmHhRivit([{ id: 'a', tyyppi: 'adar_pikakortti' }, { id: 'b', teksti: 'x' }]);
    expect(r.map((x) => x.id)).toEqual(['b']);
  });

  it('pisteet rajataan 1–3 (vanha 1–5-data ei saa vuotaa läpi)', () => {
    const r = HH.tmHhRivit([{ id: 'a', pisteet: { A: 5, D: 0, Act: null } }]);
    expect(r[0].pisteet).toEqual({ A: 3, D: 1 });
  });
});

/* ── 2 · RENDERÖINTI ──────────────────────────────────────────────────── */

describe('(2) tmHhHTML — sisältö ja suodatus', () => {
  const rivit = HH.tmHhRivit([
    { id: 'h', tyyppi: 'adar_pikakortti', narratiivi: 'Havainnon teksti', nakyvyys: 'pelaaja',
      pelaaja_lukenut: true, luotu: '2026-09-28T10:00:00Z', tekija_nimi: 'Tero' },
    { id: 'v', tyyppi: 'valmentaja_viesti', teksti: 'Viestin teksti', nakyvyys: 'pelaaja',
      luotu: '2026-09-27T10:00:00Z', valmentajaNimi: 'Tero' },
  ]);

  it('KOKO teksti näkyy — ei katkaisua 110 merkkiin', () => {
    const pitka = 'a'.repeat(400);
    const html = HH.tmHhHTML(HH.tmHhRivit([{ id: 'x', teksti: pitka, luotu: '2026-09-28' }]), {});
    expect(html).toContain(pitka);
  });

  it('SUODATIN erottaa havainnot ja viestit', () => {
    expect(HH.tmHhHTML(rivit, { suodatin: 'havainto' })).toContain('Havainnon teksti');
    expect(HH.tmHhHTML(rivit, { suodatin: 'havainto' })).not.toContain('Viestin teksti');
    expect(HH.tmHhHTML(rivit, { suodatin: 'viesti' })).toContain('Viestin teksti');
    expect(HH.tmHhHTML(rivit, { suodatin: 'viesti' })).not.toContain('Havainnon teksti');
    const kaikki = HH.tmHhHTML(rivit, { suodatin: 'kaikki' });
    expect(kaikki).toContain('Havainnon teksti');
    expect(kaikki).toContain('Viestin teksti');
  });

  it('NÄKYVYYS ja lukutila näkyvät rivillä', () => {
    const html = HH.tmHhHTML(rivit, {});
    expect(html).toContain('Pelaaja näkee');
    expect(html).toContain('✓ luettu');
    expect(html).toContain('ei vielä luettu');
  });

  it('vain valmentajille -rivillä EI kerrota lukutilaa', () => {
    const r = HH.tmHhRivit([{ id: 'a', teksti: 'x', nakyvyys: 'valmentajat', luotu: '2026-09-28' }]);
    const html = HH.tmHhHTML(r, {});
    expect(html).toContain('Vain valmentajille');
    expect(html, 'lukutila olisi harhaanjohtava merkinnälle jota ei ole tarkoitettu lapselle')
      .not.toContain('ei vielä luettu');
  });

  it('PERUTTU näkyy merkintänä eikä katoa listasta', () => {
    const r = HH.tmHhRivit([{ id: 'a', teksti: 'x', tila: 'peruttu', luotu: '2026-09-28' }]);
    const html = HH.tmHhHTML(r, {});
    expect(html).toContain('Peruttu');
    expect(html).toContain('peruttu');
    expect(html).toContain('x');
  });

  it('Peru-nappi vain kun kutsuja sallii, eikä perutulle', () => {
    const r = HH.tmHhRivit([
      { id: 'a', teksti: 'x', luotu: '2026-09-28' },
      { id: 'b', teksti: 'y', tila: 'peruttu', luotu: '2026-09-27' },
    ]);
    expect(HH.tmHhHTML(r, {}), 'ilman lupaa ei Peru-nappia').not.toContain('data-hh-peru');
    const html = HH.tmHhHTML(r, { peruSallittu: () => true });
    expect(html).toContain('data-hh-peru="a"');
    expect(html, 'perutulle ei saa tarjota perumista uudelleen').not.toContain('data-hh-peru="b"');
  });

  it('tyhjä lista antaa tyhjätilan, ei tyhjää merkkijonoa', () => {
    expect(HH.tmHhHTML([], {})).toContain('Ei merkintöjä');
  });
});

/* ── 3 · XSS ──────────────────────────────────────────────────────────── */

describe('(3) XSS — valmentajan teksti päätyy myös lapsen appiin', () => {
  it.each([
    ['narratiivi', { narratiivi: '<img src=x onerror=alert(1)>' }],
    ['teksti', { teksti: '<script>alert(1)</script>' }],
    ['tekijä', { teksti: 'x', tekija_nimi: '<img src=x onerror=alert(1)>' }],
    ['havaitut', { teksti: 'x', havaitut: ['A:<img src=x onerror=alert(1)>'] }],
    ['konteksti', { teksti: 'x', konteksti: '<img src=x onerror=alert(1)>' }],
  ])('%s escapoidaan', (_n, doc) => {
    const html = HH.tmHhHTML(HH.tmHhRivit([Object.assign({ id: 'a', luotu: '2026-09-28' }, doc)]), {});
    expect(html, 'suorittuva elementti pääsi HTML:ään').not.toContain('<img');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;');
  });

  it('EI VACUOUS: tavallinen teksti menee läpi sellaisenaan', () => {
    const html = HH.tmHhHTML(HH.tmHhRivit([{ id: 'a', teksti: 'Hyvä peli!', luotu: '2026-09-28' }]), {});
    expect(html).toContain('Hyvä peli!');
  });
});

/* ── 4 · KULUTTAJAT ───────────────────────────────────────────────────── */

describe('(4) VP:n porraslohko vastaa valmentajan sovellusta', () => {
  const lohko = () => pura(VP, 'function _vpArvAdarKoostumusHTML(p, ika) {');

  it('VANHA 2A-jäänne on poistettu', () => {
    const k = ilmanKommentteja(lohko());
    ['U13-portti', 'avautuu 16', 'tmAdarIkaTier', 'Havaitse', 'Toimi'].forEach((s) => {
      expect(k, '2A-jäänne jäi VP:n lohkoon: ' + s).not.toContain(s);
    });
  });

  it('porras, bändi ja nimet tulevat LIBISTÄ (ei omaa logiikkaa)', () => {
    const f = lohko();
    expect(f).toContain('p.havainto_porras ||');
    expect(f).toContain('tmAdarIkaPorras(ika)');
    expect(f).toContain('tmAdarBand(ika, _porras)');
    expect(f).toContain('TM_ADAR_NIMET.valmentaja');
  });

  it('otsikko on "Porras N / 4" ja tikkaat piirretään', () => {
    const f = lohko();
    expect(f).toContain("vpT('Porras') + ' ' + _porras + ' / 4");
    expect(f).toContain('jsp-adar-ladder');
  });

  it('lukittu rivi kertoo portaan, ei ikää', () => {
    const f = lohko();
    expect(f).toContain("vpT('porras') + ' ' + (idx + 1)");
  });

  it('uusin porrasulottuvuus merkitään samalla ehdolla kuin Masterissa', () => {
    const vpF = lohko();
    expect(vpF).toContain('havainto_porras_ehdotus');
    expect(vpF).toContain('_ehdHist.length < 3');
    expect(vpF).toContain("vpT('uusi porras')");
    /* PARITEETTI: Master käyttää samaa ehtoa — jos toinen muuttuu, sama pelaaja näyttäisi
       eri asiaa VP:lle ja valmentajalle, mikä oli tämän PR:n koko syy. */
    expect(MASTER).toContain('_ehdHistC.length < 3');
  });

  it('Havainnot-linkki avaa historian eikä lataa listaa renderöinnissä (§26)', () => {
    const f = lohko();
    expect(f).toContain('jsp-hh-link');
    expect(f, 'alikokoelmakysely renderöinnissä rikkoisi §26:n').not.toContain('.collection(');
    const avaa = pura(VP, 'async function avaaHavaintohistoria(pelaajaId, pelaajaNimi) {');
    expect(avaa, 'lista on ladattava vasta klikkauksesta').toContain(".collection('havainnot')");
    expect(avaa).toContain('tmHhRivit(');
  });
});

describe('(5) valmentajan sovellus käyttää samaa komponenttia', () => {
  it('lista renderöidään kirjastolla, ei omalla HTML:llä', () => {
    const f = pura(MASTER, 'function _hkPiirraLista() {');
    expect(f).toContain('tmHhHTML(');
    expect(f).toContain('tmHhSuodatinHTML(');
  });

  it('EI KATKAISUA 110 merkkiin', () => {
    expect(ilmanKommentteja(MASTER), 'vanha katkaisu jäi').not.toContain(".slice(0, 110)");
  });

  it('viestit eivät enää putoa listalta', () => {
    const f = pura(MASTER, 'async function _hkRenderLista(pelaajaId) {');
    expect(f, 'viestien suodatus pois — ne kuuluvat samaan historiaan')
      .not.toContain("h.tyyppi !== 'valmentaja_viesti'");
  });

  it('taktiikkataulu-liitos säilyy rivikohtaisena toimintona', () => {
    const f = pura(MASTER, 'function _hkPiirraLista() {');
    /* Kohdistus NAPPIIN, ei pelkkaan tunnisteeseen: sidontarivi querySelectorAll sisaltaa
       saman merkkijonon, joten valja haku meni lapi vaikka itse nappi oli poistettu. */
    expect(f, 'liitosnappia ei rakenneta').toContain('<button data-hk-liita=');
    expect(f, 'napin klikkaus ei kutsu liitosta').toContain('_hkLiita(window._hkPid');
    expect(f, 'liitos kuuluu vain pelihavainnoille').toContain("r.laji !== 'havainto'");
  });

  it('napin nimi on "Havainnot" kaikkialla', () => {
    expect(MASTER).toContain("masterT('▷ Havainnot')");
    expect(MASTER, 'vanha nimi jäi').not.toContain("masterT('📋 Taktiikkataulu')");
  });
});

describe('(6) molemmat sovellukset lataavat saman kirjaston', () => {
  it.each([['VP', VP], ['Master', MASTER]])('%s lataa lib/tm_havaintohistoria.js', (_n, s) => {
    expect(s).toMatch(/lib\/tm_havaintohistoria\.js\?v=\d+/);
  });

  it('kummallakaan ei ole omaa rivirenderöijää', () => {
    [VP, MASTER].forEach((s) => {
      expect(ilmanKommentteja(s), 'oma kopio rivin HTML:stä ajautuisi erilleen')
        .not.toContain('class="hh-rivi"');
    });
  });
});

describe('(7) VP:n muistiinpanolista escapoi tekstin', () => {
  it('käyttäjän teksti ei mene HTML:ään escapoimatta', () => {
    const f = pura(VP, 'async function avaaPelaajaMuistiinpanoModal(pelaajaId, pelaajaNimi) {');
    expect(f).toContain('_jsvEsc(m.teksti)');
    expect(f, 'escapoimaton teksti jäi').not.toMatch(/\+ m\.teksti \+/);
  });
});
