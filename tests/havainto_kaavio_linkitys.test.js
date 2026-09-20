/**
 * PELIHAVAINTO ↔ TAKTIIKKATAULU — jälkirikastuksen linkki.
 *
 * TYÖNKULKU: kentällä havainto kirjataan nopeasti (ADAR-pikakortti), kaavio
 * piirretään jälkikäteen pöydän ääressä ja liitetään jo tallennettuun
 * havaintoon. Kanoninen linkki on HAVAINNON puolella, `.update()`:lla — sama
 * kuvio kuin ADARin AI-narratiivi, samat oikeudet, ei sääntömuutosta.
 *
 * Portti mittaa KÄYTTÄYTYMISTÄ (mitä Firestoreen oikeasti kirjoitetaan) eikä
 * merkkijonoja, ja lukitsee kolme asiaa jotka voivat hiljaa rikkoutua:
 *   1. A5 — `luotu` ei saa muuttua, muuten `luotuPaivitysKelpaa` hylkää updaten
 *   2. §7.6 — `serverTimestamp()` ei toimi taulukon sisällä → `otettu` on ISO
 *   3. UUDELLEENKÄYTTÖ — ei omaa editoria/validaattoria/piirtokoodia
 */
import { describe, it, expect } from 'vitest';
import vm from 'node:vm';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const lue = (p) => readFileSync(join(juuri, p), 'utf8');
const LIB = lue('lib/tm_havainto_kaavio.js');
const KAAVIO_UI = lue('lib/tm_kaavio_ui.js');
const MASTER = lue('TalentMaster_Master_v16.html');
const RULES = lue('tm_admin/firestore.rules');

