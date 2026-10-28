/* ════════════════════════════════════════════════════════════════════════
   tm_idp_pelaaja_dok.js — Vaihe 1 · PR 1f-1: pelaajan IDP-dokumentti `idp_pelaaja/{vuosi}` (§7.22) + sitoumuksen kaksoiskirjoitus.
   Ongelma (inventaario, löydös 7): `idp_kausi/{vuosi}.tavoitteet[]` on pelaajan luettavissa ja sisältää A-sisältöä (perustelu.teksti, kypsyysvaroitus, ankkuri_7030, mittari, lahto, tavoitearvo, arviot[].arvo).
   Ratkaisu: pelaajalle oma dokumentti `seurat/{sid}/pelaajat/{pid}/idp_pelaaja/{vuosi}` = { tavoitteet: [puhdistettu tavoite], pelaaja_sitoumus, paivitetty }. Henkilökunta kirjoittaa kumpaankin samassa batchissa (dual-write); raaka pysyy idp_kausi:ssa.
   Puhdistettu tavoite: { status, fokus:{nimi}, kuvaus, pelaajan_tavoite, perustelu:{pelilause}, mitattava, arviot:[{ win, pelaajan_note }] } — ei lukuja. `win` ja `mitattava` lasketaan TÄSSÄ samalla säännöllä kuin tmPelaajaKaari
   (lib/tm_idp_pelaaja.js), joten §7.22-näkymä on identtinen raa'alla ja puhdistetulla tavoitteella (testi).
   LIPPU `LIPPU.kirjoitus` (oletus PÄÄLLÄ lipun käännön PR:stä alkaen; peruutus = false + ?v ylös) ohjaa kirjoituksen JA dual-readin (lukija: tmIdpPelaajaValitse). Lippu pois (peruutus) → kirjoitus täsmälleen kuten ennen. Kirjoittajat kytketään 1f-2:ssa (henkilökunta), 1f-3:ssa (pelaaja).
   · tmIdpTavoiteJaa(t)                     → puhdistettu tavoite | null (hylatty/vaihdettu → null)
   · tmIdpPelaajaTavoitteet(arr)            → puhdistettu taulukko (järjestys säilyy)
   · tmIdpPelaajaOsa(arr, deps)             → { tavoitteet, paivitetty } | null (lippu pois)
   · tmIdpPelaajaLisaa(kohde, db, sid, pid, vuosi, arr, deps) → true/false: lisää idp_pelaaja-kirjoituksen batchiin/transaktioon (mergeFields → pelaaja_sitoumus säilyy)
   · tmIdpPelaajaVarapolulla(deps, fn)      → fn(mukaan); permission-denied (Rules v3.71 ei käytössä) → uusi yritys ilman idp_pelaaja:a + console.warn
   · tmIdpSitoumusKirjoita(db, sid, pid, vuosi, sit, deps) → sitoumus idp_kausi:hin (kuten ennen) + idp_pelaaja:an (lippu päällä, yksi batch; permission-denied → vain idp_kausi)
   · tmIdpPelaajaValitse(pelaajaData, kausiData, deps) → dual-read: lippu päällä idp_pelaaja voittaa, muuten (tai puuttuessa) idp_kausi
   · tmIdpPelaajaLueSitoumus(db, sid, pid, vuosi, kausiData, deps) → Promise<sitoumus|null>: henkilökunnan lukija (lippu pois = ei lisäkyselyä; virhe → idp_kausi)
   Dual-export: module.exports || window.TM_IDP_PELAAJA_DOK.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var LIPPU = { kirjoitus: true };
  var KOKOELMA = 'idp_pelaaja', KAUSI = 'idp_kausi';
  function _olio(x) { return !!x && typeof x === 'object' && !Array.isArray(x); }
  function _paalla(deps) { if (deps && deps.idpPelaajaKirjoitus !== undefined && deps.idpPelaajaKirjoitus !== null) return !!deps.idpPelaajaKirjoitus; return !!LIPPU.kirjoitus; }
  function _txt(x) { return typeof x === 'string' ? x : ''; }

  /* Sama sääntö kuin tmPelaajaKaari: mitattava = yksikkö ei 'taso'/'vapaa'; win = mitattavalle abs-parannus > 0, muuten pelaajan oma fiilis (≥3 tai ei annettu). */
  function _absParannus(t, arvo) {
    var mit = (t && t.mittari) || {}, la = t && t.lahto ? t.lahto.arvo : null;
    if (arvo == null || la == null) return null;
    return (mit.suunta === 'pienempi') ? (la - arvo) : (arvo - la);
  }
  function tmIdpTavoiteJaa(t) {
    if (!_olio(t) || !_olio(t.fokus)) return null;
    var status = t.status || 'aktiivinen';
    if (status === 'hylatty' || status === 'vaihdettu') return null;
    var yks = (t.mittari && t.mittari.yksikko) || '', mitattava = (yks !== 'taso' && yks !== 'vapaa');
    var ulos = {
      status: status, fokus: { nimi: _txt(t.fokus.nimi) }, kuvaus: _txt(t.kuvaus), pelaajan_tavoite: _txt(t.pelaajan_tavoite),
      perustelu: { pelilause: _olio(t.perustelu) ? _txt(t.perustelu.pelilause) : '' }, mitattava: mitattava, arviot: []
    };
    (Array.isArray(t.arviot) ? t.arviot : []).forEach(function (a) {
      a = a || {};
      var abs = mitattava ? _absParannus(t, a.arvo) : null;
      var win = mitattava ? (abs != null && abs > 0) : (a.pelaajan_arvio == null || a.pelaajan_arvio >= 3);
      ulos.arviot.push({ win: win, pelaajan_note: _txt(a.pelaajan_note) });
    });
    return ulos;
  }
  function tmIdpPelaajaTavoitteet(arr) {
    var ulos = []; (Array.isArray(arr) ? arr : []).forEach(function (t) { var j = tmIdpTavoiteJaa(t); if (j) ulos.push(j); }); return ulos;
  }
  function tmIdpPelaajaOsa(arr, deps) {
    deps = deps || {}; if (!_paalla(deps) || !Array.isArray(arr)) return null;
    return { tavoitteet: tmIdpPelaajaTavoitteet(arr), paivitetty: deps.nytISO || new Date().toISOString() };
  }
  function _pelRef(db, sid, pid) { return db.collection('seurat').doc(sid).collection('pelaajat').doc(pid); }
  function tmIdpPelaajaLisaa(kohde, db, sid, pid, vuosi, arr, deps) {
    var o = tmIdpPelaajaOsa(arr, deps); if (!o || !vuosi) return false;
    kohde.set(_pelRef(db, sid, pid).collection(KOKOELMA).doc(String(vuosi)), o, { mergeFields: ['tavoitteet', 'paivitetty'] }); return true;
  }
  function tmIdpPelaajaVarapolulla(deps, fn) {
    var mukaan = _paalla(deps || {});
    return Promise.resolve().then(function () { return fn(mukaan); }).catch(function (e) {
      if (mukaan && e && e.code === 'permission-denied' && !(deps && deps.varapolku === false)) { console.warn('[tm_idp_pelaaja_dok] idp_pelaaja ei kirjoitettavissa (Rules v3.71 ei vielä käytössä?) — tallennettu vain idp_kausi:hin:', e.message); return fn(false); }
      throw e;
    });
  }
  /* sit = pelaaja_sitoumus-olio (nested merge kuten ennen: set({pelaaja_sitoumus}, {merge:true})). deps.kausiLisa = lisäkentät vain idp_kausi:hin (esim. paivitetty VP:n vahvistuksessa).
     Lippu pois → täsmälleen vanha yksittäinen idp_kausi-set. Päällä → YKSI batch; permission-denied → vain idp_kausi (vanha polku) + varoitus. */
  function tmIdpSitoumusKirjoita(db, sid, pid, vuosi, sit, deps) {
    deps = deps || {}; var p = _pelRef(db, sid, pid), kausiData = Object.assign({ pelaaja_sitoumus: sit }, _olio(deps.kausiLisa) ? deps.kausiLisa : {});
    function vanha() { return p.collection(KAUSI).doc(String(vuosi)).set(kausiData, { merge: true }); }
    if (!_paalla(deps)) return vanha();
    function kaksi() {
      var b = db.batch(); b.set(p.collection(KAUSI).doc(String(vuosi)), kausiData, { merge: true });
      b.set(p.collection(KOKOELMA).doc(String(vuosi)), { pelaaja_sitoumus: sit, paivitetty: deps.nytISO || new Date().toISOString() }, { merge: true }); return b.commit();
    }
    return kaksi().catch(function (e) {
      if (e && e.code === 'permission-denied' && deps.varapolku !== false) { console.warn('[tm_idp_pelaaja_dok] idp_pelaaja ei kirjoitettavissa (Rules v3.71 ei vielä käytössä?) — sitoumus vain idp_kausi:hin:', e.message); return vanha(); }
      throw e;
    });
  }
  /* DUAL-READ. pelaajaData = idp_pelaaja/{vuosi}.data() | null, kausiData = idp_kausi/{vuosi}.data() | null. → { tavoitteet, pelaaja_sitoumus, lahde:'pelaaja'|'kausi'|null }.
     Lippu päällä ja idp_pelaaja olemassa → sen tavoitteet (puhdistettu). Muuten idp_kausi sellaisenaan (kuten ennen); sitoumus samalla säännöllä, kumpikin puuttuessa varalle toiselta. */
  function tmIdpPelaajaValitse(pelaajaData, kausiData, deps) {
    var pd = _olio(pelaajaData) ? pelaajaData : null, kd = _olio(kausiData) ? kausiData : null;
    if (_paalla(deps || {}) && pd) {
      return { tavoitteet: Array.isArray(pd.tavoitteet) ? pd.tavoitteet : (kd && Array.isArray(kd.tavoitteet) ? kd.tavoitteet : null), pelaaja_sitoumus: pd.pelaaja_sitoumus || (kd && kd.pelaaja_sitoumus) || null, lahde: 'pelaaja' };
    }
    if (kd) return { tavoitteet: Array.isArray(kd.tavoitteet) ? kd.tavoitteet : null, pelaaja_sitoumus: kd.pelaaja_sitoumus || null, lahde: 'kausi' };
    return { tavoitteet: null, pelaaja_sitoumus: null, lahde: null };
  }

  /* Henkilökunnan sitoumuslukija: palauttaa pelaaja_sitoumus-olion. Lippu pois → idp_kausi:n arvo sellaisenaan (ei lisäkyselyä). Päällä → luetaan idp_pelaaja/{vuosi} ja valitaan tmIdpPelaajaValitse:lla (idp_pelaaja voittaa);
     lukuvirhe (Rules v3.71 puuttuu / verkko) ei kaada: palataan idp_kausi:n arvoon. kausiData = jo luettu idp_kausi/{vuosi}.data() | null. → Promise<sitoumus | null> */
  function tmIdpPelaajaLueSitoumus(db, sid, pid, vuosi, kausiData, deps) {
    var kd = _olio(kausiData) ? kausiData : null, vanha = (kd && kd.pelaaja_sitoumus) || null;
    if (!_paalla(deps || {}) || !db || !vuosi) return Promise.resolve(vanha);
    return Promise.resolve().then(function () { return _pelRef(db, sid, pid).collection(KOKOELMA).doc(String(vuosi)).get(); }).then(function (s) {
      return tmIdpPelaajaValitse(s && s.exists ? s.data() : null, kd, deps).pelaaja_sitoumus || null;
    }, function (e) { console.warn('[tm_idp_pelaaja_dok] idp_pelaaja-luku epäonnistui — käytetään idp_kausi:a:', e && (e.code || e.message)); return vanha; });
  }

  var API = { LIPPU: LIPPU, tmIdpPelaajaLueSitoumus: tmIdpPelaajaLueSitoumus, KOKOELMA: KOKOELMA, tmIdpPelaajaPaalla: _paalla, tmIdpTavoiteJaa: tmIdpTavoiteJaa, tmIdpPelaajaTavoitteet: tmIdpPelaajaTavoitteet, tmIdpPelaajaOsa: tmIdpPelaajaOsa,
    tmIdpPelaajaLisaa: tmIdpPelaajaLisaa, tmIdpPelaajaVarapolulla: tmIdpPelaajaVarapolulla, tmIdpSitoumusKirjoita: tmIdpSitoumusKirjoita, tmIdpPelaajaValitse: tmIdpPelaajaValitse };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.TM_IDP_PELAAJA_DOK = API;
})(typeof window !== 'undefined' ? window : this);
