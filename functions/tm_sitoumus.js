/* ════════════════════════════════════════════════════════════════════════
   tm_sitoumus.js — pelaajan sitoumus: YKSI sääntö (Kehitystyöpöytä 22 · A1 · D97). PURE (ei Firebasea/DOM:ia/kelloa).
   tmSitoumus(p) → { sitoutunut, vahvistettu, annettu_pvm, vahvistettu_pvm }
     sitoutunut  = pelaajan sitoumus (p.idp_sitoumus_pvm) on annettu NYKYISEN jakson aikana: idp_sitoumus_pvm ≥ jaksofokus.alkoi − 1 pv (± 1 pv aikavyöhyke). Vanha sitoumus + uusi jakso → EI sitoutunut.
     vahvistettu = sitoutunut JA vahvistus on sidottu nykyiseen jaksoon: p.idp_sitoumus_vahv_jakso === jaksofokus.alkoi.
   Tila `vahvistettu` (tmJaksoTila) tarkoittaa jatkossa "V1 vahvistettu, pelaajan sitoumus puuttuu" (18 §2 täsmennys) — ei tämän funktion vahvistettu-lippua.
   Käyttäjät: tm_aloita_jakso.js (tilasiru), tm_polun_tila.js (Onko mukana?), tm_seuraava_askel.js (porras 'sitoumus'), VP/Master (Kysymykset, Seuraava askel, bulk-signaali).
   Dual-export: module.exports || window.TM_SITOUMUS (+ window.tmSitoumus).
   ════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var DAY = 86400000;
  function _ms(v) { if (v == null || v === '') return NaN; if (typeof v.toDate === 'function') { try { return v.toDate().getTime(); } catch (e) { return NaN; } } var t = typeof v === 'number' ? v : new Date(v).getTime(); return t; }
  function tmSitoumus(p) {
    var jf = p && p.jaksofokus, alku = jf ? _ms(jf.alkoi) : NaN, sit = _ms(p && p.idp_sitoumus_pvm);
    var sitoutunut = !isNaN(sit) && !isNaN(alku) && sit >= alku - DAY;
    var vahvistettu = sitoutunut && p.idp_sitoumus_vahv_jakso != null && String(p.idp_sitoumus_vahv_jakso) === String(jf.alkoi);
    var s = p && p._idpSitoumus;   // VP lataa idp_kausi.pelaaja_sitoumus; Master ei välttämättä → null
    return { sitoutunut: sitoutunut, vahvistettu: vahvistettu, annettu_pvm: (p && p.idp_sitoumus_pvm) || null, vahvistettu_pvm: vahvistettu && s && s.vahvistettu_pvm ? s.vahvistettu_pvm : null };
  }
  var API = { tmSitoumus: tmSitoumus };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else { root.TM_SITOUMUS = API; root.tmSitoumus = tmSitoumus; }
})(typeof window !== 'undefined' ? window : this);
