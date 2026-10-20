/* ════════════════════════════════════════════════════════════════════════
   tm_kt_sivu.js — Kehitystyöpöytä omana sivuna (kierros B · B7, D106/D246; brief 22): TalentMaster_Kehitystyopoyta.html:n puhdas logiikka. Dual-export: module.exports || window.TM_KT_SIVU.
   Sivu on V-KOTI-kuoressa (kuori: `liput.valmentaja_v2`, ennallaan) mutta avautuu OMALLA lipulla `seurat/{sid}.liput.kehitystyopoyta_v2` (ei valmentaja_v2:lla: V-KOTI on jo käytössä, työpöytä kesken); Master ja VP linkittävät sinne osoitteella #pelaaja/{pid}/tanaan. Kuoret pienenevät: sivun oma lataus-/reititysglue on tässä, ei Masterissa.
   · tmKtSivuLinkki(pid, valilehti)          → 'TalentMaster_Kehitystyopoyta.html#pelaaja/{pid}/{valilehti}' | null (virheellinen pid)
   · tmKtMasterLinkki(ws, toiminto?)         → 'TalentMaster_Master_v16.html?ws=…[&toiminto=…]' — paluu Masterin muihin näkymiin (Koti, Viestit, Kalenteri, Joukkue …)
   · tmKtMasterParametrit(search)            → { ws, toiminto } | null (vain sallitut arvot; Master lukee tämän kutsun jälkeen)
   · tmKtMasterToiminto(t) → Masterin funktion nimi | null · tmKtToimiReitti(avain) → 'sheet'|'valilehti'|'master' (Tänään/Polku-painikkeiden reititys, K1)
   · tmKtSivuLaajuus(rooli)                  → 'seura' | 'joukkue' | null (null = rooli ei kuulu sivulle)
   · tmKtSivuJoukkueAvaimet(lista, docs)     → { idt:[…], nimet:[…] } valmentajan omat joukkueet (id TAI nimi → kanoninen)
   · tmKtSivuLataaPelaajat(d)                → Promise<[pelaaja]> : rooli-rajattu lataus (kaksoiskysely joukkue + joukkueet[]), jäsenyys joukkueet[]:stä, sukunimijärjestys
   · tmKtSivuNaapurit(pelaajat, pid, docs)   → [pid] saman joukkueen pelaajat sukunimijärjestyksessä (‹ › kulkee joukkueen sisällä)
   · tmKtSivuT(t, avain)                     → käännös | FI-oletus (kts_*-avaimet; sv Gemini-erästä)
   · tmKtSivuLippuOn(julkiset, seuraDoc)     → boolean: `kehitystyopoyta_v2` täsmälleen true (EI valmentaja_v2); liput/julkiset voittaa seurat.liput-kentän
   PURE (db injektoidaan). Ei hex-värejä, ei DOMia.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  /* Sivun omat tekstit (FI-oletukset); sv tulee Gemini-erästä (docs/i18n/sv_kaannoserae_43_gemini.json → lib/tm_lib_i18n.js), ei Codelta. Sama malli kuin muissa libeissä: t(avain) → käännös | avain → FI. */
  var FI = {
    kts_kirjaudu: 'Kirjaudu sisään', kts_kirjaudu_ohje: 'Kirjaudu ensin Masterissa; istunto on yhteinen.', kts_avaa_master: 'Avaa Master',
    kts_ei_kaytossa: 'Tämä näkymä ei ole vielä käytössä seurassasi.', kts_ei_kaytossa_ohje: 'Pelaajan työpöytä avautuu toistaiseksi Masterissa.',
    kts_vain_valmentajille: 'Tämä näkymä on valmentajille ja seuran johdolle.', kts_lataus_virhe: 'Pelaajia ei voitu ladata.', kts_yrita_uudelleen: 'Yritä uudelleen hetken päästä.', kts_virhe: 'Latauksessa tapahtui virhe.',
    kts_polku_siirtyy: 'Polku siirtyy tälle sivulle seuraavassa vaiheessa.', kts_naytto_siirtyy: 'Näyttö siirtyy tälle sivulle seuraavassa vaiheessa.', kts_vanhassa: 'Avaa vanhassa näkymässä',
    kts_murupolku: 'Murupolku', kts_vaihda_teema: 'Vaihda teema', kts_pelaajat: 'Pelaajat'
  };
  function tmKtSivuT(t, avain) { var v = typeof t === 'function' ? t(avain) : avain; return (v && v !== avain) ? v : (FI[avain] != null ? FI[avain] : avain); }
  var SIVU = 'TalentMaster_Kehitystyopoyta.html', MASTER = 'TalentMaster_Master_v16.html';
  var PID_RE = /^[A-Za-z0-9_-]{1,128}$/, VALILEHDET = ['tanaan', 'polku', 'naytto'];
  var WS = ['koti', 'inbox', 'cal', 'pulse', 'season', 'dev', 'ryhmat', 'testit', 'kuorma'], TOIMINNOT = ['havainto', 'taktiikka', 'itsearvio', 'kehittyminen', 'asetukset'];   // K1: Työkalut-valikon kohteet avautuvat Masterissa suoraan (ei laskeutumista Kotiin)
  var SEURA = { vp: 1, urheilutoimenjohtaja: 1, seurasihteeri: 1, talenttivalmentaja: 1, super_admin: 1 }, JOUKKUE = { valmentaja: 1 };

  function _req(polku) {   // Node: moduuli; selain: jaetut funktiot ovat window-globaaleja (tm_joukkue.js, tm_phv_tila.js)
    try { if (typeof module !== 'undefined' && module.exports && typeof require === 'function') return require(polku); } catch (e) { /* selain */ }
    return typeof window !== 'undefined' ? window : {};
  }
  function tmKtSivuLinkki(pid, valilehti) {
    if (!PID_RE.test(String(pid == null ? '' : pid))) return null;
    var v = valilehti || 'tanaan'; if (VALILEHDET.indexOf(v) < 0) return null;
    return SIVU + '#pelaaja/' + pid + '/' + v;
  }
  function tmKtMasterLinkki(ws, toiminto) {
    var w = WS.indexOf(ws) >= 0 ? ws : 'koti';
    return MASTER + '?ws=' + w + (TOIMINNOT.indexOf(toiminto) >= 0 ? '&toiminto=' + toiminto : '');
  }
  function tmKtMasterParametrit(search) {
    var m = /[?&]ws=([a-z]+)/.exec(String(search == null ? '' : search)); if (!m || WS.indexOf(m[1]) < 0) return null;
    var t = /[?&]toiminto=([a-z]+)/.exec(String(search)); return { ws: m[1], toiminto: t && TOIMINNOT.indexOf(t[1]) >= 0 ? t[1] : null };
  }
  /* K1: Masterin toiminto-parametri → Masterin globaali funktio (openDrill = + Havainto / Pikakortti). Master kutsuu: f === 'openDrill' ? openDrill('adar') : window[f](). Tuntematon → null. */
  var TOIMINTO_FN = { havainto: 'openDrill', taktiikka: 'avaaKaaviopankki', itsearvio: 'avaaHarjoitusarviointi', kehittyminen: 'avaaValmentajaKehitys', asetukset: 'avaaCoachProfiili' };
  function tmKtMasterToiminto(t) { return Object.prototype.hasOwnProperty.call(TOIMINTO_FN, t) ? TOIMINTO_FN[t] : null; }
  /* K1: Tänään/Polku-painikkeiden (toimiFn(pid, avain)) reititys YHDESSÄ paikassa — sivu käyttää tätä, testi käy läpi kaikki avaimet kaikissa tiloissa.
     'sheet' = avautuu paikallaan sivulla (D100) · 'valilehti' = sivun toinen välilehti · 'master' = hyppy Masteriin (jäljellä: K3b tehty: kausitavoite = sheet · K4 = syvenna · kuorma-lohko myöhemmin; K3a: anna_valita + hylkaa ovat sheet-reittejä). */
  var TOIMI_REITIT = { havainto: 'sheet', aloita: 'sheet', vahvista: 'sheet', muokkaa: 'sheet', sulje: 'sheet', aseta_alue: 'sheet', klippi: 'sheet', vahvista_sitoumus: 'sheet', anna_valita: 'sheet', hylkaa: 'sheet', jatka: 'valilehti', avaa_polku: 'valilehti', kuorma: 'master', kausitavoite: 'sheet', syvenna: 'master' };
  function tmKtToimiReitti(avain) { return Object.prototype.hasOwnProperty.call(TOIMI_REITIT, avain) ? TOIMI_REITIT[avain] : 'master'; }   // tuntematon avain → varmuuden vuoksi vanha näkymä (kuten ennen)
  function tmKtSivuLaajuus(rooli) { return SEURA[rooli] ? 'seura' : (JOUKKUE[rooli] ? 'joukkue' : null); }
  function tmKtSivuLippuOn(julkiset, seuraDoc) {
    if (julkiset && typeof julkiset === 'object' && typeof julkiset.kehitystyopoyta_v2 === 'boolean') return julkiset.kehitystyopoyta_v2;
    return !!(seuraDoc && seuraDoc.liput && seuraDoc.liput.kehitystyopoyta_v2 === true);
  }
  function tmKtSivuJoukkueAvaimet(lista, docs) {
    var J = _req('./tm_joukkue.js') || {}, idt = [], nimet = [], d = Array.isArray(docs) ? docs : [];
    (Array.isArray(lista) ? lista : []).forEach(function (x) {
      if (x == null || x === '') return; x = String(x);
      var k = typeof J.tmKanonisoiJoukkue === 'function' ? J.tmKanonisoiJoukkue(x, d) : null, tarkka = d.filter(function (j) { return j && String(j.id) === x; })[0];
      var id = tarkka ? tarkka.id : (k ? k.id : x.toLowerCase().replace(/\s+/g, '_')), nimi = tarkka ? (tarkka.nimi || x) : (k ? k.nimi : x);
      if (idt.indexOf(id) < 0) idt.push(id); if (nimi && nimet.indexOf(nimi) < 0) nimet.push(nimi);
    });
    return { idt: idt, nimet: nimet };
  }
  function _jasenet(p, docs) { var J = _req('./tm_joukkue.js') || {}; return typeof J.tmPelaajanJoukkueet === 'function' ? J.tmPelaajanJoukkueet(p, docs && docs.length ? docs : null) : (Array.isArray(p.joukkueet) ? p.joukkueet : []); }
  function _sukunimi(a, b) { return String(a.sukunimi || '').localeCompare(String(b.sukunimi || '')) || String(a.etunimi || '').localeCompare(String(b.etunimi || '')); }

  /* d: { db, sid, rooli, joukkueet:[id|nimi] (valmentaja), joukkueDocs:[{id,nimi}] } → Promise<[pelaaja]>. Valmentaja ilman joukkuetta → [] (ei koko seuraa). */
  function tmKtSivuLataaPelaajat(d) {
    d = d || {}; var laajuus = tmKtSivuLaajuus(d.rooli), docs = Array.isArray(d.joukkueDocs) ? d.joukkueDocs : [];
    if (!laajuus || !d.db || !d.sid) return Promise.resolve([]);
    var col = d.db.collection('seurat').doc(d.sid).collection('pelaajat'), P = _req('./tm_phv_tila.js') || {};
    var muoto = function (sn) { return sn.docs.map(function (x) { var o = Object.assign({ id: x.id }, x.data()); if (typeof P.tmPhvIlmoitettuPH === 'function') o.phv_ilmoitettu_ph = P.tmPhvIlmoitettuPH(o); if (typeof P.tmPhvEiMitattu === 'function') o.phv_ei_mitattu = P.tmPhvEiMitattu(o); if (typeof P.tmPhvKoodi === 'function') o.phv_tila = P.tmPhvKoodi(o); return o; }); };   // PHV vain tm_phv_tila:n kautta (kuten Masterin lataus)
    var valmis = function (l) { var m = {}; l.forEach(function (p) { m[p.id] = p; }); return Object.keys(m).map(function (k) { return m[k]; }).sort(_sukunimi); };
    if (laajuus === 'seura') return col.get().then(function (sn) { return valmis(muoto(sn)); });
    var av = tmKtSivuJoukkueAvaimet(d.joukkueet, docs); if (!av.idt.length && !av.nimet.length) return Promise.resolve([]);
    var kyselyt = av.nimet.map(function (n) { return col.where('joukkue', '==', n).get(); }).concat(av.idt.map(function (id) { return col.where('joukkueet', 'array-contains', id).get().catch(function () { return { docs: [] }; }); }));
    return Promise.all(kyselyt).then(function (sn) {
      return valmis(muoto({ docs: sn.reduce(function (a, s) { return a.concat(s.docs); }, []) }).filter(function (p) { var j = _jasenet(p, docs); return av.idt.some(function (id) { return j.indexOf(id) >= 0; }) || (!docs.length && av.nimet.indexOf(p.joukkue) >= 0); }));   // jäsenyys joukkueet[]:stä (§7.18), ei nimestä
    });
  }
  function tmKtSivuNaapurit(pelaajat, pid, docs) {
    var l = Array.isArray(pelaajat) ? pelaajat : [], p = l.filter(function (x) { return x && x.id === pid; })[0]; if (!p) return [];
    var mina = _jasenet(p, docs), ulos = l.filter(function (x) { if (x.id === pid) return true; var j = _jasenet(x, docs); return mina.length ? mina.some(function (id) { return j.indexOf(id) >= 0; }) : (!!p.joukkue && x.joukkue === p.joukkue); });
    return ulos.sort(_sukunimi).map(function (x) { return x.id; });
  }

  var API = { FI: FI, tmKtSivuT: tmKtSivuT, SIVU: SIVU, MASTER: MASTER, tmKtSivuLinkki: tmKtSivuLinkki, tmKtMasterLinkki: tmKtMasterLinkki, tmKtMasterParametrit: tmKtMasterParametrit, tmKtMasterToiminto: tmKtMasterToiminto, tmKtToimiReitti: tmKtToimiReitti, TOIMI_REITIT: TOIMI_REITIT, tmKtSivuLaajuus: tmKtSivuLaajuus, tmKtSivuLippuOn: tmKtSivuLippuOn, tmKtSivuJoukkueAvaimet: tmKtSivuJoukkueAvaimet, tmKtSivuLataaPelaajat: tmKtSivuLataaPelaajat, tmKtSivuNaapurit: tmKtSivuNaapurit };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.TM_KT_SIVU = API;
})(typeof window !== 'undefined' ? window : this);
