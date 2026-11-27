/* Suostumuksen KANONINEN ehto (1.10.2026) — yksi totuus kaikille palvelinpoluille.
   B9 (3.11.2026): ehto on lib/tm_suostumus.js:ssä — peruttu (tila 'peruttu' tai suostumus.peruttu) voittaa aina.
   Annettu = ei peruttu JA (suostumusTila === 'annettu' TAI suostumus.annettu asetettu). Molemmat kirjoituspolut
   (vahvistaSuostumus, suostumuslomakkeen uusi pelaaja) kirjoittavat molemmat; demon siemendatassa
   on pelkkä suostumusTila. Muut tilat (pilotti = tuotu, odottaa = kutsu lähetetty) = EI suostumusta.
   Käyttäjät: pelaajaKirjaudu (ei kirjautumista ilman), asetaPelaajanPin / luoPinitSeuralle (ei PIN:iä
   ilman), vahvistaSuostumus (joAnnettu). Laskenta: scripts/suostumus_pin_laskenta.js (sama ehto). */
'use strict';
const TS = require('./tm_suostumus');   // B9: lib/tm_suostumus.js (kopio) — peruttu voittaa
function suostumusAnnettu(pelaaja) { return TS.tmSuostumusAnnettu(pelaaja); }
const suostumusPeruttu = TS.tmSuostumusPeruttu;
const SUOSTUMUS_PUUTTUU = 'suostumus_puuttuu';
/* Kutsun lähetyksen jälkeen (Rules v3.33: vain palvelimella): pilotti/puuttuva → 'odottaa'.
   Annettua ei koskaan alenneta (suostumus-integriteetti), 'odottaa' ei muutu. → päivitysobjekti tai null. */
function suostumusTilaKutsunJalkeen(pelaaja) {
  if (suostumusAnnettu(pelaaja || {})) return null;
  if ((pelaaja || {}).suostumusTila === 'odottaa') return null;
  return { suostumusTila: 'odottaa' };
}

module.exports = { suostumusAnnettu, suostumusPeruttu, suostumusTilaKutsunJalkeen, SUOSTUMUS_PUUTTUU, SUOSTUMUS_PERUTTU: 'suostumus_peruttu' };
