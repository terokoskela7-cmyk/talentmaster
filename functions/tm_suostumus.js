/* ════════════════════════════════════════════════════════════════════════
   tm_suostumus.js — suostumuksen KANONINEN ehto (B9, GDPR art. 7(3); PM 3.11.2026). Yksi totuus selaimelle ja palvelimelle.
   Peruttu = suostumusTila === 'peruttu' TAI suostumus.peruttu asetettu. Peruttu VOITTAA aina:
     · peruSuostumus kirjoittaa tilan 'peruttu' + suostumus.peruttu, mutta suostumus.annettu SÄILYY todisteena (art. 7(1)).
     · Uusi kutsu siirtää tilan 'peruttu' → 'odottaa', mutta suostumus.peruttu pysyy → yhä ei suostumusta.
     · Uusi suostumus (vahvistaSuostumus) korvaa koko suostumus-olion → peruttu poistuu, edelliset audit-riville (suostumus_historia).
   Annettu = ei peruttu JA (suostumusTila === 'annettu' TAI suostumus.annettu asetettu).
   Kopio: functions/tm_suostumus.js (node scripts/sync_functions_lib.js). functions/suostumus.js käyttää tätä.
   Inline-kopiot (lib/tm_laskutus.js ym. itsenäiset libit) vartioi tests/suostumus_peruminen.test.js.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  function tmSuostumusPeruttu(p) { var x = p || {}; return x.suostumusTila === 'peruttu' || !!(x.suostumus && x.suostumus.peruttu); }
  function tmSuostumusAnnettu(p) { var x = p || {}; return !tmSuostumusPeruttu(x) && (x.suostumusTila === 'annettu' || !!(x.suostumus && x.suostumus.annettu)); }
  /* Näyttötila: 'annettu' | 'peruttu' | 'odottaa' | 'pilotti' | 'puuttuu' (peruttu voittaa myös, kun uusi kutsu on jo lähetetty). */
  function tmSuostumusTila(p) {
    var x = p || {};
    if (tmSuostumusPeruttu(x)) return 'peruttu';
    if (tmSuostumusAnnettu(x)) return 'annettu';
    return x.suostumusTila === 'odottaa' || x.suostumusTila === 'luotu' ? 'odottaa' : x.suostumusTila === 'pilotti' ? 'pilotti' : 'puuttuu';
  }
  var API = { tmSuostumusAnnettu: tmSuostumusAnnettu, tmSuostumusPeruttu: tmSuostumusPeruttu, tmSuostumusTila: tmSuostumusTila };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else if (root) root.TM_SUOSTUMUS = API;
})(typeof window !== 'undefined' ? window : this);
