'use strict';
/**
 * Huoltajan tunnistus callableissa — YKSI tapa (B4, Tero 10.10.2026): kutsujan token-email on VAHVISTETTU (email_verified === true; huoltajan sähköposti vahvistetaan
 * rekisteröinnin jälkeen salasanan asetuslinkillä) ja täsmää pelaajan `huoltajaEmail`-kenttään (case-insensitive, sama ehto kuin Rules onLapsenHuoltaja ja haeLapsiHuoltajalle).
 * Kalenterissa huoltajan polku vaatii lisäksi suostumusTila == 'annettu' (vaadiSuostumus). Käyttäjät: haePelaajanKalenteri, kirjaaHuoltajaKaynti.
 * Palauttaa null (ok) tai syykoodin: 'ei_sahkopostia' | 'ei_vahvistettu' | 'ei_huoltaja' | 'ei_suostumusta'.
 */
function huoltajaSyy(token, pelaajaData, opts) {
  const t = token || {};
  if (typeof t.email !== 'string' || !t.email) return 'ei_sahkopostia';
  if (t.email_verified !== true) return 'ei_vahvistettu';
  const x = pelaajaData || {};
  if (typeof x.huoltajaEmail !== 'string' || x.huoltajaEmail.toLowerCase().trim() !== String(t.email).toLowerCase().trim()) return 'ei_huoltaja';
  if (opts && opts.vaadiSuostumus && x.suostumusTila !== 'annettu') return 'ei_suostumusta';
  return null;
}
module.exports = { huoltajaSyy };
