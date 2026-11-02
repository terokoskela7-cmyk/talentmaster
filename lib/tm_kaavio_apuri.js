/* ════════════════════════════════════════════════════════════════════════
   tm_kaavio_apuri.js — VALMENNUSAPURIN KAAVIO → TAKTIIKKATAULU (K2, 2.11.2026). Dual-export: module.exports || window.TM_KAAVIO_APURI.
   Ei omaa renderöijää, validaattoria eikä editoria: piirto = tm_kaavio_render.js (drawSpec), tarkistus = tm_kaavio_validate.js,
   editori + tallennus = tm_kaavio_ui.js (_kaavioAvaaEditori → _kaavioTallenna create-haara → seurat/{sid}/kaaviot, luonnos).
   Tässä on vain kolme asiaa, joita jaetuissa libeissä ei ollut:
   1) SIIRTO apurisivulta Masteriin: localStorage-avain (ei URL-parametreja: spec voi olla iso). Kertakäyttöinen (luku poistaa)
      ja vanhenee 15 minuutissa, joten vanha spec ei avaudu myöhemmin. localStorage eikä sessionStorage, koska Master
      avataan uuteen välilehteen (sessionStorage ei kulje noopener-välilehteen). Master lukee avaimen vain ?apuriKaavio=1-parametrilla.
   2) UUSI MUOKKAUS: sama muoto kuin taulun "Luo ja muokkaa" (_kaavioLuoJaMuokkaa): luonnos, versio 0, yksityinen,
      näkyvyys joukkue (fail-closed kapein oletus). Kohde valitaan editorissa ennen tallennusta.
   3) RAJAUS pienalueelle (nakyma "alue" + vyohyke): viewBox rajataan alueeseen, jotta 15×15 m peli ei jää postimerkiksi
      täyden kentän keskelle. Vain näyttö; spec ja Masterin editori pysyvät koko kentässä. Muut näkymät ennallaan.
   Ei värejä, ei Firebasea, ei DOMia (paitsi masterAvaa, joka saa kaiken envissä).
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var AVAIN = 'tm_apuri_kaavio', TTL_MS = 15 * 60 * 1000, VERSIO = 1;

  function kirjoita(storage, spec, seuraId, nyt) {
    if (!storage || !spec || typeof spec !== 'object' || !seuraId) return false;
    try { storage.setItem(AVAIN, JSON.stringify({ v: VERSIO, spec: spec, seuraId: String(seuraId), aika: nyt || Date.now() })); return true; } catch (e) { return false; }
  }
  /* Kertaluku: avain poistetaan aina (myös rikkinäinen tai vanhentunut). null = ei mitään avattavaa. */
  function lue(storage, nyt) {
    if (!storage) return null;
    var raaka = null;
    try { raaka = storage.getItem(AVAIN); storage.removeItem(AVAIN); } catch (e) { return null; }
    if (!raaka) return null;
    var p; try { p = JSON.parse(raaka); } catch (e) { return null; }
    if (!p || p.v !== VERSIO || !p.spec || typeof p.spec !== 'object' || typeof p.seuraId !== 'string' || !p.seuraId) return null;
    var ika = (nyt || Date.now()) - Number(p.aika);
    if (!(ika >= 0 && ika <= TTL_MS)) return null;
    return p;
  }
  function muokkaus(spec, seuraId, joukkueId) {
    return { id: null, _uusi: true, seuraId: seuraId, spec: JSON.parse(JSON.stringify(spec)),
      review: { status: 'luonnos', nakyvyys: 'joukkue', yksityinen: true, versio: 0, joukkueId: joukkueId || null, valmentajaId: null, pelaajaIds: [] } };
  }

  /* RAJAUS (viewBox-yksiköt). r = { PX, PY, VW, VH } renderöijästä (TM_KAAVIO_RENDER.kaavioPX …). null = koko kenttä. */
  var MARGINAALI = 14, MIN_SIVU = 150, MERKKI_LEV = 4.6, SELITE_MERKIT = 24, RIVI = 9.5;
  function rajaus(spec, r) {
    if (!spec || spec.nakyma !== 'alue' || !spec.vyohyke || !r || typeof r.PX !== 'function') return null;
    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    function lisaa(x, y) { if (isFinite(x) && isFinite(y)) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } }
    var z = spec.vyohyke;
    lisaa(r.PX(z.x), r.PY(z.y)); lisaa(r.PX(z.x + z.w), r.PY(z.y + z.h));
    (spec.pelaajat || []).forEach(function (p) { var x = r.PX(p.x), y = r.PY(p.y); lisaa(x - 16, y - 16); lisaa(x + 16, y + 16); });
    (spec.liikkeet || []).forEach(function (l) { [l.from, l.to].forEach(function (e) { if (e && !e.ref) lisaa(r.PX(e.x), r.PY(e.y)); }); });
    (spec.selitteet || []).forEach(function (s) {
      var t = (s.t && (s.t.fi || s.t.sv || s.t.en)) || '', x = r.PX(s.x), y = r.PY(s.y);
      var lev = Math.min(t.length, SELITE_MERKIT) * MERKKI_LEV, rivit = Math.min(3, Math.max(1, Math.ceil(t.length / SELITE_MERKIT)));
      if (s.x > 58) lisaa(x - lev - 6, y - 8); else lisaa(x + lev + 6, y - 8);
      lisaa(x, y + 4 + RIVI * (rivit - 1));
    });
    if (!isFinite(x0)) return null;
    var w = Math.max(MIN_SIVU, x1 - x0 + 2 * MARGINAALI), h = Math.max(MIN_SIVU, y1 - y0 + 2 * MARGINAALI);
    w = Math.min(w, r.VW); h = Math.min(h, r.VH);
    var x = Math.min(Math.max(0, (x0 + x1) / 2 - w / 2), r.VW - w), y = Math.min(Math.max(0, (y0 + y1) / 2 - h / 2), r.VH - h);
    var pyor = function (v) { return Math.round(v * 10) / 10; };
    return { x: pyor(x), y: pyor(y), w: pyor(w), h: pyor(h), viewBox: pyor(x) + ' ' + pyor(y) + ' ' + pyor(w) + ' ' + pyor(h) };
  }

  /* MASTER: ?apuriKaavio=1 → lue siirto, tarkista ja avaa SAMA editori uutena luonnoksena. Palauttaa syyn (testit).
     env: { storage, haku (location.search), ctx() → {rooli, seuraId, superAdmin, joukkueet}, voiLuoda(ctx), validoi(spec) → {E},
            avaaPankki() (Promise), avaaEditori(muokkaus), toast(teksti), t(fi) } */
  function masterAvaa(env) {
    env = env || {};
    var haku = String(env.haku || '');
    if (!/[?&]apuriKaavio=1(?:&|$)/.test(haku)) return 'ei-pyyntoa';
    var t = typeof env.t === 'function' ? env.t : function (s) { return s; }, toast = typeof env.toast === 'function' ? env.toast : function () {};
    var p = lue(env.storage);
    if (!p) { toast(t('Kaaviota ei löytynyt. Avaa se uudelleen valmennusapurista.')); return 'ei-siirtoa'; }
    var c = (typeof env.ctx === 'function' ? env.ctx() : env.ctx) || {};
    if (typeof env.voiLuoda !== 'function' || !env.voiLuoda(c)) { toast(t('Ei oikeutta luoda kaaviota')); return 'ei-oikeutta'; }
    if (!c.superAdmin && c.seuraId !== p.seuraId) { toast(t('Kaavio on toisen seuran. Kirjaudu oman seurasi tunnuksella.')); return 'eri-seura'; }
    if (typeof env.validoi === 'function' && env.validoi(p.spec).E.length) { toast(t('Kaavio ei kelpaa')); return 'ei-kelpaa'; }
    var jt = Array.isArray(c.joukkueet) ? c.joukkueet : [];
    var m = muokkaus(p.spec, p.seuraId, jt.length === 1 ? jt[0] : null);
    Promise.resolve(typeof env.avaaPankki === 'function' ? env.avaaPankki() : null).then(function () { env.avaaEditori(m); }, function () { env.avaaEditori(m); });
    return 'avattu';
  }

  var API = { AVAIN: AVAIN, TTL_MS: TTL_MS, kirjoita: kirjoita, lue: lue, muokkaus: muokkaus, rajaus: rajaus, masterAvaa: masterAvaa };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (root) root.TM_KAAVIO_APURI = API;
})(typeof window !== 'undefined' ? window : null);
