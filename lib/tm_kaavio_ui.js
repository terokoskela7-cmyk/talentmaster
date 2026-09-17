/* tm_kaavio_ui.js — TAKTIIKKATAULUN KÄYTTÖLIITTYMÄ, JAETTU KAHDEN APIN KESKEN.
 *
 * Tämä ohjain asui aiemmin TalentMaster_VP_v25.html:n sisällä (~1100 riviä). Valmentajan appi
 * (Master_v16) tarvitsee saman työkalun — valmentaja on kaavioiden ensisijainen piirtäjä — mutta
 * KOPIOINTI olisi taannut ajautumisen: taktiikkataulu on aktiivisessa kehityksessä, ja jokainen
 * muutos pitäisi tehdä kahteen paikkaan. Sama opetus kuin renderöijällä (yksi jaettu drawSpec,
 * ei neljää kopiota).
 *
 * HOST-ADAPTERI. Appi asettaa window.TM_KAAVIO_HOST ENNEN tämän tiedoston latausta:
 *   db            Firestore-handle          (VP: db · Master: _db)
 *   t(fi)         i18n-funktio              (VP: vpT · Master: masterT)
 *   lang()        nykyinen kieli            'fi' | 'sv' | 'en'
 *   toast(v, tyyppi)
 *   ctx()         { rooli, uid, seuraId, joukkueet, superAdmin, anon }
 *   konsepti(k)        VALINNAINEN: konseptin lokalisointi (VP: _ttKonsepti; Master: identiteetti)
 *   konseptilista(arr) VALINNAINEN: kaanon ⊕ seura -lista lokalisoituna
 *
 * ⚠ NIMEÄMINEN: host-apurit ovat _kui*-etuliitteellä (kaavio-UI), koska Masterissa on jo
 * globaali `_db` — pelkkä `_db()` olisi törmännyt siihen ja rikkonut appin.
 *
 * Oikeudet tulevat POLICY-LIBISTÄ (kaavioVoiLukea/kaavioToiminnot/kaavioVoiLuoda), eivät tästä.
 * Palvelinsääntö on todellinen portti; UI vain ei tarjoa nappia jota palvelin hylkäisi.
 */
function _kuiHost() { return (typeof window !== 'undefined' && window.TM_KAAVIO_HOST) || {}; }
function _kuiDb() { return _kuiHost().db; }
function _kuiT(fi) { var h = _kuiHost(); return (typeof h.t === 'function') ? h.t(fi) : fi; }
function _kuiToast(v, tyyppi) { var h = _kuiHost(); if (typeof h.toast === 'function') h.toast(v, tyyppi); }
function _kuiLang() { var h = _kuiHost(); return (typeof h.lang === 'function') ? (h.lang() || 'fi') : 'fi'; }
function _kuiCtx() {
  var h = _kuiHost();
  var c = (typeof h.ctx === 'function') ? (h.ctx() || {}) : {};
  return {
    rooli: c.rooli || null, uid: c.uid || null, seuraId: c.seuraId || null,
    joukkueet: Array.isArray(c.joukkueet) ? c.joukkueet : [],
    superAdmin: c.superAdmin === true, anon: c.anon === true
  };
}
/* Konseptin lokalisointi on APPIKOHTAINEN: VP:llä on curriculum-sv-sidecar (_ttKonsepti), Masterilla
   ei. Ilman adapteria lib joutuisi tuntemaan molempien i18n-kerrokset. Puuttuva → identiteetti,
   jolloin nimet näkyvät kanonisena suomena — rehellinen fallback, ei valekäännös. */
function _kuiKonsepti(k) { var h = _kuiHost(); return (typeof h.konsepti === 'function') ? h.konsepti(k) : k; }
function _kuiKonseptilista(arr) {
  var h = _kuiHost();
  if (typeof h.konseptilista === 'function') return h.konseptilista(arr);
  return (typeof tmKonseptiListaa === 'function') ? tmKonseptiListaa(arr || [], _kuiCtx().seuraId) : (arr || []);
}
/* ── KOHDISTUSLISTAT HOSTILTA ────────────────────────────────────────────────────────────
   Kohteen valinta (kenelle kaavio on) vaatii rosterin, jota libillä ei voi olla: VP näkee koko
   seuran, valmentaja omat joukkueensa. Siksi listat tulevat adapterilta.
   PUUTTUVA funktio → null (EI []): ero on merkitsevä. null = "tätä listaa ei ole tässä apissa"
   → kyseistä tasoa ei tarjota lainkaan (fail-safe: ei tasoa jolle ei voi valita kohdetta).
   [] = "lista on, mutta tyhjä" → taso näkyy ja kertoo ettei valittavaa ole.
   §7.22: pelaajalistassa saa olla VAIN id + nimi (+joukkueId) — ei arvioita, ei lukuja. */
function _kuiJoukkueet() { var f = _kuiHost().joukkueet; return (typeof f === 'function') ? (f() || []) : null; }
function _kuiPelaajat(joukkueId) { var f = _kuiHost().pelaajat; return (typeof f === 'function') ? (f(joukkueId) || []) : null; }
function _kuiValmentajat() { var f = _kuiHost().valmentajat; return (typeof f === 'function') ? (f() || []) : null; }
/* Onko tasolle olemassa kohdelista. 'seura' ei tarvitse kohdetta → aina käytettävissä. */
function _kaavioTasoKaytettavissa(taso) {
  if (taso === 'seura') return true;
  if (taso === 'joukkue') return _kuiJoukkueet() !== null;
  if (taso === 'valmentaja') return _kuiValmentajat() !== null;
  if (taso === 'pelaaja') return _kuiPelaajat() !== null;
  return false;
}

