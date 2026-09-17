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
function _kuiEsc(x) { return String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

// ══════════ KAAVIOPANKKI (erä B2) — luku + editori + write-path ══════════
// Näkyvyys ja napit tulevat POLICY-LIBISTÄ (kaavioVoiLukea/kaavioToiminnot) — tässä ei ole omaa
// oikeuslogiikkaa. Palvelinsääntö on todellinen portti; UI vain ei yritä laitonta kirjoitusta.
// Kaksikerros: kanoniset /kaaviot/{avain} (luku) + seuran /seurat/{sid}/kaaviot (review-silmukka).
// Seuratason sama spec.avain VOITTAA kanonisen (override).
var _kaavioTila = { lista: [], valittu: null, muokkaus: null, historia: [], drag: null, tyokalu: null, veto: null };
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
  var nakyvat = _kaavioTila.lista.filter(function (k) { return kaavioVoiLukea(k, ctx); });

  var h = '<div id="_kvModal" style="position:fixed;inset:0;background:rgba(17,17,16,.92);z-index:300;display:flex;align-items:center;justify-content:center" onclick="if(event.target===this)this.remove()">';
  h += '<div style="background:var(--bg2);border:.5px solid var(--border);padding:24px;width:860px;max-width:96vw;max-height:90vh;overflow-y:auto" onclick="event.stopPropagation()">';
  h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">';
  h += '<div style="font-family:\'Cormorant Garamond\',serif;font-size:22px;color:var(--ink)">' + _kuiT('Taktiikkataulu') + '</div>';
  h += '<div style="display:flex;align-items:center;gap:12px">';
  h += '<div style="font-size:11px;color:var(--ink3)">' + nakyvat.length + ' ' + _kuiT('kaaviota') + '</div>';
  // Luontiportti = kaavioVoiLuoda (peili rulesin create-ehdosta). Rules on silti totuus; nappia
  // ei vain näytetä sille jolle kirjoitus hylättäisiin.
  if (typeof kaavioVoiLuoda === 'function' && kaavioVoiLuoda(ctx)) h += _kaavioUusiNappiHTML();
  h += '</div></div>';
  h += '<div style="font-size:11.5px;color:var(--ink3);margin-bottom:14px">' + _kuiT('Teknis-taktiset kaaviot. Kanoniset ovat kaikille yhteisiä; seuran omat kulkevat katselmuksen kautta.') + '</div>';
  if (!nakyvat.length) {
    h += '<div style="font-size:12.5px;color:var(--ink3);padding:18px;border:.5px dashed var(--border);border-radius:8px">'
       + _kuiT('Ei kaavioita vielä.')
       // Tyhjä tila on juuri se hetki jolloin sisäänkäyntiä tarvitaan — ilman tätä ensimmäistä
       // kaaviota ei voinut luoda lainkaan (editori avautui vain olemassa olevalle).
       + ((typeof kaavioVoiLuoda === 'function' && kaavioVoiLuoda(ctx)) ? '<div style="margin-top:12px">' + _kaavioUusiNappiHTML() + '</div>' : '')
       + '</div>';
  } else {
    h += '<div id="_kvLista" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px">';
    nakyvat.forEach(function (k, i) { h += _kaavioKorttiHTML(k, i, ctx); });
    h += '</div>';
  }
  h += '<div style="margin-top:16px;text-align:right"><button onclick="document.getElementById(\'_kvModal\').remove()" style="background:var(--ov-1);color:var(--ink2);border:.5px solid var(--border);border-radius:6px;padding:8px 16px;cursor:pointer;font-size:12px">' + _kuiT('Sulje') + '</button></div>';
  h += '</div></div>';
  document.body.insertAdjacentHTML('beforeend', h);
  nakyvat.forEach(function (k, i) { _kaavioPiirraEsikatselu('_kvEsik' + i, k.spec); });
}

function _kaavioTilaLbl(st) {
  var m = { luonnos: 'luonnos', odottaa: 'odottaa hyväksyntää', hyvaksytty: 'hyväksytty', hylatty: 'hylätty' };
  return _kuiT(m[st] || st || 'luonnos');
}
function _kaavioNakyvyysLbl(n) {
  var m = { seura: 'seura', joukkue: 'joukkue', pelaaja: 'pelaaja' };
  return _kuiT(m[n] || n || 'seura');
}