/** Lataa libin sandboxiin fake-firebasella; palauttaa API:n + kirjoituslokin. */
function lataa() {
  const kirjoitukset = [];
  const polku = [];
  const sandbox = {
    console, Date, Math, JSON, String, Number, Object, Array, Promise,
    firebase: {
      firestore: {
        FieldValue: {
          arrayUnion: (v) => ({ __arrayUnion: v }),
          serverTimestamp: () => ({ __serverTimestamp: true }),
        },
      },
    },
    document: {
      createElement: () => ({ innerHTML: '', style: {}, appendChild() {}, setAttribute() {} }),
    },
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(LIB, sandbox, { filename: 'tm_havainto_kaavio.js' });

  const db = {
    collection: (c) => { polku.push(c); return { doc: (d) => { polku.push(d); return Object.assign({
      collection: db.collection,
      update: (data) => { kirjoitukset.push({ polku: polku.slice(), data }); return Promise.resolve(); },
      get: () => Promise.resolve({ exists: true, id: 'k1', data: () => ({ spec: { pelaajat: [] } }) }),
    }); } }; },
  };
  return { api: sandbox.tmHavaintoKaavio, sandbox, db, kirjoitukset, polku };
}

const CTX = { seuraId: 'sjk', pelaajaId: 'p1', havaintoId: 'h1' };

describe('Havainto ↔ kaavio · jälkirikastus', () => {
  it('EI VACUOUS: linkki kirjoitetaan havainnon dokumenttiin', async () => {
    const y = lataa();
    const ok = await y.api.liita(y.db, CTX, 'kaavio123');
    expect(ok, 'linkitys palautti false').toBe(true);
    expect(y.kirjoitukset.length, 'mitään ei kirjoitettu').toBe(1);
    expect(y.polku.join('/'), 'väärä Firestore-polku')
      .toBe('seurat/sjk/pelaajat/p1/havainnot/h1');
  });

  it('A5: update EI koske `luotu`-kenttään (muuten rules hylkää)', async () => {
    /* luotuPaivitysKelpaa (firestore.rules) päästää updaten läpi vain jos
       `luotu` ei ole affectedKeys:ssä. Yksikin ylimääräinen kenttä tässä
       kaataisi koko liitoksen permission-deniediin. */
    expect(RULES, 'A5-vartija puuttuu säännöistä').toContain('luotuPaivitysKelpaa');
    const y = lataa();
    await y.api.liita(y.db, CTX, 'k1');
    const kentat = Object.keys(y.kirjoitukset[0].data).sort();
    expect(kentat, 'update kirjoittaa muutakin kuin linkin').toEqual(['kaavio_id', 'media']);
    expect(kentat, 'luotu mukana → rules hylkää').not.toContain('luotu');
  });

  it('§7.6: media-merkinnän `otettu` on ISO-string, EI serverTimestamp', async () => {
    /* serverTimestamp() ei toimi taulukon sisällä — sama sääntö kuin ADARin
       kuvamerkinnöissä. Väärä tyyppi hylkäisi kirjoituksen ajonaikana. */
    const y = lataa();
    await y.api.liita(y.db, CTX, 'k1');
    const media = y.kirjoitukset[0].data.media;
    expect(media.__arrayUnion, 'media ei käytä arrayUnionia → vanhat kuvat katoaisivat').toBeTruthy();
    const m = media.__arrayUnion;
    expect(m.tyyppi).toBe('kaavio');
    expect(m.kaavio_id).toBe('k1');
    expect(typeof m.otettu, 'otettu ei ole string').toBe('string');
    expect(m.otettu, 'otettu on serverTimestamp-objekti (ei toimi arrayssa)').toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('LUKU: kaavioId löytyy sekä kentästä että media-taulukosta', () => {
    const y = lataa();
    expect(y.api.kaavioId({ kaavio_id: 'a' })).toBe('a');
    expect(y.api.kaavioId({ media: [{ tyyppi: 'kuva' }, { tyyppi: 'kaavio', kaavio_id: 'b' }] })).toBe('b');
    expect(y.api.kaavioId({ media: [{ tyyppi: 'kuva', storage_url: 'x' }] }), 'valokuva luettiin kaavioksi').toBeNull();
    expect(y.api.kaavioId(null)).toBeNull();
    expect(y.api.onLiitetty({ kaavio_id: 'a' })).toBe(true);
    expect(y.api.onLiitetty({})).toBe(false);
  });

  it('PUUTTUVA KONTEKSTI ei kirjoita puolikasta linkkiä', async () => {
    const y = lataa();
    expect(await y.api.liita(y.db, { seuraId: 'sjk', pelaajaId: 'p1' }, 'k1')).toBe(false);
    expect(await y.api.liita(y.db, CTX, null)).toBe(false);
    expect(y.kirjoitukset.length, 'vajaa konteksti kirjoitti silti').toBe(0);
  });

  it('UUDELLEENKÄYTTÖ: editori tekee linkityksen, ei havaintonäkymä itse', () => {
    /* Brief §2: "älä tuo omaa editoria/validointia". Linkki syntyy jaetun
       _kaavioTallenna:n kautta molemmissa haaroissa (luonti JA muokkaus). */
    expect(KAAVIO_UI, 'liitoskoukku puuttuu').toMatch(/async function _kaavioLiitaHavaintoon\(/);
    expect(KAAVIO_UI, 'liitoskontekstin välitys puuttuu').toMatch(/function tmKaavioLiitaHavaintoon\(/);
    const kutsut = (KAAVIO_UI.match(/await _kaavioLiitaHavaintoon\(m\)/g) || []).length;
    expect(kutsut, 'koukku ei ole molemmissa tallennushaaroissa (luonti + muokkaus)').toBe(2);
  });

  it('UUDELLEENKÄYTTÖ: Master ei sisällä omaa piirto-/validointikoodia', () => {
    /* Sisäänkäynti saa avata jaetun editorin ja renderöidä thumbnailin
       jaetulla renderöijällä — muttei piirtää tai validoida itse. */
    const i = MASTER.indexOf('window._hkLiita');
    expect(i, 'liitos-sisäänkäyntiä ei ole').toBeGreaterThan(-1);
    const lohko = MASTER.slice(MASTER.indexOf('window._hkAvaaHavainnot'), i + 900);
    expect(lohko, 'Master avaa jaetun luontipolun').toContain('_kaavioUusiLomake()');
    expect(lohko, 'Master välittää liitoskontekstin').toContain('tmKaavioLiitaHavaintoon(');
    expect(lohko, 'Master validoi itse (oma validaattori)').not.toContain('validoiKaavio(');
    expect(lohko, 'Master piirtää itse (oma drawSpec)').not.toContain('drawSpec(');
    /* Thumbnail kulkee jaetun helperin kautta, joka käyttää TM_KAAVIO_RENDERiä. */
    expect(MASTER, 'thumbnail ei käytä jaettua renderöijää').toContain('tmHavaintoKaavio.piirraThumb(');
    expect(LIB, 'helper ei käytä jaettua renderöijää').toContain('TM_KAAVIO_RENDER');
  });

  it('LIITOS KIRJOITETAAN KERRAN vaikka Tallenna painettaisiin uudelleen', () => {
    /* Editori jää auki tallennuksen jälkeen → ilman lippua jokainen Tallenna
       lisäisi uuden media-merkinnän samasta kaaviosta. */
    const i = KAAVIO_UI.indexOf('async function _kaavioLiitaHavaintoon(');
    const runko = KAAVIO_UI.slice(i, i + 900);
    expect(runko, 'toistosuoja puuttuu').toContain('_liitetty');
  });

  it('EI SÄÄNTÖMUUTOSTA: havainto-update ja kaavio-write olivat jo sallittuja', () => {
    /* Linkki nojaa olemassa oleviin sääntöihin. Jos tämä testi punertaa,
       joku on lisännyt sääntöjä joita briefin mukaan ei tarvita. */
    expect(RULES, 'havainnot-update-sääntö puuttuu').toMatch(/allow update:[^;]*luotuPaivitysKelpaa\(\)/);
    expect(RULES, 'kaaviot-kokoelman sääntö puuttuu').toContain('kaaviot');
  });

  it('MOLEMMAT APIT lataavat linkkilibin (Master + VP)', () => {
    expect(MASTER).toContain('lib/tm_havainto_kaavio.js');
    expect(lue('TalentMaster_VP_v25.html')).toContain('lib/tm_havainto_kaavio.js');
  });
});
