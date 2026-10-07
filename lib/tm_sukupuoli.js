/* ════════════════════════════════════════════════════════════════════════
   tm_sukupuoli.js — sukupuolen normalisointi ja päättely (CLAUDE.md §7.12: Firestoressa "M"/"N", ei "poika"/"tyttö"; Excel käyttää P/T). PURE.
   · tmSukupuoliMN(raw)            → 'M' | 'N' | null   (P/M/poika/pojat/mies → M · T/N/tyttö/tytöt/nainen → N · muu/tyhjä → null, EI oletusta)
   · tmSukupuoliTuloksista(arvot)  → { sukupuoli:'M'|'N'|null, syy:'ok'|'ei_tuloksia'|'ristiriita', M:n, N:n }
       Päättely testituloksista (backfill): vain jos KAIKKI tunnistetut arvot ovat yhtä mieltä; ristiriita → null + syy (lista käsin). Tunnistamattomat arvot ohitetaan.
   Dual-export: module.exports || window.TM_SUKUPUOLI.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var M = { p: 1, m: 1, poika: 1, pojat: 1, mies: 1, miehet: 1 }, N = { t: 1, n: 1, tytto: 1, tytot: 1, nainen: 1, naiset: 1 };
  function tmSukupuoliMN(raw) {
    var s = String(raw == null ? '' : raw).trim().toLowerCase().replace(/ö/g, 'o').replace(/ä/g, 'a');
    if (M[s] === 1) return 'M'; if (N[s] === 1) return 'N'; return null;
  }
  function tmSukupuoliTuloksista(arvot) {
    var m = 0, n = 0; (Array.isArray(arvot) ? arvot : []).forEach(function (a) { var x = tmSukupuoliMN(a); if (x === 'M') m++; else if (x === 'N') n++; });
    if (!m && !n) return { sukupuoli: null, syy: 'ei_tuloksia', M: 0, N: 0 };
    if (m && n) return { sukupuoli: null, syy: 'ristiriita', M: m, N: n };
    return { sukupuoli: m ? 'M' : 'N', syy: 'ok', M: m, N: n };
  }
  var API = { tmSukupuoliMN: tmSukupuoliMN, tmSukupuoliTuloksista: tmSukupuoliTuloksista };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.TM_SUKUPUOLI = API;
})(typeof window !== 'undefined' ? window : this);
