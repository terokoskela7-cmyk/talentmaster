/**
 * V2 App Check (2a/2) — reCAPTCHA Enterprise -kytkentä KAIKISSA elävissä apeissa.
 *
 * MIKSI TÄMÄ ON PORTTI EIKÄ KERTATARKISTUS: App Check -enforce on PROJEKTINLAAJUINEN per palvelu.
 * Yksikin elävä appi ilman aktivointia = sen käyttäjät lukittuvat ulos enforcen jälkeen. Riski ei
 * ole tämän PR:n hetkessä vaan tulevassa apissa jonka joku lisää enforcen ollessa päällä — siksi
 * kate johdetaan DATASTA (kaikki firebase-appin lataavat juuritiedostot), ei kovakoodatusta
 * listasta. Uusi appi ilman App Checkiä punertaa tämän portin.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE_KEY = '6Lf3tbstAAAAAE9fqxhiH9WltKEdT4NuJBXF0kjq';

/* A2 AJETTU: VP_v22 / Testaus / Testaus_v8 siirretty archiveen → eivät enää Pagesissa eivätkä
   kohdejoukossa. POIKKEUSLISTAA EI ENÄÄ OLE — kohdejoukko on nyt puhtaasti dataohjattu: jokainen
   juuren firebase-appin lataava tiedosto on App Check -vaatimuksen piirissä, ilman poikkeuksia.
   Alla oleva lista on eri asia: se on REGRESSIOVAHTI (eivät saa palata juureen), ei poikkeus. */
const A2_SIIRRETYT = ['TalentMaster_VP_v22.html', 'TalentMaster_Testaus.html', 'TalentMaster_Testaus_v8.html'];

const MODULAR = ['tm_videopankki_admin.html', 'TM_LiikehallintaMatrix_v2.html'];

function juurenHtml() {
  return readdirSync(juuri)
    .filter((n) => n.endsWith('.html') && statSync(join(juuri, n)).isFile())
    .sort();
}
const lue = (n) => readFileSync(join(juuri, n), 'utf8');

/* Kaikki juuritason appit jotka lataavat firebase-appin = App Checkin kohdejoukko. */
const kaikki = juurenHtml().filter((n) => /firebase-app(-compat)?\.js/.test(lue(n)));
const scope = kaikki;                           // ei poikkeuksia — A2:n jälkeen juuri = elävä joukko
const compat = scope.filter((n) => !MODULAR.includes(n));

describe('kohdejoukko (johdettu datasta, ei kovakoodattu)', () => {
  /* 19 compat (ei 18): ADAR-pikakortti liittyi joukkoon kun se purettiin selainbundlesta
     tavalliseksi apiksi — sen SDK oli ennen gzip-blobina manifestissa, joten se ei nakynyt
     tassa datasta johdetussa kohdejoukossa. Nyt se lataa firebase-app-compatin ulkoisesti ja
     kuuluu App Check -vaatimuksen piiriin siina missa muutkin. */
  it('21 elävää appia = 19 compat + 2 modular', () => {
    expect(compat.length, 'compat-appeja').toBe(19);
    expect(scope.filter((n) => MODULAR.includes(n)).length, 'modular-appeja').toBe(2);
    expect(scope.length).toBe(21);
    expect(compat, 'de-bundlattu ADAR kuuluu joukkoon').toContain('TalentMaster_ADAR_Pikakortti.html');
  });
  /* Regressiovahti: jos jokin näistä palaa juureen ilman App Check -kytkentää, se olisi Pagesissa
     ja rikkoutuisi enforcessa. Paluu juureen on siis tietoinen teko joka vaatii myös kytkennän. */
  it.each(A2_SIIRRETYT)('%s on archivessa, ei juuressa (A2 pysyy tehtynä)', (n) => {
    expect(juurenHtml(), 'palasi juureen → kytke App Check tai siirrä takaisin archiveen').not.toContain(n);
    expect(existsSync(join(juuri, 'archive', n)), 'ei löydy archivesta').toBe(true);
  });
});

