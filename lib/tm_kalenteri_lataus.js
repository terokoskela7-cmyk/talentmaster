/* ════════════════════════════════════════════════════════════════════════
   tm_kalenteri_lataus.js — K35-10 · Masterin kalenterin RAJATTU lataus (ei koko seuran koko historiaa). PURE, dual-export (Node + selain).
   · tmLatausIkkuna({ nyt, valittuViikko?, ladattu? }) → { alku, loppu } (ms, Helsingin kalenteripäivän alku/loppu UTC-ms:nä): oletus −8 vk … +26 vk nykyhetkestä; valittuViikko ('YYYY-MM-DD', mikä tahansa viikon päivä)
     ikkunan ulkopuolella → ikkuna laajenee kattamaan viikon (−1…+2 vk marginaalilla). Palauttaa aina yhtenäisen välin (ladattu ∪ tarve).
   · tmLatausPuuttuva(ladattu, tarve) → [{ alku, loppu }] — VAIN puuttuva(t) väli(t) (0–2 kpl); ei mitään kun tarve on jo ladatun sisällä.
   · tmYhdistaTapahtumat(vanhat, uudet) → dedup id:llä (uudet voittavat; järjestys: alkaa-ajan mukaan).
   · tmLatausSuodata(tapahtumat) → ilman poistettuja (poistettu === true) — suodatus MUISTISSA (kysely alkaa-välillä, ei poistettu-yhdistelmäindeksiä).
   · MONIPÄIVÄISET: seuran_tauko / joukkueen_vapaa / erikoisohjelma voivat alkaa ennen ikkunaa ja jatkua sen sisään → 2. kysely `koko_paiva == true AND paattyy >= alku` (firestore.indexes.json: koko_paiva + paattyy).
     tmLataaIkkuna(db, sid, valit, TS) → Promise<[tapahtuma-dokit]> tekee molemmat kyselyt (1. alkaa ∈ väli, 2. pitkät) ja yhdistää; TS = { fromMillis } (Firestore Timestamp).
   Sarjan muokkaus ("tämä ja tulevat", toistuvuus_sarja_id) pysyy omana kyselynään — ei rajaudu ikkunaan.
   Dual-export: module.exports || window.TM_KALENTERI_LATAUS.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var DAY = 86400000, VK = 7 * DAY, OLETUS_TAAKSE = 8, OLETUS_ETEEN = 26;
  function _u(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '')); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], 12) : null; }
  function _paiva(ms) { try { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Helsinki', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms)); } catch (e) { return new Date(ms + 3 * 3600000).toISOString().slice(0, 10); } }
  function _ma(ms) { var u = _u(_paiva(ms)), wd = (new Date(u).getUTCDay() + 6) % 7; return u - wd * DAY; }   // viikon maanantai (UTC-keskipäivä)
  function _alkuMs(u) { return u - 12 * 3600000 - 3 * 3600000; }   // karkea Helsingin vuorokauden alku (EET/EEST-marginaali kattaa ±1 h; ikkuna on joka tapauksessa viikkorajattu)
  function tmLatausIkkuna(a) {
    a = a || {}; var nyt = a.nyt != null ? a.nyt : Date.now(), ma = _ma(nyt), alkuU = ma - OLETUS_TAAKSE * VK, loppuU = ma + (OLETUS_ETEEN + 1) * VK;
    if (a.valittuViikko) { var v = _u(a.valittuViikko); if (v != null) { var vma = _ma(v); alkuU = Math.min(alkuU, vma - VK); loppuU = Math.max(loppuU, vma + 3 * VK); } }
    var alku = _alkuMs(alkuU), loppu = _alkuMs(loppuU);
    if (a.ladattu) { alku = Math.min(alku, a.ladattu.alku); loppu = Math.max(loppu, a.ladattu.loppu); }
    return { alku: alku, loppu: loppu };
  }
  function tmLatausPuuttuva(ladattu, tarve) {
    if (!tarve) return []; if (!ladattu) return [{ alku: tarve.alku, loppu: tarve.loppu }]; var out = [];
    if (tarve.alku < ladattu.alku) out.push({ alku: tarve.alku, loppu: Math.min(tarve.loppu, ladattu.alku - 1) });
    if (tarve.loppu > ladattu.loppu) out.push({ alku: Math.max(tarve.alku, ladattu.loppu + 1), loppu: tarve.loppu });
    return out;
  }
  function _ms(x) { if (x == null) return 0; if (typeof x === 'number') return x; if (x.toMillis) return x.toMillis(); if (x.toDate) return x.toDate().getTime(); if (x._alkaaMs != null) return x._alkaaMs; return Date.parse(x) || 0; }
  function tmYhdistaTapahtumat(vanhat, uudet) {
    var m = {}, jarj = []; (vanhat || []).concat(uudet || []).forEach(function (t) { if (!t || t.id == null) return; if (!(t.id in m)) jarj.push(t.id); m[t.id] = t; });
    return jarj.map(function (id) { return m[id]; }).sort(function (a, b) { return _ms(a.alkaa && a.alkaa.toDate ? a.alkaa : a._alkaaMs != null ? a._alkaaMs : a.alkaa) - _ms(b.alkaa && b.alkaa.toDate ? b.alkaa : b._alkaaMs != null ? b._alkaaMs : b.alkaa); });
  }
  function tmLatausSuodata(t) { return (t || []).filter(function (x) { return x && x.poistettu !== true; }); }
  function tmLataaIkkuna(db, sid, valit, TS) {
    var kal = db.collection('seurat').doc(sid).collection('kalenteri'), haut = [];
    (valit || []).forEach(function (v) {
      haut.push(kal.where('alkaa', '>=', TS.fromMillis(v.alku)).where('alkaa', '<=', TS.fromMillis(v.loppu)).get());
      haut.push(kal.where('koko_paiva', '==', true).where('paattyy', '>=', TS.fromMillis(v.alku)).get().then(null, function (e) { try { console.warn('[kalenteri pitkät]', e && e.message); } catch (x) { /* */ } return { docs: [] }; }));   // monipäiväiset (tauko/vapaa/erikoisohjelma) joiden alku on ikkunan edellä
    });
    return Promise.all(haut).then(function (r) { var m = {}, a = []; r.forEach(function (s) { (s.docs || []).forEach(function (d) { if (!m[d.id]) { m[d.id] = 1; a.push(d); } }); }); return a; });
  }
  var API = { tmLatausIkkuna: tmLatausIkkuna, tmLatausPuuttuva: tmLatausPuuttuva, tmYhdistaTapahtumat: tmYhdistaTapahtumat, tmLatausSuodata: tmLatausSuodata, tmLataaIkkuna: tmLataaIkkuna, OLETUS_TAAKSE: OLETUS_TAAKSE, OLETUS_ETEEN: OLETUS_ETEEN };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else if (root) root.TM_KALENTERI_LATAUS = API;
})(typeof window !== 'undefined' ? window : null);
