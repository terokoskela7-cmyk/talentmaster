// eslint.config.js — #60: no-undef -portti (defektiluokan vartija, esim. 'sp is not defined' -luokka).
// VAIN no-undef: error — ei tyyli-/muotoilusääntöjä. Ajaa .js-tiedostot + HTML:n inline <script>-lohkot
// (eslint-plugin-html). Globaalit määritelty alla ettei tule vääriä positiiveja jaetuista lib-/app-funktioista.
const html = require('eslint-plugin-html');
const globals = require('globals');
const fs = require('fs');
const path = require('path');

// Kerää AJONAIKAISET globaalit (jotka selain ratkaisee mutta no-undef ei näe usean <script>-lohkon/tiedoston yli).
// Keräin on omassa moduulissaan (scripts/lint_globaalit.js) ja käyttää ESLintin omaa parseria (espree):
// regex-versio poimi monideklaraattorista vain ensimmäisen nimen (`var A = 1, B = 2;` → B jäi puuttumaan)
// ja punersi kelvollisesta koodista. Rajaus on sama kuin ennen — top-level-määrittelyt + window.X — joten
// sisennetyt paikalliset muuttujat jäävät yhä kiinni ('sp is not defined' -defektiluokka).
// Itsestään ylläpitävä: skannaa lähteet ajonaikaisesti. Yksikkötesti: tests/lint_globaalit_kerain.test.js.
const { keraaGlobaalit } = require('./scripts/lint_globaalit.js');

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
  // lib/tm_aani.js (puhdas nauhoitin) + lib/tm_reflektio.js (jaettu äänireflektio: Master + VP)
  tmAani: 'readonly', tmReflektio: 'readonly',
  // lib/tm_aktiivisuus.js (toimihenkilön kirjautumisaikaleima — 6 toimihenkilöappia)
  tmAktiivisuus: 'readonly', tmMerkitseKirjautuminen: 'readonly',
  // lib/tm_infografiikka.js (jaetut raportointikomponentit — Oura × KISS)
  TM_INFO: 'readonly',
  // lib/tm_havainto_kaavio.js (pelihavainto ↔ taktiikkataulu -linkki, jälkirikastus)
  tmHavaintoKaavio: 'readonly', tmHavaintoLiitaKaavio: 'readonly', tmKaavioLiitaHavaintoon: 'readonly',
  // lib/tm_historia.js (Trendi Vaihe 1 — mittaushistorian selkäranka)
  TM_HISTORIA: 'readonly', tmHhSnapshot: 'readonly', tmTkiSnapshot: 'readonly', tmHistoriaLisaa: 'readonly',
  // lib/tm_pohja.js (P1.2 — itsekuvaava tuontipohja: sarakegenerointi + Meta-lehti)
  TM_POHJA: 'readonly',
  // lib/tm_pikakentat.js (P2.0) · tm_testikatalogi.js + tm_pikakirjaus.js (P2.1)
  TM_PIKAKENTAT: 'readonly', tmLaskePikakentat: 'readonly', tmRakennaPikakentatArkistosta: 'readonly',
  TM_TESTIKATALOGI: 'readonly', TM_PIKAKIRJAUS: 'readonly',
  // lib/tm_pelialy_yksilo.js (ADAR §4-ikäportitus, Malli A)
  TM_PELIALY_YKSILO: 'readonly', tmAdarBand: 'readonly', tmAdarYht: 'readonly', tmAdarBonusOsat: 'readonly',
  tmAdarKonsensus: 'readonly', tmAdarRistiinarvioAvoin: 'readonly', tmAdarTalenttiSignaali: 'readonly', tmAdarKuukausiAvain: 'readonly',
  tmValmennusKaari: 'readonly', tmValmennusIkkuna: 'readonly',
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
  // lib/tm_vp_seuranta.js (Vaihe C — VP-seuranta koonti/kuittaus/IDP-feed)
  TM_VP_SEURANTA: 'readonly', tmSeurantaTilaDot: 'readonly', tmSeurantaKuittausAvain: 'readonly',
  tmSeurantaRosterSort: 'readonly', tmSeurantaAktiivisetHalytykset: 'readonly',
  tmSeurantaOnKuitattu: 'readonly', tmSeurantaIdpFeed: 'readonly',
  // lib/tm_kehityskaari.js (Trendi Vaihe 2 — yksilön kehityskaari render)
  TM_KEHITYSKAARI: 'readonly', tmKaariPienempiParempi: 'readonly', tmKaariMitatutAvaimet: 'readonly',
  tmKaariSarja: 'readonly', tmKaariSuunta: 'readonly', tmKaariNopeus: 'readonly', tmKaariTasoSarja: 'readonly',
  tmKaariKattavuusOk: 'readonly', tmKaariJaksot: 'readonly', tmKaariJaksoSidos: 'readonly',
  tmKaariNimi: 'readonly', tmKaariYksikko: 'readonly', tmKaariRenderFull: 'readonly', tmKaariRenderPelaaja: 'readonly',
  tmKehityskaari: 'readonly', tmKaariDatataso: 'readonly', tmKaariAlustaSuodata: 'readonly', tmKaariKaksiDeltaa: 'readonly',
  tmKypsyys: 'readonly', tmKypsyysVaihe: 'readonly', tmKasvutahtiVyohyke: 'readonly', tmKypsyysGuard: 'readonly',
};

const COMMON = {
  ...globals.browser,
  ...APP_GLOBALS,
  ...keraaGlobaalit(__dirname),   // ajonaikaiset top-level- ja window.X-globaalit (poistaa väärät positiivit)
};

/** Juuren HTML:t joissa on top-level ES-moduuliskripti (import-lauseet). */
function moduuliHtml() {
  return fs.readdirSync(__dirname)
    .filter((f) => f.endsWith('.html'))
    .filter((f) => /<script[^>]*type=["']module["']/.test(fs.readFileSync(path.join(__dirname, f), 'utf8')));
}

module.exports = [
  // Globaali ignore: legacy/viittaamattomat sivut joissa on jo ennestään parse-virhe.
  // #60 VAIHE 2: Valmentajakortti.html sisältää aidon duplikaatti-constin (KETJU_NIMET riveillä 452 + 848
  // → SyntaxError). Sivu on kuollut (ei linkitetty mistään, ei §8:n aktiivisessa setissä). Portti kohdistuu
  // aktiiviseen koodiin; tämä jää erilliseen legacy-siivoukseen (älä lisää tähän aktiivisia tiedostoja).
  {
    ignores: ['TalentMaster_Valmentajakortti.html'],
  },
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
  // ES-moduuliapit (§38 "modular"): top-level <script type="module"> + import-lauseet.
  // Johdetaan DATASTA — uusi moduuliappi tulee katetuksi itsestään, ei kovakoodattua listaa.
  {
    files: moduuliHtml(),
    languageOptions: { sourceType: 'module' },
  },
];