describe('site key · YKSI totuuslähde', () => {
  it('avain on lib/tm_appcheck.js:ssä', () => {
    expect(lue('lib/tm_appcheck.js')).toContain(SITE_KEY);
  });
  it('avainta EI ole kopioitu yhteenkään muuhun tiedostoon', () => {
    const vuodot = [...juurenHtml(), ...readdirSync(join(juuri, 'lib')).map((n) => 'lib/' + n)]
      .filter((n) => n !== 'lib/tm_appcheck.js')
      .filter((n) => { try { return lue(n).includes(SITE_KEY); } catch { return false; } });
    expect(vuodot).toEqual([]);
  });
});

describe('compat-polku (18 appia)', () => {
  it.each(compat)('%s · app-check-compat SAMALLA versiolla kuin app-compat', (n) => {
    const s = lue(n);
    const vApp = s.match(/firebasejs\/([0-9.]+)\/firebase-app-compat\.js/)[1];
    const mChk = s.match(/firebasejs\/([0-9.]+)\/firebase-app-check-compat\.js/);
    expect(mChk, 'app-check-compat-tagi puuttuu').toBeTruthy();
    // Versioero on Firebasen dokumentoima tukemattomuus — älä anna sen livahtaa sisään.
    expect(mChk[1], 'SDK-versiot eriävät').toBe(vApp);
  });

  it.each(compat)('%s · lataa jaetun moduulin ja aktivoi initin JÄLKEEN', (n) => {
    const L = lue(n).split('\n');
    const rivi = (re) => L.findIndex((l) => re.test(l));
    const iApp = rivi(/firebase-app-compat\.js/);
    const iChk = rivi(/firebase-app-check-compat\.js/);
    const iLib = rivi(/lib\/tm_appcheck\.js/);
    const iInit = rivi(/initializeApp/);
    const iAkt = rivi(/tmAppCheckAktivoi\(\)/);
    expect(iLib, 'lib/tm_appcheck.js puuttuu').toBeGreaterThan(-1);
    expect(iAkt, 'tmAppCheckAktivoi()-kutsu puuttuu').toBeGreaterThan(-1);
    expect(iApp).toBeLessThan(iChk);          // app-compat ennen app-checkiä
    expect(iLib).toBeLessThan(iInit);         // moduuli ladattu ennen kutsua
    expect(iInit).toBeLessThan(iAkt);         // aktivointi initin jälkeen
  });
});

