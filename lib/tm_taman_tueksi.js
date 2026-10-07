/* ════════════════════════════════════════════════════════════════════════
   tm_taman_tueksi.js — K1 (docs/CODE_BRIEF_K1_TAMAN_TUEKSI.md §2–3; design 12 pelaajan kortti "Tämän tueksi", 13 D24, 14 D32): PELAAJAN Tänään-sivun "Tämän tueksi" -kortti + "Joukkueen jakso" -rivi (PURE; ei Firebasea, ei DOM:ia).
   · tmTukiPerustelu(perustelu)        → pelaajan kielellä oleva perustelu | null. null = jätetään pois (kuvaus näytetään yksin): mittaus-/arvosanamuoto (desimaali, luku+yksikkö, X/Y, X x Y, taso N, pisteet; järjestysnumero taidon nimessä sallittu), KIELLETYT-sana (tm_jakso_malli), lähdeviite (testistä/havainnosta/arviosta…), ketjunimi, tekninen avain.
                                         Generoitu "Tukee ydinvahvuutta (X): …" → "Tukee vahvuuttasi (X): …" (henkilökunta sanoo ydinvahvuus, pelaaja vahvuus); valmentajan oma teksti sellaisenaan jos läpäisee.
   · tmTamanTueksiRivit(jaksofokus)    → [{ kuvaus, perustelu|null, harjoitteet:[kotiharjoiterivi] }] 0–2 kpl. Lähde tmTukitavoitteet(jf) (hoitaa vanhan tukiosa-muodon); EI lue tukiosaa suoraan; EI palauta alue/lahde-kenttiä (§7.22, D24).
   · tmTamanTueksiHTML(rivit, opts)    → kortti (tyhjä lista → '' eli kortti piiloon). opts: { esc, t }. Harjoitteet tmKotiharjoitteetHTML:llä (puolustava suodatus: vain hyväksytty, ei kaytto:'joukkue').
   · tmJoukkueenJaksoRiviHTML(viite, tanaan, opts) → "Joukkueen jakso · {nimi} · Viikko N" + viikon tavoite; ei viitettä/snapshotia/umpeutunut → ''. Laskenta: tm_joukkuejakso.tmJoukkuejaksoViikko (= tmJoukkuejaksoKortti) — ei toista laskentaa.
   Vain tokenit (ei hex-värejä); kaikki arvot escapataan; teksti opts.t:n läpi (avain → fi-oletus tässä). Dual-export: module.exports || window.TM_TAMAN_TUEKSI.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var FI = { k1_taman_tueksi: 'Tämän tueksi', k1_joukkueen_jakso: 'Joukkueen jakso', k1_viikko: 'Viikko' };
  // lähde-/taso-/tekniset sanat joita pelaajalle ei näytetä (§7.22 + D24): lähteen nimeäminen (taivutetut muodot: "testistä", "havainnosta", "arviosta" — EI taidon sanoja kuten "havainnointi", "arvioi"), mittaustulos, ketjunimet, avaimet
  var EI_PELAAJALLE = /\b(testist|testin|testitulo|testeist|havainnost|havainnoist|havainnon|havaintojen|arviost|arvioist|arvion|arvioinnin|mittaukse|mittaustulo|tulokse|vertai|taso)|\btulos\b|\bFLEI\b|\bOVR\b|\b(SBL|SFL|LL|DIAG|DFL)\b|fy_/i;
  function _esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function _txt(o, k) { var v = (o && typeof o.t === 'function') ? o.t(k) : k; return (v && v !== k) ? v : FI[k]; }
  function _req(g, f) { try { return (typeof module !== 'undefined' && module.exports && typeof require === 'function') ? require(f) : (root && root[g]); } catch (e) { return root && root[g]; } }
  function _JM() { return _req('TM_KIELLETYT', './tm_kielletyt.js'); }   // pelaajan app ei lataa tm_jakso_malli.js (henkilökunnan päätösrakenteet) → oma sanavartija
  function _TT() { return _req('TM_TUKITAVOITTEET', './tm_tukitavoitteet.js'); }
  function _KH() { return _req('TM_KOTIHARJOITTEET', './tm_kotiharjoitteet.js'); }
  function _JJ() { return _req('TM_JOUKKUEJAKSO', './tm_joukkuejakso.js'); }

  // MITTAUS-/ARVOSANAMUODOT (pelaajalle ei): desimaaliluku, luku + yksikkö (s, m, cm, mm, km, km/h, %, kpl, min, kg), sarja X x Y, X/Y, "taso N", pisteet.
  // Järjestysnumero/numero taidon nimessä SALLITAan: "1. kosketus", "2. pallo", "1v1", "3 pelaajaa". (Aiempi /\d/ esti kaiken numeron — liian tiukka.)
  var MITTAUS = /\d[.,]\d|\d\s*%|\d\s*(?:km\/h|km|kg|cm|mm|min|sek|kpl|s|m)(?![A-Za-zÅÄÖåäö0-9])|\d\s*[x×]\s*\d|\d\s*\/\s*\d|\btaso\s*\d|\bpiste/i;
  function _puhdasTeksti(s) {
    if (typeof s !== 'string' || !s.trim()) return null;
    if (MITTAUS.test(s)) return null;
    if (EI_PELAAJALLE.test(s)) return null;
    var JM = _JM(); if (JM && JM.tmJaksoTekstiKelpaa && !JM.tmJaksoTekstiKelpaa(s).ok) return null;   // KIELLETYT-vartija (tm_kielletyt = sama lista kuin tm_jakso_malli)
    return s.trim();
  }
  function tmTukiPerustelu(perustelu) {
    var s = _puhdasTeksti(perustelu); if (!s) return null;
    s = s.replace(/^Tukee ydinvahvuutta\b/i, 'Tukee vahvuuttasi').replace(/ydinvahvuu/gi, 'vahvuu');   // henkilökunta: ydinvahvuus · pelaaja: vahvuus
    return s;
  }
  function tmTamanTueksiRivit(jf) {
    var TT = _TT(), KH = _KH(); if (!TT || !jf) return [];
    var lista; try { lista = TT.tmTukitavoitteet(jf); } catch (e) { return []; }
    var ulos = [];
    (Array.isArray(lista) ? lista : []).slice(0, 2).forEach(function (t) {
      var kuvaus = typeof t.kuvaus === 'string' ? t.kuvaus.trim() : '';
      if (!kuvaus || /fy_/i.test(kuvaus) || /\b(SBL|SFL|LL|DIAG|DFL)\b/.test(kuvaus)) return;   // tekninen avain/ketjunimi ei koskaan pelaajalle
      var JM = _JM(); if (JM && JM.tmJaksoTekstiKelpaa && !JM.tmJaksoTekstiKelpaa(kuvaus).ok) return;
      ulos.push({ kuvaus: kuvaus, perustelu: tmTukiPerustelu(t.perustelu), harjoitteet: KH ? KH.tmKotiharjoitteet({ tukiosa: { harjoitteet: t.harjoitteet } }) : [] });
    });
    return ulos;
  }
  function tmTamanTueksiHTML(rivit, opts) {
    if (!rivit || !rivit.length) return '';   // Leikkijä / D18 = 0 / ei tukitavoitteita: kortti piiloon, ei tyhjää laatikkoa
    var esc = (opts && opts.esc) || _esc, KH = _KH();
    return '<div class="tm-taman-tueksi" style="margin:12px 20px;padding:16px;background:var(--card);border:.5px solid var(--border);border-radius:12px">'
      + '<div style="font-family:var(--font-k);font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--teal-d);margin-bottom:10px">' + esc(_txt(opts, 'k1_taman_tueksi')) + '</div>'
      + rivit.map(function (r, i) {
        return '<div class="tm-tt-rivi" style="' + (i ? 'margin-top:14px;padding-top:14px;border-top:.5px solid var(--border)' : '') + '">'
          + '<div style="font-family:var(--font-k);font-size:17px;font-weight:600;color:var(--text);line-height:1.3">' + esc(r.kuvaus) + '</div>'
          + (r.perustelu ? '<div style="font-size:13px;color:var(--ink2);line-height:1.5;margin-top:4px">' + esc(r.perustelu) + '</div>' : '')
          + (KH && r.harjoitteet && r.harjoitteet.length ? '<div style="margin-top:8px">' + KH.tmKotiharjoitteetHTML(r.harjoitteet, { esc: esc, t: opts && opts.t }) + '</div>' : '') + '</div>';
      }).join('') + '</div>';
  }
  function tmJoukkueenJaksoRiviHTML(viite, tanaan, opts) {
    var JJ = _JJ(), v = JJ ? JJ.tmJoukkuejaksoViikko(viite, tanaan) : null; if (!v) return '';
    var esc = (opts && opts.esc) || _esc;
    return '<div class="tm-joukkueen-jakso" style="margin:12px 20px;padding:12px 16px;background:var(--card);border:.5px solid var(--border);border-radius:12px">'
      + '<div style="font-family:var(--font-k);font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--ink3)">' + esc(_txt(opts, 'k1_joukkueen_jakso')) + ' · ' + esc(_txt(opts, 'k1_viikko')) + ' ' + esc(v.viikko.n) + '</div>'
      + '<div style="font-family:var(--font-k);font-size:15px;font-weight:600;color:var(--text);margin-top:4px">' + esc(v.nimi) + '</div>'
      + (v.viikkotavoite ? '<div style="font-size:13px;color:var(--ink2);line-height:1.5;margin-top:3px">' + esc(v.viikkotavoite) + '</div>' : '') + '</div>';
  }

  var API = { FI: FI, tmTukiPerustelu: tmTukiPerustelu, tmTamanTueksiRivit: tmTamanTueksiRivit, tmTamanTueksiHTML: tmTamanTueksiHTML, tmJoukkueenJaksoRiviHTML: tmJoukkueenJaksoRiviHTML };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.TM_TAMAN_TUEKSI = API;
})(typeof window !== 'undefined' ? window : this);