function _kaavioKorttiHTML(k, i, ctx) {
  var esc = _kuiEsc, st = (k.review && k.review.status) || (k.kanoninen ? 'hyvaksytty' : 'luonnos');
  var ots = _kaavioOtsikko(k.spec);
  var nimi = ots.nimi || k.id;
  var vari = st === 'hyvaksytty' ? 'var(--teal)' : st === 'odottaa' ? 'var(--amber)' : st === 'hylatty' ? '#C94040' : 'var(--ink3)';
  var h = '<div style="border:.5px solid var(--border);border-radius:10px;padding:12px;background:var(--surface)">';
  h += '<div id="_kvEsik' + i + '" class="tm-kaavio" style="margin-bottom:8px;display:flex;justify-content:center"></div>';
  h += '<div style="font-size:13px;font-weight:600;color:var(--ink)">' + esc(nimi) + '</div>';
  h += '<div style="font-size:10.5px;font-family:var(--font-mono);color:var(--ink3);margin-top:2px">'
     + esc((k.spec && k.spec.avain) || '') + (ots.kpiKoodi ? ' · ' + esc(ots.kpiKoodi) : '')
     + ' · ' + esc((k.spec && k.spec.pelimuoto) || '') + '</div>';
  // KPI-teksti = konseptin totuus (ei kaavion kopio) → näkyy vain kun kaavio on tagattu KPI:hin.
  if (ots.kpiTeksti) h += '<div style="font-size:11.5px;color:var(--ink2);line-height:1.45;margin-top:5px">' + esc(ots.kpiTeksti) + '</div>';
  h += '<div style="font-size:11px;margin-top:6px;color:' + vari + '">' + (k.kanoninen ? _kuiT('kanoninen') : _kaavioTilaLbl(st)) + (k.review && k.review.nakyvyys ? ' · ' + _kaavioNakyvyysLbl(k.review.nakyvyys) : '') + '</div>';
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
    h += '<div style="margin-top:8px"><button onclick="_kaavioNostaSeuratasolle(' + i + ')" style="background:var(--ov-1);color:var(--ink2);border:.5px solid var(--border);border-radius:6px;padding:5px 10px;font-size:11px;cursor:pointer">↑ ' + _kuiT('Nosta seuratasolle') + '</button></div>';
  }
  var toiminnot = kaavioToiminnot(k, ctx);
  if (toiminnot.length) {
    h += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:9px">';
    toiminnot.forEach(function (t) { h += _kaavioNappiHTML(t, i); });
    h += '</div>';
  }
  return h + '</div>';
}