describe('modular-polku (2 appia)', () => {
  it.each(MODULAR)('%s · Enterprise-provider + site key jaetusta moduulista', (n) => {
    const s = lue(n);
    expect(s).toMatch(/firebasejs\/10\.12\.0\/firebase-app-check\.js/);
    expect(s).toContain('ReCaptchaEnterpriseProvider');
    expect(s).toContain('initializeAppCheck');
    expect(s, 'avain luetaan jaetusta moduulista, ei kopioida').toContain('window.TM_APPCHECK_SITE_KEY');
    expect(s).toMatch(/lib\/tm_appcheck\.js/);
  });
  it('tm_videopankki_admin: App Check ENNEN getFirestore/getAuth-kutsua', () => {
    const s = lue('tm_videopankki_admin.html');
    expect(s.indexOf('initializeAppCheck(')).toBeLessThan(s.indexOf('const db   = getFirestore'));
  });
  it('matrix: yksi alustuspolku (initializeApp vain tmMatrixApp():n sisällä)', () => {
    const s = lue('TM_LiikehallintaMatrix_v2.html');
    // initializeAppCheck heittää jos sama appi aktivoidaan kahdesti → vain yksi initializeApp-kutsu
    expect((s.match(/initializeApp\(/g) || []).length).toBe(1);
    expect((s.match(/initializeAppCheck\(/g) || []).length).toBe(1);
  });
  it('appId on konfigissa (App Check -tokenvaihto vaatii sen)', () => {
    for (const n of MODULAR) expect(lue(n), n).toContain('1:872561784446:web:05c4c7996dfd46ddd14a2f');
  });
});

/* Poistaa /* *\/ -lohkot ja //-rivikommentit (ei URL:ien "://"). Tarvitaan koska tämän erän
   koodikommentit MAINITSEVAT vanhan v3-muodon selittääkseen miksi sitä ei käytetä — maininta ei
   ole vuoto, käyttö on. */
function poistaKommentit(s) {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n')
    .map((l) => l.replace(/(^|[^:])\/\/.*$/, '$1'))
    .join('\n');
}

describe('vanhentunut v3-provider ei saa palata', () => {
  it('yksikään appi tai lib ei käytä ReCaptchaV3Provideria eikä merkkijono-activatea', () => {
    const vuodot = [];
    for (const n of [...juurenHtml(), 'lib/tm_appcheck.js']) {
      const s = poistaKommentit(lue(n));
      // Haetaan KÄYTTÖ, ei mainintaa: konstruktorikutsu tai import-specifier. Pelkkä
      // maininta selittävässä kommentissa ("ei ReCaptchaV3Provideria") ei ole vuoto.
      if (/new\s+ReCaptchaV3Provider\s*\(|ReCaptchaV3Provider\s*[,}]/.test(s)) vuodot.push(n + ': ReCaptchaV3Provider');
      // v3-muoto activate('SITEKEY', true) — Enterprise vaatii provider-instanssin
      if (/appCheck\(\)\.activate\(\s*['"]/.test(s)) vuodot.push(n + ": activate('<string>')");
    }
    expect(vuodot).toEqual([]);
  });
});

describe('service workerit (§27.4)', () => {
  // Cache-versio tarkistetaan VÄHIMMÄISARVONA, ei eksaktina: §27.4 vaatii bumppaamaan cachen
  // aina kun SW-logiikka tai jaettu lib (tm_lang) muuttuu — eksakti pinni punertaisi joka bumpissa
  // ja houkuttelisi "korjaamaan" testin sen sijaan että bumppaus tehdään.
  it.each([
    ['sw_pelaaja.js', 'tm-pelaaja-v', 25],
    ['sw_vanhempi.js', 'tm-vanhempi-v', 15],
  ])('%s · cache-versio ≥ vaadittu + tm_appcheck allowlistissa', (f, etuliite, min) => {
    const s = lue(f);
    const m = s.match(new RegExp("const CACHE = '" + etuliite + "(\\d+)'"));
    expect(m, f).toBeTruthy();
    expect(Number(m[1]), f + ' cache-versio').toBeGreaterThanOrEqual(min);
    expect(s).toContain('/lib/tm_appcheck.js');
  });
  it('reCAPTCHA EI ole allowlistissa (attestointi ei saa tulla cachesta)', () => {
    for (const f of ['sw_pelaaja.js', 'sw_vanhempi.js']) {
      const s = lue(f);
      const koodi = s.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
      expect(koodi, f).not.toMatch(/indexOf\(['"][^'"]*recaptcha/i);
    }
  });
});

/* TalentMaster_Valmentajakortti.html — KYTKETTY MUTTA INERTTI.
   Ajettu todennus (headless, 20 appia) paljasti: tämä sivu ei lataa reCAPTCHA Enterprisea eikä
   aktivoi App Checkiä, koska sen 22 kt:n inline-script EI SUORITU LAINKAAN. Syy on ENNESTÄÄN OLEVA
   ja dokumentoitu: duplikaatti `const KETJU_NIMET` (rivit 452 + 848) → SyntaxError → koko lohko,
   Firebase-init mukaan lukien, jää ajamatta. eslint.config.js ignoroi tiedoston samasta syystä (#60).
   Varmistettu ettei johdu tästä erästä: sama tulos HEAD-versiolla (firebase.apps.length === 0 molemmilla).
   SEURAUS APP CHECKILLE: sivu ei koske backendiin → enforce-turvallinen sellaisenaan. Kytkentä on
   silti paikallaan, jotta se toimii heti kun #60 korjataan. Tämä testi lukitsee sen tiedon: jos
   duplikaatti poistetaan, testi punertaa ja muistuttaa varmistamaan aktivoinnin ajossa. */
describe('tunnettu poikkeus · Valmentajakortti on inertti (#60)', () => {
  it('duplikaatti-const on yhä olemassa — jos poistat sen, verifioi App Check ajossa', () => {
    const s = lue('TalentMaster_Valmentajakortti.html');
    const kpl = (s.match(/const KETJU_NIMET\b/g) || []).length;
    expect(kpl, 'duplikaatti korjattu → aja headless-todennus uudelleen ja päivitä tämä testi').toBe(2);
  });
  it('kytkentä on silti paikallaan (ei jätetty puolitiehen)', () => {
    const s = lue('TalentMaster_Valmentajakortti.html');
    expect(s).toContain('firebase-app-check-compat.js');
    expect(s).toContain('tmAppCheckAktivoi()');
  });
});
