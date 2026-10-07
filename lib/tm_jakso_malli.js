/* ════════════════════════════════════════════════════════════════════════
   tm_jakso_malli.js — R6.3-A: jakson datamalli ilman UI:ta (PURE, ei Firebasea/DOM:ia/kyselyjä). 01 · "R6.3:n suunnittelu · linjaukset 5.10.2026 (koottu täsmennys)", D8, D16.
   Rakentajat normalisoivat ja VALIDOIVAT kentät ennen kirjoitusta (adapteri vie ne tmAsetaJaksofokus:n kautta); virheellinen syöte → throw (ei hiljaista roskaa).

   · tmYdinvahvuus({kuvaus, havaittu_pvm, rooli})        → pelaajan oma ydinvahvuus (se mikä tekee pelaajasta vaarallisen); valmentaja havainnoi ja vahvistaa. EI xfactor-nimistä kenttää.
   · tmTukiosa({alue, perustelu, harjoitteet[{id,nimi,lahde:'seura'|'tm'}]}) → tukiosa PERUSTELLAAN ydinvahvuudella; pelaaja näkee harjoitteet ja perustelun. alue neutraali ('kestävyys').
   · tmTukitarve({alue, merkitty_pvm, rooli})             → VAIN henkilökunnalle (ei pelaajan/huoltajan pinnoissa, ei raporteissa); vahvistetaan tai poistetaan katselmuksessa.
   · tmKevytJakso(jf)                                    → kotitehtävä = jakson kevyt muoto (muoto:'kevyt'); päättyy jakson vaihdossa ('korvattu'), arkistoriville lisakentat {kuittauksia:n}.
   · tmRajoittaaPelaamista(p, opts)                       → SISÄINEN funktio: ehto = valmentajan tukitarve TAI fyysinen testitulos Eerikkilä-normien alimmalla tasolla (normiIka). Kypsyyssuoja (§25):
                                                            PRE/LAH tai tuntematon PHV → pelkkä fyysinen testitulos EI riitä; tuntemattomalla PHV:llä vihje 'mittaa_kasvu'. Pelipaikan KPI = kolmas ehto myöhemmin (R6.3b).
   · tmYdinvahvuusVihje(p, ydinvahvuus, opts)             → kypsyyssuoja toiseen suuntaan (§25): PHV POST tai varhain kypsynyt JA ydinvahvuus fyysinen → vihje 'harkitse_tekninen_tai_taktinen'.
   · tmPelaajanVaihtoehdot(jf)                           → D8: pelaaja näkee vain valmentajan VAHVISTAMAT (vahvistettu:true) vaihtoehdot, ja vain kun jakso on 'valittavana'; vahvistamattomia ei koskaan.
   · tmJoukkueenTeema(joukkue, pvm, opts)                 → {nyt, seuraava} | null (null = teemaa ei näytetä; näkymän pitää toimia). Lähde D16 = A: seurat/{id}/valmennuslinja/teemat (opts.teemat annetaan lukijalta;
                                                            lib ei lue Firestorea). Muoto VÄLIAIKAINEN kunnes valmennuslinja-PR vahvistaa: teemat.jaksot = [{joukkue, alkaa, paattyy, teema}].
   · tmJaksoTekstiKelpaa / tmTarkistaJaksoData            → GDPR (tarkastusoikeus, tietojen vienti): kaikki tallennettu teksti voidaan näyttää huoltajalle; sanat heikkous, rajoite, kriittinen (ja muodot)
                                                            EIVÄT saa esiintyä pelaaja- eikä jaksodatassa (arvoissa eivätkä avaimissa); "ase" ei saa esiintyä kenttänimissä (neutraalit kenttänimet).
   Dual-export: module.exports || window.TM_JAKSO_MALLI.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  // GDPR/§7.22: kielletyt sanat (taivutukset mukana). Avainsanat tahallaan tässä: tämä on vartijan oma lista, ei tallennettua tekstiä.
  var KIELLETYT = /heikkou|rajoite|rajoitt|kriittin|kriittis/i;
  // Firestore-kenttänimet ovat NEUTRAALEJA: näkyvä sana (esim. ydinvahvuus) tulee käännöksistä eikä kenttänimestä (GDPR-vienti näyttää kenttänimet). "ase" ei saa esiintyä kenttänimissä (segmenttinä).
  var KENTTANIMI_KIELLETTY = /(^|_)ase(_|$)/i;
  var HENKILOKUNTA = { valmentaja: 1, talenttivalmentaja: 1, fysiikkavalmentaja: 1, fysioterapeutti: 1, vp: 1, urheilutoimenjohtaja: 1, testivastaava: 1 };
  var LAHTEET = { seura: 1, tm: 1 };
  var FYYSISET = { kiihdytys: 1, maksinopeus: 1, voima: 1, ketteryys: 1, suunnanmuutos: 1, aerobinen: 1, fyysinen: 1, nopeus: 1, kestavyys: 1 };

  function _g(n) { return root && root[n]; }
  function _req(n, f) { try { return (typeof module !== 'undefined' && module.exports && typeof require === 'function') ? require(f) : _g(n); } catch (e) { return _g(n); } }

  function tmJaksoTekstiKelpaa(teksti) {
    var s = String(teksti == null ? '' : teksti), m = KIELLETYT.exec(s);
    return { ok: !m, loydetty: m ? m[0] : null };
  }
  // Käy läpi arvot JA avaimet; palauttaa polut joissa kielletty sana (tyhjä taulukko = puhdas). Syvyysraja suojaa kehästä.
  function tmTarkistaJaksoData(data, polku, _syv) {
    polku = polku || '$'; _syv = _syv || 0;
    var out = [];
    if (_syv > 12 || data == null) return out;
    if (typeof data === 'string') { if (KIELLETYT.test(data)) out.push(polku); return out; }
    if (typeof data !== 'object') return out;
    Object.keys(data).forEach(function (k) {
      if (KIELLETYT.test(k) || KENTTANIMI_KIELLETTY.test(k)) out.push(polku + '.' + k + ' (avain)');
      out = out.concat(tmTarkistaJaksoData(data[k], polku + '.' + k, _syv + 1));
    });
    return out;
  }

  function _teksti(v, nimi, pakollinen) {
    if (v == null || v === '') { if (pakollinen) throw new Error('tm_jakso_malli: ' + nimi + ' puuttuu'); return null; }
    if (typeof v !== 'string') throw new Error('tm_jakso_malli: ' + nimi + ' ei ole teksti');
    var t = v.trim();
    if (pakollinen && !t) throw new Error('tm_jakso_malli: ' + nimi + ' tyhjä');
    var k = tmJaksoTekstiKelpaa(t);
    if (!k.ok) throw new Error('tm_jakso_malli: ' + nimi + ' sisältää kielletyn sanan (' + k.loydetty + ') — teksti voidaan näyttää huoltajalle (GDPR)');
    return t;
  }
  function _pvm(v, nimi) {
    if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new Error('tm_jakso_malli: ' + nimi + ' ei ole päivämäärä YYYY-MM-DD (paikallinen päivä, §7.26)');
    var o = v.split('-'), y = +o[0], m = +o[1], p = +o[2], pv = [31, (y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];   // kalenteripäivä (ei UTC-johdannaista, §7.26)
    if (m < 1 || m > 12 || p < 1 || p > pv[m - 1]) throw new Error('tm_jakso_malli: ' + nimi + ' ei ole kelvollinen päivä');
    return v;
  }
  function _rooli(v) {
    if (!HENKILOKUNTA[v]) throw new Error('tm_jakso_malli: rooli ei ole henkilökunnan rooli (' + v + ')');
    return v;
  }

  function tmYdinvahvuus(x) {
    x = x || {};
    return { kuvaus: _teksti(x.kuvaus, 'ydinvahvuus.kuvaus', true), havaittu_pvm: _pvm(x.havaittu_pvm, 'ydinvahvuus.havaittu_pvm'), rooli: _rooli(x.rooli) };
  }
  function tmTukiosa(x) {
    x = x || {};
    var h = Array.isArray(x.harjoitteet) ? x.harjoitteet : [];
    return {
      alue: _teksti(x.alue, 'tukiosa.alue', true),
      perustelu: _teksti(x.perustelu, 'tukiosa.perustelu', true),   // sitoo tukiosan ydinvahvuuteen — pakollinen
      harjoitteet: h.map(function (e, i) {
        if (!e || typeof e !== 'object') throw new Error('tm_jakso_malli: tukiosa.harjoitteet[' + i + '] ei ole objekti');
        if (e.tila != null && e.tila !== 'hyvaksytty') throw new Error('tm_jakso_malli: tukiosa.harjoitteet[' + i + '] on luonnos — jaksoon snapshotataan vain hyväksytty (tila)');
        if (!LAHTEET[e.lahde]) throw new Error('tm_jakso_malli: tukiosa.harjoitteet[' + i + '].lahde pitää olla \'seura\' tai \'tm\' (D16)');
        var id = e.id != null ? String(e.id).trim() : '';
        if (!id) throw new Error('tm_jakso_malli: tukiosa.harjoitteet[' + i + '].id puuttuu');
        var o = { id: id, nimi: _teksti(e.nimi, 'tukiosa.harjoitteet[' + i + '].nimi', true), lahde: e.lahde };
        // Valinnaiset kotiharjoitteen kentät (seuran ohjelmasta/pankista kopioitu snapshot): pelaaja näkee liikkeen, toistot, ohjeen ja linkit. Tekstit GDPR-vartijan läpi; linkit vain http(s).
        ['liike', 'toistot', 'palautus', 'pelaajan_ohje', 'ohjelma_id', 'kotiin_huomio', 'lahde_nimi'].forEach(function (k) { var t = _teksti(e[k], 'tukiosa.harjoitteet[' + i + '].' + k, false); if (t != null) o[k] = t; });
        ['kesto_min', 'jarjestys', 'ohjelma_versio'].forEach(function (k) { if (e[k] != null) { if (typeof e[k] !== 'number' || !isFinite(e[k])) throw new Error('tm_jakso_malli: tukiosa.harjoitteet[' + i + '].' + k + ' ei ole luku'); o[k] = e[k]; } });
        ['video_url', 'kuva_url'].forEach(function (k) { if (e[k] != null && e[k] !== '') { if (typeof e[k] !== 'string' || !/^https?:\/\//i.test(e[k])) throw new Error('tm_jakso_malli: tukiosa.harjoitteet[' + i + '].' + k + ' pitää olla http(s)-linkki'); o[k] = e[k]; } });
        return o;
      })
    };
  }
  // ── Seuran hyväksytty sisältö → tukiosan kotiharjoitteet (SNAPSHOT-kopio; B 2/3). Vain tila 'hyvaksytty'; joukkuekäyttöiset (kaytto 'joukkue') ja ei-kotiin-sopivat liikkeet EIVÄT koskaan pelaajalle. ──
  function _eiJoukkue(x) { return !x || x.kaytto !== 'joukkue'; }
  // ohjelmat/{id}-dokumentti ({id, nimi, tila, lahde, versio, liikkeet[{jarjestys, liike, toistot, palautus, pelaajan_ohje, kesto_min, kotiin_sopiva, video_url, kuva_url}]}) → harjoitteet[]
  function tmOhjelmaTukiosaan(o, opts) {
    if (!o || o.tila !== 'hyvaksytty') throw new Error('tm_jakso_malli: ohjelma ei ole hyväksytty (tila) — jaksoon liitetään vain hyväksytty');
    var lista = (Array.isArray(o.liikkeet) ? o.liikkeet : []).filter(function (l) { return l && l.kotiin_sopiva === true && _eiJoukkue(l) && typeof l.liike === 'string' && l.liike.trim(); });
    if (!lista.length) throw new Error('tm_jakso_malli: ohjelmassa ei ole kotiin sopivia liikkeitä');
    var lahde = o.lahde === 'tm' ? 'tm' : 'seura';
    return lista.map(function (l, i) {
      var e = { id: String(o.id) + '#' + (l.jarjestys != null ? l.jarjestys : i + 1), nimi: l.liike, lahde: lahde, liike: l.liike, toistot: l.toistot || null, palautus: l.palautus || null, pelaajan_ohje: l.pelaajan_ohje || null,
        kesto_min: typeof l.kesto_min === 'number' ? l.kesto_min : null, jarjestys: typeof l.jarjestys === 'number' ? l.jarjestys : i + 1, ohjelma_id: String(o.id), ohjelma_versio: typeof o.versio === 'number' ? o.versio : 1, video_url: l.video_url || null, kuva_url: l.kuva_url || null,
        kotiin_huomio: l.kotiin_huomio || null, lahde_nimi: (opts && opts.seuraNimi) || null };   // huomio ("keppi", "tarvitsee parin") + seuran nimi lähdemerkinnäksi — näytetään pelaajalle
      Object.keys(e).forEach(function (k) { if (e[k] === null) delete e[k]; });
      return e;
    });
  }
  // harjoitepankki/{id}-dokumentti → yksi kotiharjoite (vain hyväksytty, kaytto != 'joukkue')
  function tmHarjoiteTukiosaan(h, opts) {
    if (!h || h.tila !== 'hyvaksytty') throw new Error('tm_jakso_malli: harjoite ei ole hyväksytty (tila) — jaksoon liitetään vain hyväksytty');
    if (!_eiJoukkue(h)) throw new Error('tm_jakso_malli: joukkueharjoite (kaytto "joukkue") ei ole pelaajan kotiharjoite');
    var e = { id: String(h.id), nimi: h.nimi, lahde: h.lahde === 'tm' ? 'tm' : 'seura', liike: h.nimi, pelaajan_ohje: h.ohje || null, kesto_min: typeof h.kesto_min === 'number' ? h.kesto_min : null, video_url: h.video_url || null, kuva_url: h.kuva_url || null, kotiin_huomio: h.kotiin_huomio || null, lahde_nimi: (opts && opts.seuraNimi) || null };
    Object.keys(e).forEach(function (k) { if (e[k] === null) delete e[k]; });
    return e;
  }
  // Yhdistä uudet harjoitteet OLEMASSA OLEVAAN tukiosaan (ei luoda tukiosaa tyhjästä — perustelu sidotaan ydinvahvuuteen). Sama id korvataan. → validoitu harjoitteet[]
  function tmLiitaTukiosaan(tukiosa, uudet) {
    if (!tukiosa || typeof tukiosa !== 'object' || !tukiosa.alue || !tukiosa.perustelu) throw new Error('tm_jakso_malli: jaksolla ei ole tukiosaa (alue + perustelu) — aloita jakso tukiosalla ensin');
    var ids = {}; (uudet || []).forEach(function (e) { ids[e.id] = e; });
    var yhdistetty = (Array.isArray(tukiosa.harjoitteet) ? tukiosa.harjoitteet : []).filter(function (e) { return e && !ids[e.id]; }).concat(uudet || []);
    return tmTukiosa({ alue: tukiosa.alue, perustelu: tukiosa.perustelu, harjoitteet: yhdistetty }).harjoitteet;
  }
  function tmTukitarve(x) {
    x = x || {};
    return { alue: _teksti(x.alue, 'tukitarve.alue', true), merkitty_pvm: _pvm(x.merkitty_pvm, 'tukitarve.merkitty_pvm'), rooli: _rooli(x.rooli) };
  }
  function tmKevytJakso(jf) {
    if (!jf || typeof jf !== 'object') throw new Error('tm_jakso_malli: jakso puuttuu');
    return Object.assign({}, jf, { muoto: 'kevyt' });
  }

  // ── Rajoittaa pelaamista (sisäinen) ─────────────────────────────────────
  function _phvKoodi(p, d) { var f = d.phvKoodi || _g('tmPhvKoodi') || (_req('TM_PHV', './tm_phv_tila.js') || {}).tmPhvKoodi; return typeof f === 'function' ? f(p) : null; }
  function _osaindeksit(p, d) {
    if (typeof d.osaindeksit === 'function') return d.osaindeksit(p);
    var N = _req('TM_EERIKKILA', './tm_eerikkila_normit.js') || {};
    var lasku = d.laskeD1Osaindeksit || N.laskeD1Osaindeksit || _g('laskeD1Osaindeksit');
    var ni = d.normiIka || N.normiIka || _g('normiIka');
    if (typeof lasku !== 'function' || !p || !p.hh_viimeisin) return null;
    var jk = p.joukkue || (Array.isArray(p.joukkueet) ? p.joukkueet[0] : '') || '';
    var ika = typeof ni === 'function' ? ni(p.syntymaVuosi, p.hh_pvm || null, jk) : null;
    var sp = (/\bT\s?\d/i.test(jk) || p.sukupuoli === 'N' || p.sukupuoli === 'T') ? 'N' : 'M';
    return ika == null ? null : lasku(p.hh_viimeisin, ika, sp);
  }
  function tmRajoittaaPelaamista(p, opts) {
    opts = opts || {}; var d = opts.deps || {};
    var tulos = { kylla: false, syyt: [], vihje: null, alueet: [] };
    if (!p) return tulos;
    var koodi = _phvKoodi(p, d);   // PRE|LAH|PH|POST|AN | null (tuntematon)
    // Ehto 1: valmentajan merkitsemä tukitarve (henkilökunnan päätös → ei kypsyyssuojaa; vahvistetaan katselmuksessa)
    if (p.tukitarve && p.tukitarve.alue && p.tukitarve.merkitty_pvm) { tulos.kylla = true; tulos.syyt.push('tukitarve'); tulos.alueet.push(p.tukitarve.alue); }
    // Ehto 2: fyysinen testitulos Eerikkilä-normien ALIMMALLA tasolla (normiIka) — kypsyyssuojan alainen
    var oi = _osaindeksit(p, d), alimmat = [];
    if (oi) Object.keys(oi).forEach(function (k) { if (oi[k] != null && oi[k] <= 1) alimmat.push(k); });
    if (alimmat.length) {
      var suojattu = koodi === 'PRE' || koodi === 'LAH' || koodi == null;   // §25: pre-PHV tai tuntematon → matala fyysinen on odotettua, ei peruste
      if (!suojattu) { tulos.kylla = true; tulos.syyt.push('testitulos'); alimmat.forEach(function (k) { tulos.alueet.push(k); }); }
      if (koodi == null) tulos.vihje = 'mittaa_kasvu';
      tulos.kypsyyssuoja = suojattu;
    }
    return tulos;
  }
  function tmYdinvahvuusVihje(p, ydinvahvuus, opts) {
    opts = opts || {}; var d = opts.deps || {};
    if (!p || !ydinvahvuus) return null;
    var koodi = _phvKoodi(p, d);
    var vk = d.varhainKypsynyt || _g('tmVarhainKypsynyt') || (_req('TM_PHV', './tm_phv_tila.js') || {}).tmVarhainKypsynyt;   // lib/tm_phv_tila.js (väliaikainen +1,0 v raja)
    var varhain = typeof vk === 'function' ? !!vk(p) : false;
    if (!(koodi === 'POST' || varhain)) return null;
    var alue = String(ydinvahvuus.alue || ydinvahvuus.kuvaus || '').toLowerCase();
    var fyysinen = ydinvahvuus.fyysinen === true || Object.keys(FYYSISET).some(function (k) { return alue.indexOf(k) >= 0; });
    return fyysinen ? 'harkitse_tekninen_tai_taktinen' : null;
  }

  /* ── D-3: JAKSON ALOITUS (valmentaja/VP; 6.10.2026). Vain: ydinvahvuus (pelaajan valinnasta vahvistettu tai valmentajan asettama), tukiosa {alue, perustelu}, kesto ikävaiheen mukaan (D7), vastuuhenkilö (adapteri).
     EI: katselmukset, jakson sulku, joukkuejakso, automaattinen ehdotus. ── */
  // D7 ikävaiheprofiilit: Kevyt U8–12 = 12 vk · Perus U13–15 = 6–8 vk (oletus 6) · Tiivis U16–19 = 6 vk. Ikä tuntematon → Perus.
  function tmJaksonKesto(ika) {
    var i = (typeof ika === 'number' && isFinite(ika)) ? ika : null;
    var p = i == null ? { profiili: 'perus', oletus: 6, min: 6, max: 8 } : i <= 12 ? { profiili: 'kevyt', oletus: 12, min: 12, max: 12 } : i <= 15 ? { profiili: 'perus', oletus: 6, min: 6, max: 8 } : { profiili: 'tiivis', oletus: 6, min: 6, max: 6 };
    p.vaihtoehdot = []; for (var k = p.min; k <= p.max; k++) p.vaihtoehdot.push(k);
    return p;
  }
  /* tmAloitaJakso(p, syote, opts) → { jaksofokus, ydinvahvuus, vihje }
       syote: { konsepti_avain, konsepti_nimi, konsepti_koodi?, domeeni?, ydinvahvuus_kuvaus, tukiosa_alue, tukiosa_perustelu, kesto_vk? }
       opts:  { tanaan 'YYYY-MM-DD' (paikallinen päivä §7.26), rooli (henkilökunnan rooli), nytISO, ika }
     Heittää selkeän virheen (GDPR-sanavartija, puuttuva pakollinen, kesto ikävaiheen rajojen ulkopuolella). Kenttänimet neutraaleja. Vahvistaessa pelaajan valinnan (tila 'valittavana') uusi jakso on aktiivinen (ei tila-kenttää). */
  function tmAloitaJakso(p, syote, opts) {
    opts = opts || {}; syote = syote || {};
    var avain = typeof syote.konsepti_avain === 'string' && syote.konsepti_avain.trim() ? syote.konsepti_avain.trim() : null;
    if (!avain) throw new Error('tm_jakso_malli: taito (konsepti) puuttuu');
    var ydin = tmYdinvahvuus({ kuvaus: syote.ydinvahvuus_kuvaus, havaittu_pvm: opts.tanaan, rooli: opts.rooli });
    var tuki = opts.ilmanTukiosaa === true ? null : tmTukiosa({ alue: syote.tukiosa_alue, perustelu: syote.tukiosa_perustelu, harjoitteet: [] });   // V1: liputettu modaali kirjoittaa tukitavoitteet (tmTukitavoitteetKirjoitus) — tukiosa tulee sieltä
    var kesto = tmJaksonKesto(opts.ika), vk = syote.kesto_vk != null ? Number(syote.kesto_vk) : kesto.oletus;
    if (!isFinite(vk) || vk < kesto.min || vk > kesto.max) throw new Error('tm_jakso_malli: kesto ' + syote.kesto_vk + ' vk ei sovi ikävaiheeseen (' + kesto.min + '–' + kesto.max + ' vk)');
    var jf = { konsepti_avain: avain, konsepti_nimi: _teksti(syote.konsepti_nimi, 'konsepti_nimi', false) || avain, konsepti_koodi: syote.konsepti_koodi || null, alkoi: opts.nytISO || new Date().toISOString(), kesto_vk: vk, lahde: 'valmentaja', asetti: { rooli: ydin.rooli, pvm: opts.tanaan }, domeeni: syote.domeeni || 'teknis_taktinen' };
    if (tuki) jf.tukiosa = tuki;   // asetti: "Asetti: VP · 6.10." (lähdemerkintä jaksokortille)
    var viol = tmTarkistaJaksoData(jf); if (viol.length) throw new Error('tm_jakso_malli: jaksodata sisältää kielletyn sanan/avaimen: ' + viol.join(', '));
    var vihje = null; try { vihje = tmYdinvahvuusVihje(p, ydin, opts); } catch (e) { vihje = null; }
    return { jaksofokus: jf, ydinvahvuus: ydin, vihje: vihje };
  }

  /* ── Katselmuksen "Vahvista merkinnät" (R6.3-E; 09 §6): ydinvahvuuden havaittu_pvm ja tukitarve vahvistetaan tai poistetaan katselmuksessa ── */
  var MERKINTA_VANHENTUNUT_VK = 12;   // merkintä > 12 vk vahvistamatta → "vanhentunut" (09 §6: vahvista tai poista ennen uutta jaksoa)
  function _paivaNum(iso) { var o = String(iso || '').split('-'); return Date.UTC(+o[0], +o[1] - 1, +o[2]); }
  function _vkEro(pvm, tanaan) { return Math.floor((_paivaNum(tanaan) - _paivaNum(pvm)) / 86400000 / 7); }
  // → { ydinvahvuus:{kuvaus, havaittu_pvm, ika_vk, vanhentunut}|null, tukitarve:{alue, merkitty_pvm, ika_vk, vanhentunut}|null, vihjeet:['mittaa_kasvu'|'harkitse_tekninen_tai_taktinen'] }
  function tmMerkinnatTila(p, tanaan, opts) {
    tanaan = _pvm(tanaan, 'tanaan');
    var ulos = { ydinvahvuus: null, tukitarve: null, vihjeet: [] };
    if (!p) return ulos;
    var yv = p.ydinvahvuus, tt = p.tukitarve;
    if (yv && yv.kuvaus && /^\d{4}-\d{2}-\d{2}$/.test(String(yv.havaittu_pvm))) { var a = _vkEro(yv.havaittu_pvm, tanaan); ulos.ydinvahvuus = { kuvaus: yv.kuvaus, havaittu_pvm: yv.havaittu_pvm, ika_vk: a, vanhentunut: a > MERKINTA_VANHENTUNUT_VK }; }
    if (tt && tt.alue && /^\d{4}-\d{2}-\d{2}$/.test(String(tt.merkitty_pvm))) { var b = _vkEro(tt.merkitty_pvm, tanaan); ulos.tukitarve = { alue: tt.alue, merkitty_pvm: tt.merkitty_pvm, ika_vk: b, vanhentunut: b > MERKINTA_VANHENTUNUT_VK }; }
    var r = tmRajoittaaPelaamista(p, opts); if (r && r.vihje) ulos.vihjeet.push(r.vihje);
    var v = yv ? tmYdinvahvuusVihje(p, yv, opts) : null; if (v) ulos.vihjeet.push(v);
    return ulos;
  }
  /* valinnat: { ydinvahvuus:'vahvista'|null, tukitarve:'vahvista'|'poista'|null } → kirjoitussuunnitelma (adapteri kirjoittaa katselmus-batchiin set-mergellä):
       kirjoitus.ydinvahvuus = {havaittu_pvm: tanaan}   (vahvistus päivittää VAIN havaittu_pvm; kuvaus + rooli säilyvät, merge)
       kirjoitus.tukitarve   = {merkitty_pvm: tanaan} | POISTA   (poisto → FieldValue.delete())
     Ei merkintää → vahvistus/poisto heittää (ei hiljaista valeonnistumista). Paikallinen tila palautetaan erikseen (päivitetään vasta onnistumisen jälkeen). */
  function tmVahvistaMerkinnat(p, valinnat, tanaan) {
    tanaan = _pvm(tanaan, 'tanaan'); valinnat = valinnat || {};
    var kirj = {}, paik = {}, muut = [];
    if (valinnat.ydinvahvuus != null) {
      if (valinnat.ydinvahvuus !== 'vahvista') throw new Error('tm_jakso_malli: ydinvahvuuden valinta pitää olla "vahvista"');
      if (!p || !p.ydinvahvuus || !p.ydinvahvuus.kuvaus) throw new Error('tm_jakso_malli: ei vahvistettavaa ydinvahvuutta');
      kirj.ydinvahvuus = { havaittu_pvm: tanaan }; paik.ydinvahvuus = Object.assign({}, p.ydinvahvuus, { havaittu_pvm: tanaan }); muut.push('ydinvahvuus_vahvistettu');
    }
    if (valinnat.tukitarve != null) {
      if (!p || !p.tukitarve || !p.tukitarve.alue) throw new Error('tm_jakso_malli: ei vahvistettavaa tukitarvetta');
      if (valinnat.tukitarve === 'vahvista') { kirj.tukitarve = { merkitty_pvm: tanaan }; paik.tukitarve = Object.assign({}, p.tukitarve, { merkitty_pvm: tanaan }); muut.push('tukitarve_vahvistettu'); }
      else if (valinnat.tukitarve === 'poista') { kirj.tukitarve = POISTA; paik.tukitarve = POISTA; muut.push('tukitarve_poistettu'); }
      else throw new Error('tm_jakso_malli: tukitarpeen valinta pitää olla "vahvista" tai "poista"');
    }
    return { kirjoitus: kirj, paikallinen: paik, muutokset: muut };
  }
  var POISTA = Object.freeze({ __poista: true });

  // Pelaaja näkee vaihtoehdot VASTA kun jakso on 'valittavana' JA valmentaja on vahvistanut ne (vahvistettu:true); vahvistamattomia ehdotuksia ei koskaan. Max 2 (D8).
  function tmPelaajanVaihtoehdot(jf) {
    if (!jf || jf.tila !== 'valittavana' || !Array.isArray(jf.vaihtoehdot)) return [];
    return jf.vaihtoehdot.filter(function (v) { return v && v.vahvistettu === true && v.konsepti_avain; }).slice(0, 2);
  }

  // ── Joukkueen teema (rajapinta; lähde D16 = A, seurat/{id}/valmennuslinja/teemat) ──
  function _pvmKey(v) {
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
    return null;
  }
  function tmJoukkueenTeema(joukkue, pvm, opts) {
    var teemat = opts && opts.teemat, p = _pvmKey(pvm);
    if (!joukkue || !p || !teemat || !Array.isArray(teemat.jaksot)) return null;
    var rivit = teemat.jaksot.filter(function (r) { return r && r.joukkue === joukkue && _pvmKey(r.alkaa) && _pvmKey(r.paattyy) && typeof r.teema === 'string' && r.teema.trim(); })
      .map(function (r) { return { a: _pvmKey(r.alkaa), b: _pvmKey(r.paattyy), t: r.teema.trim() }; }).sort(function (x, y) { return x.a < y.a ? -1 : 1; });
    var nyt = null, seur = null, i;
    for (i = 0; i < rivit.length; i++) if (rivit[i].a <= p && p <= rivit[i].b) { nyt = rivit[i].t; break; }
    for (i = 0; i < rivit.length; i++) if (rivit[i].a > p) { seur = rivit[i].t; break; }
    return (nyt == null && seur == null) ? null : { nyt: nyt, seuraava: seur };
  }

  var API = { tmJaksonKesto: tmJaksonKesto, tmAloitaJakso: tmAloitaJakso, tmYdinvahvuus: tmYdinvahvuus, tmTukiosa: tmTukiosa, tmOhjelmaTukiosaan: tmOhjelmaTukiosaan, tmHarjoiteTukiosaan: tmHarjoiteTukiosaan, tmLiitaTukiosaan: tmLiitaTukiosaan, tmTukitarve: tmTukitarve, tmKevytJakso: tmKevytJakso, tmRajoittaaPelaamista: tmRajoittaaPelaamista,
    tmYdinvahvuusVihje: tmYdinvahvuusVihje, tmJoukkueenTeema: tmJoukkueenTeema, tmPelaajanVaihtoehdot: tmPelaajanVaihtoehdot, tmMerkinnatTila: tmMerkinnatTila, tmVahvistaMerkinnat: tmVahvistaMerkinnat, POISTA: POISTA, MERKINTA_VANHENTUNUT_VK: MERKINTA_VANHENTUNUT_VK, tmJaksoTekstiKelpaa: tmJaksoTekstiKelpaa, tmTarkistaJaksoData: tmTarkistaJaksoData, KIELLETYT: KIELLETYT, KENTTANIMI_KIELLETTY: KENTTANIMI_KIELLETTY };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.TM_JAKSO_MALLI = API;
})(typeof window !== 'undefined' ? window : this);