function _kaavioNappiHTML(t, i) {
  var lbl = { muokkaa: 'Muokkaa', ehdota: 'Ehdota hyväksyttäväksi', hyvaksy: 'Hyväksy', hylkaa: 'Hylkää', poista: 'Poista', ymmarretty: 'Ymmärsin', kysy: 'Kysy' };
  var prim = (t === 'ehdota' || t === 'hyvaksy');
  var varoi = (t === 'hylkaa' || t === 'poista');
  var tyyli = prim ? 'background:rgba(40,176,144,.14);color:var(--teal);border-color:rgba(40,176,144,.4)'
            : varoi ? 'background:rgba(201,64,64,.12);color:#C94040;border-color:rgba(201,64,64,.35)'
            : 'background:var(--ov-1);color:var(--ink2);border-color:var(--border)';
  return '<button onclick="_kaavioToiminto(\'' + t + '\',' + i + ')" style="' + tyyli + ';border-width:.5px;border-style:solid;border-radius:6px;padding:5px 10px;font-size:11px;cursor:pointer">' + _kuiT(lbl[t] || t) + '</button>';
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
/* Nosto seuratasolle: vain nakyvyys-kenttä + versiolukko. Status ei muutu — kuratointi ei ole
   hyväksyntä, ja hyväksytyn kaavion nosto ei saa pudottaa sitä takaisin katselmukseen. */
async function _kaavioNostaSeuratasolle(i) {
  var ctx = _kaavioCtxNyt();
  var k = _kaavioTila.lista.filter(function (x) { return kaavioVoiLukea(x, ctx); })[i];
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

async function _kaavioToiminto(t, i) {
  var ctx = _kaavioCtxNyt();
  var nakyvat = _kaavioTila.lista.filter(function (k) { return kaavioVoiLukea(k, ctx); });
  var k = nakyvat[i];
  if (!k) return;
  if (kaavioToiminnot(k, ctx).indexOf(t) < 0) { _kuiToast(_kuiT('Ei oikeutta tähän toimintoon'), 'err'); return; }
  if (t === 'muokkaa') return _kaavioAvaaEditori(k);
  if (t === 'ehdota')  return _kaavioSiirra(k, 'odottaa');
  if (t === 'hyvaksy') return _kaavioSiirra(k, 'hyvaksytty');
  if (t === 'hylkaa')  return _kaavioSiirra(k, 'hylatty');
  _kuiToast(_kuiT('Toiminto kytketään myöhemmässä vaiheessa'), 'ok');
}

// Statussiirto. Client tarkistaa policyn ETUKÄTEEN, mutta sääntö on todellinen portti.
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
  h += '<select id="_kvUNak" style="width:100%;background:var(--bg);border:.5px solid var(--border);color:var(--ink);font-family:inherit;font-size:12.5px;padding:8px 9px">';
  // Hallintomalli: valmentaja kohdistaa OMAN joukkueensa sisältöä, seuran yhteisen kirjaston
  // kuratoi metodologiajohto. Valikko rajaa vaihtoehdot rooleittain — mutta TOTUUS on
  // firestore.rulesissa (kaavioNakyvyysLuontiOk), joka hylkää seuratason muualta.
  var _hyv = _kaavioOnHyvaksyjaNyt();
  h += '<option value="joukkue"' + (_hyv ? '' : ' selected') + '>' + _kuiT('joukkue') + '</option>';
  h += '<option value="pelaaja">' + _kuiT('pelaaja') + '</option>';
  if (_hyv) h += '<option value="seura" selected>' + _kuiT('seura') + '</option>';
  h += '</select></div></div>';
  if (!_hyv) h += '<div style="font-size:11px;color:var(--ink3);line-height:1.45;margin-bottom:10px">' + _kuiT('Seuratason kaavion asettaa valmennuspäällikkö katselmuksessa.') + '</div>';
  // Joukkuevalinta näkyy vain kun näkyvyys on 'joukkue' — pelaajakohdistus on myöhempi lisäys
  // (se vaatii rosterin, eikä ensimmäisen kaavion luonti saa jäädä sen taakse).
  h += '<div style="font-size:11px;color:var(--ink3);line-height:1.45;margin-bottom:16px">' + _kuiT('Joukkue- ja pelaajakohdistuksen voi tarkentaa katselmuksessa.') + '</div>';
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
    review: { status: 'luonnos', nakyvyys: (nak && nak.value) || 'seura', joukkueId: null, pelaajaIds: [], versio: 0 }
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
  _kaavioTila.tallennettuSpec = null;   // leima syntyy vasta ensimmäisestä tallennuksesta
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

  h += '<div style="display:flex;gap:6px;flex-wrap:wrap">';
  h += '<button onclick="_kaavioKumoa()" style="background:var(--ov-1);color:var(--ink2);border:.5px solid var(--border);border-radius:6px;padding:7px 12px;font-size:11.5px;cursor:pointer">' + _kuiT('Kumoa') + '</button>';
  h += '<button onclick="_kaavioTallenna()" style="background:rgba(40,176,144,.16);color:var(--teal);border:.5px solid rgba(40,176,144,.45);border-radius:6px;padding:7px 14px;font-size:11.5px;cursor:pointer">' + _kuiT('Tallenna') + '</button>';
  h += '<button id="_kvSulje" onclick="_kaavioSuljeEditori()" style="background:var(--ov-1);color:var(--ink3);border:.5px solid var(--border);border-radius:6px;padding:7px 12px;font-size:11.5px;cursor:pointer">' + _kaavioSulkuNappiTeksti() + '</button>';
  h += '</div><div id="_kvVirhe" style="margin-top:10px;font-size:11.5px;color:#C94040"></div>';
  h += '</div></div></div></div>';
  document.body.insertAdjacentHTML('beforeend', h);
  _kaavioPiirraEditori();
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
  _kaavioTila.valittu = null; _kaavioTila.tallennettuSpec = null;
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
}
function _kaavioTallentamattomia() {
  var m = _kaavioTila.muokkaus;
  if (!m) return false;
  if (m._uusi || !m.id) return true;                       // ei vielä kertaakaan tallennettu
  if (_kaavioTila.tallennettuSpec == null) return false;   // avattu, ei muokattu tässä istunnossa
  return JSON.stringify(m.spec) !== _kaavioTila.tallennettuSpec;
}
/* Sulkunapin nimi: "Peruuta" peruu jotain vasta tallentamatonta. Kun kaavio on jo levyllä,
   sulkeminen ei peru mitään → "Valmis" on rehellisempi. */
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
  h += ' · ' + _kuiT('näkyvyys') + ': ' + _kaavioNakyvyysLbl(nak);
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
        review: {
          status: 'luonnos',
          nakyvyys: (m.review && m.review.nakyvyys) || 'seura',
          joukkueId: (m.review && m.review.joukkueId) || null,
          pelaajaIds: (m.review && m.review.pelaajaIds) || [],
          versio: 0,
          luonut: luoja,
          luotu: firebase.firestore.FieldValue.serverTimestamp()
        }
      });
      m.id = ref.id; m._uusi = false;   // seuraava Tallenna päivittää samaa dokumenttia
      // PAIKALLINEN review SYNKATAAN kirjoitetun kanssa. Tämä ei ollut ennen tarpeen, koska
      // editori sulkeutui heti — nyt se jää auki, ja seuraava Tallenna lukee versionumeron
      // TÄSTÄ objektista (kaavioSeuraavaVersio). Ilman synkkaa toinen tallennus lähettäisi saman
      // version uudelleen ja optimistinen versiolukko hylkäisi sen ("joku muu ehti muokata").
      m.review = {
        status: 'luonnos',
        nakyvyys: (m.review && m.review.nakyvyys) || 'seura',
        joukkueId: (m.review && m.review.joukkueId) || null,
        pelaajaIds: (m.review && m.review.pelaajaIds) || [],
        versio: 0
      };
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
    await kohde.doc(m.id).update({
      spec: m.spec,
      'review.status': uusiTila,
      'review.versio': uusiVersio
    });
    // Sama synkka kuin luontihaarassa: paikallinen review on seuraavan tallennuksen lähtökohta.
    m.review = m.review || {};
    m.review.status = uusiTila;
    m.review.versio = uusiVersio;
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
