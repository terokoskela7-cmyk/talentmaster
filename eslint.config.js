// eslint.config.js — #60: no-undef -portti (defektiluokan vartija, esim. 'sp is not defined' -luokka).
// VAIN no-undef: error — ei tyyli-/muotoilusääntöjä. Ajaa .js-tiedostot + HTML:n inline <script>-lohkot
// (eslint-plugin-html). Globaalit määritelty alla ettei tule vääriä positiiveja jaetuista lib-/app-funktioista.
const html = require('eslint-plugin-html');
const globals = require('globals');
const fs = require('fs');
const path = require('path');

// Kerää window.X = -määrittelyt (= ajonaikaiset globaalit, jotka selain ratkaisee mutta no-undef ei näe) kaikista
// app-tiedostoista → ei vääriä positiiveja window.X-patternista. TYYPIT silti kiinni: väärin kirjoitettu nimi
// (joka EI ole window.X) flagataan. Itsestään ylläpityvä — skannaa lähteet ajonaikaisesti.
function keraaWindowGlobaalit() {
  const g = {};
  const dir = __dirname;
  const tiedostot = [];
  fs.readdirSync(dir).forEach((f) => { if (/\.(html|js)$/.test(f)) tiedostot.push(f); });
  try { fs.readdirSync(path.join(dir, 'lib')).forEach((f) => { if (/\.js$/.test(f)) tiedostot.push('lib/' + f); }); } catch (e) { /* ohita */ }
  const re = /window\.([A-Za-z_][A-Za-z0-9_]*)\s*=/g;
  tiedostot.forEach((f) => {
    try {
      const src = fs.readFileSync(path.join(dir, f), 'utf8');
      let m; while ((m = re.exec(src))) g[m[1]] = 'readonly';
    } catch (e) { /* ohita */ }
  });
  return g;
}

