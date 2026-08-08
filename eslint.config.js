// eslint.config.js — #60: no-undef -portti (defektiluokan vartija, esim. 'sp is not defined' -luokka).
// VAIN no-undef: error — ei tyyli-/muotoilusääntöjä. Ajaa .js-tiedostot + HTML:n inline <script>-lohkot
// (eslint-plugin-html). Globaalit määritelty alla ettei tule vääriä positiiveja jaetuista lib-/app-funktioista.
const html = require('eslint-plugin-html');
const globals = require('globals');
const fs = require('fs');
const path = require('path');

// Kerää AJONAIKAISET globaalit (jotka selain ratkaisee mutta no-undef ei näe usean <script>-lohkon/tiedoston yli):
//   (1) window.X = -määrittelyt · (2) SARAKKEEN 0 (top-level) function/async function -määrittelyt
//   · (3) SARAKKEEN 0 let/const/var -määrittelyt.
// → ei vääriä positiiveja window.X- eikä cross-<script>-block-patternista. TYYPIT SILTI KIINNI: väärin kirjoitettu
// nimi (jota ei ole missään top-level-määrittelyssä) flagataan, samoin SISENNETYT paikalliset muuttujat skoopin
// ulkopuolella (esim. 'sp is not defined' -luokka — paikallinen var on sisennetty → EI kerätä → jää kiinni).
// Itsestään ylläpityvä — skannaa lähteet ajonaikaisesti.
function keraaWindowGlobaalit() {
  const g = {};
  const dir = __dirname;
  const tiedostot = [];
  fs.readdirSync(dir).forEach((f) => { if (/\.(html|js)$/.test(f)) tiedostot.push(f); });
  try { fs.readdirSync(path.join(dir, 'lib')).forEach((f) => { if (/\.js$/.test(f)) tiedostot.push('lib/' + f); }); } catch (e) { /* ohita */ }
  const reWin = /window\.([A-Za-z_][A-Za-z0-9_]*)\s*=/g;                                  // window.X =
  const reFn = /^(?:async\s+)?function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/gm;                // top-level function NAME(
  const reVar = /^(?:let|const|var)\s+([A-Za-z_][A-Za-z0-9_]*)/gm;                        // top-level let/const/var NAME
  tiedostot.forEach((f) => {
    try {
      const src = fs.readFileSync(path.join(dir, f), 'utf8');
      let m;
      while ((m = reWin.exec(src))) g[m[1]] = 'readonly';
      while ((m = reFn.exec(src))) g[m[1]] = 'readonly';
      while ((m = reVar.exec(src))) g[m[1]] = 'readonly';
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
  // lib/tm_historia.js (Trendi Vaihe 1 — mittaushistorian selkäranka)
  TM_HISTORIA: 'readonly', tmHhSnapshot: 'readonly', tmTkiSnapshot: 'readonly', tmHistoriaLisaa: 'readonly',
  // lib/tm_pohja.js (P1.2 — itsekuvaava tuontipohja: sarakegenerointi + Meta-lehti)
  TM_POHJA: 'readonly',
  // lib/tm_pikakentat.js (P2.0) · tm_testikatalogi.js + tm_pikakirjaus.js (P2.1)
  TM_PIKAKENTAT: 'readonly', tmLaskePikakentat: 'readonly',
  TM_TESTIKATALOGI: 'readonly', TM_PIKAKIRJAUS: 'readonly',
  // lib/tm_pelialy_yksilo.js (ADAR §4-ikäportitus, Malli A)
  TM_PELIALY_YKSILO: 'readonly', tmAdarBand: 'readonly', tmAdarYht: 'readonly', tmAdarBonusOsat: 'readonly',
  tmAdarKonsensus: 'readonly', tmAdarRistiinarvioAvoin: 'readonly', tmAdarTalenttiSignaali: 'readonly', tmAdarKuukausiAvain: 'readonly',
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
};

const COMMON = {
  ...globals.browser,
  ...APP_GLOBALS,
  ...keraaWindowGlobaalit(),   // ajonaikaiset window.X-globaalit (poistaa window.X-patternin väärät positiivit)
};

module.exports = [
  // Globaali ignore: legacy/viittaamattomat sivut joissa on jo ennestään parse-virhe.
  // #60 VAIHE 2: Valmentajakortti.html sisältää aidon duplikaatti-constin (KETJU_NIMET riveillä 449 + 845
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
];
