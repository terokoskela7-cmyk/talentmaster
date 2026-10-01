/* Suostumuksen KANONINEN ehto (1.10.2026) — yksi totuus kaikille palvelinpoluille.
   Annettu = suostumusTila === 'annettu' TAI suostumus.annettu asetettu. Molemmat kirjoituspolut
   (vahvistaSuostumus, suostumuslomakkeen uusi pelaaja) kirjoittavat molemmat; demon siemendatassa
   on pelkkä suostumusTila. Muut tilat (pilotti = tuotu, odottaa = kutsu lähetetty) = EI suostumusta.
   Käyttäjät: pelaajaKirjaudu (ei kirjautumista ilman), asetaPelaajanPin / luoPinitSeuralle (ei PIN:iä
   ilman), vahvistaSuostumus (joAnnettu). Laskenta: scripts/suostumus_pin_laskenta.js (sama ehto). */
'use strict';
function suostumusAnnettu(pelaaja) {
  const p = pelaaja || {};
  return p.suostumusTila === 'annettu' || !!(p.suostumus && p.suostumus.annettu);
}
const SUOSTUMUS_PUUTTUU = 'suostumus_puuttuu';
module.exports = { suostumusAnnettu, SUOSTUMUS_PUUTTUU };