// Sovelluksen + kirjastojen jaetut globaalit (ladataan <script src>-tageilla → eivät näy yksittäisessä tiedostossa).
const APP_GLOBALS = {
  // SDK / kirjastot
  firebase: 'readonly', XLSX: 'readonly', Sentry: 'readonly',
  // lib/tm_eerikkila_normit.js
  EERIKKILA_NORMIT: 'readonly', eerikkilaTaso: 'readonly', eerikkilaNormiarvo: 'readonly', eerikkilaProfiilit: 'readonly',
  HH_TESTI_MAP: 'readonly', normSukupuoliMN: 'readonly', onNeutraaliPrePHV: 'readonly', teknHeikoimmat20: 'readonly',
  laskeD1Joustava: 'readonly', laskeD1Osaindeksit: 'readonly', laskeD2HH: 'readonly', laskeD2Joustava: 'readonly',
  d2SmPalloFallback: 'readonly', taydennaHvSm: 'readonly', laskeTaso3Osuus: 'readonly', valitseKohortti: 'readonly',
  tasoJakauma: 'readonly', tkiTavoiteJakauma: 'readonly', tavoiteRadarAkselit: 'readonly',
  painopisteOminaisuus: 'readonly', kattavuusVajeet: 'readonly', laskeEI: 'readonly', laskeFVP: 'readonly',
  laskeTSI: 'readonly', normiIka: 'readonly', raeKvartaali: 'readonly', raeChip: 'readonly', isUnderdog: 'readonly',
  perTestTasot: 'readonly', hhSeuraavaTaso: 'readonly',
  // docs/testit_indeksit.js (TKI)
  TM_TESTIT: 'readonly', tkLaskeMerkki: 'readonly', tkLaskeTKI: 'readonly', laskeKokonaistulos: 'readonly',
  tkLajiViite: 'readonly', tkLajiTaso: 'readonly', tkSekuntibudjetti: 'readonly', tkVaadittuVuosivauhti: 'readonly',
  tkAbsDelta: 'readonly', TK_KOKONAISRAJAT: 'readonly', TK_LAJIT_META: 'readonly', TK_LAJITASOT: 'readonly',
  // lib/tm_joukkue.js
  tmNormJoukkueAvain: 'readonly', tmKanonisoiJoukkue: 'readonly', tmPuhdistaJoukkueetIdt: 'readonly',
  lajitteleJoukkueetIkaluokittain: 'readonly',
  // lib/tm_pvm.js
  tmPaivaIso: 'readonly', tmSolustaPvm: 'readonly',
  // muut jaetut libit / globaalit
  TM: 'readonly', TM_AI: 'readonly', TM_SELITTEET: 'readonly', tmSentryContext: 'readonly',
  tmKalenteriOccurrences: 'readonly', tmToistuvuusPaiva: 'readonly', tmSarjaId: 'readonly', tmCadenceNimi: 'readonly',
  tm_bioika: 'readonly', laskeMirwald: 'readonly', laskeBioIkaDokumentti: 'readonly',
  PANKKI: 'readonly', valitsePaivanHarjoite: 'readonly', generoiMiksiteksti: 'readonly',
  // globaalit lib-objektit (väylä/moduulit, ladataan erillisillä <script>-tageilla)
  TMBus: 'readonly', TM_KALENTERI: 'readonly', TM_HARJOITUS: 'readonly', TMImport: 'readonly', TMEmptyState: 'readonly',
  // CDN-kirjastot
  pdfjsLib: 'readonly', Chart: 'readonly',
  // lib/tm_eerikkila_normit.js (lisää) + tm_harjoitusarviointi.js + docs/testit_indeksit.js
  renderD3VertailuHTML: 'readonly', D3_DIMS: 'readonly', d3Varmuus: 'readonly', d3VarmuusChip: 'readonly',
  d3VpKuiluPelaajalla: 'readonly', renderKehityskorttiHTML: 'readonly', laskeVPTuloskortti: 'readonly',
  laskeJoukkueReviewKooste: 'readonly', vanhempiRaporttiTekstit: 'readonly', raeJoukkueJakauma: 'readonly',
  laskeValmentajaKalibraatio: 'readonly', laskeValmennustaitoIndeksi: 'readonly', laskeReviewKadenssi: 'readonly',
  laskeJoukkuePoikkeamat: 'readonly', laskeHarjoituslaatuPalloliitto: 'readonly', hhKehityskohde: 'readonly',
  harjoitusKalibraatioHistoria: 'readonly', tkLajiGapit: 'readonly', omaKehitysKooste: 'readonly', laskeVNE: 'readonly',
  laskeKiihdytysprofiili: 'readonly', laskeHarjoitusKalibraatio: 'readonly', koostaHarjoitusarvioinnit: 'readonly',
  hhVaadittuVuosivauhti: 'readonly', hhLaskeTaso: 'readonly', harjoitusTrendi: 'readonly', harjoitusBenchmarkDelta: 'readonly',
  cpdKooste: 'readonly', laskeTekninenKehityskohde: 'readonly', _laskeIkavaihe: 'readonly',
  getWhyLause: 'readonly', getTHarjoiteWhy: 'readonly', getSHarjoiteWhy: 'readonly',
  // yleinen app-toast (window.toast)
  toast: 'readonly',
  // ristikkäin-lib-globaalit (yhden lib-tiedoston funktio kutsuu toisessa määriteltyä, molemmat ladataan globaaleina)
  laskeHiddenGem: 'readonly', laskeValmentajaHarjoitusKooste: 'readonly',
  // tm_lang.js (kielilib)
  tmAsetaKieli: 'readonly', tmKieli: 'readonly', tmT: 'readonly',
};

const COMMON = {
  ...globals.browser,
  ...APP_GLOBALS,
  ...keraaWindowGlobaalit(),   // ajonaikaiset window.X-globaalit (poistaa window.X-patternin väärät positiivit)
};

module.exports = [
  // Kirjastot (CommonJS — node + selain): module/require + browser + sovellusglobaalit.
  {
    files: ['lib/**/*.js', 'docs/testit_indeksit.js', 'docs/tk_lajiviitteet.js', 'harjoitelogiikka_v4.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: { ...globals.node, ...COMMON },
    },
    rules: { 'no-undef': 'error' },
  },
  // HTML inline <script> -lohkot (selain-skriptejä): no-undef-portti.
  {
    files: ['*.html'],
    plugins: { html },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: COMMON,
    },
    rules: { 'no-undef': 'error' },
  },
];