function _kuiEsc(x) { return String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

// ══════════ KAAVIOPANKKI (erä B2) — luku + editori + write-path ══════════
// Näkyvyys ja napit tulevat POLICY-LIBISTÄ (kaavioVoiLukea/kaavioToiminnot) — tässä ei ole omaa
// oikeuslogiikkaa. Palvelinsääntö on todellinen portti; UI vain ei yritä laitonta kirjoitusta.
// Kaksikerros: kanoniset /kaaviot/{avain} (luku) + seuran /seurat/{sid}/kaaviot (review-silmukka).
// Seuratason sama spec.avain VOITTAA kanonisen (override).
var _kaavioTila = { lista: [], nakyvat: [], suodatin: null, lanka: [], valittu: null, muokkaus: null, historia: [], drag: null, tyokalu: null, veto: null };
// `valittu` = PYSYVÄ valinta { kind:'player'|'liike'|'selite', id }. Aiemmin se oli pelkkä
// pelaaja-id ja tarkoitti "viimeksi kosketettu" — käyttäjä ei nähnyt keneen se osui, joten
// "kenelle tämä menee?" oli oikeutettu kysymys. Nyt valinta on näkyvä (overlay-korostus) ja
// nimetty (paneelin otsikko). Valinta on OLETUSTILAN käytös: kun työkalu on aktiivinen,
// työkalu voittaa eikä valintaa muuteta.

// ⚠ KRIITTINEN KORJAUS — tämä funktio HEITTI ReferenceErrorin joka kutsulla.
// `_rooli`-globaalia ei ole koskaan deklaroitu missään (ei var/let/const eikä window._rooli), joten
// bare-viittaus kaatui heti. Koska avaaKaaviopankki() kutsuu tätä ENSIMMÄISENÄ, koko taktiikkataulu
// oli tuotannossa rikki siitä asti kun se shipattiin: modaali ei ehtinyt renderöityä lainkaan.
// Sama vika oli korjattu jo toisaalla (#207: "_rooli-globaali oli VP-sessiossa undefined").
// Oikea rooli-globaali on `window._vpRooli` (asetetaan kirjautuessa token.claims.rooli:sta).
//
// Miksi mikään testi ei nähnyt tätä: yksikkötestit ajavat puhtaita libejä ja sääntöjä, ja
// render-testien sandbox palautti tuntemattomalle nimelle undefinedin sen sijaan että olisi
// heittänyt — eli juuri se mekanismi joka teki testeistä ajettavia, piilotti tämän. Alla oleva
// entry point -testi ajaa sisäänkäynnin oikeasti ja vaatii ettei se heitä.
function _kaavioCtxNyt() { return _kuiCtx(); }
function _kaavioLang() { return _kuiLang(); }

// ── ERÄ C · OTSIKON LÄHDE = KONSEPTI, EI SPEC ────────────────────────────────────────────
// Aiemmin otsikko luettiin `spec.nimi`-kartasta ({fi,sv,en}), joka oli kaavion OMA kopio
// konseptin nimestä. Seuraus: kun seura muokkasi konseptia S2:lla, kaavion otsikko jäi vanhaan.
// Nyt nimi ja KPI-teksti resolvoidaan elävästi kaanon ⊕ seura -kerroksesta.
//
// ⚠ LOKALISOINTI KULKEE _kuiKonsepti():n KAUTTA, EI _kuiT():n. Ero on §32-kriittinen:
//   · konseptien nimet EIVÄT ole VP:n sivukartassa — ne käännetään curriculum-sidecarista
//     (_ttSv(avain,'nimi')), joten _kuiT('HAVAINNOINTI') putoaisi aina fi:hin eikä kaanon
//     kääntyisi koskaan ruotsiksi;
//   · _ttKonsepti OHITTAA `_seura_kentat`-kentät → seuran kirjoittama suomi renderöityy
//     sellaisenaan. vpT voisi osua sivukartan avaimeen ja kääntää seuran oman tekstin —
//     juuri se vuoto jonka S1/S2 esti.
// Sidoslogiikka (mikä kenttä mistä) on lib/tm_kaavio_konsepti.js:ssä, jotta erä D
// (pelaajapinta, oma t()-kerros) käyttää samaa sidosta ilman VP-oletuksia.
function _kaavioKonsepti(spec) {
  if (!spec || !spec.avain || typeof tmKonseptiResolvoi !== 'function') return null;
  return tmKonseptiResolvoi(spec.avain, _kuiCtx().seuraId);
}
function _kaavioOtsikko(spec) {
  var raaka = _kaavioKonsepti(spec);
  if (typeof kaavioKonseptiNaytto !== 'function') {
    return { nimi: (spec && spec.avain) || '', kpiKoodi: '', kpiTeksti: '', kpiKoodit: [], loytyi: !!raaka };
  }
  // näyttö lokalisoidusta, koodit RAA'ASTA (enum ei riipu kielestä) — ks. lib-kommentti.
  var naytto = kaavioKonseptiNaytto(spec, raaka ? _kuiKonsepti(raaka) : null);
  naytto.kpiKoodit = raaka ? kaavioKpiKoodit(raaka) : [];
  naytto.loytyi = !!raaka;
  return naytto;
}


async function avaaKaaviopankki() {
  document.getElementById('_kvModal')?.remove();
  var ctx = _kaavioCtxNyt();
  _kaavioTila.lista = [];
  try {
    if (_kuiCtx().seuraId && _kuiDb()) {
      var snap = await _kuiDb().collection('seurat').doc(_kuiCtx().seuraId).collection('kaaviot').get();
      snap.forEach(function (d) { _kaavioTila.lista.push(Object.assign({ id: d.id, seuraId: _kuiCtx().seuraId }, d.data())); });
      var kan = await _kuiDb().collection('kaaviot').get();
      var omatAvaimet = {};
      _kaavioTila.lista.forEach(function (k) { if (k.spec && k.spec.avain) omatAvaimet[k.spec.avain] = 1; });
      kan.forEach(function (d) {
        if (omatAvaimet[d.id]) return;   // seuran override voittaa kanonisen
        _kaavioTila.lista.push(Object.assign({ id: d.id, kanoninen: true }, d.data()));
      });
    }
  } catch (e) { if (typeof toast === 'function') _kuiToast(_kuiT('Kaavioiden lataus epäonnistui'), 'err'); }
  // LUKUPORTTI ENSIN. Kaikki myöhempi suodatus on näkymää tämän tuloksen PÄÄLLÄ — suodatin ei
  // voi tuoda näkyviin mitään jota tämä ei päästänyt läpi.
  _kaavioTila.nakyvat = _kaavioTila.lista.filter(function (k) { return kaavioVoiLukea(k, ctx); });
  _kaavioTila.suodatin = Object.assign({}, _KAAVIO_SUODATIN_TYHJA);   // pankin avaus = puhdas näkymä

  var h = '<div id="_kvModal" style="position:fixed;inset:0;background:rgba(17,17,16,.92);z-index:300;display:flex;align-items:center;justify-content:center" onclick="if(event.target===this)this.remove()">';
  h += '<div style="background:var(--bg2);border:.5px solid var(--border);padding:24px;width:860px;max-width:96vw;max-height:90vh;overflow-y:auto" onclick="event.stopPropagation()">';
  h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">';
  h += '<div style="font-family:\'Cormorant Garamond\',serif;font-size:22px;color:var(--ink)">' + _kuiT('Taktiikkataulu') + '</div>';
  h += '<div style="display:flex;align-items:center;gap:12px">';
  h += '<div id="_kvLaskuri" style="font-size:11px;color:var(--ink3)">' + _kaavioLaskuriTeksti(_kaavioTila.nakyvat.length, _kaavioTila.nakyvat.length) + '</div>';
  // Luontiportti = kaavioVoiLuoda (peili rulesin create-ehdosta). Rules on silti totuus; nappia
  // ei vain näytetä sille jolle kirjoitus hylättäisiin.
  if (typeof kaavioVoiLuoda === 'function' && kaavioVoiLuoda(ctx)) h += _kaavioUusiNappiHTML();
  h += '</div></div>';
  h += '<div style="font-size:11.5px;color:var(--ink3);margin-bottom:14px">' + _kuiT('Teknis-taktiset kaaviot. Kanoniset ovat kaikille yhteisiä; seuran omat kulkevat katselmuksen kautta.') + '</div>';
  h += '<div id="_kvSuodattimet">' + _kaavioSuodatinHTML(ctx) + '</div>';
  h += '<div id="_kvSisalto">' + _kaavioPankkiSisaltoHTML(ctx) + '</div>';
  h += '<div style="margin-top:16px;text-align:right"><button onclick="document.getElementById(\'_kvModal\').remove()" style="background:var(--ov-1);color:var(--ink2);border:.5px solid var(--border);border-radius:6px;padding:8px 16px;cursor:pointer;font-size:12px">' + _kuiT('Sulje') + '</button></div>';
  h += '</div></div>';
  document.body.insertAdjacentHTML('beforeend', h);
  _kaavioPiirraEsikatselut();
}

function _kaavioLaskuriTeksti(nayt, koko) {
  return (nayt === koko) ? (koko + ' ' + _kuiT('kaaviota')) : (nayt + ' / ' + koko + ' ' + _kuiT('kaaviota'));
}
/* Esikatselut piirretään vasta kun kortit ovat DOMissa. Indeksi juoksee SUODATETUN listan yli,
   joten id:t ovat uniikkeja jokaisella renderillä (kaksi korttia samalla id:llä oli aiemmin
   harnessi-tason bugi — sama ansa toistuisi tässä jos indeksi tulisi ryhmän sisältä). */
function _kaavioPiirraEsikatselut() {
  // Luetaan DOMista, ei lasketa järjestystä uudelleen: taittuvat teemaosiot ja suodatus
  // muuttavat sitä mitä on renderöity, ja kahden totuuden pitäminen synkassa olisi juuri se
  // ansa joka teki toiminnoista indeksiherkkiä. data-kaavio kertoo kumpi spec kuuluu mihin.
  var solut = (typeof document !== 'undefined' && document.querySelectorAll)
    ? document.querySelectorAll('#_kvSisalto [data-kaavio]') : [];
  Array.prototype.forEach.call(solut, function (el) {
    var k = _kaavioEtsiKaavio(el.getAttribute('data-kaavio'));
    if (k) _kaavioPiirraEsikatselu(el.id, k.spec);
  });
}

/* Suodattimen muutos EI hae dataa uudelleen: se renderöi vain sisältölohkon. Suodatinpalkki
   jätetään koskematta, jottei hakukenttä menetä fokusta kirjoittaessa. */
function _kaavioSuodataNyt(muutos) {
  Object.assign(_kaavioSuodatinNyt(), muutos || {});
  var ctx = _kaavioCtxNyt();
  var el = document.getElementById('_kvSisalto');
  if (el) el.innerHTML = _kaavioPankkiSisaltoHTML(ctx);
  var lask = document.getElementById('_kvLaskuri');
  if (lask) lask.innerHTML = _kaavioLaskuriTeksti(
    _kaavioSuodata(_kaavioTila.nakyvat || [], _kaavioSuodatinNyt(), ctx).length,
    (_kaavioTila.nakyvat || []).length);
  var tyhj = document.getElementById('_kvTyhjenna');
  if (tyhj) tyhj.style.display = _kaavioSuodatinAktiivinen() ? '' : 'none';
  _kaavioPiirraEsikatselut();
}
function _kaavioSuodatinTyhjenna() {
  _kaavioTila.suodatin = Object.assign({}, _KAAVIO_SUODATIN_TYHJA);
  var sp = document.getElementById('_kvSuodattimet');
  if (sp) sp.innerHTML = _kaavioSuodatinHTML(_kaavioCtxNyt());
  _kaavioSuodataNyt({});
}
/* Haku debounceataan: joka näppäin renderöisi koko listan + SVG-esikatselut uudelleen. */
var _kaavioHakuAjastin = null;
function _kaavioHakuMuuttui(arvo) {
  if (_kaavioHakuAjastin) clearTimeout(_kaavioHakuAjastin);
  _kaavioHakuAjastin = setTimeout(function () { _kaavioSuodataNyt({ haku: arvo }); }, 150);
}
window._kaavioSuodataNyt = _kaavioSuodataNyt;
window._kaavioSuodatinTyhjenna = _kaavioSuodatinTyhjenna;
window._kaavioHakuMuuttui = _kaavioHakuMuuttui;

var _KV_CHIP_OFF = 'background:var(--ov-1);color:var(--ink2);border:.5px solid var(--border)';
var _KV_CHIP_ON = 'background:rgba(40,176,144,.18);color:var(--teal);border:.5px solid rgba(40,176,144,.5)';
function _kvChip(fn, teksti, paalla, maara) {
  return '<button onclick="' + fn + '" style="' + (paalla ? _KV_CHIP_ON : _KV_CHIP_OFF)
    + ';border-radius:14px;padding:4px 11px;font-size:11px;cursor:pointer">' + _kuiEsc(teksti)
    + (maara == null ? '' : ' <span style="opacity:.65">' + maara + '</span>') + '</button>';
}
function _kvSuodatinRivi(otsikko, sisalto) {
  return '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:6px">'
    + '<span style="font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink3);min-width:62px">' + _kuiEsc(_kuiT(otsikko)) + '</span>'
    + sisalto + '</div>';
}

function _kaavioSuodatinHTML(ctx) {
  var s = _kaavioSuodatinNyt(), esc = _kuiEsc, lista = _kaavioTila.nakyvat || [];
  // Chippien LUVUT lasketaan luetusta listasta, eivät suodatetusta: määrä kertoo mitä valinta
  // toisi, ei mitä nykyinen näkymä sattuu sisältämään.
  var teemaMaarat = {};
  lista.forEach(function (k) { var t = _kaavioTeema(k); teemaMaarat[t] = (teemaMaarat[t] || 0) + 1; });

  var h = '<div style="border:.5px solid var(--border);border-radius:8px;padding:10px 12px;margin-bottom:14px;background:var(--ov-1)">';

  var teemat = _KAAVIO_TEEMAT.filter(function (t) { return teemaMaarat[t]; });   // tyhjät piiloon
  if (teemat.length > 1) {
    h += _kvSuodatinRivi('Teema', _kvChip("_kaavioSuodataNyt({teema:''})", _kuiT('Kaikki'), !s.teema)
      + teemat.map(function (t) { return _kvChip("_kaavioSuodataNyt({teema:'" + t + "'})", _kaavioTeemaLbl(t), s.teema === t, teemaMaarat[t]); }).join(''));
  }

  // Pelaajasuodatin vain jos host tarjoaa rosterin (#533). §7.22: pelkkä nimi.
  var pl = _kuiPelaajat();
  if (pl && pl.length) {
    var ps = '<select onchange="_kaavioSuodataNyt({pelaajaId:this.value})" style="' + _KV_KOHDE_TYYLI + ';width:auto;min-width:170px;padding:4px 8px;font-size:11.5px">';
    ps += '<option value="">' + esc(_kuiT('— kaikki pelaajat —')) + '</option>';
    pl.forEach(function (p) { ps += '<option value="' + esc(p.id) + '"' + (s.pelaajaId === p.id ? ' selected' : '') + '>' + esc(p.nimi || p.id) + '</option>'; });
    ps += '</select>';
    h += _kvSuodatinRivi('Pelaaja', ps);
  }

  var rivi3 = _kvChip('_kaavioSuodataNyt({minulle:' + (!s.minulle) + '})', _kuiT('Minulle osoitetut'), s.minulle);
  ['luonnos', 'odottaa', 'hyvaksytty', 'hylatty'].forEach(function (t) {
    rivi3 += _kvChip("_kaavioSuodataNyt({tila:'" + (s.tila === t ? '' : t) + "'})", _kaavioTilaLbl(t), s.tila === t);
  });
  h += _kvSuodatinRivi('Rajaa', rivi3);

  h += '<div style="display:flex;gap:8px;align-items:center;margin-top:8px">';
  h += '<input id="_kvHaku" type="search" value="' + esc(s.haku || '') + '" oninput="_kaavioHakuMuuttui(this.value)" placeholder="' + esc(_kuiT('Hae nimellä, avaimella tai pelimuodolla…')) + '" style="flex:1;' + _KV_KOHDE_TYYLI + ';padding:6px 9px;font-size:12px">';
  h += '<button id="_kvTyhjenna" onclick="_kaavioSuodatinTyhjenna()" style="' + _KV_CHIP_OFF + ';border-radius:6px;padding:6px 11px;font-size:11px;cursor:pointer;display:' + (_kaavioSuodatinAktiivinen(s) ? '' : 'none') + '">' + esc(_kuiT('Tyhjennä')) + '</button>';
  h += '</div></div>';
  return h;
}

/* Sisältö: teemaosiot (kansion tuntu) tai tasainen ruudukko kun teema on jo valittu. */
function _kaavioPankkiSisaltoHTML(ctx) {
  var lista = _kaavioTila.nakyvat || [];
  var s = _kaavioSuodatinNyt();
  var nayt = _kaavioSuodata(lista, s, ctx);

  if (!lista.length) {
    return '<div style="font-size:12.5px;color:var(--ink3);padding:18px;border:.5px dashed var(--border);border-radius:8px">'
      + _kuiT('Ei kaavioita vielä.')
      // Tyhjä tila on juuri se hetki jolloin sisäänkäyntiä tarvitaan — ilman tätä ensimmäistä
      // kaaviota ei voinut luoda lainkaan (editori avautui vain olemassa olevalle).
      + ((typeof kaavioVoiLuoda === 'function' && kaavioVoiLuoda(ctx)) ? '<div style="margin-top:12px">' + _kaavioUusiNappiHTML() + '</div>' : '')
      + '</div>';
  }
  if (!nayt.length) {
    // ERI TYHJÄ TILA kuin "ei kaavioita": tässä niitä on, suodatin vain rajaa kaikki pois.
    return '<div style="font-size:12.5px;color:var(--ink3);padding:18px;border:.5px dashed var(--border);border-radius:8px">'
      + _kuiT('Ei osumia näillä rajauksilla.')
      + ' <a onclick="_kaavioSuodatinTyhjenna()" style="color:var(--teal);cursor:pointer">' + _kuiT('Tyhjennä') + '</a></div>';
  }

  var i = 0, h = '';
  var ruudukko = function (osa) {
    var g = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px">';
    osa.forEach(function (k) { g += _kaavioKorttiHTML(k, i++, ctx); });
    return g + '</div>';
  };
  // Teema jo valittu → osiointi olisi yksi otsikko turhaan. Sama kun teemoja on vain yksi.
  var teemat = _KAAVIO_TEEMAT.filter(function (t) { return nayt.some(function (k) { return _kaavioTeema(k) === t; }); });
  if (s.teema || teemat.length <= 1) return '<div id="_kvLista">' + ruudukko(nayt) + '</div>';

  h += '<div id="_kvLista">';
  teemat.forEach(function (t) {
    var osa = nayt.filter(function (k) { return _kaavioTeema(k) === t; });
    var auki = _kaavioTeemaAuki(t);
    h += '<div style="margin-bottom:14px">';
    h += '<div onclick="_kaavioTeemaTaita(\'' + t + '\')" style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:6px 0;border-bottom:.5px solid var(--border);margin-bottom:10px">';
    h += '<span style="font-size:11px;color:var(--ink3);width:10px">' + (auki ? '▾' : '▸') + '</span>';
    h += '<span style="font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink2)">' + _kuiEsc(_kaavioTeemaLbl(t)) + '</span>';
    h += '<span style="font-size:11px;color:var(--ink3)">' + osa.length + '</span>';
    h += '</div>';
    if (auki) h += ruudukko(osa);   // suljettu osio: kortteja ei renderöidä lainkaan
    h += '</div>';
  });
  return h + '</div>';
}
var _KAAVIO_TEEMA_KIINNI = {};
function _kaavioTeemaAuki(t) { return !_KAAVIO_TEEMA_KIINNI[t]; }
function _kaavioTeemaTaita(t) {
  _KAAVIO_TEEMA_KIINNI[t] = !_KAAVIO_TEEMA_KIINNI[t];
  _kaavioSuodataNyt({});
}
window._kaavioTeemaTaita = _kaavioTeemaTaita;

function _kaavioTilaLbl(st) {
  var m = { luonnos: 'luonnos', odottaa: 'odottaa hyväksyntää', hyvaksytty: 'hyväksytty', hylatty: 'hylätty' };
  return _kuiT(m[st] || st || 'luonnos');
}
function _kaavioNakyvyysLbl(n) {
  var m = { seura: 'seura', joukkue: 'joukkue', valmentaja: 'valmentaja', pelaaja: 'pelaaja' };
  return _kuiT(m[n] || n || 'seura');
}

/* ── KOHDE NÄKYVIIN ───────────────────────────────────────────────────────────────────────
   Taso yksin ei vastaa kysymykseen "kenelle tämä tallentuu". Kortti sanoi "pelaaja" muttei
   ketä — VP ei voinut tietää kenelle kaavio oli tarkoitettu, eikä valmentaja nähnyt osuiko
   kohdistus. Tämä kääntää review-kohteen NIMIKSI host-listoista.
   Lista puuttuu (toinen appi, ei rosteria) → näytetään id, ei tyhjää: väärä nimi olisi pahempi
   kuin raaka tunniste, mutta tyhjä olisi pahin (näyttäisi kohdistamattomalta). */
function _kaavioNimiListasta(lista, id) {
  var o = (lista || []).filter(function (x) { return x && x.id === id; })[0];
  return (o && o.nimi) || id;
}
function _kaavioKohdeNimet(review) {
  var r = review || {};
  if (r.nakyvyys === 'joukkue') return r.joukkueId ? _kaavioNimiListasta(_kuiJoukkueet(), r.joukkueId) : '';
  if (r.nakyvyys === 'valmentaja') return r.valmentajaId ? _kaavioNimiListasta(_kuiValmentajat(), r.valmentajaId) : '';
  if (r.nakyvyys === 'pelaaja') {
    var ids = r.pelaajaIds || [];
    if (!ids.length) return '';
    var lista = _kuiPelaajat();
    return ids.map(function (id) { return _kaavioNimiListasta(lista, id); }).join(', ');
  }
  return '';
}
/* Taso + kohde yhtenä merkkijonona, esim. "pelaaja: Topias, Aada". Kohteen puuttuminen
   NÄYTETÄÄN (ei piiloteta): se on juuri se tila jonka VP joutuu korjaamaan katselmuksessa. */
function _kaavioKohdeLbl(review) {
  var r = review || {};
  var taso = _kaavioNakyvyysLbl(r.nakyvyys);
  if (typeof kaavioKohdeKentta === 'function' && !kaavioKohdeKentta(r.nakyvyys)) return taso;
  var nimet = _kaavioKohdeNimet(r);
  return nimet ? (taso + ': ' + nimet) : (taso + ' · ' + _kuiT('kohdetta ei valittu'));
}

/* ── KOHTEEN VALITSIN ─────────────────────────────────────────────────────────────────────
   Sama komponentti luontimodaalissa JA editorissa (pfx erottaa instanssit), jotta kohteen voi
   korjata jälkikäteen. Tasolista tulee policysta (kaavioNakyvyysTasot = peili rulesista) eikä
   kovakoodatusta roolilistasta, ja siitä karsitaan tasot joille tällä apilla ei ole kohdelistaa. */
function _kaavioTasotNyt() {
  var tasot = (typeof kaavioNakyvyysTasot === 'function')
    ? kaavioNakyvyysTasot(_kaavioCtxNyt())
    : ['joukkue', 'pelaaja'];
  return tasot.filter(_kaavioTasoKaytettavissa);
}
function _kaavioNakyvyysValitsinHTML(pfx, valittu) {
  var tasot = _kaavioTasotNyt(), esc = _kuiEsc;
  // Oletus: kapein tarjolla oleva taso jonka tekijä saa asettaa. Seuran yhteinen kirjasto on
  // kuratointipäätös, ei luonnin oletus — myös hyväksyjälle.
  var oletus = valittu || (tasot.indexOf('joukkue') >= 0 ? 'joukkue' : tasot[0]);
  var h = '<select id="' + pfx + 'Nak" onchange="_kaavioKohdeTasoVaihtui(\'' + pfx + '\')" style="width:100%;background:var(--bg);border:.5px solid var(--border);color:var(--ink);font-family:inherit;font-size:12.5px;padding:8px 9px">';
  tasot.forEach(function (t) {
    h += '<option value="' + esc(t) + '"' + (t === oletus ? ' selected' : '') + '>' + esc(_kaavioNakyvyysLbl(t)) + '</option>';
  });
  return h + '</select>';
}
function _kvKohdeLabel(fi, id) {
  return '<label for="' + id + '" style="display:block;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink2);margin:10px 0 5px">' + _kuiEsc(_kuiT(fi)) + '</label>';
}
var _KV_KOHDE_TYYLI = 'width:100%;background:var(--bg);border:.5px solid var(--border);color:var(--ink);font-family:inherit;font-size:12.5px;padding:8px 9px';
function _kaavioKohdeValitsinHTML(pfx, nak, val) {
  val = val || {};
  var esc = _kuiEsc, h = '';
  if (nak === 'joukkue') {
    var jt = _kuiJoukkueet() || [];
    h += _kvKohdeLabel('Joukkue', pfx + 'Kj');
    h += '<select id="' + pfx + 'Kj" style="' + _KV_KOHDE_TYYLI + '">';
    if (!jt.length) h += '<option value="">' + esc(_kuiT('— ei joukkueita —')) + '</option>';
    // Yksi joukkue → esivalinta. Valmentajalla se on tavallisin tapaus, eikä pakollinen klikkaus
    // yhden vaihtoehdon listassa tuota tietoa.
    jt.forEach(function (j, i) {
      var sel = val.joukkueId ? (val.joukkueId === j.id) : (jt.length === 1 && i === 0);
      h += '<option value="' + esc(j.id) + '"' + (sel ? ' selected' : '') + '>' + esc(j.nimi || j.id) + '</option>';
    });
    h += '</select>';
  } else if (nak === 'valmentaja') {
    var vt = _kuiValmentajat() || [];
    h += _kvKohdeLabel('Valmentaja', pfx + 'Kv');
    h += '<select id="' + pfx + 'Kv" style="' + _KV_KOHDE_TYYLI + '">';
    h += '<option value="">' + esc(_kuiT('— valitse —')) + '</option>';
    vt.forEach(function (v) {
      h += '<option value="' + esc(v.id) + '"' + (val.valmentajaId === v.id ? ' selected' : '') + '>' + esc(v.nimi || v.id) + '</option>';
    });
    h += '</select>';
    h += '<div style="font-size:11px;color:var(--ink3);line-height:1.45;margin-top:6px">' + esc(_kuiT('Valmentajalle annettu kaavio ei näy pelaajalle — hän ottaa sen käyttöön omassa työssään.')) + '</div>';
  } else if (nak === 'pelaaja') {
    var jt2 = _kuiJoukkueet() || [];
    // Joukkuesuodatin vain kun joukkueita on useampi: VP:n rosteri on koko seura, ja sadan nimen
    // listasta valitseminen ilman rajausta ei ole valitsin vaan este.
    if (jt2.length > 1) {
      h += _kvKohdeLabel('Rajaa joukkueella', pfx + 'Kpj');
      h += '<select id="' + pfx + 'Kpj" onchange="_kaavioKohdePelaajatPaivita(\'' + pfx + '\')" style="' + _KV_KOHDE_TYYLI + '">';
      h += '<option value="">' + esc(_kuiT('— kaikki —')) + '</option>';
      jt2.forEach(function (j) { h += '<option value="' + esc(j.id) + '"' + (val._pjFiltteri === j.id ? ' selected' : '') + '>' + esc(j.nimi || j.id) + '</option>'; });
      h += '</select>';
    }
    h += _kvKohdeLabel('Pelaajat', pfx + 'Kp');
    h += '<div id="' + pfx + 'KpWrap">' + _kaavioPelaajaListaHTML(pfx, val._pjFiltteri || '', val.pelaajaIds || []) + '</div>';
    h += '<div style="font-size:11px;color:var(--ink3);line-height:1.45;margin-top:6px">' + esc(_kuiT('Valitse yksi tai useampi (ctrl/cmd tai pyyhkäisy).')) + '</div>';
  }
  return h;
}
var _KV_VAL_ETU = '\u2713\u00A0', _KV_EI_ETU = '\u00A0\u00A0\u00A0';
/* Repaint PAIKALLAAN, ei uudelleenrenderöinti: listan korvaaminen nollaisi vierityksen ja
   katkaisisi käynnissä olevan monivalinnan. data-nimi säilyttää puhtaan nimen, jottei
   etuliitteitä kasaannu. */
function _kaavioPelaajaKorosta(sel) {
  if (!sel) return;
  for (var i = 0; i < sel.options.length; i++) {
    var o = sel.options[i], on = o.selected;
    var nimi = o.getAttribute('data-nimi'); if (nimi == null) continue;
    o.style.backgroundColor = on ? 'rgba(40,176,144,.22)' : 'var(--bg)';
    o.style.color = on ? 'var(--teal)' : 'var(--ink)';
    o.textContent = (on ? _KV_VAL_ETU : _KV_EI_ETU) + nimi;
  }
}
window._kaavioPelaajaKorosta = _kaavioPelaajaKorosta;

function _kaavioPelaajaListaHTML(pfx, joukkueId, valitut) {
  var esc = _kuiEsc, pl = _kuiPelaajat(joukkueId || undefined) || [];
  // Monivalinta-listboxin (size>1) OPTION-rivit eivät peri selectin taustaa Chromessa — ilman
  // per-rivin väriä lista renderöityy vaaleana tummalla sivulla (todettu live-renderistä).
  // color-scheme kertoo selaimelle myös valinnan korostusvärin sävyn.
  var optTyyli = 'background-color:var(--bg);color:var(--ink)';
  // VALINNAN KOROSTUS on maalattava itse. Kun option saa oman background-colorin, selain ei enää
  // piirrä järjestelmän valintakorostusta sen päälle — ilman tätä valitut rivit näyttäisivät
  // täsmälleen valitsemattomilta (todettu live-renderistä). ✓-etuliite on väristä riippumaton
  // rinnakkaissignaali: valinta ei saa olla pelkän värin varassa.
  var valTyyli = 'background-color:rgba(40,176,144,.22);color:var(--teal)';
  var h = '<select id="' + pfx + 'Kp" multiple size="' + Math.min(8, Math.max(3, pl.length))
    + '" onchange="_kaavioPelaajaKorosta(this)" style="' + _KV_KOHDE_TYYLI + ';padding:4px 6px;background-color:var(--bg)">';
  if (!pl.length) h += '<option value="" disabled style="' + optTyyli + '">' + esc(_kuiT('— ei pelaajia —')) + '</option>';
  pl.forEach(function (p) {
    var on = (valitut || []).indexOf(p.id) >= 0, nimi = p.nimi || p.id;
    h += '<option value="' + esc(p.id) + '" data-nimi="' + esc(nimi) + '" style="' + (on ? valTyyli : optTyyli) + '"'
       + (on ? ' selected' : '') + '>' + (on ? _KV_VAL_ETU : _KV_EI_ETU) + esc(nimi) + '</option>';
  });
  return h + '</select>';
}
/* Taso vaihtui → kohdevalitsin uusiksi. Valinta EI säily tason yli tarkoituksella: joukkueId ei
   ole pelaajavalinta eikä päinvastoin, ja vanhan kohteen säilyttäminen kirjoittaisi speciin
   kohteen jota käyttäjä ei enää näe. */
function _kaavioKohdeTasoVaihtui(pfx) {
  var nak = document.getElementById(pfx + 'Nak'), sailio = document.getElementById(pfx + 'Kohde');
  if (!sailio) return;
  sailio.innerHTML = _kaavioKohdeValitsinHTML(pfx, nak ? nak.value : 'joukkue', null);
}
function _kaavioKohdePelaajatPaivita(pfx) {
  var jf = document.getElementById(pfx + 'Kpj'), wrap = document.getElementById(pfx + 'KpWrap');
  if (!wrap) return;
  wrap.innerHTML = _kaavioPelaajaListaHTML(pfx, jf ? jf.value : '', _kaavioKohdeLue(pfx, 'pelaaja').pelaajaIds || []);
}
/* Lukee valitsimet review-muotoon. Kaikki kolme kenttää palautetaan aina, jotta tason vaihto
   NOLLAA edellisen tason kohteen — muuten dokumenttiin jäisi haamukohdistus. */
function _kaavioKohdeLue(pfx, nak) {
  var r = { joukkueId: null, valmentajaId: null, pelaajaIds: [] };
  var el;
  if (nak === 'joukkue') { el = document.getElementById(pfx + 'Kj'); r.joukkueId = (el && el.value) || null; }
  else if (nak === 'valmentaja') { el = document.getElementById(pfx + 'Kv'); r.valmentajaId = (el && el.value) || null; }
  else if (nak === 'pelaaja') {
    el = document.getElementById(pfx + 'Kp');
    if (el) for (var i = 0; i < el.options.length; i++) if (el.options[i].selected && el.options[i].value) r.pelaajaIds.push(el.options[i].value);
  }
  return r;
}
/* Editorin kohdistusvalitsimet → muokattava review. Kirjoitetaan HETI (ei vasta Tallennassa),
   jotta tallennusrivi kertoo totuuden koko ajan — se on käyttäjän ainoa palaute kohteesta. */
function _kaavioKohdistusSync() {
  var m = _kaavioTila.muokkaus; if (!m) return;
  var el = document.getElementById('_kvENak');
  var nak = (el && el.value) || (m.review && m.review.nakyvyys) || 'joukkue';
  var k = _kaavioKohdeLue('_kvE', nak);
  m.review = m.review || {};
  m.review.nakyvyys = nak;
  m.review.joukkueId = k.joukkueId;
  m.review.valmentajaId = k.valmentajaId;
  m.review.pelaajaIds = k.pelaajaIds;
  var ko = document.getElementById('_kvKohde'); if (ko) ko.innerHTML = _kaavioTallennusKohdeHTML();
}
/* Kohdistuskentät kirjoitusmuodossa. YKSI lähde sekä luonti- että muokkaushaaralle, jotta ne
   eivät voi ajautua erilleen. Oletus on KAPEIN taso ('joukkue'), ei 'seura': puuttuva arvo ei saa
   tarkoittaa laajinta yleisöä. Kaikki kolme kohdekenttää kirjoitetaan aina, myös null/[], jotta
   tason vaihto NOLLAA edellisen kohteen eikä dokumenttiin jää haamukohdistusta. */
function _kaavioKohdistusKentat(m) {
  var r = (m && m.review) || {};
  return {
    nakyvyys: r.nakyvyys || 'joukkue',
    joukkueId: r.joukkueId || null,
    valmentajaId: r.valmentajaId || null,
    pelaajaIds: Array.isArray(r.pelaajaIds) ? r.pelaajaIds : []
  };
}
/* Yksityisyys kirjoitetaan omana kenttänään, EI kohdistuksen mukana: se ei ole kohdistusta vaan
   työn valmiusaste. Oletus false = julkinen, jotta vanha dokumentti ei muutu yksityiseksi
   pelkästä tallennuksesta (se katoaisi muilta ilman että kukaan pyysi sitä). */
function _kaavioYksityinenNyt(m) { return ((m && m.review) || {}).yksityinen === true; }
window._kaavioKohdistusSync = _kaavioKohdistusSync;
window._kaavioKohdeTasoVaihtui = _kaavioKohdeTasoVaihtui;
window._kaavioKohdePelaajatPaivita = _kaavioKohdePelaajatPaivita;

/* ══════════ PANKIN FASETIT (erä D1) ══════════════════════════════════════════════════════
   Kansio olisi pakottanut yhden sijainnin: sama kaavio on yhtä aikaa teema, pelaaja, joukkue ja
   tila. Siksi FASETIT — teema antaa kansion tunnun taittuvina osioina, ja pelaaja-/tila-/
   "minulle"-suodattimet leikkaavat sen läpi.

   ⚠ SUODATUS AJETAAN AINA kaavioVoiLukea():n JÄLKEEN. Suodatin on näkymä, ei lupa: se ei saa
   koskaan olla ainoa syy miksi jokin ei näy — eikä varsinkaan tuoda näkyviin mitään.

   TEEMA = PELIVAIHE. Brief oletti konsepteilla kentän `arkkityyppi` — sitä ei ole (tarkistettu
   lib/tm_teknistaktiset.js:stä). Curriculumissa on sen sijaan `ryhma` (joukkueteemat) ·
   `faasi` (93/109) · `dim` (youth), jotka kaikki kertovat pelivaiheen. Yhdistelmä kattaa
   109/109 konseptia neljään ämpäriin: hyökkäys 57 · puolustus 48 · siirtymä 2 · erikoistilanne 2.
   Tuntematon → 'muut' (taaksepäinyhteensopiva: vanhat/omat konseptit eivät katoa). */
var _KAAVIO_TEEMAT = ['hyokkays', 'puolustus', 'siirtyma', 'erikoistilanne', 'muut'];
var _KAAVIO_TEEMA_LBL = { hyokkays: 'Hyökkäys', puolustus: 'Puolustus', siirtyma: 'Siirtymä', erikoistilanne: 'Erikoistilanne', muut: 'Muut' };
function _kaavioTeema(k) {
  var kons = _kaavioKonsepti(k && k.spec);
  var v = (kons && (kons.ryhma || kons.faasi || kons.dim)) || (k && k.spec && k.spec.teema) || null;
  return (_KAAVIO_TEEMAT.indexOf(v) >= 0) ? v : 'muut';
}
function _kaavioTeemaLbl(t) { return _kuiT(_KAAVIO_TEEMA_LBL[t] || 'Muut'); }

var _KAAVIO_SUODATIN_TYHJA = { teema: '', pelaajaId: '', minulle: false, tila: '', nakyvyys: '', haku: '' };
function _kaavioSuodatinNyt() {
  if (!_kaavioTila.suodatin) _kaavioTila.suodatin = Object.assign({}, _KAAVIO_SUODATIN_TYHJA);
  return _kaavioTila.suodatin;
}
function _kaavioSuodatinAktiivinen(s) {
  s = s || _kaavioSuodatinNyt();
  return !!(s.teema || s.pelaajaId || s.minulle || s.tila || s.nakyvyys || (s.haku || '').trim());
}

/* "Minulle osoitetut" = henkilöstöreititys (review.valmentajaId) TAI oman joukkueen kohdistus.
   EI rajaus vaan FOKUS: valmentaja näkee ilman suodatinta yhä koko seuran, koska seuran sisäinen
   oppiminen on tarkoituksellista (Teron päätös). Tämä tekee #533:n 'valmentaja'-tasosta
   toiminnallisen — ilman sitä kohdistus olisi lippu ilman hyötyä. */
function _kaavioMinulle(k, ctx) {
  var r = (k && k.review) || {};
  if (r.valmentajaId && ctx && r.valmentajaId === ctx.uid) return true;
  return !!(r.joukkueId && ctx && (ctx.joukkueet || []).indexOf(r.joukkueId) >= 0);
}

/* Hakukenttä: nimi (LOKALISOITU — käyttäjä hakee sillä mitä näkee) · avain · pelimuoto · teema.
   Ei KPI-tekstiä: se tekisi hausta osuvan lähes kaikkeen ja veisi suodattimelta terän. */
function _kaavioHakuOsuu(k, haku) {
  var q = String(haku || '').trim().toLowerCase();
  if (!q) return true;
  var ots = _kaavioOtsikko(k.spec) || {};
  var kentat = [ots.nimi, (k.spec && k.spec.avain), (k.spec && k.spec.pelimuoto), _kaavioTeemaLbl(_kaavioTeema(k))];
  return kentat.some(function (x) { return String(x == null ? '' : x).toLowerCase().indexOf(q) >= 0; });
}

function _kaavioSuodata(lista, s, ctx) {
  s = s || _KAAVIO_SUODATIN_TYHJA;
  return (lista || []).filter(function (k) {
    var r = k.review || {};
    if (s.teema && _kaavioTeema(k) !== s.teema) return false;
    // Pelaajasuodatin vastaa kysymykseen "mitä TÄLLE pelaajalle on tehty" → vain nimenomaan
    // hänelle kohdistetut. Joukkue-/seuratason kaaviot eivät ole "hänelle tehtyjä".
    if (s.pelaajaId && (r.pelaajaIds || []).indexOf(s.pelaajaId) < 0) return false;
    if (s.minulle && !_kaavioMinulle(k, ctx)) return false;
    if (s.tila && ((r.status || (k.kanoninen ? 'hyvaksytty' : 'luonnos')) !== s.tila)) return false;
    if (s.nakyvyys && ((r.nakyvyys || (k.kanoninen ? '' : 'seura')) !== s.nakyvyys)) return false;
    if (!_kaavioHakuOsuu(k, s.haku)) return false;
    return true;
  });
}

/* ⚠ KORTIN TOIMINNOT EIVÄT SAA KULKEA JÄRJESTYSNUMEROLLA. Ennen fasetteja kortin indeksi oli
   sama kuin luetun listan indeksi, joten _kaavioToiminto(t, i) osui oikeaan. Suodatuksen myötä
   näytetty järjestys eroaa luetusta — indeksi olisi osoittanut ERI kaavioon, eli Muokkaa/Hyväksy/
   Nosta olisi kohdistunut väärään dokumenttiin. Siksi tunniste on stabiili avain, ei sijainti.
   Etuliite erottaa kanonisen ja seuratason dokumentin, joiden id:t tulevat eri kokoelmista. */
function _kaavioKorttiAvain(k) {
  return (k && k.kanoninen ? 'kan_' : 'seu_') + String((k && k.id) || '').replace(/[^A-Za-z0-9_-]/g, '');
}
function _kaavioEtsiKaavio(avain) {
  return (_kaavioTila.nakyvat || []).filter(function (k) { return _kaavioKorttiAvain(k) === avain; })[0] || null;
}

function _kaavioKorttiHTML(k, i, ctx) {
  var esc = _kuiEsc, st = (k.review && k.review.status) || (k.kanoninen ? 'hyvaksytty' : 'luonnos');
  var ots = _kaavioOtsikko(k.spec);
  var nimi = ots.nimi || k.id;
  var vari = st === 'hyvaksytty' ? 'var(--teal)' : st === 'odottaa' ? 'var(--amber)' : st === 'hylatty' ? '#C94040' : 'var(--ink3)';
  var kav = _kaavioKorttiAvain(k);
  var h = '<div style="border:.5px solid var(--border);border-radius:10px;padding:12px;background:var(--surface)">';
  h += '<div id="_kvEsik' + i + '" data-kaavio="' + kav + '" class="tm-kaavio" style="margin-bottom:8px;display:flex;justify-content:center"></div>';
  h += '<div style="font-size:13px;font-weight:600;color:var(--ink)">' + esc(nimi) + '</div>';
  h += '<div style="font-size:10.5px;font-family:var(--font-mono);color:var(--ink3);margin-top:2px">'
     + esc((k.spec && k.spec.avain) || '') + (ots.kpiKoodi ? ' · ' + esc(ots.kpiKoodi) : '')
     + ' · ' + esc((k.spec && k.spec.pelimuoto) || '') + '</div>';
  // KPI-teksti = konseptin totuus (ei kaavion kopio) → näkyy vain kun kaavio on tagattu KPI:hin.
  if (ots.kpiTeksti) h += '<div style="font-size:11.5px;color:var(--ink2);line-height:1.45;margin-top:5px">' + esc(ots.kpiTeksti) + '</div>';
  // KOHDE NIMINÄ, ei pelkkä taso. Tämä on Teron vaatimus: "miten VP voi tietää kenelle se
  // tallentuu". Pelkkä "pelaaja" kertoi tason muttei kenelle — kortti näytti kohdistetulta
  // vaikkei kohdetta ollut lainkaan.
  h += '<div style="font-size:11px;margin-top:6px;color:' + vari + '">' + (k.kanoninen ? _kuiT('kanoninen') : _kaavioTilaLbl(st)) + (!k.kanoninen && k.review && k.review.nakyvyys ? ' · ' + esc(_kaavioKohdeLbl(k.review)) : '') + '</div>';
  // Yksityisyys näkyviin: ilman merkkiä tekijä ei tiedä onko työ jo muiden nähtävissä.
  if (typeof kaavioYksityinen === 'function' && kaavioYksityinen(k)) {
    h += '<div style="font-size:10.5px;margin-top:4px;color:var(--amber)">🔒 ' + esc(_kuiT('yksityinen luonnos · vain sinä')) + '</div>';
  }
  // Erä D2 — kuittauskattavuus. Näytetään VAIN hyväksytylle (kuittaus on mahdollinen vasta
  // silloin) ja vain kun joku on kuitannut: "0 ymmärtänyt" ei ole tieto vaan moite, ja
  // kohdistettujen kokonaismäärää ei voi tietää ilman rosterikyselyä (§26: ei alikokoelmakyselyjä
  // renderissä). Luku on kuittausten MÄÄRÄ, ei osuus — osuus vaatisi nimittäjän jota ei ole.
  var _kuitt = (k.review && k.review.ymmarretty) ? Object.keys(k.review.ymmarretty).length : 0;
  if (st === 'hyvaksytty' && _kuitt > 0) {
    h += '<div style="font-size:11px;margin-top:4px;color:var(--teal)">✓ ' + _kuitt + ' ' + _kuiT('pelaajaa kuitannut ymmärtäneensä') + '</div>';
  }
  // Näkyvyyden nosto seuratasolle on KURATOINTITOIMI, ei tilasiirto → oma nappinsa, ei
  // kaavioToiminnot-listalla (se kuvaa review-elinkaarta). Näkyy vain hyväksyjälle ja vain kun
  // kaavio ei jo ole seuratasoinen; kanoniset eivät ole seurakerroksen kuratoitavia.
  if (!k.kanoninen && k.review && k.review.nakyvyys !== 'seura' && (typeof kaavioOnHyvaksyja === 'function') && kaavioOnHyvaksyja(ctx)) {
    h += '<div style="margin-top:8px"><button onclick="_kaavioNostaSeuratasolle(\'' + kav + '\')" style="background:var(--ov-1);color:var(--ink2);border:.5px solid var(--border);border-radius:6px;padding:5px 10px;font-size:11px;cursor:pointer">↑ ' + _kuiT('Nosta seuratasolle') + '</button></div>';
  }
  var toiminnot = kaavioToiminnot(k, ctx);
  if (toiminnot.length) {
    h += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:9px">';
    toiminnot.forEach(function (t) { h += _kaavioNappiHTML(t, kav); });
    h += '</div>';
  }
  return h + '</div>';
}

function _kaavioNappiHTML(t, kav) {
  var lbl = { muokkaa: 'Muokkaa', julkaise: 'Julkaise joukkueelle', ehdota: 'Ehdota hyväksyttäväksi', hyvaksy: 'Hyväksy', hylkaa: 'Hylkää', poista: 'Poista', ymmarretty: 'Ymmärsin', kysy: 'Kysy' };
  var prim = (t === 'ehdota' || t === 'hyvaksy' || t === 'julkaise');
  var varoi = (t === 'hylkaa' || t === 'poista');
  var tyyli = prim ? 'background:rgba(40,176,144,.14);color:var(--teal);border-color:rgba(40,176,144,.4)'
            : varoi ? 'background:rgba(201,64,64,.12);color:#C94040;border-color:rgba(201,64,64,.35)'
            : 'background:var(--ov-1);color:var(--ink2);border-color:var(--border)';
  return '<button onclick="_kaavioToiminto(\'' + t + '\',\'' + kav + '\')" style="' + tyyli + ';border-width:.5px;border-style:solid;border-radius:6px;padding:5px 10px;font-size:11px;cursor:pointer">' + _kuiT(lbl[t] || t) + '</button>';
}

function _kaavioPiirraEsikatselu(elId, spec) {
  var el = document.getElementById(elId);
  if (!el || !spec || typeof drawSpec !== 'function') return;
  try {
    var svg = drawSpec(spec, _kaavioLang());
    svg.setAttribute('style', 'width:150px;height:auto');
    el.appendChild(svg);
  } catch (e) { el.textContent = _kuiT('Esikatselu ei onnistunut'); }
}

// ── TOIMINNOT ────────────────────────────────────────────────────────────────────────────
/* JULKAISU (erä D2): yksityinen luonnos → näkyviin muille. Vain yksityisyyslippu + versiolukko;
   status ja kohdistus eivät muutu. Ero Tallennaan on tarkoituksellisesti terävä: Tallenna pitää
   työn alla, Julkaise päästää sen esille. */
async function _kaavioJulkaise(k) {
  if (!k || k.kanoninen || !k.id) return;
  var ctx = _kaavioCtxNyt();
  if (typeof kaavioToiminnot === 'function' && kaavioToiminnot(k, ctx).indexOf('julkaise') < 0) {
    _kuiToast(_kuiT('Ei oikeutta tähän toimintoon'), 'err'); return;
  }
  try {
    await _kuiDb().collection('seurat').doc(k.seuraId || _kuiCtx().seuraId).collection('kaaviot').doc(k.id).update({
      'review.yksityinen': false,
      'review.versio': kaavioSeuraavaVersio(k)
    });
    _kuiToast(_kuiT('Julkaistu — näkyy nyt muille'), 'ok');
    await avaaKaaviopankki();
  } catch (e) { _kuiToast(_kuiT('Julkaisu epäonnistui — lataa kaavio uudelleen'), 'err'); }
}
window._kaavioJulkaise = _kaavioJulkaise;

/* Nosto seuratasolle: vain nakyvyys-kenttä + versiolukko. Status ei muutu — kuratointi ei ole
   hyväksyntä, ja hyväksytyn kaavion nosto ei saa pudottaa sitä takaisin katselmukseen. */
async function _kaavioNostaSeuratasolle(kav) {
  var k = _kaavioEtsiKaavio(kav);
  if (!k || k.kanoninen) return;
  if (!_kaavioOnHyvaksyjaNyt()) { _kuiToast(_kuiT('Ei oikeutta nostaa seuratasolle'), 'err'); return; }
  try {
    await _kuiDb().collection('seurat').doc(k.seuraId || _kuiCtx().seuraId).collection('kaaviot').doc(k.id).update({
      'review.nakyvyys': 'seura',
      'review.versio': kaavioSeuraavaVersio(k)
    });
    _kuiToast(_kuiT('Kaavio nostettu seuratasolle'), 'ok');
    avaaKaaviopankki();
  } catch (e) { _kuiToast(_kuiT('Nosto epäonnistui — lataa kaavio uudelleen'), 'err'); }
}
window._kaavioNostaSeuratasolle = _kaavioNostaSeuratasolle;

async function _kaavioToiminto(t, kav) {
  var ctx = _kaavioCtxNyt();
  var k = _kaavioEtsiKaavio(kav);
  if (!k) return;
  if (kaavioToiminnot(k, ctx).indexOf(t) < 0) { _kuiToast(_kuiT('Ei oikeutta tähän toimintoon'), 'err'); return; }
  if (t === 'muokkaa') return _kaavioAvaaEditori(k);
  if (t === 'julkaise') return _kaavioJulkaise(k);
  if (t === 'ehdota')  return _kaavioSiirra(k, 'odottaa');
  if (t === 'hyvaksy') return _kaavioSiirra(k, 'hyvaksytty');
  if (t === 'hylkaa')  return _kaavioHylkaaLomake(kav);   // EI _kaavioSiirra: perustelu on pakollinen
  if (t === 'kysy')    { _kuiToast(_kuiT('Kysymys kytketään myöhemmässä vaiheessa'), 'ok'); return; }
  _kuiToast(_kuiT('Toiminto kytketään myöhemmässä vaiheessa'), 'ok');
}

// Statussiirto. Client tarkistaa policyn ETUKÄTEEN, mutta sääntö on todellinen portti.
/* ══════════ KATSELMUKSEN KOMMENTTILANKA (erä E) ═════════════════════════════════════════
   Reject ilman perustelua oli umpikuja: valmentaja sai "hylätty" tietämättä miksi, eikä
   katselmuksella ollut valmennuksellista arvoa. Lanka on kaavion ALIKOKOELMA (ei
   review.kommentit[]): taulukko vaatisi doc-updaten joka kommentista ja törmäisi
   optimistiseen versiolukkoon (#531:n oppi).

   §32: teksti on käyttäjän VAPAATEKSTIÄ omalla kielellään — yksi kenttä, ei fi/sv/en eikä
   käännösvaatimusta. Sama linja kuin selitteellä (#530). */
function _kaavioKommenttiRef(k) {
  return _kuiDb().collection('seurat').doc(k.seuraId || _kuiCtx().seuraId)
    .collection('kaaviot').doc(k.id).collection('kommentit');
}
async function _kaavioLataaLanka(k) {
  if (!k || !k.id || k.kanoninen || !_kuiDb()) return [];
  try {
    var snap = await _kaavioKommenttiRef(k).orderBy('aika').get();
    var ulos = [];
    snap.forEach(function (d) { ulos.push(Object.assign({ id: d.id }, d.data())); });
    return ulos;
  } catch (e) { return []; }
}
/* Yksi kirjoituspolku sekä tavalliselle kommentille että hylkäysperustelulle — tyyppi erottaa
   ne. Kaksi polkua olisi tarkoittanut kahta paikkaa jossa kirjoittaja/aika voi mennä väärin. */
async function _kaavioLisaaKommentti(k, teksti, tyyppi) {
  var t = String(teksti == null ? '' : teksti).trim();
  if (!t) return false;
  var ctx = _kaavioCtxNyt();
  try {
    await _kaavioKommenttiRef(k).add({
      teksti: t,
      kirjoittaja: ctx.uid || null,
      rooli: ctx.rooli || null,
      tyyppi: tyyppi || 'kommentti',
      aika: firebase.firestore.FieldValue.serverTimestamp()
    });
    return true;
  } catch (e) { _kuiToast(_kuiT('Kommentin tallennus epäonnistui'), 'err'); return false; }
}

/* PAKOLLINEN HYLKÄYSPERUSTELU. Oma lomake, EI selaimen prompt(): prompt on tyylitön, ei
   tue monirivistä perustelua eikä noudata appien teemaa — ja se on juuri se hetki jossa
   VP kirjoittaa valmennuksellisen viestin, ei yhtä sanaa. */
function _kaavioHylkaaLomake(kav) {
  var k = _kaavioEtsiKaavio(kav); if (!k) return;
  var ctx = _kaavioCtxNyt();
  if (!kaavioSiirtoSallittu((k.review && k.review.status) || 'luonnos', 'hylatty', ctx)) {
    _kuiToast(_kuiT('Tilasiirto ei ole sallittu'), 'err'); return;
  }
  document.getElementById('_kvHylkays')?.remove();
  var h = '<div id="_kvHylkays" style="position:fixed;inset:0;background:rgba(17,17,16,.94);z-index:340;display:flex;align-items:center;justify-content:center;padding:20px" onclick="if(event.target===this)this.remove()">';
  h += '<div style="background:var(--bg2);border:.5px solid var(--border);padding:22px;width:460px;max-width:96vw" onclick="event.stopPropagation()">';
  h += '<div style="font-family:\'Cormorant Garamond\',serif;font-size:20px;color:var(--ink);margin-bottom:4px">' + _kuiT('Hylkää kaavio') + '</div>';
  h += '<div style="font-size:11.5px;color:var(--ink3);line-height:1.5;margin-bottom:14px">' + _kuiT('Perustelu näkyy valmentajalle katselmuslangassa. Kerro mitä pitää korjata.') + '</div>';
  h += '<textarea id="_kvHylkaysSyy" rows="4" style="width:100%;' + _KV_KOHDE_TYYLI + ';resize:vertical;line-height:1.5"></textarea>';
  h += '<div id="_kvHylkaysVirhe" style="font-size:11.5px;color:#C94040;margin-top:8px;min-height:15px"></div>';
  h += '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:6px">';
  h += '<button onclick="document.getElementById(\'_kvHylkays\').remove()" style="background:var(--ov-1);color:var(--ink3);border:.5px solid var(--border);border-radius:6px;padding:8px 14px;font-size:12px;cursor:pointer">' + _kuiT('Peruuta') + '</button>';
  h += '<button onclick="_kaavioHylkaaVahvista(\'' + _kuiEsc(kav) + '\')" style="background:rgba(201,64,64,.14);color:#C94040;border:.5px solid rgba(201,64,64,.4);border-radius:6px;padding:8px 16px;font-size:12px;cursor:pointer">' + _kuiT('Hylkää') + '</button>';
  h += '</div></div></div>';
  document.body.insertAdjacentHTML('beforeend', h);
  document.getElementById('_kvHylkaysSyy')?.focus();
}
/* Hylkäys on KAKSI kirjoitusta: perustelu lankaan + status. PERUSTELU KIRJOITETAAN ENSIN — jos
   status menisi läpi ja kommentti epäonnistuisi, jäljelle jäisi juuri se umpikuja jonka tämä erä
   poistaa ("hylätty", ei syytä). Toisin päin epäonnistuva statuspäivitys jättää langan johon VP
   voi palata, ja hylkäyksen voi yrittää uudelleen. */
async function _kaavioHylkaaVahvista(kav) {
  var k = _kaavioEtsiKaavio(kav); if (!k) return;
  var el = document.getElementById('_kvHylkaysSyy');
  var virhe = document.getElementById('_kvHylkaysVirhe');
  var syy = el ? String(el.value || '').trim() : '';
  if (!syy) {
    if (virhe) virhe.textContent = _kuiT('Hylkäys vaatii perustelun.');
    if (el) el.focus();
    return;
  }
  if (!(await _kaavioLisaaKommentti(k, syy, 'hylkays'))) return;   // ei statusta ilman syytä
  document.getElementById('_kvHylkays')?.remove();
  await _kaavioSiirra(k, 'hylatty');
}
window._kaavioHylkaaLomake = _kaavioHylkaaLomake;
window._kaavioHylkaaVahvista = _kaavioHylkaaVahvista;

/* ── LANKA UI ─────────────────────────────────────────────────────────────────────────────
   Lanka näkyy EDITORISSA, ei kortissa: kortti on selailunäkymä (esikatselu + tila + kohde), ja
   keskustelu kuuluu siihen näkymään jossa kaaviota katsotaan tarkkaan. Kortille jäisi myös
   n kertaa alikokoelmakysely pankin avauksessa (§26: ei alikokoelmakyselyjä renderissä). */
function _kaavioLankaRiviHTML(c) {
  var esc = _kuiEsc;
  var hylkays = c.tyyppi === 'hylkays';
  var vari = hylkays ? 'var(--amber)' : 'var(--ink3)';
  var reuna = hylkays ? 'rgba(224,160,64,.45)' : 'var(--border)';
  var h = '<div style="border-left:2px solid ' + reuna + ';padding:4px 0 6px 9px;margin-bottom:8px">';
  h += '<div style="font-size:10px;color:' + vari + ';letter-spacing:.06em">'
     + (hylkays ? esc(_kuiT('Hylätty')) + ' · ' : '')
     + esc(_kaavioKirjoittajaNimi(c)) + ' · ' + esc(_kaavioAikaLbl(c.aika)) + '</div>';
  // Kommentti on käyttäjän vapaatekstiä (§32) → escape, ei käännöstä, rivinvaihdot säilyvät.
  h += '<div style="font-size:12px;color:var(--ink2);line-height:1.5;white-space:pre-wrap;margin-top:2px">' + esc(c.teksti || '') + '</div>';
  return h + '</div>';
}
/* Kirjoittajan nimi host-listasta jos löytyy; muuten rooli; muuten uid. Nimi on parempi kuin
   uid, mutta uid on parempi kuin tyhjä — lukija tarvitsee jonkin tunnisteen. */
function _kaavioKirjoittajaNimi(c) {
  var v = (_kuiValmentajat() || []).filter(function (x) { return x.id === c.kirjoittaja; })[0];
  if (v && v.nimi) return v.nimi;
  if (c.rooli) return _kuiT(c.rooli);
  return c.kirjoittaja || '—';
}
function _kaavioAikaLbl(aika) {
  try {
    var d = (aika && typeof aika.toDate === 'function') ? aika.toDate() : (aika ? new Date(aika) : null);
    if (!d || isNaN(d.getTime())) return _kuiT('juuri nyt');   // serverTimestamp ei ole vielä palannut
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return p(d.getDate()) + '.' + p(d.getMonth() + 1) + '.' + d.getFullYear() + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  } catch (e) { return ''; }
}
function _kaavioLankaHTML() {
  var lanka = _kaavioTila.lanka || [];
  var h = '<div style="font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink3);margin-bottom:8px">' + _kuiT('Katselmus') + '</div>';
  if (!lanka.length) {
    h += '<div style="font-size:11.5px;color:var(--ink3);line-height:1.45;margin-bottom:8px">' + _kuiT('Ei kommentteja. Perustele hylkäys tai kysy tarkennusta tässä.') + '</div>';
  } else {
    lanka.forEach(function (c) { h += _kaavioLankaRiviHTML(c); });
  }
  h += '<textarea id="_kvKomm" rows="2" placeholder="' + _kuiEsc(_kuiT('Kirjoita kommentti…')) + '" style="width:100%;' + _KV_KOHDE_TYYLI + ';resize:vertical;line-height:1.45;font-size:12px"></textarea>';
  h += '<div style="text-align:right;margin-top:6px"><button onclick="_kaavioLahetaKommentti()" style="background:var(--ov-1);color:var(--ink2);border:.5px solid var(--border);border-radius:6px;padding:6px 12px;font-size:11.5px;cursor:pointer">' + _kuiT('Lähetä') + '</button></div>';
  return h;
}
async function _kaavioLahetaKommentti() {
  var m = _kaavioTila.muokkaus, el = document.getElementById('_kvKomm');
  if (!m || !m.id || !el) return;
  var t = String(el.value || '').trim();
  if (!t) return;
  if (!(await _kaavioLisaaKommentti(m, t, 'kommentti'))) return;
  el.value = '';
  await _kaavioPaivitaLanka(m);
}
async function _kaavioPaivitaLanka(k) {
  _kaavioTila.lanka = await _kaavioLataaLanka(k);
  var el = document.getElementById('_kvLanka');
  if (el) el.innerHTML = _kaavioLankaHTML();
}
window._kaavioLahetaKommentti = _kaavioLahetaKommentti;

async function _kaavioSiirra(k, uusiTila) {
  var ctx = _kaavioCtxNyt();
  if (!kaavioSiirtoSallittu((k.review && k.review.status) || 'luonnos', uusiTila, ctx)) {
    _kuiToast(_kuiT('Tilasiirto ei ole sallittu'), 'err'); return;
  }
  try {
    await _kuiDb().collection('seurat').doc(k.seuraId || _kuiCtx().seuraId).collection('kaaviot').doc(k.id).update({
      'review.status': uusiTila,
      'review.versio': kaavioSeuraavaVersio(k)
    });
    _kuiToast(_kuiT('Tila päivitetty'), 'ok');
    avaaKaaviopankki();
  } catch (e) { _kuiToast(_kuiT('Tallennus epäonnistui — lataa kaavio uudelleen'), 'err'); }
}

// ── EDITORI ──────────────────────────────────────────────────────────────────────────────
// Piirto tulee tm_kaavio_render.js:stä ja vuorovaikutus tm_kaavio_editori.js:stä — SAMA
// koordinaattimappi (B1:n pariteettitesti lukitsee sen), joten hit-testaus osuu kohdakkain.
/* ══════════════════════════════════════════════════════════
   UUDEN KAAVION LUONTI — puuttuva sisäänkäynti
   ──────────────────────────────────────────────────────────
   Pankki osasi listata, muokata, katselmoida ja hyväksyä — mutta ei LUODA. Editori avautui vain
   olemassa olevalle dokumentille ja tallennus oli pelkkä update(), joten tyhjässä seurassa
   ensimmäistä kaaviota ei voinut tehdä lainkaan.

   Luonti ei tuo omaa editoria eikä omaa validointia: se rakentaa valmiiksi VALIDIN starter-specin
   ja avaa SAMAN editorin (_kaavioAvaaEditori). Ainoa uusi asia on _kaavioTallenna():n create-haara.

   Miksi starter on valmiiksi validi: §6-validaattori ajetaan tallennuksessa, ja tyhjä spec
   (0 pelaajaa) avaisi editorin virhetilassa — käyttäjä näkisi "ei kelpaa" ennen kuin on tehnyt
   mitään. Kaksi pelaajaa on pienin määrä joka kelpaa JA josta voi vetää ensimmäisen syötön.
══════════════════════════════════════════════════════════ */
var _KAAVIO_PELIMUODOT = ['5v5', '8v8', '11v11'];

/* Hyväksyjyys = peili firestore.rules onKaavioHyvaksyja():sta (vp | urheilutoimenjohtaja | SA).
   Policy-libissä on jo kaavioOnHyvaksyja(ctx) — käytetään sitä, jottei rinnakkaista roolilistaa
   synny. Tämä ratkaisee sekä näkyvyysvalikon että katselmuksen noston. */
function _kaavioOnHyvaksyjaNyt() {
  return (typeof kaavioOnHyvaksyja === 'function') ? kaavioOnHyvaksyja(_kaavioCtxNyt()) : false;
}

function _kaavioUusiNappiHTML() {
  return '<button onclick="_kaavioUusiLomake()" style="background:rgba(40,176,144,.14);color:var(--teal);'
    + 'border:.5px solid rgba(40,176,144,.4);border-radius:6px;padding:6px 12px;font-size:11.5px;cursor:pointer">＋ '
    + _kuiT('Uusi kaavio') + '</button>';
}

/* Konseptilista lomakkeen dropdowniin: kaanon ⊕ seura, näyttönimet lokalisoituna (host.konseptilista
   hoitaa molemmat). Tallennettava arvo on AVAIN — nimi resolvoituu renderissä (erä C). */
function _kaavioUusiKonseptit() {
  var pohja = [];
  try { if (typeof TM_TT_YOUTH !== 'undefined') pohja = pohja.concat(TM_TT_YOUTH); } catch (e) {}
  try { if (typeof TM_TT_JOUKKUE !== 'undefined') pohja = pohja.concat(TM_TT_JOUKKUE); } catch (e) {}
  var lista = _kuiKonseptilista(pohja) || pohja;
  return lista.filter(function (k) { return k && k.avain; });
}

function _kaavioUusiLomake() {
  var ctx = _kaavioCtxNyt();
  if (typeof kaavioVoiLuoda !== 'function' || !kaavioVoiLuoda(ctx)) { _kuiToast(_kuiT('Ei oikeutta luoda kaaviota'), 'err'); return; }
  document.getElementById('_kvUusi')?.remove();
  var kons = _kaavioUusiKonseptit();
  var esc = _kuiEsc;
  var h = '<div id="_kvUusi" style="position:fixed;inset:0;background:rgba(17,17,16,.94);z-index:330;display:flex;align-items:center;justify-content:center;padding:20px" onclick="if(event.target===this)this.remove()">';
  h += '<div style="background:var(--bg2);border:.5px solid var(--border);padding:22px;width:460px;max-width:96vw;max-height:92vh;overflow-y:auto" onclick="event.stopPropagation()">';
  h += '<div style="font-family:\'Cormorant Garamond\',serif;font-size:20px;color:var(--ink);margin-bottom:4px">' + _kuiT('Uusi kaavio') + '</div>';
  h += '<div style="font-size:11.5px;color:var(--ink3);line-height:1.5;margin-bottom:16px">' + _kuiT('Valitse mitä kaavio opettaa. Piirto avautuu seuraavaksi; kaavio tallentuu luonnoksena ja menee katselmukseen.') + '</div>';

  h += '<div style="margin-bottom:14px"><label for="_kvUKons" style="display:block;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink2);margin-bottom:5px">' + _kuiT('Konsepti') + '</label>';
  h += '<select id="_kvUKons" onchange="_kaavioUusiKpiPaivita()" style="width:100%;background:var(--bg);border:.5px solid var(--border);color:var(--ink);font-family:inherit;font-size:12.5px;padding:8px 9px">';
  kons.forEach(function (k) { h += '<option value="' + esc(k.avain) + '">' + esc(k.nimi || k.avain) + '</option>'; });
  h += '</select></div>';

  h += '<div style="margin-bottom:14px"><label for="_kvUKpi" style="display:block;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink2);margin-bottom:5px">' + _kuiT('Havaintokriteeri (valinnainen)') + '</label>';
  h += '<select id="_kvUKpi" style="width:100%;background:var(--bg);border:.5px solid var(--border);color:var(--ink);font-family:inherit;font-size:12.5px;padding:8px 9px"></select></div>';

  h += '<div style="display:flex;gap:12px;margin-bottom:14px">';
  h += '<div style="flex:1"><label for="_kvUPm" style="display:block;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink2);margin-bottom:5px">' + _kuiT('Pelimuoto') + '</label>';
  h += '<select id="_kvUPm" style="width:100%;background:var(--bg);border:.5px solid var(--border);color:var(--ink);font-family:inherit;font-size:12.5px;padding:8px 9px">';
  _KAAVIO_PELIMUODOT.forEach(function (pm) { h += '<option value="' + pm + '"' + (pm === '8v8' ? ' selected' : '') + '>' + pm + '</option>'; });
  h += '</select></div>';
  h += '<div style="flex:1"><label for="_kvUNak" style="display:block;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink2);margin-bottom:5px">' + _kuiT('Näkyvyys') + '</label>';
  // Tasolista tulee policysta (peili rulesin kaavioNakyvyysLuontiOk:sta) — ei kovakoodattua
  // roolihaarautumista täällä. TOTUUS on silti firestore.rulesissa.
  h += _kaavioNakyvyysValitsinHTML('_kvU', null);
  h += '</div></div>';
  var _hyv = _kaavioOnHyvaksyjaNyt();
  if (!_hyv) h += '<div style="font-size:11px;color:var(--ink3);line-height:1.45;margin-bottom:10px">' + _kuiT('Seuratason kaavion asettaa valmennuspäällikkö katselmuksessa.') + '</div>';
  // KOHTEEN valinta — tämä oli se puuttunut puolisko. Ilman sitä taso tallentui mutta kohde jäi
  // tyhjäksi: kortti sanoi "pelaaja" muttei kenelle.
  var _tasot = _kaavioTasotNyt();
  var _oletusTaso = (_tasot.indexOf('joukkue') >= 0) ? 'joukkue' : _tasot[0];
  h += '<div id="_kvUKohde" style="margin-bottom:16px">' + _kaavioKohdeValitsinHTML('_kvU', _oletusTaso, null) + '</div>';
  h += '<div id="_kvUVirhe" style="font-size:11.5px;color:#C94040;margin-bottom:10px"></div>';
  h += '<div style="display:flex;gap:8px;justify-content:flex-end">';
  h += '<button onclick="document.getElementById(\'_kvUusi\').remove()" style="background:var(--ov-1);color:var(--ink3);border:.5px solid var(--border);border-radius:6px;padding:8px 14px;font-size:12px;cursor:pointer">' + _kuiT('Peruuta') + '</button>';
  h += '<button onclick="_kaavioLuoJaMuokkaa()" style="background:rgba(40,176,144,.16);color:var(--teal);border:.5px solid rgba(40,176,144,.45);border-radius:6px;padding:8px 16px;font-size:12px;cursor:pointer">' + _kuiT('Luo ja muokkaa') + '</button>';
  h += '</div></div></div>';
  document.body.insertAdjacentHTML('beforeend', h);
  _kaavioUusiKpiPaivita();
}

/* KPI-vaihtoehdot seuraavat valittua konseptia — validaattori hylkäisi koodin joka ei kuulu
   konseptin KPI-listalle (erä C), joten listaa ei saa kovakoodata a–d:ksi. */
function _kaavioUusiKpiPaivita() {
  var ks = document.getElementById('_kvUKons'), kp = document.getElementById('_kvUKpi');
  if (!ks || !kp) return;
  var ots = _kaavioOtsikko({ avain: ks.value });
  var raaka = (typeof tmKonseptiResolvoi === 'function') ? tmKonseptiResolvoi(ks.value, _kuiCtx().seuraId) : null;
  var naytto = raaka ? _kuiKonsepti(raaka) : raaka;
  var h = '<option value="">' + _kuiT('— koko konsepti —') + '</option>';
  (ots.kpiKoodit || []).forEach(function (koodi) {
    var rivi = ((naytto && naytto.kpi) || []).filter(function (x) { return x && x.koodi === koodi; })[0];
    var teksti = (rivi && rivi.teksti) ? String(rivi.teksti) : '';
    if (teksti.length > 64) teksti = teksti.slice(0, 64).trim() + '…';
    h += '<option value="' + _kuiEsc(koodi) + '">' + _kuiEsc(koodi + (teksti ? ' · ' + teksti : '')) + '</option>';
  });
  kp.innerHTML = h;
}

function _kaavioLuoJaMuokkaa() {
  var ctx = _kaavioCtxNyt();
  if (typeof kaavioVoiLuoda !== 'function' || !kaavioVoiLuoda(ctx)) { _kuiToast(_kuiT('Ei oikeutta luoda kaaviota'), 'err'); return; }
  var ks = document.getElementById('_kvUKons'), kp = document.getElementById('_kvUKpi');
  var pm = document.getElementById('_kvUPm'), nak = document.getElementById('_kvUNak');
  var virhe = document.getElementById('_kvUVirhe');
  // FAIL-CLOSED oletus: jos valitsinta ei jostain syystä ole, kapein taso — ei 'seura'.
  var _nakArvo = (nak && nak.value) || 'joukkue';
  var avain = ks && ks.value;
  if (!avain) { if (virhe) virhe.textContent = _kuiT('Valitse konsepti.'); return; }
  // Starter seuraa konseptin DOMEENIA. Hyökkäyskonseptin lähtöasetelma (pallo omalla pelaajalla)
  // on väärä puolustuskonseptille: 1v1-puolustaminen alkaa siitä että pallo on VASTUSTAJALLA ja
  // oma pelaaja painostaa ilman palloa. Väärä asetelma ei ole pelkkä kauneusvirhe — valmentaja
  // joutuisi purkamaan sen ennen kuin voi piirtää mitään.
  // dim luetaan resolvoidusta konseptista (kaanon ⊕ seura); puuttuva dim → hyökkäys (entinen).
  var _k = (typeof tmKonseptiResolvoi === 'function') ? tmKonseptiResolvoi(avain, _kuiCtx().seuraId) : null;
  var _puolustus = !!(_k && _k.dim === 'puolustus');
  var starter = {
    avain: avain,
    suunta: 'ylos',
    pelimuoto: (pm && pm.value) || '8v8',
    pelaajat: _puolustus
      ? [
          // rooli 'syöttäjä', EI 'vastaanottaja': renderöijä tyylittää vastaanottajan aksenttivärillä
          // ENNEN joukkuetarkistusta, joten vastustaja olisi näyttänyt omalta korostetulta pelaajalta
          // (todettu live-renderistä). 'syöttäjä' on myös semanttisesti oikein — pallollinen joka
          // on syöttämässä. Seuraus: puolustus-starterissa ei ole vastaanottajaa, joten näkökenttä
          // vaatii että valmentaja lisää sellaisen ensin (työkalu kertoo sen).
          { id: 'V1', joukkue: 'vastustaja', rooli: 'syöttäjä', x: 50, y: 52, pallo: true },
          { id: 'P1', joukkue: 'oma', rooli: 'paine', x: 50, y: 66 },
          { id: 'P2', joukkue: 'oma', rooli: 'tuki', x: 34, y: 76 }
        ]
      : [
          { id: 'P1', joukkue: 'oma', rooli: 'vastaanottaja', x: 50, y: 62, avoin: -90, pallo: true },
          { id: 'P2', joukkue: 'oma', rooli: 'tuki', x: 35, y: 74 }
        ],
    liikkeet: [], selitteet: []
  };
  if (kp && kp.value) starter.kpi = kp.value;
  _kaavioTila.muokkaus = {
    id: null, _uusi: true, seuraId: _kuiCtx().seuraId,
    spec: starter,
    // YKSITYINEN OLETUKSENA (erä D2): tekijä hioo ensin, julkaisee sitten. Ilman tätä keskeneräinen
    // luonnos ilmestyy heti koko seuran valmentajille — ei siksi että näkyvyys olisi väärin
    // (se on tarkoituksellista) vaan siksi ettei työ ole vielä esittelykelpoista.
    review: Object.assign(
      { status: 'luonnos', nakyvyys: _nakArvo, yksityinen: true, versio: 0 },
      _kaavioKohdeLue('_kvU', _nakArvo))
  };
  document.getElementById('_kvUusi')?.remove();
  _kaavioAvaaEditori(_kaavioTila.muokkaus);   // SAMA editori kuin Muokkaa — ei kopiota
}
window._kaavioUusiLomake = _kaavioUusiLomake;
window._kaavioUusiKpiPaivita = _kaavioUusiKpiPaivita;
window._kaavioLuoJaMuokkaa = _kaavioLuoJaMuokkaa;

function _kaavioAvaaEditori(k) {
  document.getElementById('_kvEditori')?.remove();
  _kaavioTila.muokkaus = JSON.parse(JSON.stringify(k));
  // MIGRAATIO avattaessa: globaali spec.cone → pelaajakohtainen nakokentta. Dokumentti korjaa
  // itsensä seuraavassa tallennuksessa; renderöijä sietäisi molempia, mutta editorin työkalut
  // toimivat vain uudessa muodossa.
  if (typeof kaavioNormalisoiNakokentta === 'function') {
    var _mg = kaavioNormalisoiNakokentta(_kaavioTila.muokkaus.spec);
    if (_mg.muuttui) _kaavioTila.muokkaus.spec = _mg.spec;
  }
  _kaavioTila.historia = [];
  _kaavioTila.tyokalu = null; _kaavioTila.veto = null; _kaavioTila.valittu = null;   // jokainen avaus alkaa raahaus- ja valintatilasta
  _kaavioTila.tallennettuSpec = null; _kaavioTila.tallennettuKohde = null;   // leima syntyy vasta ensimmäisestä tallennuksesta
  var h = '<div id="_kvEditori" style="position:fixed;inset:0;background:rgba(17,17,16,.96);z-index:320;display:flex;align-items:center;justify-content:center" onclick="if(event.target===this)_kaavioSuljeEditori()">';
  h += '<div style="background:var(--bg2);border:.5px solid var(--border);padding:20px;max-width:96vw;max-height:94vh;overflow-y:auto" onclick="event.stopPropagation()">';
  var edOts = _kaavioOtsikko(_kaavioTila.muokkaus.spec);
  h += '<div style="font-family:\'Cormorant Garamond\',serif;font-size:20px;color:var(--ink);margin-bottom:2px">' + _kuiT('Muokkaa kaaviota') + '</div>';
  h += '<div style="font-size:12.5px;color:var(--ink2);margin-bottom:2px">' + _kuiEsc(edOts.nimi || '') + (edOts.kpiKoodi ? ' · ' + _kuiEsc(edOts.kpiKoodi) : '') + '</div>';
  if (edOts.kpiTeksti) h += '<div style="font-size:11.5px;color:var(--ink3);line-height:1.45;margin-bottom:10px">' + _kuiEsc(edOts.kpiTeksti) + '</div>';
  else h += '<div style="margin-bottom:6px"></div>';
  // TALLENNUKSEN NÄKYVYYS: käyttäjä kysyi "mihin se tallentuu?" — toast on ohimenevä, tämä ei.
  h += '<div id="_kvKohde" style="font-size:11px;color:var(--ink3);margin-bottom:10px">' + _kaavioTallennusKohdeHTML() + '</div>';
  h += '<div style="display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap">';
  h += '<div id="_kvCanvas" class="tm-kaavio" style="flex:0 0 auto"></div>';
  h += '<div style="flex:1;min-width:210px">';
  h += '<div style="font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink3);margin-bottom:6px">' + _kuiT('Lisää pelaaja') + '</div>';
  h += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">';
  h += _kvTyokalu('pelaaja_oma', 'Oma pelaaja') + _kvTyokalu('pelaaja_vast', 'Vastustaja');
  h += '</div>';
  // Piirrostyökalut: aktiivinen työkalu vaihtaa pointer-vedon merkityksen (ks. _kaavioPointerDown).
  h += '<div style="font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink3);margin-bottom:6px">' + _kuiT('Piirrä') + '</div>';
  h += '<div id="_kvTyokalut" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">' + _kaavioTyokalupalkkiHTML() + '</div>';
  h += '<div id="_kvNkSaadin">' + _kaavioNakokenttaSaadinHTML() + '</div>';
  h += '<div id="_kvOminaisuudet" style="border-top:.5px solid var(--border);padding-top:10px;margin-top:10px">' + _kaavioOminaisuudetHTML() + '</div>';
  h += '<div id="_kvOhje" style="font-size:11px;color:var(--ink3);line-height:1.45;margin-bottom:12px">' + _kuiEsc(_kaavioTyokaluOhje()) + '</div>';
  // KOHDISTUS myös editorissa, ei vain luonnissa: kohde on korjattava jälkikäteen (VP tarkentaa
  // katselmuksessa, valmentaja huomaa unohtaneensa pelaajan). change kuplii → yksi onchange
  // säiliössä riittää kaikille valitsimille.
  if (!_kaavioTila.muokkaus.kanoninen) {
    var _edR = _kaavioTila.muokkaus.review || {};
    var _edNak = _edR.nakyvyys || _kaavioTasotNyt()[0] || 'joukkue';
    h += '<div id="_kvEKohdistus" onchange="_kaavioKohdistusSync()" style="border-top:.5px solid var(--border);padding-top:10px;margin-bottom:12px">';
    h += '<div style="font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink3);margin-bottom:6px">' + _kuiT('Kohdistus') + '</div>';
    h += _kaavioNakyvyysValitsinHTML('_kvE', _edNak);
    h += '<div id="_kvEKohde">' + _kaavioKohdeValitsinHTML('_kvE', _edNak, _edR) + '</div>';
    h += '</div>';
  }

  // Lanka vain tallennetulle: julkaisemattomalla luonnoksella ei ole katselmusta josta
  // keskustella, eikä kommentille olisi dokumenttia johon liittyä.
  // ⚠ ENNEN nappirivin flex-containeria: sen sisällä lanka olisi flex-lapsi ja venyttäisi
  // Kumoa/Tallenna/Valmis pystysuunnassa langan korkuisiksi (todettu live-renderistä).
  if (!_kaavioTila.muokkaus.kanoninen && _kaavioTila.muokkaus.id && !_kaavioTila.muokkaus._uusi) {
    h += '<div id="_kvLanka" style="border-top:.5px solid var(--border);padding-top:10px;margin-bottom:12px">' + _kaavioLankaHTML() + '</div>';
  }

  h += '<div style="display:flex;gap:6px;flex-wrap:wrap">';
  h += '<button onclick="_kaavioKumoa()" style="background:var(--ov-1);color:var(--ink2);border:.5px solid var(--border);border-radius:6px;padding:7px 12px;font-size:11.5px;cursor:pointer">' + _kuiT('Kumoa') + '</button>';
  h += '<button onclick="_kaavioTallenna()" style="background:rgba(40,176,144,.16);color:var(--teal);border:.5px solid rgba(40,176,144,.45);border-radius:6px;padding:7px 14px;font-size:11.5px;cursor:pointer">' + _kuiT('Tallenna') + '</button>';
  // Julkaise näkyy vasta kun kaavio on levyllä: julkaisematonta luonnosta ei ole olemassa
  // muille missään mielessä, joten nappi ennen ensimmäistä tallennusta olisi valhe.
  h += '<span id="_kvJulkaiseSlot">' + _kaavioJulkaiseNappiHTML() + '</span>';
  h += '<button id="_kvSulje" onclick="_kaavioSuljeEditori()" style="background:var(--ov-1);color:var(--ink3);border:.5px solid var(--border);border-radius:6px;padding:7px 12px;font-size:11.5px;cursor:pointer">' + _kaavioSulkuNappiTeksti() + '</button>';
  h += '</div><div id="_kvVirhe" style="margin-top:10px;font-size:11.5px;color:#C94040"></div>';
  h += '</div></div></div></div>';
  document.body.insertAdjacentHTML('beforeend', h);
  _kaavioPiirraEditori();
  // Lanka ladataan editorin avauduttua: se on alikokoelmakysely eikä saa viivyttää piirtoa.
  _kaavioTila.lanka = [];
  if (_kaavioTila.muokkaus.id && !_kaavioTila.muokkaus._uusi) _kaavioPaivitaLanka(_kaavioTila.muokkaus);
}
function _kvTyokalu(k, lbl) {
  return '<button onclick="_kaavioLisaa(\'' + k + '\')" style="background:var(--ov-1);color:var(--ink2);border:.5px solid var(--border);border-radius:6px;padding:6px 10px;font-size:11px;cursor:pointer">' + _kuiT(lbl) + '</button>';
}
/* Sulkeminen on nyt AINOA poistumispolku → pankin päivitys tapahtuu tässä, ei tallennuksessa.
   Näin pankki näyttää juuri tallennetun kaavion tuoreena riippumatta siitä montako kertaa
   välissä tallennettiin. */
function _kaavioSuljeEditori() {
  document.getElementById('_kvEditori')?.remove();
  _kaavioTila.muokkaus = null; _kaavioTila.tyokalu = null; _kaavioTila.veto = null;
  _kaavioTila.valittu = null; _kaavioTila.tallennettuSpec = null; _kaavioTila.tallennettuKohde = null;
  if (typeof avaaKaaviopankki === 'function') avaaKaaviopankki();
}

function _kaavioPiirraEditori() {
  var c = document.getElementById('_kvCanvas');
  if (!c || !_kaavioTila.muokkaus) return;
  c.innerHTML = '';
  var svg = drawSpec(_kaavioTila.muokkaus.spec, _kaavioLang());
  // Esikatseluviiva: piirretään renderöidyn SVG:n päälle samalla koordinaattimapilla, jotta se
  // osuu kohdakkain. Se EI mene speciin — vasta pointerup luo liikkeen.
  var v = _kaavioTila.veto;
  if (v) {
    var ap = v.alku.ref ? (_kaavioTila.muokkaus.spec.pelaajat || []).find(function (q) { return q.id === v.alku.ref; }) : v.alku;
    // suunta/näkökenttä-veto: viiva kertoo mihin pelaaja käännetään ja kuinka kauas hän näkee.
    if (ap) {
      var ln = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      ln.setAttribute('x1', kaavioEdPX(ap.x)); ln.setAttribute('y1', kaavioEdPY(ap.y));
      ln.setAttribute('x2', kaavioEdPX(v.x));  ln.setAttribute('y2', kaavioEdPY(v.y));
      ln.setAttribute('stroke', 'var(--accent)'); ln.setAttribute('stroke-width', '1.6');
      ln.setAttribute('stroke-dasharray', '4 3'); ln.setAttribute('opacity', '.75');
      svg.appendChild(ln);
    }
  }
  // SELITTEEN OSUMA-ALUE. kaavioOsuma osuu selitteeseen vain sen ANKKURIPISTEESSÄ, mutta pitkän
  // tekstin runko on kaukana ankkurista → käyttäjä klikkasi tekstiä ja ohitti osuman ("ei pysty
  // muokkaamaan"). Piirretään läpinäkyvä suorakulmio tekstin päälle, joka valitsee selitteen.
  // Vain editorin overlayssa — jaettu renderöijä pysyy puhtaana.
  (_kaavioTila.muokkaus.spec.selitteet || []).forEach(function (se) {
    var oikea = se.x > 58;
    var lev = 74, kork = 30;                       // kattaa 3 rivin tekstilaatikon
    var hx = oikea ? kaavioEdPX(se.x) - lev : kaavioEdPX(se.x);
    var hr = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    hr.setAttribute('x', hx); hr.setAttribute('y', kaavioEdPY(se.y) - 8);
    hr.setAttribute('width', lev); hr.setAttribute('height', kork);
    hr.setAttribute('fill', 'transparent'); hr.setAttribute('style', 'cursor:pointer');
    hr.addEventListener('pointerdown', function (ev) {
      if (_kaavioTila.tyokalu) return;             // työkalu voittaa, kuten muuallakin
      ev.stopPropagation();
      _kaavioAsetaValinta({ kind: 'selite', id: se.id });
    });
    svg.appendChild(hr);
  });

  // VALINNAN KOROSTUS on EDITORIN tila, ei speksin ominaisuus → se piirretään tähän
  // overlay-kerrokseen drawSpecin JÄLKEEN. Jaettu renderöijä pysyy puhtaana, jottei pelaaja-appi
  // näytä valintakehyksiä.
  var _val = _kaavioTila.valittu;
  if (_val) {
    var _sp = _kaavioTila.muokkaus.spec, _kohde = null;
    if (_val.kind === 'player') _kohde = (_sp.pelaajat || []).filter(function (q) { return q.id === _val.id; })[0];
    else if (_val.kind === 'selite') _kohde = (_sp.selitteet || []).filter(function (q) { return q.id === _val.id; })[0];
    else if (_val.kind === 'liike') {
      var _l = (_sp.liikkeet || []).filter(function (q) { return q.id === _val.id; })[0];
      var _pp = function (pt) {
        if (!pt) return null;
        if (pt.ref) return (_sp.pelaajat || []).filter(function (q) { return q.id === pt.ref; })[0] || null;
        return pt;
      };
      var _a = _l && _pp(_l.from), _b = _l && _pp(_l.to);
      if (_a && _b) _kohde = { x: (_a.x + _b.x) / 2, y: (_a.y + _b.y) / 2 };
    }
    if (_val.kind === 'selite' && _kohde && typeof _kohde.x === 'number') {
      // Selitteen korostus on LAATIKKO (teksti on laatikko), ei rengas — rengas ankkurin ympärillä
      // ei kertoisi mitä on valittuna kun teksti on kaukana ankkurista.
      var _so = _kohde.x > 58, _sl = 74;
      var _sr = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      _sr.setAttribute('x', _so ? kaavioEdPX(_kohde.x) - _sl : kaavioEdPX(_kohde.x));
      _sr.setAttribute('y', kaavioEdPY(_kohde.y) - 8);
      _sr.setAttribute('width', _sl); _sr.setAttribute('height', 30);
      _sr.setAttribute('fill', 'none'); _sr.setAttribute('stroke', 'var(--amber)');
      _sr.setAttribute('stroke-width', '1.2'); _sr.setAttribute('stroke-dasharray', '3 2.5');
      svg.appendChild(_sr);
    } else if (_kohde && typeof _kohde.x === 'number') {
      var _r = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      _r.setAttribute('cx', kaavioEdPX(_kohde.x)); _r.setAttribute('cy', kaavioEdPY(_kohde.y));
      _r.setAttribute('r', 15); _r.setAttribute('fill', 'none');
      _r.setAttribute('stroke', 'var(--amber)'); _r.setAttribute('stroke-width', '1.4');
      _r.setAttribute('stroke-dasharray', '3 2.5');
      svg.appendChild(_r);
    }
  }
  svg.setAttribute('style', 'width:300px;height:auto;touch-action:none;cursor:' + (_kaavioTila.tyokalu ? 'crosshair' : 'grab'));
  svg.addEventListener('pointerdown', _kaavioPointerDown);
  svg.addEventListener('pointermove', _kaavioPointerMove);
  svg.addEventListener('pointerup', _kaavioPointerUp);
  c.appendChild(svg);
}
/* ══════════════════════════════════════════════════════════
   PIIRROSTYÖKALUT — aktiivinen työkalu vaihtaa pointer-vedon merkityksen
   ──────────────────────────────────────────────────────────
   Editori osasi vain raahata pelaajia: liikkeitä, selitettä ja näkökenttää ei päässyt
   piirtämään lainkaan, vaikka §3-skeema ja renderöijä tukevat niitä kaikkia.

   Malli: `_kaavioTila.tyokalu === null` = raahaus (entinen käytös, ennallaan). Muuten veto
   PIIRTÄÄ. Päätepisteet napsahtavat pelaajaan (kaavioSnapPaate) tai jäävät vapaaksi pisteeksi —
   §3 sallii molemmat, ja ref-pää seuraa pelaajaa kun tätä myöhemmin siirretään.

   RAJAUS — VYÖHYKE EI OLE TYÖKALUISSA. Renderöijä piirtää `spec.vyohyke`-suorakulmion, mutta
   sitä EI ole §3-skeemadokumentissa eikä validaattori tunne sitä. Työkalu tuottaisi kentän jota
   mikään portti ei valvo → jätetty pois tarkoituksella (ks. PR-raportti).
══════════════════════════════════════════════════════════ */
var _KAAVIO_TYOKALUT = [
  { k: 'syotto',   lbl: 'Syöttö' },
  { k: 'juoksu',   lbl: 'Juoksu' },
  { k: 'kuljetus', lbl: 'Kuljetus' },
  { k: 'laukaus',  lbl: 'Laukaus' },
  { k: 'pallo',    lbl: 'Pallo' },
  { k: 'suunta',   lbl: 'Peliasento' },
  { k: 'nakokentta', lbl: 'Näkökenttä' },
  { k: 'selite',   lbl: 'Selite' },
  { k: 'poista',   lbl: 'Poista' }
];
function _kaavioOnLiiketyokalu(t) { return ['syotto', 'juoksu', 'kuljetus', 'laukaus'].indexOf(t) >= 0; }

function _kaavioTyokalupalkkiHTML() {
  var akt = _kaavioTila.tyokalu || null;
  return _KAAVIO_TYOKALUT.map(function (t) {
    var on = akt === t.k;
    var vari = on ? 'background:rgba(40,176,144,.18);color:var(--teal);border-color:rgba(40,176,144,.5)'
                  : (t.k === 'poista' ? 'background:var(--ov-1);color:#C94040;border-color:rgba(201,64,64,.3)'
                                      : 'background:var(--ov-1);color:var(--ink2);border-color:var(--border)');
    return '<button onclick="_kaavioValitseTyokalu(\'' + t.k + '\')" style="' + vari
      + ';border-width:.5px;border-style:solid;border-radius:6px;padding:6px 10px;font-size:11px;cursor:pointer">'
      + _kuiT(t.lbl) + '</button>';
  }).join('');
}
/* Ohje kertoo mitä veto juuri nyt tekee — ilman sitä työkalutila on näkymätön moodi. */
function _kaavioTyokaluOhje() {
  var t = _kaavioTila.tyokalu;
  if (!t) return _kuiT('Raahaa pelaajia kentällä. Muutokset tallentuvat vasta Tallenna-napista.');
  if (_kaavioOnLiiketyokalu(t)) return _kuiT('Vedä pelaajasta toiseen tai vapaaseen kohtaan. Sama nappi uudelleen palauttaa raahaukseen.');
  if (t === 'selite') return _kuiT('Klikkaa kohtaa johon selite tulee.');
  if (t === 'pallo') return _kuiT('Klikkaa pelaajaa jolla on pallo. Sama pelaaja uudelleen ottaa pallon pois.');
  if (t === 'suunta') return _kuiT('Vedä pelaajasta suuntaan johon hän katsoo.');
  if (t === 'nakokentta') return _kuiT('Klikkaa pelaajaa: näkökenttä päälle tai pois. Vedä pelaajasta = suunta ja syvyys. Säädä leveyttä ja katvetta alla.');
  if (t === 'poista') return _kuiT('Klikkaa poistettavaa elementtiä.');
  return '';
}
/* TALLENNETTU-LEIMA: viimeksi levylle kirjoitetun specin tilannekuva. Editori jää tallennuksen
   jälkeen auki, joten käyttäjän pitää nähdä onko hänellä kirjoittamattomia muutoksia. Vertailu on
   merkkijonovertailu — se riittää, koska spec on puhdasta dataa eikä siinä ole kiertoviitteitä. */
function _kaavioTallennettuLeima() {
  var m = _kaavioTila.muokkaus;
  _kaavioTila.tallennettuSpec = m ? JSON.stringify(m.spec) : null;
  _kaavioTila.tallennettuKohde = m ? JSON.stringify(_kaavioKohdeLeima(m)) : null;
}
function _kaavioTallentamattomia() {
  var m = _kaavioTila.muokkaus;
  if (!m) return false;
  if (m._uusi || !m.id) return true;                       // ei vielä kertaakaan tallennettu
  if (_kaavioTila.tallennettuKohde != null
      && JSON.stringify(_kaavioKohdeLeima(m)) !== _kaavioTila.tallennettuKohde) return true;   // kohdistus muuttui
  if (_kaavioTila.tallennettuSpec == null) return false;   // avattu, ei muokattu tässä istunnossa
  return JSON.stringify(m.spec) !== _kaavioTila.tallennettuSpec;
}
/* Kohdistuksen leima. Kohdistus EI ole spec-dataa (§3: kohdistus asuu reviewissa), joten
   spec-vertailu ei huomaisi sen muutosta — käyttäjä luulisi tallentaneensa uuden kohteen. */
function _kaavioKohdeLeima(m) {
  var r = (m && m.review) || {};
  return { n: r.nakyvyys || null, j: r.joukkueId || null, v: r.valmentajaId || null, p: (r.pelaajaIds || []).slice().sort() };
}
/* Sulkunapin nimi: "Peruuta" peruu jotain vasta tallentamatonta. Kun kaavio on jo levyllä,
   sulkeminen ei peru mitään → "Valmis" on rehellisempi. */
function _kaavioJulkaiseNappiHTML() {
  var m = _kaavioTila.muokkaus;
  if (!m || m._uusi || !m.id || typeof kaavioYksityinen !== 'function' || !kaavioYksityinen(m)) return '';
  if (typeof kaavioToiminnot === 'function' && kaavioToiminnot(m, _kaavioCtxNyt()).indexOf('julkaise') < 0) return '';
  return '<button onclick="_kaavioJulkaiseEditorista()" style="background:rgba(224,160,64,.16);color:var(--amber);border:.5px solid rgba(224,160,64,.45);border-radius:6px;padding:7px 12px;font-size:11.5px;cursor:pointer">'
    + _kuiT('Julkaise joukkueelle') + '</button>';
}
/* Julkaisu editorista: tallentamattomat muutokset kirjoitetaan ENSIN, muuten julkaistaisiin
   vanhempi versio kuin mitä ruudulla näkyy — juuri se mitä tekijä yritti välttää hiomalla. */
async function _kaavioJulkaiseEditorista() {
  var m = _kaavioTila.muokkaus; if (!m) return;
  if (_kaavioTallentamattomia()) await _kaavioTallenna();
  await _kaavioJulkaise(_kaavioTila.muokkaus);
  if (_kaavioTila.muokkaus && _kaavioTila.muokkaus.review) _kaavioTila.muokkaus.review.yksityinen = false;
  _kaavioTyokaluPaivita();
}
window._kaavioJulkaiseEditorista = _kaavioJulkaiseEditorista;
window._kaavioJulkaiseNappiHTML = _kaavioJulkaiseNappiHTML;

function _kaavioSulkuNappiTeksti() {
  var m = _kaavioTila.muokkaus;
  return (m && m.id && !m._uusi) ? _kuiT('Valmis') : _kuiT('Peruuta');
}

/* Mihin tallentuu ja missä tilassa. Arvot luetaan samasta review-objektista jota
   _kaavioTallenna kirjoittaa, joten rivi ei voi ajautua erilleen todellisuudesta. */
function _kaavioTallennusKohdeHTML() {
  var m = _kaavioTila.muokkaus; if (!m) return '';
  var uusi = !!(m._uusi || !m.id);
  var st = (m.review && m.review.status) || 'luonnos';
  var nak = (m.review && m.review.nakyvyys) || 'seura';
  var h = '↳ ' + _kuiT('Tallentuu: seuran kaaviopankki');
  h += ' · ' + _kuiT('tila') + ': ' + _kaavioTilaLbl(uusi ? 'luonnos' : st);
  // Kohde niminä, ei pelkkä taso — "kenelle tämä tallentuu" on koko rivin olemassaolon syy.
  h += ' · ' + _kuiT('näkyvyys') + ': ' + _kuiEsc(_kaavioKohdeLbl(m.review || { nakyvyys: nak }));
  if (typeof kaavioYksityinen === 'function' && kaavioYksityinen(m)) {
    h += ' · <span style="color:var(--amber)">🔒 ' + _kuiT('yksityinen luonnos · vain sinä') + '</span>';
  }
  if (uusi) h += ' · ' + _kuiT('uusi — tallentuu luonnoksena');
  else if (_kaavioTallentamattomia()) h += ' · <span style="color:var(--amber)">' + _kuiT('tallentamattomia muutoksia') + '</span>';
  else if (st === 'hyvaksytty' && typeof kaavioTilaMuokkauksenJalkeen === 'function'
           && kaavioTilaMuokkauksenJalkeen(m, _kaavioCtxNyt()) === 'odottaa') {
    h += ' · ' + _kuiT('muokkaus vie takaisin katselmukseen');
  }
  return h;
}

/* ── VALINTA ──────────────────────────────────────────────────────────────────────────────
   Klikkaus oletustilassa (ei työkalua) valitsee elementin. Raahaus toimii yhä: pointerdown
   aloittaa vedon, ja VASTA jos sormi/hiiri ei liikkunut, up tulkitaan klikkaukseksi. Näin
   valinta ei vie raahausta eikä raahaus estä valintaa. */
function _kaavioValittuId(kind) {
  var v = _kaavioTila.valittu;
  return (v && (!kind || v.kind === kind)) ? v.id : null;
}
function _kaavioValittuPelaaja() {
  var id = _kaavioValittuId('player'), m = _kaavioTila.muokkaus;
  if (!id || !m) return null;
  return (m.spec.pelaajat || []).filter(function (q) { return q.id === id; })[0] || null;
}
function _kaavioAsetaValinta(v) {
  _kaavioTila.valittu = v || null;
  _kaavioTyokaluPaivita();
  _kaavioPiirraEditori();
}
window._kaavioAsetaValinta = _kaavioAsetaValinta;

/* Valinnan nimi paneelin otsikkoon. Ilman tätä käyttäjä ei tiedä mitä muokkaa. */
function _kaavioValinnanNimi() {
  var v = _kaavioTila.valittu, m = _kaavioTila.muokkaus;
  if (!v || !m) return _kuiT('— ei valintaa');
  if (v.kind === 'player') {
    var p = (m.spec.pelaajat || []).filter(function (q) { return q.id === v.id; })[0];
    if (!p) return _kuiT('— ei valintaa');
    return v.id + ' · ' + _kuiT(p.joukkue === 'vastustaja' ? 'vastustaja' : 'oma pelaaja');
  }
  if (v.kind === 'selite') return v.id + ' · ' + _kuiT('selite');
  if (v.kind === 'liike') {
    var l = (m.spec.liikkeet || []).filter(function (q) { return q.id === v.id; })[0];
    return v.id + ' · ' + _kuiT(l ? _KAAVIO_LIIKENIMI[l.tyyppi] || l.tyyppi : 'liike');
  }
  return _kuiT('— ei valintaa');
}
var _KAAVIO_LIIKENIMI = { syotto: 'Syöttö', juoksu: 'Juoksu', kuljetus: 'Kuljetus', laukaus: 'Laukaus' };

/* ── VALITUN OMINAISUUDET ─────────────────────────────────────────────────────────────────
   Kaikki kentät ovat JO §3:ssa valideja → tämä on puhdasta UI:ta, ei skeemamuutosta.
   Paneeli rakentuu valinnan lajin mukaan; pelaajan kaikki ominaisuudet (joukkue, korostus,
   maalivahti, pallo, peliasento, näkökenttä) ovat samassa paikassa. */
function _kvKytkin(fn, paalla, txt) {
  var v = paalla ? 'background:rgba(40,176,144,.16);color:var(--teal);border-color:rgba(40,176,144,.45)'
                 : 'background:var(--ov-1);color:var(--ink2);border-color:var(--border)';
  return '<button onclick="' + fn + '" style="' + v + ';border-width:.5px;border-style:solid;border-radius:6px;padding:6px 10px;font-size:11px;cursor:pointer;min-height:28px">'
    + (paalla ? '☑ ' : '☐ ') + _kuiT(txt) + '</button>';
}
function _kvNappi(fn, txt, vaara) {
  var v = vaara ? 'background:var(--ov-1);color:#C94040;border-color:rgba(201,64,64,.35)'
                : 'background:var(--ov-1);color:var(--ink2);border-color:var(--border)';
  return '<button onclick="' + fn + '" style="' + v + ';border-width:.5px;border-style:solid;border-radius:6px;padding:6px 10px;font-size:11px;cursor:pointer;min-height:28px">' + _kuiT(txt) + '</button>';
}
function _kaavioOminaisuudetHTML() {
  var m = _kaavioTila.muokkaus, v = _kaavioTila.valittu;
  var h = '<div style="font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink3);margin-bottom:4px">' + _kuiT('Valitun ominaisuudet') + '</div>';
  h += '<div style="font-size:12px;color:var(--ink);margin-bottom:8px">' + _kuiT('Valittu') + ': <b>' + _kuiEsc(_kaavioValinnanNimi()) + '</b></div>';
  if (!m || !v) {
    return h + '<div style="font-size:11px;color:var(--ink3);line-height:1.45;margin-bottom:12px">' + _kuiT('Klikkaa kentältä pelaajaa, liikettä tai selitettä.') + '</div>';
  }
  var rivi = function (sisalto) { return '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">' + sisalto + '</div>'; };

  if (v.kind === 'player') {
    var p = _kaavioValittuPelaaja();
    if (!p) return h;
    var vast = p.joukkue === 'vastustaja';
    h += rivi(_kvNappi("_kaavioOmJoukkue('oma')", 'Oma') + _kvNappi("_kaavioOmJoukkue('vastustaja')", 'Vastustaja')
            + '<span style="font-size:11px;color:var(--ink3);align-self:center">' + _kuiT(vast ? 'vastustaja' : 'oma pelaaja') + '</span>');
    h += rivi(_kvKytkin("_kaavioOmLippu('korostus')", !!p.korostus, 'Korostus')
            + (vast ? _kvKytkin("_kaavioOmLippu('gk')", !!p.gk, 'Maalivahti') : '')
            + _kvKytkin('_kaavioOmPallo()', !!p.pallo, 'Pallo'));
    h += rivi('<span style="font-size:10.5px;color:var(--ink3);min-width:62px;align-self:center">' + _kuiT('Peliasento') + '</span>'
            + _kvNappi("_kaavioOmSuunta(-15)", '↺') + _kvNappi("_kaavioOmSuunta(15)", '↻')
            + _kvKytkin('_kaavioOmNakokentta()', !!p.nakokentta, 'Näkökenttä'));
    if (p.nakokentta) {
      h += rivi('<span style="font-size:10.5px;color:var(--ink3);min-width:62px;align-self:center">' + _kuiT('leveys') + '</span>'
              + _kvNappi("_kaavioNkSaada('half',-12)", '−') + _kvNappi("_kaavioNkSaada('half',12)", '+')
              + '<span style="font-size:10.5px;color:var(--ink3);min-width:52px;align-self:center;margin-left:4px">' + _kuiT('syvyys') + '</span>'
              + _kvNappi("_kaavioNkSaada('r',-8)", '−') + _kvNappi("_kaavioNkSaada('r',8)", '+')
              + _kvKytkin('_kaavioNkKatve()', !!p.nakokentta.katve, 'Katve'));
    }
  } else if (v.kind === 'selite') {
    var se = (m.spec.selitteet || []).filter(function (q) { return q.id === v.id; })[0];
    if (!se) return h;
    // SELITE = KIRJOITTAJAN VAPAATEKSTI. Yksi kenttä riittää ja tallentuu; muut kielet ovat
    // vapaaehtoinen lisä kaksikieliselle seuralle, eivät este. Aiempi kolmen pakollisen kentän
    // malli esti tallennuksen kokonaan — väärä rajanveto, korjattu.
    var _paakieli = _kaavioSeliteKirjoituskieli(se);
    h += '<div style="margin-bottom:6px"><label for="_kvSel_' + _paakieli + '" style="display:block;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink3);margin-bottom:3px">'
      + _kuiT('Teksti') + ' · ' + _paakieli.toUpperCase() + '</label>'
      + '<textarea id="_kvSel_' + _paakieli + '" rows="2" oninput="_kaavioOmSelite(\'' + _paakieli + '\')" '
      + 'style="width:100%;box-sizing:border-box;background:var(--bg);border:.5px solid var(--border);color:var(--ink);font-family:inherit;font-size:12px;line-height:1.4;padding:6px 8px;resize:vertical">'
      + _kuiEsc((se.t && se.t[_paakieli]) || '') + '</textarea></div>';
    // Muut kielet vain pyydettäessä — ei kolmea kenttää oletuksena.
    var _muut = ['fi', 'sv', 'en'].filter(function (k) { return k !== _paakieli; });
    var _avoinna = _muut.some(function (k) { return se.t && se.t[k]; }) || _kaavioTila.seliteKaannokset;
    if (!_avoinna) {
      h += '<div style="margin-bottom:8px">' + _kvNappi('_kaavioSeliteKaannokset()', '+ Lisää käännös') + '</div>';
    } else {
      _muut.forEach(function (kieli) {
        h += '<div style="margin-bottom:6px"><label for="_kvSel_' + kieli + '" style="display:block;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink3);margin-bottom:3px">'
          + kieli.toUpperCase() + ' · <span style="text-transform:none;letter-spacing:0">' + _kuiT('valinnainen') + '</span></label>'
          + '<textarea id="_kvSel_' + kieli + '" rows="2" oninput="_kaavioOmSelite(\'' + kieli + '\')" '
          + 'style="width:100%;box-sizing:border-box;background:var(--bg);border:.5px solid var(--border);color:var(--ink);font-family:inherit;font-size:12px;line-height:1.4;padding:6px 8px;resize:vertical">'
          + _kuiEsc((se.t && se.t[kieli]) || '') + '</textarea></div>';
      });
    }
  } else if (v.kind === 'liike') {
    var l = (m.spec.liikkeet || []).filter(function (q) { return q.id === v.id; })[0];
    if (!l) return h;
    h += rivi(['syotto', 'juoksu', 'kuljetus', 'laukaus'].map(function (t) {
      return _kvKytkin("_kaavioOmLiiketyyppi('" + t + "')", l.tyyppi === t, _KAAVIO_LIIKENIMI[t]);
    }).join(''));
  }
  h += rivi(_kvNappi('_kaavioOmPoista()', 'Poista valittu', true));
  return h;
}

/* Selitteen KIRJOITUSKIELI: se kieli jolla lappu on kirjoitettu. Ensisijaisesti katsojan kieli
   (uusi lappu syntyy siihen), muuten se joka on täytetty. Näin kaksikielisen seuran ruotsiksi
   kirjoitettu lappu avautuu muokkaukseen ruotsiksi eikä tyhjänä fi-kenttänä. */
function _kaavioSeliteKirjoituskieli(se) {
  var oma = _kaavioLang();
  if (se && se.t && se.t[oma]) return oma;
  var loydetty = ['fi', 'sv', 'en'].filter(function (k) { return se && se.t && se.t[k]; })[0];
  return loydetty || oma;
}
function _kaavioSeliteKaannokset() {
  _kaavioTila.seliteKaannokset = !_kaavioTila.seliteKaannokset;
  _kaavioTyokaluPaivita();
}
window._kaavioSeliteKaannokset = _kaavioSeliteKaannokset;

/* Ominaisuustoiminnot. Kukin: historia → lib-setter → uudelleenpiirto. */
function _kaavioOmSovella(r) {
  if (!r || r.virhe) { if (r && r.virhe) _kuiToast(_kuiT('Muutos ei onnistunut'), 'err'); return; }
  _kaavioTila.muokkaus.spec = r.spec;
  _kaavioTyokaluPaivita();
  _kaavioPiirraEditori();
}
function _kaavioOmHistoria() { _kaavioTila.historia = kaavioHistoriaLisaa(_kaavioTila.historia, _kaavioTila.muokkaus.spec); }
function _kaavioOmJoukkue(jk) {
  var id = _kaavioValittuId('player'); if (!id) return;
  _kaavioOmHistoria(); _kaavioOmSovella(kaavioAsetaJoukkue(_kaavioTila.muokkaus.spec, id, jk));
}
function _kaavioOmLippu(kentta) {
  var p = _kaavioValittuPelaaja(); if (!p) return;
  _kaavioOmHistoria(); _kaavioOmSovella(kaavioAsetaLippu(_kaavioTila.muokkaus.spec, p.id, kentta, !p[kentta]));
}
function _kaavioOmPallo() {
  var id = _kaavioValittuId('player'); if (!id) return;
  _kaavioOmHistoria(); _kaavioOmSovella(kaavioAsetaPallo(_kaavioTila.muokkaus.spec, id));
}
function _kaavioOmSuunta(delta) {
  var p = _kaavioValittuPelaaja(); if (!p) return;
  var nyt = (typeof p.suunta === 'number') ? p.suunta : (typeof p.avoin === 'number' ? p.avoin : -90);
  _kaavioOmHistoria(); _kaavioOmSovella(kaavioAsetaSuunta(_kaavioTila.muokkaus.spec, p.id, nyt + delta));
}
function _kaavioOmNakokentta() {
  var p = _kaavioValittuPelaaja(); if (!p) return;
  _kaavioOmHistoria();
  _kaavioOmSovella(kaavioAsetaNakokentta(_kaavioTila.muokkaus.spec, p.id, p.nakokentta ? false : {}));
}
function _kaavioOmSelite(kieli) {
  var id = _kaavioValittuId('selite'); if (!id) return;
  var el = document.getElementById('_kvSel_' + kieli); if (!el) return;
  // Ei historiaa joka näppäinpainalluksesta — kirjoittaminen ei ole erillinen kumottava askel.
  var r = kaavioAsetaSeliteTeksti(_kaavioTila.muokkaus.spec, id, kieli, el.value);
  if (!r.virhe) { _kaavioTila.muokkaus.spec = r.spec; _kaavioPiirraEditori(); }
}
function _kaavioOmLiiketyyppi(t) {
  var id = _kaavioValittuId('liike'); if (!id) return;
  _kaavioOmHistoria(); _kaavioOmSovella(kaavioAsetaLiiketyyppi(_kaavioTila.muokkaus.spec, id, t));
}
function _kaavioOmPoista() {
  var v = _kaavioTila.valittu; if (!v) return;
  _kaavioOmHistoria();
  _kaavioTila.muokkaus.spec = kaavioPoista(_kaavioTila.muokkaus.spec, v.id).spec;
  _kaavioTila.valittu = null;
  _kaavioTyokaluPaivita();
  _kaavioPiirraEditori();
}
window._kaavioOmJoukkue = _kaavioOmJoukkue;   window._kaavioOmLippu = _kaavioOmLippu;
window._kaavioOmPallo = _kaavioOmPallo;       window._kaavioOmSuunta = _kaavioOmSuunta;
window._kaavioOmNakokentta = _kaavioOmNakokentta; window._kaavioOmSelite = _kaavioOmSelite;
window._kaavioOmLiiketyyppi = _kaavioOmLiiketyyppi; window._kaavioOmPoista = _kaavioOmPoista;

/* Näkökentän säätimet. Tila-editorissa ei ole pysyvää valintaa, joten säätimet kohdistuvat
   VIIMEKSI KOSKETTUUN pelaajaan (_kaavioTila.valittu). Geometriset kahvat olisivat siistimmät,
   mutta ne vaatisivat valintatilan + osumatestin kahvoille; nappisäädin on kosketuskokoinen ja
   toimii samalla tavalla hiirellä ja sormella. Näkyy vain kun valitulla on näkökenttä. */
function _kaavioNakokenttaSaadinHTML() {
  var m = _kaavioTila.muokkaus;
  if (!m || _kaavioTila.tyokalu !== 'nakokentta') return '';
  var p = _kaavioValittuPelaaja();
  if (!p || !p.nakokentta) return '';
  var nappi = function (fn, txt) {
    return '<button onclick="' + fn + '" style="background:var(--ov-1);color:var(--ink2);border:.5px solid var(--border);border-radius:6px;min-width:30px;padding:6px 9px;font-size:11px;cursor:pointer">' + txt + '</button>';
  };
  var h = '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:8px">';
  h += '<span style="font-size:10.5px;color:var(--ink3);min-width:52px">' + _kuiEsc(p.id) + ' ' + _kuiT('leveys') + '</span>';
  h += nappi("_kaavioNkSaada('half',-12)", '−') + nappi("_kaavioNkSaada('half',12)", '+');
  h += '<span style="font-size:10.5px;color:var(--ink3);min-width:52px;margin-left:6px">' + _kuiT('syvyys') + '</span>';
  h += nappi("_kaavioNkSaada('r',-8)", '−') + nappi("_kaavioNkSaada('r',8)", '+');
  h += nappi("_kaavioNkKatve()", (p.nakokentta.katve ? '☑ ' : '☐ ') + _kuiT('Katve'));
  return h + '</div>';
}
function _kaavioNkSaada(kentta, delta) {
  var m = _kaavioTila.muokkaus, p = _kaavioValittuPelaaja(); if (!m || !p) return;
  var id = p.id;
  if (!p.nakokentta) return;
  _kaavioTila.historia = kaavioHistoriaLisaa(_kaavioTila.historia, m.spec);
  var as = {}; as[kentta] = (p.nakokentta[kentta] || 0) + delta;
  var r = kaavioAsetaNakokentta(m.spec, id, as);
  if (!r.virhe) { m.spec = r.spec; _kaavioTyokaluPaivita(); _kaavioPiirraEditori(); }
}
function _kaavioNkKatve() {
  var m = _kaavioTila.muokkaus, p = _kaavioValittuPelaaja(); if (!m || !p) return;
  var id = p.id;
  if (!p.nakokentta) return;
  _kaavioTila.historia = kaavioHistoriaLisaa(_kaavioTila.historia, m.spec);
  var r = kaavioAsetaNakokentta(m.spec, id, { katve: !p.nakokentta.katve });
  if (!r.virhe) { m.spec = r.spec; _kaavioTyokaluPaivita(); _kaavioPiirraEditori(); }
}
window._kaavioNkSaada = _kaavioNkSaada;
window._kaavioNkKatve = _kaavioNkKatve;

function _kaavioTyokaluPaivita() {
  var el = document.getElementById('_kvTyokalut'); if (el) el.innerHTML = _kaavioTyokalupalkkiHTML();
  var sa = document.getElementById('_kvNkSaadin'); if (sa) sa.innerHTML = _kaavioNakokenttaSaadinHTML();
  var om = document.getElementById('_kvOminaisuudet'); if (om) om.innerHTML = _kaavioOminaisuudetHTML();
  var ko = document.getElementById('_kvKohde'); if (ko) ko.innerHTML = _kaavioTallennusKohdeHTML();
  var jl = document.getElementById('_kvJulkaiseSlot'); if (jl) jl.innerHTML = _kaavioJulkaiseNappiHTML();
  var su = document.getElementById('_kvSulje'); if (su) su.textContent = _kaavioSulkuNappiTeksti();
  var o = document.getElementById('_kvOhje'); if (o) o.textContent = _kaavioTyokaluOhje();
}
function _kaavioValitseTyokalu(k) {
  // Toinen klikkaus samaan nappiin palauttaa raahaukseen — moodista pitää päästä ulos.
  _kaavioTila.tyokalu = (_kaavioTila.tyokalu === k) ? null : k;
  _kaavioTila.veto = null;
  // Valinta EI nollaudu työkalua vaihtaessa: se on pysyvä tila, ja ominaisuuspaneeli
  // näyttää koko ajan mitä muokataan riippumatta siitä mikä työkalu on aktiivinen.
  _kaavioTyokaluPaivita();
  _kaavioPiirraEditori();
}
function _kaavioSvgPiste(evt) {
  var svg = evt.currentTarget, pt = svg.createSVGPoint();
  pt.x = evt.clientX; pt.y = evt.clientY;
  var p = pt.matrixTransform(svg.getScreenCTM().inverse());
  return [p.x, p.y];
}
function _kaavioPointerDown(e) {
  var m = _kaavioTila.muokkaus, s = m && m.spec; if (!s) return;
  var xy = _kaavioSvgPiste(e), sx = kaavioEdOX(xy[0]), sy = kaavioEdOY(xy[1]);
  var t = _kaavioTila.tyokalu;

  if (_kaavioOnLiiketyokalu(t)) {                       // liike: down = alkupää
    _kaavioTila.veto = { alku: kaavioSnapPaate(s, sx, sy, 5), x: sx, y: sy };
    e.currentTarget.setPointerCapture(e.pointerId);
    return;
  }
  if (t === 'pallo') {                                  // #1: kuka pitää palloa
    var op = kaavioSnapPaate(s, sx, sy, 5);
    if (!op.ref) { _kuiToast(_kuiT('Klikkaa pelaajaa'), 'err'); return; }
    _kaavioTila.historia = kaavioHistoriaLisaa(_kaavioTila.historia, s);
    var rp = kaavioAsetaPallo(s, op.ref);
    if (!rp.virhe) { m.spec = rp.spec; _kaavioPiirraEditori(); }
    return;
  }
  if (t === 'suunta' || t === 'nakokentta') {           // #2/#3: veto = suunta (+ syvyys)
    var os = kaavioSnapPaate(s, sx, sy, 5);
    if (!os.ref) { _kuiToast(_kuiT('Klikkaa pelaajaa'), 'err'); return; }
    _kaavioTila.valittu = { kind: 'player', id: os.ref };
    _kaavioTila.veto = { alku: os, x: sx, y: sy, pelaaja: os.ref };
    e.currentTarget.setPointerCapture(e.pointerId);
    _kaavioTyokaluPaivita();
    return;
  }
  if (t === 'selite') {
    var teksti = window.prompt(_kuiT('Selitteen teksti'));
    if (teksti && teksti.trim()) {
      _kaavioTila.historia = kaavioHistoriaLisaa(_kaavioTila.historia, s);
      var rs = kaavioLisaaSelite(s, sx, sy, teksti);
      if (!rs.virhe) { m.spec = rs.spec; _kaavioPiirraEditori(); }
    }
    return;
  }
  if (t === 'poista') {
    var osui = kaavioOsuma(s, sx, sy, 5);
    if (!osui) { _kuiToast(_kuiT('Ei elementtiä tässä kohdassa'), 'err'); return; }
    _kaavioTila.historia = kaavioHistoriaLisaa(_kaavioTila.historia, s);
    m.spec = kaavioPoista(s, osui.id).spec;
    _kaavioPiirraEditori();
    return;
  }
  // OLETUSTILA = raahaa TAI valitse. Pointerdown aloittaa raahauksen; jos osoitin ei liikkunut,
  // pointerup tulkitsee sen klikkaukseksi ja valitsee. Näin kumpikaan ele ei vie toista.
  var osuma = kaavioSnapPaate(s, sx, sy, 5);
  _kaavioTila.klikAlku = { x: sx, y: sy, liikkui: false };
  if (osuma.ref) { _kaavioTila.drag = osuma.ref; e.currentTarget.setPointerCapture(e.pointerId); }
}
function _kaavioPointerMove(e) {
  if (_kaavioTila.veto) {                                // esikatseluviiva piirron aikana
    var v = _kaavioSvgPiste(e);
    _kaavioTila.veto.x = kaavioEdOX(v[0]); _kaavioTila.veto.y = kaavioEdOY(v[1]);
    _kaavioPiirraEditori();
    return;
  }
  if (!_kaavioTila.drag) return;
  var xy = _kaavioSvgPiste(e);
  if (_kaavioTila.klikAlku) {
    var _dx = kaavioEdOX(xy[0]) - _kaavioTila.klikAlku.x, _dy = kaavioEdOY(xy[1]) - _kaavioTila.klikAlku.y;
    if (Math.sqrt(_dx * _dx + _dy * _dy) >= 3) _kaavioTila.klikAlku.liikkui = true;
  }
  var r = kaavioSiirraPelaaja(_kaavioTila.muokkaus.spec, _kaavioTila.drag, xy[0], xy[1]);
  if (!r.virhe) { _kaavioTila.muokkaus.spec = r.spec; _kaavioPiirraEditori(); }
}
function _kaavioPointerUp(e) {
  var m = _kaavioTila.muokkaus;
  var t = _kaavioTila.tyokalu;
  if (_kaavioTila.veto && m && (t === 'suunta' || t === 'nakokentta')) {
    var v = _kaavioTila.veto, pid = v.pelaaja;
    var xy0 = _kaavioSvgPiste(e), ux = kaavioEdOX(xy0[0]), uy = kaavioEdOY(xy0[1]);
    var pl = (m.spec.pelaajat || []).filter(function (q) { return q.id === pid; })[0];
    _kaavioTila.veto = null;
    if (!pl) { _kaavioPiirraEditori(); return; }
    var dx = ux - pl.x, dy = uy - pl.y, pit = Math.sqrt(dx * dx + dy * dy);
    _kaavioTila.historia = kaavioHistoriaLisaa(_kaavioTila.historia, m.spec);
    // Lyhyt veto = KLIKKAUS. Näkökenttä-työkalulla se togglaa kartion; suunta-työkalulla se ei
    // tee mitään (kulmaa ei voi päätellä nollapituisesta vedosta).
    if (pit < 3) {
      if (t === 'nakokentta') {
        var rr = pl.nakokentta ? kaavioAsetaNakokentta(m.spec, pid, false) : kaavioAsetaNakokentta(m.spec, pid, {});
        if (!rr.virhe) m.spec = rr.spec;
      }
    } else {
      var aste = Math.atan2(dy, dx) * 180 / Math.PI;
      var rs = kaavioAsetaSuunta(m.spec, pid, aste);
      if (!rs.virhe) m.spec = rs.spec;
      // Näkökenttä-työkalulla sama veto asettaa myös SYVYYDEN: osoita ja vedä = suunta + kuinka
      // kauas pelaaja näkee. Yksi ele, kaksi ominaisuutta — ei erillistä kahvaa tarvita.
      if (t === 'nakokentta') {
        var rn = kaavioAsetaNakokentta(m.spec, pid, { r: Math.max(6, Math.round(pit)) });
        if (!rn.virhe) m.spec = rn.spec;
      }
    }
    _kaavioTyokaluPaivita();
    _kaavioPiirraEditori();
    return;
  }
  if (_kaavioTila.veto && m) {
    var xy = _kaavioSvgPiste(e), sx = kaavioEdOX(xy[0]), sy = kaavioEdOY(xy[1]);
    var loppu = kaavioSnapPaate(m.spec, sx, sy, 5);
    var alku = _kaavioTila.veto.alku;
    _kaavioTila.veto = null;
    // Nollapituinen veto (klikkaus) ei ole liike — ilman tätä yksi harhaklikkaus tuottaisi
    // näkymättömän liikkeen jota käyttäjä ei osaa poistaa.
    var sama = (alku.ref && loppu.ref && alku.ref === loppu.ref)
            || (!alku.ref && !loppu.ref && Math.abs(alku.x - loppu.x) < 2 && Math.abs(alku.y - loppu.y) < 2);
    if (!sama) {
      _kaavioTila.historia = kaavioHistoriaLisaa(_kaavioTila.historia, m.spec);
      var rl = kaavioLisaaLiike(m.spec, _kaavioTila.tyokalu, alku, loppu);
      if (rl.virhe) _kuiToast(_kuiT('Liikettä ei voitu lisätä'), 'err'); else m.spec = rl.spec;
    }
    _kaavioPiirraEditori();
    return;
  }
  if (_kaavioTila.drag && _kaavioTila.klikAlku && _kaavioTila.klikAlku.liikkui) {
    _kaavioTila.historia = kaavioHistoriaLisaa(_kaavioTila.historia, _kaavioTila.muokkaus.spec);
  } else if (!_kaavioTila.tyokalu && m) {
    // Ei liikuttu → klikkaus. Osumatesti kattaa pelaajat, selitteet ja liikkeet; tyhjä kohta
    // tyhjentää valinnan (muuten valinta jäisi roikkumaan eikä käyttäjä pääsisi siitä eroon).
    var xy2 = _kaavioSvgPiste(e), kx = kaavioEdOX(xy2[0]), ky = kaavioEdOY(xy2[1]);
    var osui = (typeof kaavioOsuma === 'function') ? kaavioOsuma(m.spec, kx, ky, 5) : null;
    _kaavioTila.valittu = osui ? { kind: osui.tyyppi === 'pelaaja' ? 'player' : osui.tyyppi, id: osui.id } : null;
    _kaavioTyokaluPaivita();
  }
  _kaavioTila.drag = null;
  _kaavioTila.klikAlku = null;
  _kaavioPiirraEditori();
}
function _kaavioLisaa(mita) {
  var s = _kaavioTila.muokkaus && _kaavioTila.muokkaus.spec; if (!s) return;
  _kaavioTila.historia = kaavioHistoriaLisaa(_kaavioTila.historia, s);
  var r = kaavioLisaaPelaaja(s, { joukkue: mita === 'pelaaja_vast' ? 'vastustaja' : 'oma', x: 50, y: 50 });
  if (r.virhe === 'pelimuoto_taynna') { _kuiToast(_kuiT('Pelimuoto on täynnä'), 'err'); return; }
  _kaavioTila.muokkaus.spec = r.spec;
  _kaavioPiirraEditori();
}
function _kaavioKumoa() {
  var k = kaavioKumoa(_kaavioTila.historia);
  if (!k.spec) { _kuiToast(_kuiT('Ei kumottavaa'), 'ok'); return; }
  _kaavioTila.historia = k.historia;
  _kaavioTila.muokkaus.spec = k.spec;
  _kaavioPiirraEditori();
}

// ── WRITE-PATH ───────────────────────────────────────────────────────────────────────────
// §6-validaattori ajetaan ENNEN kirjoitusta: palvelin ei validoi speciä syvästi, joten tämä on
// se portti joka estää rikkinäisen datan (esim. liike poistettuun pelaajaan). Uudelleenhyväksyntä
// ja versionosto peilaavat policya; säännöt pakottavat molemmat.
async function _kaavioTallenna() {
  var m = _kaavioTila.muokkaus; if (!m) return;
  var virheEl = document.getElementById('_kvVirhe');
  // KPI-jäsenyys tarkistetaan RESOLVOITUA konseptia vasten. Jos konseptia ei löydy lainkaan
  // (avain ei kaanonissa eikä seurakerroksessa), ctx jätetään antamatta → vain syntaktinen
  // portti. Muuten puuttuva konsepti tuottaisi vale-virheen jokaisesta kpi-tagista.
  var _ots = _kaavioOtsikko(m.spec);
  var tulos = validoiKaavio(m.spec, _ots.loytyi ? { kpiKoodit: _ots.kpiKoodit } : undefined);
  if (tulos.E.length) {
    if (virheEl) virheEl.textContent = _kuiT('Kaavio ei kelpaa:') + ' ' + tulos.E.slice(0, 2).join(' · ');
    _kuiToast(_kuiT('Tallennus estetty — kaavio ei läpäise tarkistusta'), 'err');
    return;
  }
  var ctx = _kaavioCtxNyt();
  var kohde = _kuiDb().collection('seurat').doc(m.seuraId || _kuiCtx().seuraId).collection('kaaviot');
  // ── LUONTI ──────────────────────────────────────────────────────────────────────────────
  // Uusi kaavio syntyy AINA luonnoksena versiolla 0 — rules vaatii täsmälleen tämän
  // (status ∈ [luonnos, odottaa] && versio == 0). Tilasiirtokoneisto
  // (kaavioTilaMuokkauksenJalkeen) koskee MUOKKAUSTA eikä sitä saa ajaa tässä: se päättelee
  // seuraavan tilan vanhasta, jota ei ole. Ketju jatkuu normaalisti: Ehdota → Hyväksy.
  // Kanoniin ei kirjoiteta koskaan — luonti menee aina seuratasolle.
  if (m._uusi || !m.id) {
    try {
      var luoja = _kuiCtx().uid || ((typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser) ? firebase.auth().currentUser.uid : null);
      var ref = await kohde.add({
        spec: m.spec,
        review: Object.assign(_kaavioKohdistusKentat(m), {
          status: 'luonnos',
          yksityinen: _kaavioYksityinenNyt(m),
          versio: 0,
          luonut: luoja,          // tekijä = julkaisuoikeuden ja yksityisyyden avain (D2)
          luotu: firebase.firestore.FieldValue.serverTimestamp()
        })
      });
      m.id = ref.id; m._uusi = false;   // seuraava Tallenna päivittää samaa dokumenttia
      // PAIKALLINEN review SYNKATAAN kirjoitetun kanssa. Tämä ei ollut ennen tarpeen, koska
      // editori sulkeutui heti — nyt se jää auki, ja seuraava Tallenna lukee versionumeron
      // TÄSTÄ objektista (kaavioSeuraavaVersio). Ilman synkkaa toinen tallennus lähettäisi saman
      // version uudelleen ja optimistinen versiolukko hylkäisi sen ("joku muu ehti muokata").
      m.review = Object.assign(_kaavioKohdistusKentat(m),
        { status: 'luonnos', yksityinen: _kaavioYksityinenNyt(m), versio: 0, luonut: luoja });
      _kaavioTallennettuLeima();
      _kuiToast(_kuiT('Tallennettu luonnoksena'), 'ok');
      _kaavioTyokaluPaivita();          // tallennusrivi + sulkunappi tallennettuun tilaan
      _kaavioPiirraEditori();           // editori JÄÄ AUKI: muokkausta voi jatkaa
    } catch (e) {
      if (virheEl) virheEl.textContent = _kuiT('Luonti epäonnistui — tarkista oikeudet.');
      _kuiToast(_kuiT('Luonti epäonnistui'), 'err');
    }
    return;
  }
  // ── MUOKKAUS (ennallaan) ────────────────────────────────────────────────────────────────
  var uusiTila = kaavioTilaMuokkauksenJalkeen(m, ctx);
  var uusiVersio = kaavioSeuraavaVersio(m);
  try {
    // KOHDISTUS kirjoitetaan myös muokkauksessa: kohde on korjattava jälkikäteen (VP tarkentaa
    // katselmuksessa). Ilman näitä kolmea riviä editorin kohdevalitsin olisi ollut näennäinen —
    // valinta olisi näkynyt ruudulla muttei koskaan päätynyt dokumenttiin.
    var _kk = _kaavioKohdistusKentat(m);
    await kohde.doc(m.id).update({
      spec: m.spec,
      'review.status': uusiTila,
      'review.versio': uusiVersio,
      'review.nakyvyys': _kk.nakyvyys,
      'review.joukkueId': _kk.joukkueId,
      'review.valmentajaId': _kk.valmentajaId,
      'review.pelaajaIds': _kk.pelaajaIds,
      'review.yksityinen': _kaavioYksityinenNyt(m)      // Tallenna EI julkaise — se on oma toimintonsa
    });
    // Sama synkka kuin luontihaarassa: paikallinen review on seuraavan tallennuksen lähtökohta.
    m.review = Object.assign(m.review || {}, _kk, { status: uusiTila, versio: uusiVersio });
    _kaavioTallennettuLeima();
    _kuiToast(uusiTila === 'odottaa' ? _kuiT('Tallennettu — odottaa hyväksyntää') : _kuiT('Tallennettu'), 'ok');
    _kaavioTyokaluPaivita();
    _kaavioPiirraEditori();
  } catch (e) {
    if (virheEl) virheEl.textContent = _kuiT('Joku muu ehti muokata — lataa kaavio uudelleen.');
    _kuiToast(_kuiT('Tallennus epäonnistui — lataa kaavio uudelleen'), 'err');
  }
}
window._kaavioValitseTyokalu = _kaavioValitseTyokalu;
window.avaaKaaviopankki = avaaKaaviopankki;
window._kaavioToiminto = _kaavioToiminto; window._kaavioLisaa = _kaavioLisaa;
window._kaavioKumoa = _kaavioKumoa; window._kaavioTallenna = _kaavioTallenna;
window._kaavioSuljeEditori = _kaavioSuljeEditori;
