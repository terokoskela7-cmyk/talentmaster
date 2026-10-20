/* ════════════════════════════════════════════════════════════════════════
   tm_kt_polku.js — Kehitystyöpöytä 22 · B4a: Polku-välilehti uudella sivulla (docs/design/idp-v2/22_kehitystyopoyta_kayttettavyys.html osio 2; brief .briefit/CODE_BRIEF_22_B4_POLKU.md).
   Jana: Kausi → Jakso nyt (osat, klipit, toiminnot). B4b: Tämä viikko (luku) · Pelaajan ääni (D105) · Historia — tmKtPolkuViikko/-LataaViikko, tmKtPolkuAani, tmKtPolkuHistoria; ctx lisäksi { viikko:{tila,docs}, vk:{docs}, joukkueDocs, tanaan, ikavaihe, historiaNimiFn }. PURE (db injektoidaan lataajille); ei uusia Firestore-kenttiä.
   · tmKtPolkuLataaKausi(d)            → Promise<tavoite|null>: idp_kausi/{vuosi}-dokit (kuluva + edellinen vuodenvaihteessa), VOIMASSA oleva tavoite (lib/tm_idp.js); d: { db, sid, pid, nyt? }
   · tmKtPolkuKausi(tavoite)           → { nimi, omin, asetettu, kausi, lahto:{arvo,yks,pvm}|null, tavoite:{arvo,yks}|null } | null — lähtötaso VAIN jos mitattu (D104): yksikkö ≠ taso/vapaa, arvo ja päivä olemassa; oletus taso+1 ei koskaan lukuna
   · tmKtPolkuKlipit(dokit, jf, ctx)   → { rivit:[…uusin ensin], n } — vain tämän jakson klipit (klippi.aika ≥ jaksofokus.alkoi) ketjuineen (vastaus, kuittaus); rivit lib/tm_mediaviesti.js:n tmMvRivit-tilasta (YKSI klippisääntö)
   · tmKtPolkuTila(p, tila, osat, klipit) → 'ei_jaksoa' | 'normaali' | 'vahan' | 'katselmus'
   · tmKtPolkuHTML(p, ctx)             → koko jana. ctx: { esc, t, tila (tmJaksoTila), tanaan (ISO), kaanon, voiKirjoittaa, alueMahdollinen, kausi:{tila,tavoite}, klipit:{tila,dokit}, osaFn, toimiFn, uudelleenFn, nimet?, osatHTML? }
   · tmKtPolkuCss()                    → tyylit (vain tokenit)
   Jakson osat piirretään SAMALLA komponentilla kuin Tänään (tmKtOsatHTML, lib/tm_kehitystyopoyta.js) — ei toista osarenderöintiä. Konseptin nimi esiintyy vain Jakso nyt -otsikossa.
   Dual-export: module.exports || window.TM_KT_POLKU.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var FI = {
    ktp_kausi: 'Kausi', ktp_kausi_ei: 'Kauden tavoitetta ei ole asetettu.', ktp_aseta_kausitavoite: 'Aseta kauden tavoite', ktp_muokkaa_kausitavoitetta: 'Muokkaa kauden tavoitetta', ktp_asetettu: 'asetettu {pvm}',
    ktp_omin_sanoin: 'Pelaajan omin sanoin: ”{teksti}”', ktp_tavoite_arvo: 'Tavoite: {arvo} {yks}.', ktp_lahto_mitattu: 'Lähtötaso: {arvo} {yks} (mitattu {pvm}).', ktp_lahto_ei: 'Lähtötasoa ei ole vielä mitattu.',
    ktp_jakso_nyt: 'Jakso nyt', ktp_viikko: 'viikko {n}/{k}', ktp_paattynyt: 'päättynyt · suljettava', ktp_tuki: 'tukiosa: {alue}', ktp_arviointi: 'arviointi {pvm}',
    ktp_klipit: 'Klipit', ktp_ei_klippeja: 'Ei klippejä tällä jaksolla.', ktp_nayta_kaikki: 'Näytä kaikki ({n})', ktp_avaa_klippi: 'Avaa klippi', ktp_vastaus: 'Pelaaja', ktp_kuittaus: 'Kuittaus',
    ktp_k_odottaa: 'lähetetty', ktp_k_vastattu: 'pelaaja vastasi', ktp_k_perhe: 'huoltaja kuittasi', ktp_k_lupa: 'odottaa lupaa', ktp_k_suljettu: 'ketju suljettu',
    ktp_lisaa_klippi: 'Lisää klippi', ktp_merkitse_havainto: 'Merkitse viikkohavainto', ktp_muokkaa_jaksoa: 'Muokkaa jaksoa', ktp_sulje_jakso: 'Sulje jakso', ktp_valikko: 'Lisää toimintoja',
    ktp_ei_jaksoa: 'Ei jaksoa käynnissä', ktp_ei_jaksoa_ohje: 'Aloita jakso, niin osat, viikkohavainnot ja klipit tulevat tähän.', ktp_aloita_jakso: 'Aloita jakso', ktp_aseta_ydinvahvuus: 'Aseta ydinvahvuus kentälle', ktp_vahvista_jakso: 'Vahvista jakso', ktp_valinta_odottaa: 'Pelaaja valitsee seuraavaa reittiä.',
    ktp_vahan_ohje: 'Merkitse ensimmäinen viikkohavainto, niin osille tulee tila.', ktp_lataa: 'Ladataan…', ktp_virhe_kausi: 'Kauden tavoitetta ei voitu ladata.', ktp_virhe_klipit: 'Klippejä ei voitu ladata.', ktp_yrita_uudelleen: 'Yritä uudelleen',
    ktp_viikko_ots: 'Tämä viikko', ktp_viikko_luku: 'luku', ktp_pv_ma: 'Ma', ktp_pv_ti: 'Ti', ktp_pv_ke: 'Ke', ktp_pv_to: 'To', ktp_pv_pe: 'Pe', ktp_pv_la: 'La', ktp_pv_su: 'Su',
    ktp_ev_harjoitus: 'Harjoitus', ktp_ev_ottelu: 'Ottelu', ktp_vk_katsaus: 'Viikkokatsaus', ktp_vk_vastattu: 'vastattu', ktp_vk_odottaa: 'pelaaja vastaa', ktp_vk_ei_tapahtumia: 'Ei harjoituksia tai otteluita tällä viikolla.',
    ktp_vk_lahde: 'harjoitukset ja ottelu joukkueen kalenterista · viikkokatsaus sunnuntaina', ktp_virhe_viikko: 'Viikon tapahtumia ei voitu ladata.',
    ktp_aani: 'Pelaajan ääni', ktp_a_kausi: 'Kauden tavoite omin sanoin', ktp_a_klippi: 'Klippivastaus', ktp_a_vk: 'Viikkokatsaus', ktp_a_uusinta: '{n} uusinta · {yht} tekstiä yhteensä', ktp_a_omaa: '{n} pelaajan omaa tekstiä',
    ktp_historia: 'Historia', ktp_h_tyhja: 'Historia täyttyy, kun jaksoja päätetään.', ktp_h_osaa: '{a}/{b} osaa itsenäisesti', ktp_h_vaihdettu: 'vaihdettu', ktp_h_vk: '{n} vk', ktp_h_pv: '{n} pv', ktp_piirra_taululle: 'Piirrä taululle',
    ktp_h_lause_valm: 'valmentajan lause', ktp_h_lause_vp: 'VP:n lause', ktp_h_klipit: 'Klipit ({n})'
  };
  function _esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function _alueFi() { var A = _req('TM_KT_ALUE', './tm_kt_alue.js'), K = _req('TM_KEHITYSTYOPOYTA', './tm_kehitystyopoyta.js'); return Object.assign({}, (K && K.FI) || {}, (A && A.FI) || {}); }   // K3a: kt_valikko_syy_kuvaus tulee tm_kehitystyopoyta.js:stä
  function _txt(c, k) { var v = (c && typeof c.t === 'function') ? c.t(k) : k; return (v && v !== k) ? v : (FI[k] != null ? FI[k] : (_alueFi()[k] != null ? _alueFi()[k] : k)); }
  function _fmt(str, o) { return String(str).replace(/\{(\w+)\}/g, function (m, k) { return o && o[k] != null ? o[k] : m; }); }
  function _req(g, f) { try { return (typeof module !== 'undefined' && module.exports && typeof require === 'function') ? require(f) : (root && root[g]); } catch (e) { return root && root[g]; } }
  function _ms(t) { return t == null ? NaN : (t.toDate ? t.toDate().getTime() : (t instanceof Date ? t.getTime() : (typeof t === 'number' ? t : new Date(t).getTime()))); }
  function _paiva(ms) { var d = new Date(ms); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function _pvm(x) {   // ISO-päivä | ISO-aikaleima | ms | Timestamp → d.m. (paikallinen päivä, §7.26)
    if (x == null || x === '') return '';
    var s = String(x), m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (m) return (+m[3]) + '.' + (+m[2]) + '.';
    var ms = _ms(x); if (!isFinite(ms)) return ''; var d = new Date(ms); return d.getDate() + '.' + (d.getMonth() + 1) + '.';
  }

  /* ── KAUSI ── */
  function _idp() {   // tm_idp.js: Node → moduuli; selain → top-level-globaalit (ei TM_IDP-oliota)
    try { if (typeof module !== 'undefined' && module.exports && typeof require === 'function') return require('./tm_idp.js'); } catch (e) { /* selain */ }
    return root && typeof root.idpKausivuosi === 'function' ? { idpKausivuosi: root.idpKausivuosi, idpJaaVoimassaJaEhdotus: root.idpJaaVoimassaJaEhdotus, idpValitseKausidokista: root.idpValitseKausidokista } : null;
  }
  /* Voimassa oleva kausitavoite: sama valinta kuin Masterissa (_mIdpLataa): kuluva vuosi, vuodenvaihteessa edellinen. db.collection('seurat')… .collection('idp_kausi'). */
  function tmKtPolkuLataaKausi(d) {
    d = d || {}; var I = _idp(); if (!d.db || !d.sid || !d.pid || !I) return Promise.resolve(null);
    var vuosi = (typeof I.idpKausivuosi === 'function') ? I.idpKausivuosi(d.nyt || new Date()) : String((d.nyt || new Date()).getFullYear()), ed = String(Number(vuosi) - 1);
    var col = d.db.collection('seurat').doc(d.sid).collection('pelaajat').doc(d.pid).collection('idp_kausi');
    var lue = function (id) { return col.doc(id).get().then(function (s) { return s && s.exists ? ((s.data() || {}).tavoitteet || null) : null; }); };
    return lue(vuosi).then(function (nyt) {
      if (I.idpJaaVoimassaJaEhdotus(nyt).tavoite) return I.idpJaaVoimassaJaEhdotus(nyt).tavoite;
      return lue(ed).catch(function () { return null; }).then(function (edArr) { var v = I.idpValitseKausidokista(nyt, vuosi, edArr, ed); return v ? v.tavoite : null; });
    });
  }
  var EI_LUKU = { taso: 1, vapaa: 1 };
  function tmKtPolkuKausi(tav) {
    if (!tav || typeof tav !== 'object' || tav.status === 'vaihdettu' || tav.status === 'hylatty' || tav.status === 'ehdotettu') return null;
    var f = tav.fokus || {}, mit = tav.mittari || {}, yks = mit.yksikko || '', la = tav.lahto || {};
    var mitattu = !EI_LUKU[yks] && yks !== '' && la.arvo != null && isFinite(Number(la.arvo)) && !!la.pvm;   // D104: lähtötaso vain mitattuna; havaittu taso ja oletus taso+1 eivät ole mittaus
    var nimi = typeof f.nimi === 'string' && f.nimi.trim() ? f.nimi.trim() : '';
    if (!nimi && !(typeof tav.pelaajan_tavoite === 'string' && tav.pelaajan_tavoite.trim())) return null;
    return { nimi: nimi, omin: typeof tav.pelaajan_tavoite === 'string' ? tav.pelaajan_tavoite.trim() : '', asetettu: tav.luotu || null, kausi: (tav.aikaraami && tav.aikaraami.kausi) || '',
      lahto: mitattu ? { arvo: la.arvo, yks: yks, pvm: la.pvm } : null, tavoite: (mitattu && tav.tavoitearvo != null && isFinite(Number(tav.tavoitearvo))) ? { arvo: tav.tavoitearvo, yks: yks } : null };
  }

  /* ── KLIPIT (jakson sisällä) ── */
  /* dokit = viestit-dokumentit (klippi · klippi_vastaus · klippi_kuittaus), jf = jaksofokus, ctx: { pelaaja:{id,nimi?,suostumusTila?}, nyt? }.
     Rajaus: klipin oma aika ≥ jaksofokus.alkoi (ei ylärajaa: jakso nyt jatkuu sulkemiseen asti); aika puuttuu (serverTimestamp kesken) = nyt. Vastaukset ja kuittaukset seuraavat klippiään. */
  function tmKtPolkuKlipit(dokit, jf, ctx) {
    ctx = ctx || {}; var M = _req('TM_MEDIAVIESTI', './tm_mediaviesti.js'), l = Array.isArray(dokit) ? dokit : [];
    var alku = jf && jf.alkoi ? _ms(String(jf.alkoi).length <= 10 ? jf.alkoi + 'T00:00:00' : jf.alkoi) : NaN, nyt = ctx.nyt != null ? _ms(ctx.nyt) : Date.now();
    var yla = ctx.loppu ? _ms(String(ctx.loppu).length <= 10 ? ctx.loppu + 'T23:59:59' : ctx.loppu) : Infinity;   // suljettu jakso (Historia): yläraja = päättymispäivä; Jakso nyt: ei ylärajaa
    if (!M || !jf || !isFinite(alku)) return { rivit: [], n: 0 };
    var klipit = l.filter(function (d) { if (!d) return false; var a = isFinite(_ms(d.aika)) ? _ms(d.aika) : nyt; return d.tyyppi === 'klippi' && a >= alku && (!isFinite(yla) || a <= yla); }), id = {};
    klipit.forEach(function (k) { id[k.id] = k; });
    var vast = l.filter(function (d) { return d && (d.tyyppi === 'klippi_vastaus' || d.tyyppi === 'klippi_kuittaus') && id[d.vastaus_viestille]; });
    var pl = {}; if (ctx.pelaaja && ctx.pelaaja.id) pl[ctx.pelaaja.id] = { nimi: ctx.pelaaja.nimi || '', suostumusTila: ctx.pelaaja.suostumusTila };
    var rivit = M.tmMvRivit(klipit.concat(vast), { pelaajat: pl, nyt: nyt }).map(function (r) { var k = id[r.klippiDocId] || {}; return Object.assign({}, r, { url: typeof k.url === 'string' && /^https:\/\//i.test(k.url) ? k.url : '', domain: k.domain || r.domain || '', tekija: k.fromNimi || '', aikaMs: isFinite(_ms(k.aika)) ? _ms(k.aika) : nyt }); });
    rivit.sort(function (a, b) { return b.aikaMs - a.aikaMs; });
    return { rivit: rivit, n: rivit.length };
  }
  /* Tila: 'ei_jaksoa' (aloittamaton/valinta kesken) · 'katselmus' (päättynyt, suljettava) · 'vahan' (käynnissä, ei yhtään havaintoa eikä klippiä) · 'normaali'. */
  function tmKtPolkuTila(p, tila, osat, klipit) {
    var t = tila && tila.tila; if (t === 'paattynyt') return 'katselmus';
    if (t !== 'kaynnissa' && t !== 'vahvistettu') return 'ei_jaksoa';
    var havaintoja = (osat || []).some(function (o) { return o && o.tila; }), klippeja = !!(klipit && klipit.n);
    return havaintoja || klippeja ? 'normaali' : 'vahan';
  }


  /* ── TÄMÄ VIIKKO (luku, B4b) ── */
  function _isoPaiva(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function _viikonPaivat(tanaanIso) {   // ma–su, ISO-päivät (paikallinen, keskipäivästä → ei kesäaikavirhettä)
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(tanaanIso || '')); var d = m ? new Date(+m[1], +m[2] - 1, +m[3], 12) : new Date(); d.setHours(12, 0, 0, 0);
    var ma = new Date(d.getTime()); ma.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    var ulos = []; for (var i = 0; i < 7; i++) { var x = new Date(ma.getTime()); x.setDate(ma.getDate() + i); ulos.push(_isoPaiva(x)); } return ulos;
  }
  /* Viikon ikkuna latausta varten: { alku, loppu } ms (ma 00:00 – su 23:59:59, paikallinen). */
  function tmKtPolkuViikonIkkuna(tanaanIso) { var v = _viikonPaivat(tanaanIso); return { alku: new Date(v[0] + 'T00:00:00').getTime(), loppu: new Date(v[6] + 'T23:59:59').getTime(), paivat: v }; }
  /* Kalenteritapahtumat (kalenteri/{id}) → vain tämän viikon harjoitukset ja ottelu, jotka kuuluvat pelaajalle (sama jäsenyyssääntö kuin pelaajan kalenterissa). Ei joukkueen viikkoa (14) eikä kuormaa (B5).
     d = { tanaan (ISO), joukkueDocs? } → { paivat:[{iso, tapahtumat:[{tyyppi:'harjoitus'|'ottelu', nimi, klo}]}], n } */
  function tmKtPolkuViikko(docs, p, d) {
    d = d || {}; var TY = _req('TM_KALENTERI_TYYPIT', './tm_kalenteri_tyypit.js'), KP = _req('TM_KALENTERI_PELAAJALLE', './tm_kalenteri_pelaajalle.js'), pv = _viikonPaivat(d.tanaan), per = {}, n = 0;
    pv.forEach(function (iso) { per[iso] = []; });
    (Array.isArray(docs) ? docs : []).forEach(function (e) {
      if (!e || e.poistettu === true || e.tila === 'peruttu') return;
      var ty = TY && TY.tmKalTyyppiAvain ? TY.tmKalTyyppiAvain(e.tyyppi) : String(e.tyyppi || '').toLowerCase(); if (ty !== 'harjoitus' && ty !== 'ottelu') return;
      var ms = _ms(e.alkaa); if (!isFinite(ms)) return; var iso = _isoPaiva(new Date(ms)); if (!per[iso]) return;
      if (KP && typeof KP.tmKuuluuPelaajalle === 'function' && !KP.tmKuuluuPelaajalle(e, p, d.joukkueDocs || [])) return;
      var dd = new Date(ms); per[iso].push({ tyyppi: ty, nimi: typeof e.nimi === 'string' ? e.nimi.trim() : '', klo: e.koko_paiva ? '' : String(dd.getHours()).padStart(2, '0') + ':' + String(dd.getMinutes()).padStart(2, '0'), ms: ms }); n++;
    });
    return { paivat: pv.map(function (iso) { return { iso: iso, tapahtumat: per[iso].sort(function (a, b) { return a.ms - b.ms; }) }; }), n: n };
  }
  /* d = { db, sid, nyt?, tanaan?, L: TM_KALENTERI_LATAUS, TS: firebase.firestore.Timestamp } → Promise<[kalenteridokit]> (luku; sama haku kuin muu kalenteri) */
  function tmKtPolkuLataaViikko(d) {
    d = d || {}; if (!d.db || !d.sid || !d.L || !d.TS) return Promise.resolve([]);
    var v = tmKtPolkuViikonIkkuna(d.tanaan || _isoPaiva(d.nyt || new Date()));
    return d.L.tmLataaIkkuna(d.db, d.sid, [{ alku: v.alku, loppu: v.loppu }], d.TS).then(function (docs) { return d.L.tmLatausSuodata((docs || []).map(function (x) { return Object.assign({ id: x.id }, x.data ? x.data() : x); })); });
  }

  /* ── PELAAJAN ÄÄNI (D105) ── */
  /* Olemassa olevat pelaajan tekstit: klippivastaukset (viestit), viikkokatsauksen lause (viikkokatsaukset), kausitavoite omin sanoin (idp_kausi). Uusin ensin, enintään 3; jokaisella lähde ja päivä.
     D3-itsearvio tallentuu vain numeroina (d3_viimeisin.pisteet) → ei tekstilähdettä, ei mukana. 0 lähdettä → []. src = { kausi: tmKtPolkuKausi-tulos|null, klipit: viestit-dokit, vk: viikkokatsaus-dokit|null, pelaaja:{id,nimi?,suostumusTila?} } */
  function tmKtPolkuAani(src) {
    src = src || {}; var M = _req('TM_MEDIAVIESTI', './tm_mediaviesti.js'), ulos = [];
    function lisaa(lahde, teksti, ms) { var t = typeof teksti === 'string' ? teksti.trim() : ''; if (t && isFinite(ms)) ulos.push({ lahde: lahde, teksti: t, ms: ms, pvm: _paiva(ms) }); }
    if (src.kausi && src.kausi.omin) lisaa('kausi', src.kausi.omin, _ms(src.kausi.asetettu));
    var pl = {}; if (src.pelaaja && src.pelaaja.id) pl[src.pelaaja.id] = { nimi: src.pelaaja.nimi || '', suostumusTila: src.pelaaja.suostumusTila };
    if (M && Array.isArray(src.klipit) && src.klipit.length) M.tmMvRivit(src.klipit, { pelaajat: pl }).forEach(function (r) { if (r.vastaus && r.vastaus.teksti) lisaa('klippi', r.vastaus.teksti, r.vastaus.aika); });
    (Array.isArray(src.vk) ? src.vk : []).forEach(function (v) { if (v && typeof v.lause === 'string') { var ms = /^\d{4}-\d{2}-\d{2}$/.test(String(v.id || '')) ? _ms(v.id + 'T12:00:00') : _ms(v.luotu); lisaa('vk', v.lause, ms); } });
    ulos.sort(function (a, b) { return b.ms - a.ms; });
    return { rivit: ulos.slice(0, 3), yht: ulos.length };
  }

  /* ── HISTORIA (suljetut jaksot, jaksofokus_historia) ── */
  /* Trendi: osan viimeisin viikkohavainto (havainnot_vk.<konsepti>.<koodi>.<vvvv-Www>.<uid> = {arvo,pvm,rooli}); a = osaa itsenäisesti (arvo 3), b = jakson osat (kaanon) tai havaittujen osien määrä. null kun havaintoja ei ole. */
  function _trendi(h, kaanon) {
    var vk = h && h.havainnot_vk && h.konsepti_avain && h.havainnot_vk[h.konsepti_avain]; if (!vk || typeof vk !== 'object') return null;
    var K = _req('TM_KEHITYSTYOPOYTA', './tm_kehitystyopoyta.js'), a = 0, havaittu = 0;
    Object.keys(vk).forEach(function (koodi) {
      var viikot = vk[koodi]; if (!viikot || typeof viikot !== 'object') return; var v = Object.keys(viikot).sort().pop(), rivit = viikot[v] || {}, arvot = Object.keys(rivit).map(function (u) { return rivit[u] && rivit[u].arvo; }).filter(function (x) { return x === 1 || x === 2 || x === 3; });
      if (!arvot.length) return; havaittu++; if (arvot.indexOf(3) >= 0 && arvot.every(function (x) { return x === 3; })) a++;
    });
    if (!havaittu) return null;
    var b = havaittu; try { var osat = K && h.konsepti_avain ? K.tmKtOsat({ konsepti_avain: h.konsepti_avain }, { kaanon: kaanon }) : []; if (osat.length > b) b = osat.length; } catch (e) { /* kaanon puuttuu */ }
    return { a: a, b: b };
  }
  /* K1b: Historian kesto = TOTEUTUNUT, kun jakso on suljettu (suljettu-päivä): alle 7 pv → '{n} pv', muuten pyöristetty viikkoihin '{n} vk'. Ilman sulkupäivää suunniteltu kesto (alkoi → paattyi) viikkoina kuten ennen (min 1). Kalenteripäivät paikallisesti (ei kellonaika-/kesäaikavirhettä). */
  function _kalPv(ms) { var d = new Date(ms); return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000; }
  function _kesto(h) {
    var a = _ms(String(h.alkoi || '').length <= 10 ? h.alkoi + 'T00:00:00' : h.alkoi), toteutunut = isFinite(_ms(h.suljettu)), loppu = toteutunut ? h.suljettu : h.paattyi;
    var b = _ms(String(loppu || '').length <= 10 ? loppu + 'T00:00:00' : loppu); if (!(isFinite(a) && isFinite(b))) return null;
    var pv = Math.round(_kalPv(b) - _kalPv(a)); if (pv < 0) return null;
    if (toteutunut && pv < 7) return { n: Math.max(1, pv), yks: 'pv' };
    return { n: Math.max(1, Math.round(pv / 7)), yks: 'vk' };
  }
  function _kestoVk(h) { var a = _ms(String(h.alkoi || '').length <= 10 ? h.alkoi + 'T00:00:00' : h.alkoi), b = _ms(String(h.paattyi || '').length <= 10 ? h.paattyi + 'T00:00:00' : h.paattyi); return isFinite(a) && isFinite(b) && b >= a ? Math.max(1, Math.round((b - a) / 86400000 / 7)) : null; }
  function HL() { return _req('TM_HISTORIA_LAUSE', './tm_historia_lause.js'); }
  function tmKtPolkuHistoria(p, klipitDokit, ctx) {
    ctx = ctx || {}; var l = p && Array.isArray(p.jaksofokus_historia) ? p.jaksofokus_historia : [];
    var rivit = l.filter(function (h) { return h && typeof h === 'object' && (h.konsepti_nimi || h.konsepti_avain) && h.paattyi; }).sort(function (a, b) { return (_ms(b.paattyi) || 0) - (_ms(a.paattyi) || 0); });
    return rivit.map(function (h) {
      var nimi = typeof ctx.nimiFn === 'function' ? ctx.nimiFn(h.konsepti_avain, h.konsepti_nimi) : h.konsepti_nimi;
      var kl = klipitDokit ? tmKtPolkuKlipit(klipitDokit, { alkoi: h.alkoi }, { pelaaja: { id: p.id, nimi: ctx.nimi, suostumusTila: p.suostumusTila }, loppu: h.paattyi, nyt: ctx.nyt }) : null;
      return { nimi: nimi || h.konsepti_avain, alkoi: h.alkoi || '', paattyi: h.paattyi, vk: _kestoVk(h), kesto: _kesto(h), lause: typeof h.lause === 'string' ? h.lause.trim() : '', lauseLahde: h.lause_lahde === 'vp' ? 'vp' : 'valmentaja', sisainenLause: (function () { var x = HL() && HL().tmHlLause(h, ctx.reviewit); return x && x.sisainen ? x : null; })(), suljettu: HL() ? HL().tmHlLoppupvm(h) : h.paattyi, vaihdettu: h.tulos === 'vaihda', trendi: _trendi(h, ctx.kaanon), klipit: kl };
    });
  }

  /* ── HTML ── */
  function _jakso(jf) {   // jakson alkupäivä: alkoi (ISO/Date/Timestamp/ms) ensisijainen; puuttuessa alku (YYYY-MM-DD, kuten tm_kehitystyopoyta._katselmusIso ja tm_viikkokatsaus.tmVkJaksoAlkoi)
    var a = jf && jf.alkoi ? String(jf.alkoi).slice(0, 10) : '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(a) && jf && jf.alkoi != null && jf.alkoi !== '') { var ms = _ms(jf.alkoi); a = isFinite(ms) ? _paiva(ms) : ''; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(a) && jf && typeof jf.alku === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(jf.alku)) a = jf.alku;
    return /^\d{4}-\d{2}-\d{2}$/.test(a) ? a : null;
  }
  function _loppuIso(jf) {
    var K = _req('TM_KEHITYSTYOPOYTA', './tm_kehitystyopoyta.js'); return K && typeof K.tmKtKatselmusIso === 'function' ? K.tmKtKatselmusIso(jf) : null;
  }
  function _label(s) { var x = String(s == null ? '' : s).trim().replace(/_/g, '-').toLowerCase(); return /^[a-zäöå -]+$/.test(x) ? x : ''; }
  function _virhe(c, kuvaus) { var esc = c.esc || _esc; return '<div class="kt-pk-virhe" role="alert" data-kt-polku-virhe>' + esc(_txt(c, kuvaus)) + (c.uudelleenFn ? ' <button type="button" class="kt-linkki" data-kt-polku-uudelleen onclick="' + esc(c.uudelleenFn + '()') + '">' + esc(_txt(c, 'ktp_yrita_uudelleen')) + '</button>' : '') + '</div>'; }
  function _rivi(cls, kirjain, otsikko, sisalto, aria) { return '<div class="kt-jr' + (cls ? ' ' + cls : '') + '"><div class="kt-jd" aria-hidden="true">' + kirjain + '</div><div class="kt-jb"><span class="kt-eb">' + otsikko + '</span>' + sisalto + '</div></div>'; }
  function _nappi(c, fn, pid, avain, teksti, attr, cls) { var esc = c.esc || _esc; return c.toimiFn ? '<button type="button" class="' + (cls || 'kt-linkki') + '" ' + (attr || '') + ' onclick="' + esc(c.toimiFn + '(' + JSON.stringify(pid) + ',' + JSON.stringify(avain) + ')') + '">' + esc(teksti) + '</button>' : ''; }

  function _kausiHTML(p, c, tila) {
    var esc = c.esc || _esc, t = function (k) { return _txt(c, k); }, k = c.kausi || {}, pid = p.id, ots = esc(t('ktp_kausi'));
    if (k.tila === 'lataa') return _rivi('done', 'K', ots, '<div class="kt-ev" data-kt-kausi="lataa"><div class="kt-ev-lause">' + esc(t('ktp_lataa')) + '</div></div>');
    if (k.tila === 'virhe') return _rivi('done', 'K', ots, '<div class="kt-ev" data-kt-kausi="virhe">' + _virhe(c, 'ktp_virhe_kausi') + '</div>');
    var K = tmKtPolkuKausi(k.tavoite), ots2 = ots + (K && K.kausi ? ' · ' + esc(K.kausi) : '');
    var muokkaa = c.voiKirjoittaa ? _nappi(c, null, pid, 'kausitavoite', t(K ? 'ktp_muokkaa_kausitavoitetta' : 'ktp_aseta_kausitavoite'), 'data-kt-kausitavoite') : '';
    if (!K) return _rivi('done', 'K', ots, '<div class="kt-ev" data-kt-kausi="ei"><div class="kt-ev-lause">' + esc(t('ktp_kausi_ei')) + '</div>' + (muokkaa ? '<div class="kt-ev-act">' + muokkaa + '</div>' : '') + '</div>');
    var lause = [];
    if (K.omin) lause.push(esc(_fmt(t('ktp_omin_sanoin'), { teksti: K.omin })));
    if (K.tavoite) lause.push(esc(_fmt(t('ktp_tavoite_arvo'), { arvo: K.tavoite.arvo, yks: K.tavoite.yks })));
    lause.push(K.lahto ? esc(_fmt(t('ktp_lahto_mitattu'), { arvo: K.lahto.arvo, yks: K.lahto.yks, pvm: _pvm(K.lahto.pvm) })) : esc(t('ktp_lahto_ei')));
    return _rivi('done', 'K', ots2, '<div class="kt-ev" data-kt-kausi="ok"><div class="kt-ev-t"><span class="kt-ev-h">' + esc(K.nimi || K.omin) + '</span>' + (K.asetettu ? '<span class="kt-ev-age">' + esc(_fmt(t('ktp_asetettu'), { pvm: _pvm(K.asetettu) })) + '</span>' : '') + '</div><div class="kt-ev-lause">' + lause.join(' ') + '</div>' + (muokkaa ? '<div class="kt-ev-act">' + muokkaa + '</div>' : '') + '</div>');
  }

  function _klippiKysymys(r, c) { var M = _req('TM_MEDIAVIESTI', './tm_mediaviesti.js'); return M && typeof M.tmMvKysymysTeksti === 'function' ? M.tmMvKysymysTeksti(r, { t: c.t }) : (r.kysymys || ''); }
  /* K1b: lyhennys sanarajalta (≤ n merkkiä + …); lyhyt teksti sellaisenaan. */
  function _lyhenna(s, n) { s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); if (s.length <= n) return s; var x = s.slice(0, n + 1), i = x.lastIndexOf(' '); x = (i >= Math.floor(n / 2) ? x.slice(0, i) : x.slice(0, n)).replace(/[\s,.;:!?-]+$/, ''); return x + '…'; }
  function _klippiRivi(r, c) {
    var esc = c.esc || _esc, t = function (k) { return _txt(c, k); }, M = _req('TM_MEDIAVIESTI', './tm_mediaviesti.js');
    var tilaAvain = { odottaa: 'ktp_k_odottaa', vastattu: 'ktp_k_vastattu', perhe_kuittasi: 'ktp_k_perhe', odottaa_lupaa: 'ktp_k_lupa', suljettu: 'ktp_k_suljettu' }[r.tila] || 'ktp_k_odottaa';
    var kysymys = _klippiKysymys(r, c);
    var tila = r.tila === 'ajastettu' && M && M.tmMvAjastusTeksti ? M.tmMvAjastusTeksti(r.nakyvaMs, { t: c.t }, 'mv_rivi_ajastettu', 0) : t(tilaAvain);   // ajastettu: ei "lähetetty" vaan milloin pelaaja näkee (yksi lib-funktio, sama kuin Masterin mediakanava)
    var meta = [r.tekija, _pvm(r.aikaMs), tila].filter(Boolean).join(' · '), ketju = '';
    if (r.vastaus && (r.vastaus.valinta || r.vastaus.teksti)) ketju += '<span class="kt-kl-ketju" data-kt-klippi-vastaus>' + esc(t('ktp_vastaus') + ': ' + [r.vastaus.valinta, r.vastaus.teksti].filter(Boolean).join(' — ')) + '</span>';
    if (r.kuittaus_lause) ketju += '<span class="kt-kl-ketju" data-kt-klippi-kuittaus>' + esc(t('ktp_kuittaus') + ': ' + r.kuittaus_lause) + '</span>';
    var uusi = Array.isArray(c.uudet) && c.uudet.indexOf(r.klippiDocId) >= 0;   // K1b: juuri lähetetty klippi korostuu hetken (CSS-animaatio; sivu tyhjentää c.uudet 4 s kuluttua)
    return '<div class="kt-kl' + (uusi ? ' kt-kl-uusi' : '') + '" data-kt-klippi="' + esc(r.klippiDocId || r.avain) + '"' + (uusi ? ' data-kt-klippi-uusi' : '') + ' data-kt-klippi-tila="' + esc(r.tila) + '"><span class="kt-kl-v" aria-hidden="true">▶</span><span class="kt-kl-t"><b>”' + esc(kysymys) + '”</b><small>' + esc(meta) + '</small>' + ketju + '</span>'
      + (r.url ? '<a class="kt-linkki kt-kl-linkki" data-kt-klippi-linkki href="' + esc(r.url) + '" target="_blank" rel="noopener noreferrer">' + esc(t('ktp_avaa_klippi')) + '</a>' : '') + '</div>';
  }
  function _klipitHTML(p, c, kl) {
    var esc = c.esc || _esc, t = function (k) { return _txt(c, k); }, k = c.klipit || {};
    if (k.tila === 'lataa') return '<div class="kt-pk-klipit" role="group" aria-label="' + esc(t('ktp_klipit')) + '" data-kt-klipit="lataa"><div class="kt-meta">' + esc(t('ktp_lataa')) + '</div></div>';
    if (k.tila === 'virhe') return '<div class="kt-pk-klipit" role="group" aria-label="' + esc(t('ktp_klipit')) + '" data-kt-klipit="virhe">' + _virhe(c, 'ktp_virhe_klipit') + '</div>';
    if (!kl.n) return '<div class="kt-pk-klipit" role="group" aria-label="' + esc(t('ktp_klipit')) + '" data-kt-klipit="tyhja"><div class="kt-meta">' + esc(t('ktp_ei_klippeja')) + '</div></div>';
    var nakyvat = kl.rivit.slice(0, 5), loput = kl.rivit.slice(5);
    return '<div class="kt-pk-klipit" role="group" aria-label="' + esc(t('ktp_klipit')) + '" data-kt-klipit="ok" data-kt-klipit-n="' + kl.n + '">' + nakyvat.map(function (r) { return _klippiRivi(r, c); }).join('')
      + (loput.length ? '<details class="kt-kl-kaikki" data-kt-klipit-kaikki><summary>' + esc(_fmt(t('ktp_nayta_kaikki'), { n: kl.n })) + '</summary>' + loput.map(function (r) { return _klippiRivi(r, c); }).join('') + '</details>' : '') + '</div>';
  }

  function _jaksoHTML(p, c, tila, tilaNimi, osat, kl) {
    var esc = c.esc || _esc, t = function (k) { return _txt(c, k); }, pid = p.id, jf = p.jaksofokus || {}, ots = esc(t('ktp_jakso_nyt')), tt = tila && tila.tila;
    if (tilaNimi === 'ei_jaksoa') {
      var ase = !!(p.ydinvahvuus && typeof p.ydinvahvuus.kuvaus === 'string' && p.ydinvahvuus.kuvaus.trim()), nappi = '';
      if (c.voiKirjoittaa) {
        if (tt === 'valinta_tehty') nappi = _nappi(c, null, pid, 'vahvista', t('ktp_vahvista_jakso'), 'data-kt-jakso-nappi="vahvista"', 'kt-btn') + _nappi(c, null, pid, 'hylkaa', t('Hylkää valinta'), 'data-kt-hylkaa');   // K3a: Hylkää valinta sheetinä (sama avain kuin Tänään ⋯)
        else if (tt === 'valittavana') nappi = '';
        else if (ase || !c.alueMahdollinen) nappi = _nappi(c, null, pid, 'aloita', t('ktp_aloita_jakso'), 'data-kt-jakso-nappi="aloita"', 'kt-btn');
        else nappi = _nappi(c, null, pid, 'aseta_alue', t('ktp_aseta_ydinvahvuus'), 'data-kt-aseta-alue', 'kt-btn');
      }
      return _rivi('now', '·', ots, '<div class="kt-sig n" data-kt-jakso="ei_jaksoa"><div class="kt-sig-h">' + esc(t('ktp_ei_jaksoa')) + '</div><div class="kt-sig-why">' + esc(t(tt === 'valittavana' ? 'ktp_valinta_odottaa' : 'ktp_ei_jaksoa_ohje')) + '</div>' + (nappi ? '<div>' + nappi + '</div>' : '') + '</div>');
    }
    var K = _req('TM_KEHITYSTYOPOYTA', './tm_kehitystyopoyta.js'), alku = _jakso(jf), loppu = _loppuIso(jf);
    var viikko = (tila && tila.rivitila && tila.rivitila.vk) ? tila.rivitila.vk : null;
    var ots2 = ots + (alku && loppu && _pvm(alku) && _pvm(loppu) ? ' · ' + esc(_pvm(alku) + '–' + _pvm(loppu)) : '');   // ei tyhjää "· –" -väliä
    var age = tilaNimi === 'katselmus' ? t('ktp_paattynyt') : (viikko ? _fmt(t('ktp_viikko'), { n: viikko.n, k: viikko.yht }) : '');
    var tukiAlue = jf.tukiosa && typeof jf.tukiosa.alue === 'string' ? jf.tukiosa.alue.replace(/\s*\(\s*(?:yli|alle|noin|n\.)?\s*\)/gi, '').trim() : '';   // tyhjät sulkeet "(yli )" pois (arvo puuttuu → ei näytetä)
    var lause = [_label(jf.domeeni), tukiAlue ? _fmt(t('ktp_tuki'), { alue: tukiAlue }) : '', loppu ? _fmt(t('ktp_arviointi'), { pvm: _pvm(loppu) }) : ''].filter(Boolean).join(' · ');
    var osatHTML = K ? K.tmKtOsatHTML({ osat: osat, viikonOsa: tilaNimi === 'katselmus' ? null : K.tmKtViikonOsa(osat, K.tmKtValittuOsa(jf, c.tanaan)), jaksoNimi: '' }, { esc: esc, t: c.t, osaFn: c.voiKirjoittaa ? c.osaFn : null, pid: pid, nimet: c.nimet, v2: true }) : '';
    var toiminnot = '';
    if (c.voiKirjoittaa && c.toimiFn) {
      var primary = tilaNimi === 'katselmus' ? _nappi(c, null, pid, 'sulje', t('ktp_sulje_jakso'), 'data-kt-jakso-nappi="sulje"', 'kt-btn') : _nappi(c, null, pid, 'havainto', t('ktp_merkitse_havainto'), 'data-kt-jakso-nappi="havainto"');
      var valikko = [['klippi', 'ktp_lisaa_klippi', 'data-kt-lisaa-klippi'], ['taulu', 'ktp_piirra_taululle', 'data-kt-piirra-taululle'], ['muokkaa', 'ktp_muokkaa_jaksoa', 'data-kt-jakso-muokkaa']];   /* K1b: Piirrä taululle (modaali pelaajakortin päälle) */
      var KSP = _req('TM_KENTTA_SPEC', './tm_kentta_spec.js'), onAlue = c.alueAsetettu != null ? !!c.alueAsetettu : !!(KSP && KSP.tmKenttaAlue(p));
      if (c.alueMahdollinen) valikko.push(['aseta_alue', onAlue ? 'ka_vaihda' : 'ka_aseta_alue', 'data-kt-aseta-alue'])   /* K1: 'Aseta alue' kun aluetta ei ole, 'Vaihda aluetta' kun on (ka_vaihda: sv jo olemassa; ka_aseta_alue: erä 72) */;
      if (tilaNimi !== 'katselmus') valikko.push(['sulje', 'ktp_sulje_jakso', 'data-kt-jakso-sulje']);
      var voiValita = !!(p.ydinvahvuus && typeof p.ydinvahvuus.kuvaus === 'string' && p.ydinvahvuus.kuvaus.trim());
      if (tilaNimi !== 'katselmus') valikko.push(['anna_valita', null, 'data-kt-anna-valita', voiValita, t('Anna pelaajan valita seuraava reitti')]);   /* K3a: sama toiminto kuin Tänään ⋯; vain kun ydinvahvuuden kuvaus on asetettu, muuten harmaa rivi + syy */
      var menu = '<details class="kt-valikko kt-pk-valikko"><summary class="kt-nappi kt-nappi-kuva" aria-label="' + esc(t('ktp_valikko')) + '">⋯</summary><div class="kt-valikko-lista" role="menu">' + valikko.map(function (v) {
        var nimi = v[4] != null ? v[4] : t(v[1]);   // v[4] = jo käännetty teksti (K3a)
        if (v[3] === false) return '<button type="button" role="menuitem" ' + v[2] + ' disabled title="' + esc(t('kt_valikko_syy_kuvaus')) + '">' + esc(nimi) + '<small data-kt-valikko-syy>' + esc(t('kt_valikko_syy_kuvaus')) + '</small></button>';
        return '<button type="button" role="menuitem" ' + v[2] + ' onclick="' + esc(c.toimiFn + '(' + JSON.stringify(pid) + ',' + JSON.stringify(v[0]) + ')') + '">' + esc(nimi) + '</button>'; }).join('') + '</div></details>';
      toiminnot = '<div class="kt-ev-act">' + primary + menu + '</div>';
    }
    return _rivi('now' + (tilaNimi === 'katselmus' ? ' w' : ''), viikko ? viikko.n + '/' + viikko.yht : '·', ots2,
      '<div class="kt-ev" data-kt-jakso="' + esc(tilaNimi) + '"><div class="kt-ev-t"><span class="kt-ev-h" data-kt-jakso-nimi>' + esc(jf.konsepti_nimi || '') + '</span>' + (age ? '<span class="kt-ev-age">' + esc(age) + '</span>' : '') + '</div>'
      + (lause ? '<div class="kt-ev-lause">' + esc(lause) + '</div>' : '') + osatHTML + (tilaNimi === 'vahan' ? '<div class="kt-meta" data-kt-vahan-ohje>' + esc(t('ktp_vahan_ohje')) + '</div>' : '')
      + _klipitHTML(p, c, kl) + toiminnot + '</div>');
  }


  /* ── B4b: Tämä viikko · Pelaajan ääni · Historia ── */
  var PV = ['ktp_pv_ma', 'ktp_pv_ti', 'ktp_pv_ke', 'ktp_pv_to', 'ktp_pv_pe', 'ktp_pv_la', 'ktp_pv_su'];
  function _viikkoHTML(p, c, tila) {
    if (!c.viikko) return '';   // ei viikkodataa (vain B4a-kutsuja) → rivi pois
    var esc = c.esc || _esc, t = function (k) { return _txt(c, k); }, v = c.viikko, tanaan = c.tanaan || _isoPaiva(c.nyt ? new Date(_ms(c.nyt)) : new Date()), pv = _viikonPaivat(tanaan);
    var ots = esc(t('ktp_viikko_ots') + ' · ' + _pvm(pv[0]) + '–' + _pvm(pv[6]) + ' · ' + t('ktp_viikko_luku'));
    if (v.tila === 'lataa') return _rivi('', 'vk', ots, '<div class="kt-meta" data-kt-viikko="lataa">' + esc(t('ktp_lataa')) + '</div>');
    if (v.tila === 'virhe') return _rivi('', 'vk', ots, '<div data-kt-viikko="virhe">' + _virhe(c, 'ktp_virhe_viikko') + '</div>');
    var w = tmKtPolkuViikko(v.docs || [], p, { tanaan: tanaan, joukkueDocs: c.joukkueDocs });
    var kaynnissa = tila && (tila.tila === 'kaynnissa' || tila.tila === 'vahvistettu') && c.ikavaihe !== 'leikkija', vk = c.vk && Array.isArray(c.vk.docs) ? c.vk.docs : null;
    var vastattu = vk ? vk.some(function (x) { return x && x.id === pv[6]; }) : null;
    var solut = w.paivat.map(function (d, i) {
      var evs = d.tapahtumat.map(function (e) { return '<span class="kt-vk-e ' + e.tyyppi + '" data-kt-vk-tapahtuma="' + e.tyyppi + '"><span>' + esc(t(e.tyyppi === 'ottelu' ? 'ktp_ev_ottelu' : 'ktp_ev_harjoitus')) + '</span>' + (e.klo || e.nimi ? '<small>' + esc([e.klo, e.tyyppi === 'ottelu' ? e.nimi : ''].filter(Boolean).join(' · ')) + '</small>' : '') + '</span>'; }).join('');
      var kat = i === 6 && kaynnissa ? '<span class="kt-vk-e kat" data-kt-vk-katsaus' + (vastattu == null ? '' : ' data-kt-vk-katsaus-tila="' + (vastattu ? 'vastattu' : 'odottaa') + '"') + '><span>' + esc(t('ktp_vk_katsaus')) + '</span>' + (vastattu == null ? '' : '<small>' + esc(t(vastattu ? 'ktp_vk_vastattu' : 'ktp_vk_odottaa')) + '</small>') + '</span>' : '';
      return '<div class="kt-vk-p' + (d.iso === tanaan ? ' tdy' : '') + (evs || kat ? '' : ' tyhja') + '" data-kt-vk-paiva="' + d.iso + '"><span class="kt-vk-d">' + esc(t(PV[i])) + '</span>' + evs + kat + '</div>';
    }).join('');
    return _rivi('', 'vk', ots, '<div class="kt-vk" data-kt-viikko="ok" data-kt-viikko-n="' + w.n + '">' + solut + '</div>' + (w.n ? '' : '<div class="kt-meta" data-kt-vk-ei>' + esc(t('ktp_vk_ei_tapahtumia')) + '</div>') + '<div class="kt-meta">' + esc(t('ktp_vk_lahde')) + '</div>');
  }
  function _aaniHTML(p, c) {
    var esc = c.esc || _esc, t = function (k) { return _txt(c, k); }, k = c.kausi || {}, kl = c.klipit || {};
    var a = tmKtPolkuAani({ kausi: k.tila === 'ok' ? tmKtPolkuKausi(k.tavoite) : null, klipit: kl.tila === 'ok' ? kl.dokit : [], vk: c.vk && Array.isArray(c.vk.docs) ? c.vk.docs : null, pelaaja: { id: p.id, nimi: c.nimi, suostumusTila: p.suostumusTila } });
    if (!a.rivit.length) return '';   // 0 lähdettä: ei otsikkoa, ei paikkamerkkiä (D105)
    var LAHDE = { kausi: 'ktp_a_kausi', klippi: 'ktp_a_klippi', vk: 'ktp_a_vk' };
    return _rivi('', 'ä', esc(t('ktp_aani')), '<div class="kt-aani" data-kt-aani data-kt-aani-n="' + a.rivit.length + '">' + a.rivit.map(function (r) {
      return '<div class="kt-ar" data-kt-aani-lahde="' + r.lahde + '"><div class="kt-aq">”' + esc(r.teksti) + '”</div><div class="kt-as"><b>' + esc(t(LAHDE[r.lahde])) + '</b><span>' + esc(_pvm(r.ms)) + '</span></div></div>';
    }).join('') + '<div class="kt-meta">' + esc(a.yht > a.rivit.length ? _fmt(t('ktp_a_uusinta'), { n: a.rivit.length, yht: a.yht }) : _fmt(t('ktp_a_omaa'), { n: a.yht })) + '</div></div>');
  }
  function _historiaHTML(p, c) {
    var esc = c.esc || _esc, t = function (k) { return _txt(c, k); }, kl = c.klipit || {}, ots = esc(t('ktp_historia'));
    var h = tmKtPolkuHistoria(p, kl.tila === 'ok' ? kl.dokit : null, { kaanon: c.kaanon, nimiFn: c.historiaNimiFn, nimi: c.nimi, nyt: c.nyt, reviewit: c.reviewit && c.reviewit.tila === 'ok' ? c.reviewit.docs : null });
    if (!h.length) return _rivi('', 'H', ots, '<div class="kt-meta" data-kt-historia="tyhja">' + esc(t('ktp_h_tyhja')) + '</div>');
    return _rivi('', 'H', ots, '<div class="kt-hist" data-kt-historia="ok" data-kt-historia-n="' + h.length + '">' + h.map(function (r) {
      var aika = [r.alkoi ? _pvm(r.alkoi) : '', _pvm(r.suljettu || r.paattyi)].filter(Boolean).join('–')   /* 0b-jatko: todellinen sulkemispäivä kun se on olemassa */, osa = r.trendi ? '<b class="kt-h-trendi ' + (r.trendi.a > 0 ? 'ylos' : 'sama') + '" data-kt-h-trendi>' + (r.trendi.a > 0 ? '↗ ' : '→ ') + esc(_fmt(t('ktp_h_osaa'), r.trendi)) + '</b>' : '';
      var rivi = [esc(r.nimi), r.kesto ? esc(_fmt(t(r.kesto.yks === 'pv' ? 'ktp_h_pv' : 'ktp_h_vk'), { n: r.kesto.n })) : '', osa, r.vaihdettu ? '<b class="kt-h-trendi sama">→ ' + esc(t('ktp_h_vaihdettu')) + '</b>' : ''].filter(Boolean).join(' · ');
      var lause = r.lause ? '<span class="kt-h-lause">”' + esc(r.lause) + '” – ' + esc(t(r.lauseLahde === 'vp' ? 'ktp_h_lause_vp' : 'ktp_h_lause_valm')) + '</span>' : '';
      if (!lause && r.sisainenLause) lause = '<span class="kt-h-lause" data-kt-h-sisainen>”' + esc(r.sisainenLause.teksti) + '” – ' + esc(t(r.sisainenLause.lahde === 'vp' ? 'ktp_h_lause_vp' : 'ktp_h_lause_valm')) + HL().tmHlSisainenMerkki({ esc: esc, t: c.t }) + '</span>';
      var viimeisin = r.klipit && r.klipit.n ? _lyhenna(_klippiKysymys(r.klipit.rivit[0], c), 32) : '';   /* K1b: viimeisimmän (uusin ensin) klipin kysymys lyhennettynä Klipit-rivin perään */
      var klipit = r.klipit && r.klipit.n ? '<details class="kt-h-klipit" data-kt-h-klipit><summary>' + esc(_fmt(t('ktp_h_klipit'), { n: r.klipit.n })) + (viimeisin ? ' · ”' + esc(viimeisin) + '”' : '') + '</summary>' + r.klipit.rivit.map(function (x) { return _klippiRivi(x, c); }).join('') + '</details>' : '';
      return '<div class="kt-h" data-kt-h><span class="kt-h-aika">' + esc(aika) + '</span><span class="kt-h-rivi">' + rivi + '</span>' + lause + klipit + '</div>';
    }).join('') + '</div>');
  }

  /* p = pelaaja (D248-näyttökopio: jaksofokus.konsepti_nimi sanastosta), ctx kuten otsikossa. Koko jana = YKSI .kt-polku-juuri. */
  function tmKtPolkuHTML(p, c) {
    c = c || {}; p = p || {}; var K = _req('TM_KEHITYSTYOPOYTA', './tm_kehitystyopoyta.js'), jf = p.jaksofokus || null;
    var tila = c.tila || null, kaynnissa = tila && (tila.tila === 'kaynnissa' || tila.tila === 'vahvistettu' || tila.tila === 'paattynyt');
    var osat = kaynnissa && K ? K.tmKtOsat(jf, { kaanon: c.kaanon }) : [];
    var kl = kaynnissa ? tmKtPolkuKlipit((c.klipit && c.klipit.dokit) || [], jf, { pelaaja: { id: p.id, nimi: c.nimi, suostumusTila: p.suostumusTila }, nyt: c.nyt }) : { rivit: [], n: 0 };
    var tilaNimi = tmKtPolkuTila(p, tila, osat, c.klipit && c.klipit.tila === 'ok' ? kl : null);
    return '<div class="kt-pk" data-kt-polku data-kt-polku-tila="' + (c.esc || _esc)(tilaNimi) + '"><div class="kt-jana">' + _kausiHTML(p, c, tila) + _jaksoHTML(p, c, tila, tilaNimi, osat, kl) + _viikkoHTML(p, c, tila) + _aaniHTML(p, c) + _historiaHTML(p, c) + '</div></div>';
  }

  function tmKtPolkuCss() {
    return [
      '.kt-pk{max-width:860px}.kt-jana{position:relative;display:grid;gap:18px;padding-left:44px}',
      '.kt-jana::before{content:"";position:absolute;left:15px;top:14px;bottom:14px;width:1px;background:var(--border)}',
      '.kt-jr{position:relative;display:grid;gap:6px;min-width:0}.kt-jb{display:grid;gap:6px;min-width:0}',
      '.kt-jd{position:absolute;left:-44px;top:0;width:32px;height:32px;border-radius:50%;border:1px solid var(--border);background:var(--bg);color:var(--ink2);display:flex;align-items:center;justify-content:center;font-size:var(--fs-meta,12.5px)}',
      '.kt-jr.done .kt-jd{border-color:var(--teal);color:var(--teal)}.kt-jr.now .kt-jd{border-color:var(--teal);color:var(--teal)}.kt-jr.now.w .kt-jd{border-color:var(--amber);color:var(--amber)}',
      '.kt-pk .kt-ev .kt-osat{margin-top:2px}.kt-pk-klipit{display:grid;gap:6px;margin-top:2px}.kt-pk-virhe{font-size:var(--fs-body,14px);color:var(--amber)}',
      '.kt-kl{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:10px;align-items:center;border:1px solid var(--border);border-radius:4px;padding:8px 10px;background:var(--bg)}',
      '.kt-kl-v{width:28px;height:28px;border-radius:4px;background:var(--bg2,var(--card));color:var(--teal);display:flex;align-items:center;justify-content:center;font-size:var(--fs-meta,12.5px)}',
      '.kt-kl-t{display:grid;gap:1px;min-width:0;font-size:var(--fs-body,14px)}.kt-kl-t small{font-size:var(--fs-meta,12.5px);color:var(--ink2)}.kt-kl-ketju{font-size:var(--fs-meta,12.5px);color:var(--ink2)}',
      '.kt-kl-uusi{border-color:var(--teal);animation:ktKlUusi 3.6s ease-out}@keyframes ktKlUusi{0%,55%{background:var(--teal-dim,var(--bg2,var(--card)));box-shadow:0 0 0 2px var(--teal)}100%{background:var(--bg);box-shadow:0 0 0 0 transparent}}@media (prefers-reduced-motion:reduce){.kt-kl-uusi{animation:none;box-shadow:0 0 0 2px var(--teal)}}',
      '.kt-kl-kaikki{display:grid;gap:6px}.kt-kl-kaikki summary{cursor:pointer;font-size:var(--fs-body,14px);font-weight:600;color:var(--teal);margin-bottom:6px}',
      '.kt-pk .kt-ev-act{position:relative}.kt-pk-valikko{margin-left:auto}',
      '.kt-vk{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px}.kt-vk-p{display:grid;align-content:start;gap:3px;min-width:0;border:1px solid var(--border);border-radius:4px;padding:6px 7px;background:var(--bg);min-height:62px}.kt-vk-p.tdy{border-color:var(--teal)}',
      '.kt-vk-d{font-size:var(--fs-eb,11px);letter-spacing:.06em;text-transform:uppercase;color:var(--ink2)}.kt-vk-e{display:grid;font-size:var(--fs-meta,12.5px);color:var(--ink)}.kt-vk-e small{font-size:var(--fs-eb,11px);color:var(--ink2)}.kt-vk-e.ottelu{color:var(--amber)}.kt-vk-e.kat{color:var(--ink2)}',
      '.kt-aani{display:grid;gap:8px}.kt-ar{display:grid;gap:3px;border-left:2px solid var(--teal);padding:2px 0 2px 10px}.kt-aq{font-size:var(--fs-body,14px);color:var(--ink)}.kt-as{display:flex;gap:8px;font-size:var(--fs-meta,12.5px);color:var(--ink2)}.kt-as b{font-weight:600}',
      '.kt-hist{display:grid;gap:10px}.kt-h{display:grid;gap:3px;min-width:0}.kt-h-aika{font-size:var(--fs-meta,12.5px);color:var(--ink2)}.kt-h-rivi{font-size:var(--fs-body,14px);color:var(--ink)}.kt-h-trendi.ylos{color:var(--teal)}.kt-h-trendi.sama{color:var(--amber)}.kt-h-lause{font-size:var(--fs-meta,12.5px);color:var(--ink2)}',
      '.kt-h-klipit{display:grid;gap:6px}.kt-h-klipit summary{cursor:pointer;font-size:var(--fs-meta,12.5px);font-weight:600;color:var(--teal);margin-bottom:6px}',
      '@media (max-width:720px){.kt-vk{grid-template-columns:1fr}.kt-vk-p{grid-template-columns:34px 1fr;align-items:baseline;min-height:0}.kt-vk-p.tyhja{display:none}.kt-jana{padding-left:36px}.kt-jana::before{left:11px}.kt-jd{left:-36px;width:24px;height:24px;font-size:var(--fs-eb,11px)}.kt-kl{grid-template-columns:auto minmax(0,1fr)}.kt-kl-linkki{grid-column:2;justify-self:start}}'
    ].join('\n');
  }

  var API = { FI: FI, tmKtPolkuLataaKausi: tmKtPolkuLataaKausi, tmKtPolkuKausi: tmKtPolkuKausi, tmKtPolkuKlipit: tmKtPolkuKlipit, tmKtPolkuTila: tmKtPolkuTila, tmKtPolkuViikonIkkuna: tmKtPolkuViikonIkkuna, tmKtPolkuViikko: tmKtPolkuViikko, tmKtPolkuLataaViikko: tmKtPolkuLataaViikko, tmKtPolkuAani: tmKtPolkuAani, tmKtPolkuHistoria: tmKtPolkuHistoria, tmKtPolkuHTML: tmKtPolkuHTML, tmKtPolkuCss: tmKtPolkuCss };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.TM_KT_POLKU = API;
})(typeof window !== 'undefined' ? window : this);
