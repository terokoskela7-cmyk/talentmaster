/* Verkkokatkon käsittely kirjautumisessa (1.10.2026). Sentry 1.10. klo 16.23: "pelaajaKirjaudu epäonnistui: internal",
   fetch ilman HTTP-statusta, eikä funktion lokissa kutsua → pyyntö katkesi verkkotasolla (luultavasti CI-deployn aikana).

   Tunnistus (Firebase Functions SDK, _errorForResponse): kun palvelin ei vastaa (fetch kaatuu, status 0, ei runkoa),
   SDK heittää FunctionsError(code, code) — viesti on sama kuin koodi eikä details-kenttää ole. Palvelimen oma virhe
   antaa viestiksi 'INTERNAL'/'UNAVAILABLE' tai oman tekstin. Aikakatkaisu: deadline-exceeded/deadline-exceeded.
   Auth-kirjautumisessa sama tilanne on auth/network-request-failed.

   Käytös: yksi automaattinen uudelleenyritys 2 s päästä. Jos sekin katkeaa → "Yhteyskatko"-ilmoitus ja Sentryyn
   warning-tasolla tagilla tm_virhetyyppi=verkko (ei error: oikeat palvelinvirheet erottuvat; ei suodateta pois,
   koska toistuvat katkot halutaan nähdä). Ei PII:tä: vain kohde (esim. 'pelaajaKirjaudu'). */
var TM_VERKKO_KOODIT = ['internal', 'unavailable', 'deadline-exceeded'];
var TM_VERKKO_VIESTIT = {   // sv: Gemini (odottaa) → fallback en, kuten t()
  fi: 'Yhteyskatko – yritä hetken kuluttua uudelleen',
  en: 'Connection lost – please try again in a moment',
};
function tmOnVerkkokatko(e) {
  if (!e) return false;
  var koodi = String(e.code || '').replace(/^functions\//, '');
  if (koodi === 'auth/network-request-failed') return true;
  if (TM_VERKKO_KOODIT.indexOf(koodi) < 0) return false;
  return String(e.message || '') === koodi && e.details === undefined;
}
function tmVerkkoViesti(kieli) {
  var k = kieli || (typeof tmNykyinenKieli === 'function' ? tmNykyinenKieli() : 'fi');
  return TM_VERKKO_VIESTIT[k] || (k === 'fi' ? TM_VERKKO_VIESTIT.fi : TM_VERKKO_VIESTIT.en);
}
/** Ajaa fn():n; verkkokatkossa odottaa (oletus 2 s) ja yrittää KERRAN uudelleen. Toinen katko heitetään eteenpäin. */
async function tmYritaUudelleenVerkkokatkossa(fn, opts) {
  var o = opts || {};
  var odota = o.odota || function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  try {
    return await fn();
  } catch (e) {
    if (!tmOnVerkkokatko(e)) throw e;
    await odota(o.viiveMs == null ? 2000 : o.viiveMs);
    return await fn();
  }
}
/** Sentry: warning + tm_virhetyyppi=verkko. Ei kaada kutsujaa. */
function tmRaportoiVerkkokatko(kohde) {
  try {
    var S = (typeof window !== 'undefined') ? window.Sentry : null;
    if (S && typeof S.captureMessage === 'function') {
      S.captureMessage(kohde + ': verkkokatko', { level: 'warning', tags: { tm_virhetyyppi: 'verkko', tm_kohde: kohde } });
    }
  } catch (e) { /* Sentry ei saa kaataa kirjautumista */ }
}
if (typeof window !== 'undefined') {
  window.tmOnVerkkokatko = tmOnVerkkokatko;
  window.tmVerkkoViesti = tmVerkkoViesti;
  window.tmYritaUudelleenVerkkokatkossa = tmYritaUudelleenVerkkokatkossa;
  window.tmRaportoiVerkkokatko = tmRaportoiVerkkokatko;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TM_VERKKO_VIESTIT: TM_VERKKO_VIESTIT, tmOnVerkkokatko: tmOnVerkkokatko, tmVerkkoViesti: tmVerkkoViesti,
    tmYritaUudelleenVerkkokatkossa: tmYritaUudelleenVerkkokatkossa, tmRaportoiVerkkokatko: tmRaportoiVerkkokatko };
}
