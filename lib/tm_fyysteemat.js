/* ════════════════════════════════════════════════════════════════════════
   tm_fyysteemat.js — Vaihe 7: fyysinen teemaluettelo + D1-fokuslähde + evidenssi.
   Geneerinen V6-jaksosyklimoottori (tm_jaksokooste.js) saa toisen ilmentymän
   domeeni:'fyysinen'. Tämä lib on VAIN fyysinen FOKUSLÄHDE + VAIKUTUKSEN EVIDENSSI
   (delta §29 + PHV-portti §28) — sulku/historia/kaari toimivat jo domeeniagnostisesti.
   PURE (EI Firestore/DOM). Sisältö = katalogi + viittaukset olemassa oleviin lähteisiin
   (§9.2, EI kopioitua harjoitesisältöä). Dual-export: module.exports || window.TM_FYYSTEEMAT_LIB.
   §28 · §29 · §26 · §34.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  // Fyysinen teemaluettelo (spec §1). Evidenssi: hh-testit (H-H-taso) tai FLEI (fy_liikehallinta).
  var TM_FYYSTEEMAT = [
    { avain: 'fy_nopeus', nimi: 'Nopeus', ikoni: '🏃', testit: ['lin5m', 'lin10m', 'lin30m'] },
    { avain: 'fy_rajahtavyys', nimi: 'Räjähtävyys', ikoni: '⚡', testit: ['cmj', 'sj'] },
    { avain: 'fy_kestavyys', nimi: 'Kestävyys', ikoni: '🫁', testit: ['mas'] },
    { avain: 'fy_ketteryys', nimi: 'Ketteryys & suunnanmuutos', ikoni: '🔄', testit: ['kasirata', 'sm_juoksu'] },
    { avain: 'fy_liikehallinta', nimi: 'Liikehallinta (kehon valmius)', ikoni: '🧘', testit: [], flei: true }   // evidenssi = FLEI (Teron päätös 2026-07-09)
  ];
  // D2-testit (pujottelu/syöttö ym.) EIVÄT mäppäydy fyysiseen teemaan — kenttä erottaa (§9.1/§9.5).
  var D2_TESTIT = { pujottelu: 1, syotto: 1, kuljetus_laukaus: 1, ponnauttelu: 1, pituuspotku: 1, sm_pallo: 1 };
  var FLEI_KLINIKKA = 40;   // §14 klinikkalähete-kynnys
  // D1-osaindeksi (laskeD1Osaindeksit, tm_eerikkila_normit) → fyysinen teema. Lähde SSOT (§9.1/§9.5).
  var OSAINDEKSI_TEEMA = { kiihdytys: 'fy_nopeus', maksinopeus: 'fy_nopeus', voima: 'fy_rajahtavyys', aerobinen: 'fy_kestavyys', ketteryys: 'fy_ketteryys', suunnanmuutos: 'fy_ketteryys' };
  var OSAINDEKSI_NIMI = { kiihdytys: 'kiihdytys', maksinopeus: 'maksiminopeus', voima: 'voima', aerobinen: 'kestävyys', ketteryys: 'ketteryys', suunnanmuutos: 'suunnanmuutos' };

  function tmFyysTeema(avain) { for (var i = 0; i < TM_FYYSTEEMAT.length; i++) if (TM_FYYSTEEMAT[i].avain === avain) return TM_FYYSTEEMAT[i]; return null; }
  function _teemaTestista(testi) { for (var i = 0; i < TM_FYYSTEEMAT.length; i++) if (TM_FYYSTEEMAT[i].testit.indexOf(testi) >= 0) return TM_FYYSTEEMAT[i]; return null; }
  function _pvmTuore(pvm, alkoi) { if (!pvm) return false; if (!alkoi) return true; return String(pvm).slice(0, 10) >= String(alkoi).slice(0, 10); }
  // FLEI-pikakenttä on JOKO numero (legacy, §26 Topias) TAI objekti {pct,...} (HPP intake) — normalisoi pct:ksi.
  function _fleiPct(f) { return (typeof f === 'number') ? f : (f && typeof f.pct === 'number') ? f.pct : null; }

  // tmFyysHeikoinTesti(osatasot) → heikoin fy_*-relevantti D1-testi (pienin taso) | null.
  // osatasot = { <testi>: taso1–5 } (test-id-pohjainen; vaihtoehto osaindeksi-polulle). D2 ei mukana.
  function tmFyysHeikoinTesti(osatasot) {
    if (!osatasot || typeof osatasot !== 'object') return null;
    var kaikki = {};
    TM_FYYSTEEMAT.forEach(function (t) { t.testit.forEach(function (x) { kaikki[x] = 1; }); });
    var paras = null, pt = Infinity;
    Object.keys(osatasot).forEach(function (testi) {
      if (!kaikki[testi] || D2_TESTIT[testi]) return;
      var v = osatasot[testi];
      if (typeof v !== 'number') return;
      if (v < pt) { pt = v; paras = testi; }
    });
    return paras;
  }
  // tmFyysHeikoinOsaindeksi(osaindeksit) → { osaindeksi, teema, nimi, taso } | null.
  // osaindeksit = laskeD1Osaindeksit-tulos { kiihdytys, maksinopeus, voima, ketteryys, suunnanmuutos, aerobinen } (taso1–5|null).
  function tmFyysHeikoinOsaindeksi(osaindeksit) {
    if (!osaindeksit || typeof osaindeksit !== 'object') return null;
    var heikoin = null, ht = Infinity;
    Object.keys(OSAINDEKSI_TEEMA).forEach(function (oi) {
      var v = osaindeksit[oi];
      if (typeof v !== 'number') return;
      if (v < ht) { ht = v; heikoin = oi; }
    });
    if (!heikoin) return null;
    return { osaindeksi: heikoin, teema: OSAINDEKSI_TEEMA[heikoin], nimi: OSAINDEKSI_NIMI[heikoin] || heikoin, taso: ht };
  }

  // tmFyysEhdota(p, ctx) → {avain, nimi, peruste, prioriteetti?, testi?, taso?} | null. Heikoimman D1:n mäppäys (spec §1):
  //   1) FLEI-pct < 40 → fy_liikehallinta (klinikkajatkumo §14, prioriteetti)
  //   2) ctx.osaindeksit (laskeD1Osaindeksit) → heikoin osaindeksi → teema (ensisijainen; hh_kehityskohde EI ole pikakenttä)
  //   3) ctx.heikoinD1Testi / ctx.osatasot (test-id) → teema (vaihtoehto)
  //   4) null → silta ei ehdota ("Ei D1-mittausta")
  function tmFyysEhdota(p, ctx) {
    if (!p) return null;
    ctx = ctx || {};
    var pct = _fleiPct(p.flei_viimeisin);
    if (pct != null && pct < FLEI_KLINIKKA) {
      var fl = tmFyysTeema('fy_liikehallinta');
      return { avain: fl.avain, nimi: fl.nimi, peruste: 'Kehon valmius ' + pct + ' < 40 → klinikkajatkumo (§14)', prioriteetti: true };
    }
    if (ctx.osaindeksit) {
      var oi = tmFyysHeikoinOsaindeksi(ctx.osaindeksit);
      if (oi) { var t2 = tmFyysTeema(oi.teema); return { avain: oi.teema, nimi: t2 ? t2.nimi : oi.teema, peruste: 'Heikoin D1: ' + (t2 ? t2.nimi : oi.teema) + ' (' + oi.nimi + ' taso ' + oi.taso + ')', taso: oi.taso, osaindeksi: oi.osaindeksi }; }
    }
    var testi = p.hh_kehityskohde || ctx.heikoinD1Testi || (ctx.osatasot ? tmFyysHeikoinTesti(ctx.osatasot) : null);
    if (testi && !D2_TESTIT[testi]) {
      var tm = _teemaTestista(testi);
      if (tm) return { avain: tm.avain, nimi: tm.nimi, peruste: 'Heikoin D1: ' + tm.nimi, testi: testi };
    }
    return null;
  }

  // tmFyysDelta(p, alkoi, teemaAvain?) → {lahde:'hh'|'flei', ennen, jalkeen, muutos, pvm_ennen, pvm_jalkeen, testi?, raaka_jalkeen?} | null.
  // §29-vahti: palauttaa arvon VAIN jos tuore mittauspvm (hh_pvm/flei_pvm) >= alkoi. Ei tuoretta → null (subjektiivinen riittää).
  // Taso-delta on ikänormitettu → kasvu huomioitu automaattisesti (§0); pre-PHV "taso ennallaan" = odotettu.
  function tmFyysDelta(p, alkoi, teemaAvain) {
    if (!p) return null;
    var teema = teemaAvain || (p.jaksofokus && p.jaksofokus.konsepti_avain) || null;
    if (teema === 'fy_liikehallinta') {
      var fPvm = p.flei_pvm || (p.flei_viimeisin && p.flei_viimeisin.pvm) || null;
      if (!_pvmTuore(fPvm, alkoi)) return null;
      var nyt = _fleiPct(p.flei_viimeisin);
      var fe = _fleiPct(p.flei_edellinen);
      if (fe == null || nyt == null) return null;   // ei edellistä FLEIta → ei deltaa (subjektiivinen §29)
      return { lahde: 'flei', ennen: fe, jalkeen: nyt, muutos: Math.round((nyt - fe) * 10) / 10, pvm_ennen: p.flei_pvm_edellinen || null, pvm_jalkeen: fPvm };
    }
    // hh-teemat: ikänormitettu taso-delta (hh_taso_edellinen → hh_taso)
    if (!_pvmTuore(p.hh_pvm, alkoi)) return null;
    if (p.hh_taso == null || p.hh_taso_edellinen == null) return null;
    var out = { lahde: 'hh', ennen: p.hh_taso_edellinen, jalkeen: p.hh_taso, muutos: Math.round((p.hh_taso - p.hh_taso_edellinen) * 10) / 10, pvm_ennen: p.hh_taso_edellinen_pvm || p.hh_pvm_edellinen || null, pvm_jalkeen: p.hh_pvm };
    var t = tmFyysTeema(teema);
    if (t && t.testit.length && p.hh_viimeisin) { var testi = t.testit[t.testit.length - 1]; if (p.hh_viimeisin[testi] != null) { out.testi = testi; out.raaka_jalkeen = p.hh_viimeisin[testi]; } }
    return out;
  }

  // tmFyysPHVPortti(p, onNeutraaliPre?) → {neutraali:bool}. Pre-PHV → §28-neutraali kehys sulussa.
  function tmFyysPHVPortti(p, onNeutraaliPre) {
    if (!p) return { neutraali: false };
    return { neutraali: (p.phv_tila === 'PRE' || p.phv_tila === 'LAH') || (onNeutraaliPre === true) };
  }

  // Ohjelmatemplaatit (§2c/§10.1, näyttöpohjainen §9.2) — oletusannos per tyyppi. Sisältö = VIITE lähteeseen,
  // EI kopioitua harjoitussisältöä (§9/§34). Kevyt polku: yksi klik → ohjelma-slot esitäytyy tällä.
  var TM_OHJELMA_TEMPLAATIT = {
    nopeus_voima: { tyyppi: 'nopeus_voima', nimi: 'Nopeus-voima (plyo-progressio)', kuvaus: '6 vk plyometrinen progressio intensiteettiportailla (Valmistava 60–70 % → Kehittävä 75–85 % → Huipentava 90–100 %).', kesto_vk: 6, lahde: 'everton_loikat' },
    perusvoima: { tyyppi: 'perusvoima', nimi: 'Perusvoima (progressiivinen)', kuvaus: 'Progressiivinen voimaharjoite ketjuittain, Stage 1 → 3 → 5.', kesto_vk: 8, lahde: 'pankki_s_stage' },
    // ⚠ GDPR Art. 9 (§2c): 'kuntoutus' on OK neutraalina harjoitusohjelmana — vamma-/terveysyksityiskohdat
    // EIVÄT kuulu ohjelma.kuvaus-kenttään (harjoitussisältöä, ei diagnooseja); ne → terveys/-alikokoelma.
    kuntoutus: { tyyppi: 'kuntoutus', nimi: 'Kuntoutus (vaiheittainen)', kuvaus: 'Vaiheittainen paluuohjelma akuutti → subakuutti → krooninen + paluukriteerit (RTP). Vain harjoitussisältöä.', kesto_vk: 8, lahde: 'hpp_rehab' },
    nopeus: { tyyppi: 'nopeus', nimi: 'Nopeus', kuvaus: 'Kiihdytys + maksiminopeus.', kesto_vk: 4, lahde: 'testipankki' },
    liikkuvuus: { tyyppi: 'liikkuvuus', nimi: 'Liikkuvuus', kuvaus: 'Liikkuvuusaktivoinnit (SFL/DFL) + thomas/valakyykky-baseline.', kesto_vk: 4, lahde: 'pankki_d' },
    muu: { tyyppi: 'muu', nimi: 'Muu ohjelma', kuvaus: '', kesto_vk: 4, lahde: null }
  };
  function tmOhjelmaTemplaatti(tyyppi) { return TM_OHJELMA_TEMPLAATIT[tyyppi] || null; }

  var API = {
    TM_FYYSTEEMAT: TM_FYYSTEEMAT,
    TM_OHJELMA_TEMPLAATIT: TM_OHJELMA_TEMPLAATIT,
    FLEI_KLINIKKA: FLEI_KLINIKKA,
    tmFyysTeema: tmFyysTeema,
    tmFyysHeikoinTesti: tmFyysHeikoinTesti,
    tmFyysHeikoinOsaindeksi: tmFyysHeikoinOsaindeksi,
    tmFyysEhdota: tmFyysEhdota,
    tmFyysDelta: tmFyysDelta,
    tmFyysPHVPortti: tmFyysPHVPortti,
    tmOhjelmaTemplaatti: tmOhjelmaTemplaatti
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.TM_FYYSTEEMAT_LIB = API;
})(typeof window !== 'undefined' ? window : this);
