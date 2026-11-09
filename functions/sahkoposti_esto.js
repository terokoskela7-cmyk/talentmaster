'use strict';
/**
 * Sähköpostin esto muissa kuin tuotantoprojektissa (projekti 06, PM 9.11.2026 P6).
 * Staging (talentmaster-staging) ja kaikki muut projektit EIVÄT saa lähettää oikeaa sähköpostia: SendGrid-kutsu ohitetaan ja
 * lähetys kirjataan vain lokiin (ei vastaanottajaa, ei otsikkoa, ei sisältöä).
 *
 * Projekti tunnistetaan ajoympäristöstä (GCLOUD_PROJECT → GCP_PROJECT → GOOGLE_CLOUD_PROJECT → FIREBASE_CONFIG.projectId), ei konfiguraatiosta.
 * Tuntematon projekti (mikään muuttuja ei ole asetettu) EI estä lähetystä: tuotannon kutsu-, salasana- ja suostumussähköpostit eivät saa
 * pysähtyä, jos ympäristömuuttuja puuttuu. Stagingissa toinen suoja on dummy-SENDGRID_API_KEY (Secret Manager). Älä käännä oletusta
 * ilman, että tuotannon ajoympäristön muuttujat on varmistettu (lokirivi `[SendGrid] projekti=` näyttää tunnistetun arvon).
 * Vartijat: functions/test/sahkoposti_esto.test.js (molemmat haarat) + tests/sahkoposti_esto_kytkenta.test.js (kutsu ennen avainta).
 */
const TUOTANTOPROJEKTI = 'talentmaster-pilot';

/** env → projektitunniste tai null. */
function projektiId(env) {
  const e = env || {};
  const suora = e.GCLOUD_PROJECT || e.GCP_PROJECT || e.GOOGLE_CLOUD_PROJECT;
  if (suora) return String(suora).trim();
  try {
    const cfg = e.FIREBASE_CONFIG ? JSON.parse(e.FIREBASE_CONFIG) : null;
    if (cfg && cfg.projectId) return String(cfg.projectId).trim();
  } catch (err) { /* virheellinen JSON → tuntematon */ }
  return null;
}

/** env → { estetty: boolean, projekti: string|null }. Estetty vain, kun projekti tunnetaan eikä se ole tuotanto. */
function sahkopostiEsto(env) {
  const projekti = projektiId(env);
  return { estetty: projekti !== null && projekti !== TUOTANTOPROJEKTI, projekti };
}

module.exports = { TUOTANTOPROJEKTI, projektiId, sahkopostiEsto };
