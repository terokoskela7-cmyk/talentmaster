/* ════════════════════════════════════════════════════════════════════════
   tm_viikkopohja.js — K35-3 · viikkopohjat ja Täytä viikko -logiikka (docs/CODE_BRIEF_35_KALENTERI.md; docs/KOKONAISKUVA_KAUSI_JAKSO_VIIKKO.md §1–3; D14, D26, D34, D173, D183, D193, D196).
   PURE, ei Firestorea, ei käyttöliittymää; toimii selaimessa JA Nodessa. Riippuvuudet (vain luku): tm_kalenteri_tyypit.js, tm_kalenteri_kyselyt.js (tmOnTauko), tm_kalenteri_malli.js (tmKalNormalisoi).
   Pohjat tulevat parametrina (selaimessa JSONia ei voi requirettaa): tmPalloliitonPohjat(json) ← docs/data/spl_viikkopohjat_2023.json; seuran pohjat samassa skeemassa (lahde:'seura').

   SKEEMA (valmennuslinja/viikkopohjat.pohjat[]):
     { avain, nimi, pelimuoto:'3v3'|'5v5'|'8v8'|'11v11', ikavaihe (Palloliiton vaihe), ika_ohje?:[min,max] (Palloliitto), lahde:'palloliitto'|'seura', lahde_viite?, kohde?:{joukkue}|{ryhma} (D196),
       paivat:[{ md, viikonpaiva_oletus (1=ma…7=su), painotus, kesto_min, alue?, pelimuoto, rpe_min?, rpe_max? }], peli:{ maara, teksti }, omatoiminen?:{ h_vk:[min,max]|null, sisalto:['fysiikka','idp'] } }
     md = harjoituspäivä ottelupäivään nähden (−5 = viisi päivää ennen ottelua; Palloliiton "peli +2" ≡ −5). rpe_* VAIN 11v11 (D26) — arvot null kunnes tavoitekuormat sovitaan (lähteen huomio, s. 65).

   MUUNNOSSÄÄNNÖT Palloliiton muodosta (Tero voi muuttaa; yksi taulukko alla):
     harjoitusmäärä N = pohjan harjoituksia-yläraja (3v3 → 2, 5v5 → 3, 8v8 → 4, 11v11 erikoistuminen → 5) — poikkeus avaimella: spl_11v11_nuoruus → 4 (pohjan nimen mukaan) · kesto_min = harjoitus-tapahtuman kesto-alaraja · päivät MD_JOUKKO[N] (oletusviikko la-ottelulla):
       N=1 → −2 (to) · N=2 → −4, −2 (ti, to) · N=3 → −5, −3, −2 (ma, ke, to) · N=4 → −5, −4, −2, −1 (ma, ti, to, pe) · N=5 → −5…−1 (ma–pe); viikonpaiva_oletus = 6 + md.
     Ottelupäivää ja ottelun jälkeistä päivää (MD+1) ei ole harjoituspäivänä. 11v11: painotus esimerkkiviikosta (peli +2 → −5, +3/−4 → −4, −3, −2, −1); muilla painotus null. Pelimuoto = pohjan (ikä ohjeellinen, D173: valinta pelimuodosta, ei iästä).
     omatoiminen = lähteen omatoiminen_h → { h_vk:[min,max]|null, sisalto:['fysiikka','idp'] } (seura voi muuttaa). EI kalenteritapahtumia; kuormanäkymä (D197) lukee myöhemmin.
     peli.maara = lähteen "ka. X–Y peliä" alaraja X (muuten null); peli.teksti = lähteen pelit-teksti.

   API:
     tmPohjaPalloliitosta(pohjaJson) · tmPalloliitonPohjat(json) → [skeema] · tmViikkopohjaVirhe(pohja) → null | 'pelimuoto_puuttuu'|'paivat_puuttuu'|'md_paallekkain'|'rpe_vain_11v11'|'kesto'|'viikonpaiva'|'omatoiminen' (omatoiminen valinnainen)
     tmKausivaihe(kausisuunnitelma, pvm) → vaihe | null  (kausisuunnitelma = valmennuslinja/kausisuunnitelma_{kausi}: { kausi, tauot, vaiheet:[{avain,nimi,tyyppi,alku,loppu,viikkopohjat:{leikkija,rakentaja,showcase},kuormataso}] }; alku/loppu 'YYYY-MM-DD', molemmat mukana)
     tmPohjaJoukkueelle(pohjat, kausisuunnitelma, joukkue, pvm) → pohja | null  (joukkue = { id, pelimuoto?, ika?|ikaluokka? (luku tai 'U13'), ikavaihe? (vain kausisuunnitelman reittiin) }; kausivaiheen viikkopohjat[ikävaihe] ensin, muuten joukkue.pelimuoto; puuttuu → null = näkymä kysyy kerran)
     tmSaaTayttaaViikon({ uid, rooli, johto, joukkueet:[omat joukkue-id:t] }, kohde, ryhmat) → boolean — VAIN UI-APU: oikeuden ratkaisee Firestore Rules (K35-6), tämä ei suojaa mitään.
     tmMonistaViikko({ tapahtumat, maanantai, joukkue?, kohde?, pelaajat?, kokoonpanot? }) → kuten tmTaytaViikko (edellisen viikon harjoitukset +7 pv) · tmEhdotusDoc(ehdotus, { joukkue, uid, pohjaAvain, pelaajat }) → { pvm, alkaa, paattyy, doc } (K35-6a)
     tmTaytaViikko({ pohja, vaihe, ottelut, tapahtumat, historia, kokoonpanot, maanantai, joukkue?, kohde?, pelaajat?, teema? }) → { ehdotukset, paallekkaisyydet, ohitetut:[{pvm, syy:'tauko'|'ottelu'|'olemassa'|'palautuminen'}], vaihe }
       Valinnaiset: joukkue/kohde (tmOnTauko ja 'olemassa' tarvitsevat kohteen) · pelaajat (kohteen pelaajat-id:t päällekkäisyyslaskentaan) · teema (kopioidaan ehdotuksiin).
       KUTSUJAN (K35-6) VASTUU: anna ottelut vähintään väliltä [maanantai, maanantai+13] — lähin tuleva ottelu ratkaisee päivän md:n (D14); tyhjä/liian kapea lista tulkitaan 'ei ottelua' → viikonpaiva_oletus.
       Päivän md = päivä − lähin tuleva ottelu (≤ 7 pv; muuten viikonpaiva_oletus); MD+1 = 'palautuminen'; ottelupäivä ja kahden ottelun viikolla MD−1 = 'ottelu'.
   Päivät: puhdas ISO-päiväaritmetiikka (UTC-keskipäivä) ja Helsingin kalenteripäivä (Intl) — ei paikallisaikaa, ei toISOString-leikkausta; kesäaika ei siirrä päiviä.
   Dual-export: module.exports || window.TM_VIIKKOPOHJA.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  function _lib(f, g) { try { if (typeof module !== 'undefined' && module.exports && typeof require === 'function') return require(f); } catch (e) { /* selain */ } return (root && root[g]) || {}; }
  function _TY() { return _lib('./tm_kalenteri_tyypit.js', 'TM_KALENTERI_TYYPIT'); }
  function _KY() { return _lib('./tm_kalenteri_kyselyt.js', 'TM_KALENTERI_KYSELYT'); }
  function _MA() { return _lib('./tm_kalenteri_malli.js', 'TM_KALENTERI_MALLI'); }

  var PELIMUODOT = ['3v3', '5v5', '8v8', '11v11'];
  var MD_JOUKKO = { 1: [-2], 2: [-4, -2], 3: [-5, -3, -2], 4: [-5, -4, -2, -1], 5: [-5, -4, -3, -2, -1] };
  var LKM_YLIRIDI = { spl_11v11_nuoruus: 4 };   // pohjan nimen mukaan 4 harjoitusta (lähde 4–5); muut = yläraja
  var OLETUS_ALKAA = '17:30';

  /* ── päivät: ISO-päiväaritmetiikka ilman paikallista aikaa ── */
  function _utc(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '')); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], 12) : null; }
  function _z(n) { return (n < 10 ? '0' : '') + n; }
  function _iso(u) { var d = new Date(u); return d.getUTCFullYear() + '-' + _z(d.getUTCMonth() + 1) + '-' + _z(d.getUTCDate()); }
  function _lisaa(iso, vrk) { var u = _utc(iso); return u == null ? null : _iso(u + vrk * 86400000); }
  function _vkpaiva(iso) { var u = _utc(iso); return u == null ? null : ((new Date(u).getUTCDay() + 6) % 7) + 1; }   // 1 = ma … 7 = su
  function _maanantai(iso) { var v = _vkpaiva(iso); return v == null ? null : _lisaa(iso, 1 - v); }
  var _fmtP = null, _fmtK = null;
  function _helsinkiPaiva(ms) {
    if (ms == null) return null;
    try { _fmtP = _fmtP || new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Helsinki', year: 'numeric', month: '2-digit', day: '2-digit' }); return _fmtP.format(new Date(ms)); } catch (e) { return null; }
  }
  function _helsinkiKello(ms) {   // 'HH:MM' Helsingin ajassa
    if (ms == null) return null;
    try { _fmtK = _fmtK || new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Helsinki', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }); return _fmtK.format(new Date(ms)); } catch (e) { return null; }
  }
  function _min(hhmm) { var m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || '')); return m ? (+m[1]) * 60 + (+m[2]) : null; }
  function _hhmm(min) { min = ((min % 1440) + 1440) % 1440; return _z(Math.floor(min / 60)) + ':' + _z(min % 60); }

  /* ── 1 · Palloliiton pohjat → yhteinen skeema ── */
  function _mdTekstista(t) {   // "peli +2" → −5 · "peli +3 / −4" → −4 · "peli −3" → −3 · "peli" → null (ottelupäivä)
    var s = String(t || '').replace(/−/g, '-'), neg = /-\s*(\d)/.exec(s), pos = /\+\s*(\d)/.exec(s);
    if (neg) return -(+neg[1]); if (pos) return -(7 - (+pos[1])); return null;
  }
  function _peliMaara(txt) { var m = /ka\.\s*(\d+(?:,\d+)?)/.exec(String(txt || '')); return m ? parseFloat(m[1].replace(',', '.')) : null; }
  function tmPohjaPalloliitosta(p) {
    if (!p || typeof p !== 'object') return null;
    var yla = Array.isArray(p.harjoituksia) ? p.harjoituksia[p.harjoituksia.length - 1] : p.harjoituksia, kesto = Array.isArray(p.kesto_min) ? p.kesto_min[0] : p.kesto_min;
    var n = LKM_YLIRIDI[p.avain] || Math.max(1, Math.min(5, Math.round(+yla || 0))), pm = p.pelimuoto, on11 = pm === '11v11', profiili = {};
    (Array.isArray(p.esimerkkiviikko) ? p.esimerkkiviikko : []).forEach(function (r) { var md = _mdTekstista(r && r.md); if (md != null && md < 0) profiili[md] = r.painotus || null; });
    var paivat = (MD_JOUKKO[n] || []).map(function (md) {
      var d = { md: md, viikonpaiva_oletus: 6 + md, painotus: profiili[md] != null ? profiili[md] : null, kesto_min: kesto, pelimuoto: pm };
      if (on11) { d.rpe_min = null; d.rpe_max = null; }   // D26: vain 11v11; arvot vasta kun tavoitekuormat sovitaan (lähde s. 65)
      return d;
    });
    var sivut = Array.isArray(p.sivut) && p.sivut.length ? ', s. ' + p.sivut.join(', ') : '';
    return { avain: p.avain, nimi: p.nimi, pelimuoto: pm, ikavaihe: p.vaihe || null, ika_ohje: Array.isArray(p.ika_ohje) && p.ika_ohje.length === 2 ? p.ika_ohje.slice() : null, lahde: 'palloliitto', lahde_viite: 'Palloliiton valmennuslinja 2023' + sivut, paivat: paivat, peli: { maara: _peliMaara(p.pelit), teksti: p.pelit || '' },
      omatoiminen: { h_vk: Array.isArray(p.omatoiminen_h) ? p.omatoiminen_h.slice(0, 2) : null, sisalto: ['fysiikka', 'idp'] } };
  }
  function tmPalloliitonPohjat(json) { var a = json && Array.isArray(json.pohjat) ? json.pohjat : []; return a.map(tmPohjaPalloliitosta).filter(Boolean); }

  /* ── 2 · validointi ── */
  function tmViikkopohjaVirhe(p) {
    if (!p || typeof p !== 'object' || PELIMUODOT.indexOf(p.pelimuoto) < 0) return 'pelimuoto_puuttuu';
    if (!Array.isArray(p.paivat) || !p.paivat.length) return 'paivat_puuttuu';
    var o = p.omatoiminen, h = o && o.h_vk;
    if (o !== undefined && o !== null && (typeof o !== 'object' || (h != null && !(Array.isArray(h) && h.length === 2 && h[0] >= 0 && h[1] >= h[0])) || (o.sisalto != null && !Array.isArray(o.sisalto)))) return 'omatoiminen';
    var nahty = {};
    for (var i = 0; i < p.paivat.length; i++) {
      var d = p.paivat[i] || {};
      if (!(+d.kesto_min > 0)) return 'kesto';
      if (!(d.viikonpaiva_oletus >= 1 && d.viikonpaiva_oletus <= 7)) return 'viikonpaiva';
      if (nahty[d.md]) return 'md_paallekkain'; nahty[d.md] = 1;
      if ((d.rpe_min !== undefined || d.rpe_max !== undefined) && (p.pelimuoto !== '11v11' || d.pelimuoto && d.pelimuoto !== '11v11')) return 'rpe_vain_11v11';
    }
    return null;
  }

  /* ── 3 · kausivaihe ja pohjan valinta ── */
  function tmKausivaihe(ks, pvm) {
    var p = typeof pvm === 'number' ? _helsinkiPaiva(pvm) : String(pvm || '').slice(0, 10), v = ks && Array.isArray(ks.vaiheet) ? ks.vaiheet : [];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p)) return null;
    for (var i = 0; i < v.length; i++) if (v[i] && v[i].alku && v[i].loppu && v[i].alku <= p && p <= v[i].loppu) return v[i];
    return null;
  }
  /* Joukkueen ikä: luku tai teksti 'U13'/'P13'/'T13'/'13' → 13; puuttuu/tuntematon → null (kentät ika | ikaluokka) */
  function tmJoukkueenIka(j) {
    if (!j) return null; var x = j.ika != null && j.ika !== '' ? j.ika : j.ikaluokka; if (typeof x === 'number') return isFinite(x) && x > 0 ? Math.round(x) : null;
    var m = /(\d{1,2})/.exec(String(x == null ? '' : x)); return m ? +m[1] : null;
  }
  /* TM:n ikävaihe (leikkija/rakentaja/showcase) VAIN kausisuunnitelman viikkopohjat[ikävaihe]-reittiin — ei Palloliiton vaiheisiin (lapsuus/nuoruus/erikoistuminen) verrattavaksi */
  function _ikavaihe(j) { if (!j) return null; if (j.ikavaihe) return j.ikavaihe; var a = tmJoukkueenIka(j); return a == null ? null : (a <= 12 ? 'leikkija' : (a <= 15 ? 'rakentaja' : 'showcase')); }   // §14/§28: ≤12 leikkijä · 13–15 rakentaja · ≥16 showcase
  /* Saman pelimuodon pohjista se, jonka ika_ohje [min,max] sisältää iän; muuten lähin (etäisyys ohjeen reunaan; tasatilanteessa ensimmäinen); ikä tuntematon tai pohjalla ei ika_ohjetta → nykyinen järjestys */
  function _ikaValinta(a, ika) {
    if (ika == null || a.length < 2) return a[0] || null; var paras = null, pe = Infinity;
    a.forEach(function (p) { var o = p.ika_ohje; var e = Array.isArray(o) && o.length === 2 ? (ika < o[0] ? o[0] - ika : (ika > o[1] ? ika - o[1] : 0)) : Infinity; if (e < pe) { pe = e; paras = p; } });
    return paras || a[0];
  }
  function tmPohjaKuuluu(pohja, kohde) {   // kohteeton pohja = koko seuran oletus (D196)
    var k = pohja && pohja.kohde; if (!k) return true; if (!kohde) return false;
    return (k.joukkue != null && kohde.joukkue != null && String(k.joukkue) === String(kohde.joukkue)) || (k.ryhma != null && kohde.ryhma != null && String(k.ryhma) === String(kohde.ryhma));
  }
  function tmPohjaJoukkueelle(pohjat, ks, joukkue, pvm) {
    var L = (Array.isArray(pohjat) ? pohjat : []).filter(function (p) { return p && tmPohjaKuuluu(p, joukkue ? { joukkue: joukkue.id } : null); });
    function omin(f, ika) { var a = L.filter(f), t = a.filter(function (p) { return p.kohde; }); if (!t.length) t = a.filter(function (p) { return p.lahde === 'seura'; }); return _ikaValinta(t.length ? t : a, ika); }   // joukkuekohtainen > seuran > Palloliiton; tasolla ikä ratkaisee
    var v = tmKausivaihe(ks, pvm), iv = _ikavaihe(joukkue), avain = v && v.viikkopohjat && iv ? v.viikkopohjat[iv] : null;
    if (avain) { var k = omin(function (p) { return p.avain === avain; }); if (k) return k; }
    var pm = joukkue && joukkue.pelimuoto; if (!pm) return null;
    return omin(function (p) { return p.pelimuoto === pm; }, tmJoukkueenIka(joukkue));   // 8v8/11v11: kaksi pohjaa → Palloliiton ika_ohje ratkaisee iän mukaan
  }

  /* ── 4 · oikeus (vain UI-apu) ── */
  function tmSaaTayttaaViikon(kayttaja, kohde, ryhmat) {
    if (!kayttaja || !kohde) return false;
    if (kayttaja.johto === true) return true;
    if (kohde.joukkue != null) return Array.isArray(kayttaja.joukkueet) && kayttaja.joukkueet.map(String).indexOf(String(kohde.joukkue)) >= 0;
    if (kohde.ryhma != null && kayttaja.uid) return (Array.isArray(ryhmat) ? ryhmat : []).some(function (r) { return r && String(r.id) === String(kohde.ryhma) && r.vastuu_uid === kayttaja.uid; });
    return false;
  }

  /* Yhteinen suodatus + päällekkäisyys (Täytä viikko ja Monista viikko): tauko (D193) → olemassa → lisää ehdotus + päällekkäisyys (≥1 yhteinen pelaaja samaan aikaan; lukumäärä, ei nimiä) */
  /* Erikoisohjelma (D241): joukkueen erikoisohjelma-tapahtuma, joka osuu päivälle p → laji (leiri|turnaus|kotiviikko|kevennys|muu) | null */
  function _erikoisTapahtumat(c) { return c.tapahtumat.filter(function (t) { return t.tyyppi === 'erikoisohjelma' && _kohdeTasmaa(t, c.a.kohde, c.joukkue); }); }
  function _erikoisLaji(c, p) { var MA = _MA(), x = _erikoisTapahtumat(c).filter(function (t) { return MA.tmKalOsuuPaivalle && MA.tmKalOsuuPaivalle(t, p); }).map(function (t) { return t.laji; }); return ['leiri', 'turnaus', 'kotiviikko'].filter(function (l) { return x.indexOf(l) >= 0; })[0] || (x.indexOf('kevennys') >= 0 ? 'kevennys' : null); }
  function _kevennysViikolla(c, viikko) { var MA = _MA(); return _erikoisTapahtumat(c).some(function (t) { return t.laji === 'kevennys' && viikko.some(function (p) { return MA.tmKalOsuuPaivalle && MA.tmKalOsuuPaivalle(t, p); }); }); }
  function _lisaaEhdotus(out, e, c) {
    var p = e.pvm;
    if (c.KY.tmOnTauko && c.KY.tmOnTauko(c.a.tapahtumat, p, c.joukkue).tauko) { out.ohitetut.push({ pvm: p, syy: 'tauko' }); return; }
    var laji = _erikoisLaji(c, p); if (laji === 'leiri' || laji === 'turnaus' || laji === 'kotiviikko') { out.ohitetut.push({ pvm: p, syy: laji }); return; }   // D241: erikoisohjelma korvaa joukkueen normaaliviikon
    if (c.tapahtumat.some(function (t) { return t.tyyppi === 'harjoitus' && t.pvm === p && _kohdeTasmaa(t, c.a.kohde, c.joukkue); })) { out.ohitetut.push({ pvm: p, syy: 'olemassa' }); return; }
    if (c.kevennysPaiva === p) { out.ohitetut.push({ pvm: p, syy: 'kevennys' }); return; }   // D241: kevennysviikolta pois pohjan viimeinen (ottelua lähin) päivä
    out.ehdotukset.push(e);
    if (c.pelaajat.length) c.tapahtumat.forEach(function (t) {
      if (t.pvm !== p || t.koko_paiva || t.alkaaMs == null) return;
      var ta = _min(_helsinkiKello(t.alkaaMs)), tb = t.paattyyMs != null && t.paattyyMs > t.alkaaMs ? ta + Math.round((t.paattyyMs - t.alkaaMs) / 60000) : ta + 1;
      if (!(ta < _min(e.paattyy) && _min(e.alkaa) < tb)) return;
      var muut = (c.kokoonpanot[t.id] || t.pelaajat_id || []).map(String), n = c.pelaajat.filter(function (x) { return muut.indexOf(x) >= 0; }).length;
      if (n >= 1) out.paallekkaisyydet.push({ pvm: p, pelaajia: n, toinen_tapahtuma_id: t.id });
    });
  }
  /* Monista edellinen viikko: kohteen (joukkue/ryhmä) edellisen viikon harjoitukset +7 pv, sama aika ja paikka; sama suodatus kuin Täytä viikko ('tauko' / 'olemassa'). Argumentit kuten tmTaytaViikko ilman pohjaa. */
  function tmMonistaViikko(a) {
    a = a || {}; var out = { ehdotukset: [], paallekkaisyydet: [], ohitetut: [], vaihe: null }, ma = _maanantai(typeof a.maanantai === 'number' ? _helsinkiPaiva(a.maanantai) : String(a.maanantai || '').slice(0, 10));
    if (!ma) return out;
    var KY = _KY(), MA = _MA(), joukkue = a.joukkue != null ? a.joukkue : (a.kohde && a.kohde.joukkue), norm = function (x) { return MA.tmKalNormalisoi ? MA.tmKalNormalisoi(x) : null; };
    var tapahtumat = (Array.isArray(a.tapahtumat) ? a.tapahtumat : []).map(norm).filter(function (e) { return e && !e.poistettu && e.tila !== 'peruttu' && e.tila !== 'peruutettu'; });
    var edellinen = []; for (var i = 0; i < 7; i++) edellinen.push(_lisaa(ma, i - 7));
    var lahde = tapahtumat.filter(function (e) { return e.tyyppi === 'harjoitus' && e.alkaaMs != null && edellinen.indexOf(e.pvm) >= 0 && _kohdeTasmaa(e, a.kohde, joukkue); }).sort(function (x, y) { return x.alkaaMs - y.alkaaMs; });
    var ctx = { KY: KY, a: a, joukkue: joukkue, tapahtumat: tapahtumat, pelaajat: Array.isArray(a.pelaajat) ? a.pelaajat.map(String) : [], kokoonpanot: a.kokoonpanot || {}, kevennysPaiva: null };
    var vkPv = []; for (var vj = 0; vj < 7; vj++) vkPv.push(_lisaa(ma, vj));
    if (_kevennysViikolla(ctx, vkPv)) ctx.kevennysPaiva = lahde.length ? _lisaa(lahde[lahde.length - 1].pvm, 7) : null;   // Monista: kevennysviikolta pois viimeinen (viikon myöhäisin) päivä
    lahde.forEach(function (e) {
      var alkaa = _helsinkiKello(e.alkaaMs), kesto = e.paattyyMs != null && e.paattyyMs > e.alkaaMs ? Math.round((e.paattyyMs - e.alkaaMs) / 60000) : 90;
      _lisaaEhdotus(out, { pvm: _lisaa(e.pvm, 7), alkaa: alkaa, paattyy: _hhmm(_min(alkaa) + kesto), paikka: e.paikka || '', tyyppi: 'harjoitus', md: null, painotus: null, nimi: e.nimi || undefined }, ctx);
    });
    out.ohitetut.sort(function (x, y) { return x.pvm < y.pvm ? -1 : 1; });
    return out;
  }
  /* Vahvistettavan ehdotuksen Firestore-dokumentti (kentät kuten Masterin nykyinen luonti; toistuvuus ei; kohde joukkue; pohja_avain/md/painotus). alkaa/paattyy täyttää kutsuja Timestampeiksi (pvm + HH:MM palautetaan erikseen). */
  function tmEhdotusDoc(e, c) {
    c = c || {}; var R = _lib('./tm_ryhmat.js', 'TM_RYHMAT'), j = c.joukkue || null, nimet = {}; if (j) nimet[j] = j;
    var osa = R.tmKenelleDoc ? R.tmKenelleDoc({ tapa: 'joukkue', joukkue: j || '', joukkueNimet: nimet }, { oletusPelaajat: c.pelaajat || [] }).osa : { joukkue: j, joukkue_nimi: j, joukkueet: j ? [j] : [], pelaajat_id: c.pelaajat || [], kohde: { tyyppi: 'joukkue' }, nakyvyys: 'kaikki' };
    var doc = Object.assign({ nimi: e.nimi || c.nimi || 'Harjoitus', tyyppi: 'harjoitus', alkaa: null, paattyy: null, koko_paiva: false, osallistujat_uid: c.uid ? [c.uid] : [], paikka: (e.paikka || '').trim().slice(0, 120) || null, paikka_id: null, testitapahtuma_id: null, myclub_event_id: null, taso_ottelu_id: null,
      toistuvuus: null, toistuvuus_sarja_id: null, luoja_uid: c.uid || '', muokkaaja_uid: null, tila: 'suunniteltu', poistettu: false, poistettu_uid: null, poistettu_pvm: null, pelaajaviesti: null, lahde: 'manuaalinen', lahde_id: null, viimeisin_synkka: null, mentoroitava_uid: null, mentoroitava_nimi: null,
      pohja_avain: c.pohjaAvain || null, md: e.md != null ? e.md : null, painotus: e.painotus || null }, osa);
    if (e.teema) doc.teema = e.teema;
    return { pvm: e.pvm, alkaa: e.alkaa, paattyy: e.paattyy, doc: doc };
  }

  /* ── 5 · Täytä viikko ── */
  function _joukkueTasmaa(e, j) { if (j == null) return false; var s = String(j).trim().toLowerCase(), a = [e.joukkue, e.joukkue_nimi].concat(e.joukkueet || []).filter(Boolean).map(function (x) { return String(x).trim().toLowerCase(); }); return a.indexOf(s) >= 0; }
  function _kohdeTasmaa(e, kohde, joukkue) { if (kohde && kohde.ryhma != null) return !!(e.kohde && String(e.kohde.ryhma_id) === String(kohde.ryhma)); return _joukkueTasmaa(e, joukkue != null ? joukkue : (kohde && kohde.joukkue)); }
  function tmTaytaViikko(a) {
    a = a || {}; var out = { ehdotukset: [], paallekkaisyydet: [], ohitetut: [], vaihe: a.vaihe && a.vaihe.avain || null };
    var pohja = a.pohja, ma = _maanantai(typeof a.maanantai === 'number' ? _helsinkiPaiva(a.maanantai) : String(a.maanantai || '').slice(0, 10));
    if (!ma || tmViikkopohjaVirhe(pohja)) return out;
    var KY = _KY(), MA = _MA(), joukkue = a.joukkue != null ? a.joukkue : (a.kohde && a.kohde.joukkue), TY = _TY();
    var viikko = []; for (var i = 0; i < 7; i++) viikko.push(_lisaa(ma, i));
    var ottelut = (Array.isArray(a.ottelut) ? a.ottelut : []).map(function (o) { return typeof o === 'string' ? o.slice(0, 10) : (o && (o.pvm || (o.alkaaMs != null ? _helsinkiPaiva(o.alkaaMs) : null))); }).filter(function (x) { return /^\d{4}-\d{2}-\d{2}$/.test(x || ''); });
    var vkOttelut = ottelut.filter(function (p) { return viikko.indexOf(p) >= 0; });
    var kielletty = {}; vkOttelut.forEach(function (p) { kielletty[p] = 1; if (vkOttelut.length >= 2) kielletty[_lisaa(p, -1)] = 1; });   // ottelupäivä aina; kahden ottelun viikolla myös MD−1

    // päivät (D14): jokaiselle viikon päivälle md = päivä − LÄHIN TULEVA ottelu (sama tai myöhempi päivä); harjoitus, jos md on pohjan päivissä.
    // Ottelun jälkeinen päivä (MD+1) ohitetaan aina ('palautuminen'). Lähin ottelu > 7 pv päässä (tai ei ole) → viikonpaiva_oletus (paitsi MD+1).
    var paivat = {}, ohitus = [];
    viikko.forEach(function (p, i) {
      if (kielletty[p]) { ohitus.push({ pvm: p, syy: 'ottelu' }); return; }
      if (ottelut.indexOf(_lisaa(p, -1)) >= 0) { ohitus.push({ pvm: p, syy: 'palautuminen' }); return; }
      var tuleva = ottelut.filter(function (o) { return o >= p; }).sort()[0], md = tuleva ? Math.round((_utc(p) - _utc(tuleva)) / 86400000) : null, d = null;
      pohja.paivat.forEach(function (x) { if (tuleva && md >= -7 && md <= 0 ? x.md === md : (!tuleva || md < -7) && x.viikonpaiva_oletus === i + 1) d = x; });
      if (d) paivat[p] = d;
    });

    var norm = function (x) { return MA.tmKalNormalisoi ? MA.tmKalNormalisoi(x) : null; };
    var tapahtumat = (Array.isArray(a.tapahtumat) ? a.tapahtumat : []).map(norm).filter(function (e) { return e && !e.poistettu && e.tila !== 'peruttu' && e.tila !== 'peruutettu'; });
    var historia = (Array.isArray(a.historia) ? a.historia : []).map(norm).filter(function (e) { return e && !e.poistettu && e.tyyppi === 'harjoitus' && e.alkaaMs != null && _kohdeTasmaa(e, a.kohde, joukkue); });
    var pelaajat = Array.isArray(a.pelaajat) ? a.pelaajat.map(String) : [], kokoonpanot = a.kokoonpanot || {};

    var ctx = { KY: KY, a: a, joukkue: joukkue, tapahtumat: tapahtumat, pelaajat: pelaajat, kokoonpanot: kokoonpanot, kevennysPaiva: null };
    var viikkoPv = []; for (var vi = 0; vi < 7; vi++) viikkoPv.push(_lisaa(ma, vi));
    if (_kevennysViikolla(ctx, viikkoPv)) { var pk = Object.keys(paivat).sort(function (x, y) { return paivat[y].md - paivat[x].md || (x < y ? 1 : -1); })[0]; ctx.kevennysPaiva = pk || null; }   // kevennys: pohjan viimeinen MD-päivä (suurin md = ottelua lähin)
    Object.keys(paivat).sort().forEach(function (p) {
      var d = paivat[p], vk = _vkpaiva(p), sama = historia.filter(function (e) { return _vkpaiva(_helsinkiPaiva(e.alkaaMs)) === vk; }).sort(function (x, y) { return y.alkaaMs - x.alkaaMs; })[0];   // viimeisin saman viikonpäivän harjoitus
      var alkaa = sama ? _helsinkiKello(sama.alkaaMs) : OLETUS_ALKAA, e = { pvm: p, alkaa: alkaa, paattyy: _hhmm(_min(alkaa) + Math.round(d.kesto_min)), paikka: sama && sama.paikka ? sama.paikka : '', tyyppi: 'harjoitus', md: d.md, painotus: d.painotus != null ? d.painotus : null };
      if (a.teema) e.teema = a.teema;
      _lisaaEhdotus(out, e, ctx);
    });
    out.ohitetut = out.ohitetut.concat(ohitus).sort(function (x, y) { return x.pvm < y.pvm ? -1 : 1; });
    return out;
  }

  var API = {
    MD_JOUKKO: MD_JOUKKO, PELIMUODOT: PELIMUODOT, tmPohjaPalloliitosta: tmPohjaPalloliitosta, tmPalloliitonPohjat: tmPalloliitonPohjat, tmViikkopohjaVirhe: tmViikkopohjaVirhe,
    tmKausivaihe: tmKausivaihe, tmJoukkueenIka: tmJoukkueenIka, tmPohjaKuuluu: tmPohjaKuuluu, tmPohjaJoukkueelle: tmPohjaJoukkueelle, tmSaaTayttaaViikon: tmSaaTayttaaViikon, tmTaytaViikko: tmTaytaViikko, tmMonistaViikko: tmMonistaViikko, tmEhdotusDoc: tmEhdotusDoc
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else if (root) root.TM_VIIKKOPOHJA = API;
})(typeof window !== 'undefined' ? window : null);
