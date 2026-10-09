/* ════════════════════════════════════════════════════════════════════════
   tm_polun_tila.js — "Polun tila" -SIGNAALI + kolme kysymystä (design 01, Tänään; PURE; henkilökunnalle, vain luku). 6.10.2026.
   Tila: Etenee · Huomio · Katselmuksen aika · Ei vielä tietoa (01). Kysymykset: Näkyykö fokus? · Treenataanko? · Onko mukana?  Pelaajaa verrataan vain hänen omaan lähtötasoonsa (§28);
   tiedon puuttuessa kerrotaan se ("Ei vielä tietoa") — ei arvata. Seuraava askel tulee YHDESTÄ logiikasta (tmSeuraavaAskel; kutsuja syöttää tuloksen).
   · tmPolunTila(p, ctx) → { tila, kysymykset:[{avain, kysymys, vastaus, tieto:bool}] }
       ctx: { askel ({avain,tila}|null — tmSeuraavaAskel/_pdcPaatos), sitoumusOdottaa (bool|undefined), blokit ({tehty, suunniteltu}|null), nyt (ISO) }
   Kenttänimet neutraaleja; tekstit palautetaan avaimina (adapteri kääntää t():llä). Dual-export: module.exports || window.TM_POLUN_TILA.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var KATSELMUS = { review_myohassa: 1, review_eraantymassa: 1 };
  function _SIT() { try { if (typeof module !== 'undefined' && module.exports && typeof require === 'function') return require('./tm_sitoumus.js'); } catch (e) { /* ei */ } return root && root.TM_SITOUMUS; }
  function tmPolunTila(p, ctx) {
    p = p || {}; ctx = ctx || {};
    var jf = p.jaksofokus, onJakso = !!(jf && (jf.konsepti_avain || jf.konsepti_nimi)), a = ctx.askel || null;
    var tila = 'ei_tietoa';
    if (a && KATSELMUS[a.avain]) tila = 'katselmus';
    else if (a && a.tila === 'toimenpide') tila = 'huomio';
    else if (onJakso || a) tila = 'etenee';
    // Näkyykö fokus? — jakson osa-arviot (curriculum 1–3; 3 = itsenäisesti); vain jakson omasta konseptista
    var osat = onJakso && jf.osa_arviot && jf.konsepti_avain && jf.osa_arviot[jf.konsepti_avain] || null, avaimet = osat ? Object.keys(osat) : [], itsen = avaimet.filter(function (k) { return osat[k] === 3; }).length;
    var fokus = avaimet.length ? { tieto: true, vastaus: 'osaa_itsenaisesti', n: itsen, yht: avaimet.length } : { tieto: false, vastaus: 'ei_tietoa' };
    // Treenataanko? — IDP-blokkien toteuma (kutsujan syöttämä; ei kyselyä täällä, §26)
    var b = ctx.blokit, treeni = b && typeof b.tehty === 'number' && typeof b.suunniteltu === 'number' && b.suunniteltu > 0 ? { tieto: true, vastaus: 'blokit_tehty', n: b.tehty, yht: b.suunniteltu } : { tieto: false, vastaus: 'ei_tietoa' };
    // Onko mukana? — pelaajan sitoumus jakson alusta
    // A1/D97: yksi sääntö lib/tm_sitoumus.js. ctx.sitoumusOdottaa on vain ohitus (testit/erikoistapaus); oletuksena päätellään pelaajasta: vanha sitoumus + uusi jakso → ei tietoa (ei "Mukana").
    var SX = _SIT(), SS = SX ? SX.tmSitoumus(p) : null, odottaa = ctx.sitoumusOdottaa != null ? ctx.sitoumusOdottaa === true : !!(SS && SS.sitoutunut && !SS.vahvistettu);
    var vahv = ctx.sitoumusOdottaa != null ? (ctx.sitoumusOdottaa === false && !!p.idp_sitoumus_pvm) : !!(SS && SS.vahvistettu);
    var sit = odottaa ? { tieto: true, vastaus: 'sitoumus_odottaa' } : (vahv ? { tieto: true, vastaus: 'sitoumus_vahvistettu', pvm: p.idp_sitoumus_pvm } : { tieto: false, vastaus: 'ei_tietoa' });
    return { tila: tila, kysymykset: [Object.assign({ avain: 'nakyyko_fokus', kysymys: 'Näkyykö fokus?' }, fokus), Object.assign({ avain: 'treenataanko', kysymys: 'Treenataanko?' }, treeni), Object.assign({ avain: 'onko_mukana', kysymys: 'Onko mukana?' }, sit)] };
  }
  var API = { tmPolunTila: tmPolunTila };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.TM_POLUN_TILA = API;
})(typeof window !== 'undefined' ? window : this);
