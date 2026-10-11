/* ════════════════════════════════════════════════════════════════════════
   tm_aamutreeni.js — K35-6d (aamutreenit) · Aamutreeni = harjoitus-tyypin ESIASETUS, ei uutta tyyppiä: kuorma, jaksokooste ja läsnäolo toimivat ilman erikoistapauksia (Tero 11.10.).
   PURE; Master vain kytkee. Dokumentti: tyyppi 'harjoitus' + alalaji 'aamutreeni' + kohde { tyyppi:'pelaajat' } + pelaajat_id (poimitut, ≥ 1) — joukkuetta ei aseteta, joten tapahtuma ei laske koko joukkueelle
   (Täytä viikko, joukkueen harjoitusmäärät ja tmSeuraavaTapahtuma({joukkue}) ohittavat sen), mutta poimittu pelaaja ja huoltaja näkevät sen (TM_KALENTERI_PELAAJALLE.tmKuuluuPelaajalle: pelaajat_id) ja läsnäolon roster = poimitut.
   · ESIASETUS: { alkaa:'07:00', paattyy:'08:30', alalaji:'aamutreeni', nimi:'Aamutreeni', toisto:'viikoittain' } (aika muokattavissa)
   · tmAamuHTML({ t, pvm }) → viikonpäivävalinta (ma–su; oletus = valitun päivän viikonpäivä) · tmAamuLue(root) → [viikonpäivät 1–7] · tmAamuNayta(on, wrap)
   · tmAamuAlut(pvm, paivat) → [ISO] — jokaiselle valitulle viikonpäivälle ensimmäinen päivä ≥ pvm (jokaisesta oma viikoittainen sarja)
   · tmAamuValidoi({ pelaajat_id, paivat }) → { ok } | { ok:false, syy:'pelaajat'|'paivat' }
   · tmAamuKenelle() → { sallitut:['pelaajat'], tapa:'pelaajat' } (joukkue-valinta piilotetaan)
   · tmAamuOsa(nimi) → { tyyppi:'harjoitus', alalaji:'aamutreeni', nimi }
   Dual-export: module.exports || window.TM_AAMUTREENI.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var ALALAJI = 'aamutreeni', ESIASETUS = { alkaa: '07:00', paattyy: '08:30', alalaji: ALALAJI, nimi: 'Aamutreeni', toisto: 'viikoittain' }, PAIVAT = ['Ma', 'Ti', 'Ke', 'To', 'Pe', 'La', 'Su'];
  function _esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function _utc(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '')); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], 12) : null; }
  function _vk(iso) { var u = _utc(iso); return u == null ? null : ((new Date(u).getUTCDay() + 6) % 7) + 1; }   // 1 = ma … 7 = su
  function _lisaa(iso, vrk) { var d = new Date(_utc(iso) + vrk * 86400000), z = function (n) { return (n < 10 ? '0' : '') + n; }; return d.getUTCFullYear() + '-' + z(d.getUTCMonth() + 1) + '-' + z(d.getUTCDate()); }
  function tmAamuHTML(o) {
    o = o || {}; var t = typeof o.t === 'function' ? o.t : function (x) { return x; }, oletus = _vk(o.pvm), lab = 'font-size:11px;font-weight:500;text-transform:uppercase;letter-spacing:.06em;color:var(--ink3);display:block;margin-bottom:6px';
    return '<div data-aamu-wrap><label style="' + lab + '">' + _esc(t('Viikonpäivät')) + '</label><div style="display:flex;flex-wrap:wrap;gap:10px">'
      + PAIVAT.map(function (p, i) { return '<label style="display:inline-flex;align-items:center;gap:5px;font-size:13px;color:var(--ink)"><input type="checkbox" data-aamu-pv="' + (i + 1) + '"' + (i + 1 === oletus ? ' checked' : '') + '>' + _esc(t(p)) + '</label>'; }).join('') + '</div></div>';
  }
  function tmAamuLue(root) { var r = [], l = root && root.querySelectorAll ? root.querySelectorAll('[data-aamu-pv]') : []; for (var i = 0; i < l.length; i++) if (l[i].checked) r.push(+l[i].getAttribute('data-aamu-pv')); return r; }
  function tmAamuAlut(pvm, paivat) {
    if (_utc(pvm) == null) return []; var v = _vk(pvm), seen = {}, out = [];
    (Array.isArray(paivat) ? paivat : []).forEach(function (p) { p = +p; if (!(p >= 1 && p <= 7) || seen[p]) return; seen[p] = 1; out.push(_lisaa(pvm, ((p - v) + 7) % 7)); });
    return out.sort();
  }
  function tmAamuValidoi(v) { v = v || {}; if (!Array.isArray(v.pelaajat_id) || !v.pelaajat_id.length) return { ok: false, syy: 'pelaajat' }; if (!Array.isArray(v.paivat) || !v.paivat.length) return { ok: false, syy: 'paivat' }; return { ok: true }; }
  function tmAamuKenelle() { return { sallitut: ['pelaajat'], tapa: 'pelaajat' }; }
  function tmAamuOsa(nimi) { return { tyyppi: 'harjoitus', alalaji: ALALAJI, nimi: nimi || ESIASETUS.nimi }; }
  var API = { ALALAJI: ALALAJI, ESIASETUS: ESIASETUS, tmAamuHTML: tmAamuHTML, tmAamuLue: tmAamuLue, tmAamuAlut: tmAamuAlut, tmAamuValidoi: tmAamuValidoi, tmAamuKenelle: tmAamuKenelle, tmAamuOsa: tmAamuOsa };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else if (root) root.TM_AAMUTREENI = API;
})(typeof window !== 'undefined' ? window : null);
