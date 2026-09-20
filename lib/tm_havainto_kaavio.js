/* ══════════════════════════════════════════════════════════════════════════
   tm_havainto_kaavio.js — PELIHAVAINTO ↔ TAKTIIKKATAULU -linkki (jälkirikastus)

   TYÖNKULKU: kentällä valmentaja/VP kirjaa pelihavainnon NOPEASTI (ADAR-
   pikakortti). Taktiikkataulun kaavio piirretään JÄLKIKÄTEEN rauhassa ja
   liitetään jo tallennettuun havaintoon. Pelihavainto = D4 peliäly
   (asemointi/ratkaisut) → kaavio on siihen usein parempi todiste kuin valokuva.

   KANONINEN LINKKI ON HAVAINNON PUOLELLA. Kirjoitetaan `.update()`:lla samaan
   dokumenttiin — sama kuvio kuin AI-narratiivi (`_pyydaAINarratiivi`), samat
   oikeudet, EI sääntömuutosta:
     seurat/{seuraId}/pelaajat/{pelaajaId}/havainnot/{havaintoId}

   A5-INVARIANTTI: update EI saa koskea `luotu`-kenttään. `luotuPaivitysKelpaa`
   (firestore.rules:422) päästää läpi vain jos `luotu` ei ole affectedKeys:ssä
   — tai jos se on timestamp. Siksi tässä kirjoitetaan VAIN `media` + `kaavio_id`.

   §7.6: `serverTimestamp()` EI toimi taulukon sisällä → `otettu` on ISO-string,
   kuten ADARin `media[]`-kuvamerkinnöissä.

   EI OMAA EDITORIA EIKÄ VALIDAATTORIA. Kaavio luodaan ja tallennetaan
   olemassa olevalla `lib/tm_kaavio_ui.js`-editorilla (`_kaavioAvaaEditori` /
   `_kaavioTallenna`) ja renderöidään `lib/tm_kaavio_render.js`:llä.
   ══════════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var VERSIO = '1.0.0';
  var MEDIA_TYYPPI = 'kaavio';

  function _havaintoRef(db, ctx) {
    return db.collection('seurat').doc(ctx.seuraId)
      .collection('pelaajat').doc(ctx.pelaajaId)
      .collection('havainnot').doc(ctx.havaintoId);
  }

  /**
   * Liittää kaavion havaintoon. Havainto on totuuslähde linkille.
   *
   * @param {object} db   Firestore (compat)
   * @param {object} ctx  { seuraId, pelaajaId, havaintoId }
   * @param {string} kaavioId
   * @returns {Promise<boolean>} true jos linkki kirjoitettiin
   */
  function liita(db, ctx, kaavioId) {
    try {
      if (!db || !ctx || !ctx.seuraId || !ctx.pelaajaId || !ctx.havaintoId || !kaavioId) {
        return Promise.resolve(false);
      }
      var merkinta = { tyyppi: MEDIA_TYYPPI, kaavio_id: kaavioId, otettu: new Date().toISOString() };
      var paivitys = { kaavio_id: kaavioId };
      /* arrayUnion säilyttää olemassa olevat kuvamerkinnät — havainnolla voi olla
         sekä valokuva että kaavio. EI `luotu`-kenttää (A5). */
      try {
        paivitys.media = global.firebase.firestore.FieldValue.arrayUnion(merkinta);
      } catch (e) {
        return Promise.resolve(false);   // ilman FieldValue ei kirjoiteta puolikasta
      }
      return _havaintoRef(db, ctx).update(paivitys)
        .then(function () { return true; })
        .catch(function () { return false; });
    } catch (e) { return Promise.resolve(false); }
  }

  /**
   * Lukee havaintoon liitetyn kaavion id:n.
   * Ensisijainen `kaavio_id`, fallback `media[]`-merkintä (molemmat kirjoitetaan,
   * mutta vanhempi data tai osittainen kirjoitus voi sisältää vain toisen).
   */
  function kaavioId(havainto) {
    if (!havainto) return null;
    if (havainto.kaavio_id) return havainto.kaavio_id;
    var media = havainto.media;
    if (!Array.isArray(media)) return null;
    for (var i = 0; i < media.length; i++) {
      var m = media[i];
      if (m && m.tyyppi === MEDIA_TYYPPI && m.kaavio_id) return m.kaavio_id;
    }
    return null;
  }

  function onLiitetty(havainto) { return !!kaavioId(havainto); }

  /**
   * Renderöi kaavion thumbnailiksi annettuun elementtiin.
   * Käyttää JAETTUA renderöijää — ei omaa piirtokoodia.
   * @returns {boolean} true jos piirrettiin
   */
  function piirraThumb(el, spec, opts) {
    try {
      if (!el || !spec) return false;
      var R = global.TM_KAAVIO_RENDER;
      if (!R || typeof R.drawSpec !== 'function') return false;
      var svg = R.drawSpec(spec, (opts && opts.lang) || 'fi');
      if (!svg) return false;
      el.innerHTML = '';
      try {
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        svg.style.width = '100%';
        svg.style.height = 'auto';
        svg.style.display = 'block';
      } catch (e) { /* attribuutit valinnaisia */ }
      el.appendChild(svg);
      return true;
    } catch (e) { return false; }
  }

  /** Hakee kaaviodokumentin (spec + review) linkitystä varten. */
  function haeKaavio(db, seuraId, kid) {
    try {
      if (!db || !seuraId || !kid) return Promise.resolve(null);
      return db.collection('seurat').doc(seuraId).collection('kaaviot').doc(kid).get()
        .then(function (d) { return (d && d.exists) ? Object.assign({ id: d.id }, d.data()) : null; })
        .catch(function () { return null; });
    } catch (e) { return Promise.resolve(null); }
  }

  var API = {
    VERSIO: VERSIO,
    MEDIA_TYYPPI: MEDIA_TYYPPI,
    liita: liita,
    kaavioId: kaavioId,
    onLiitetty: onLiitetty,
    piirraThumb: piirraThumb,
    haeKaavio: haeKaavio,
  };

  global.tmHavaintoKaavio = API;
  /* §7.17: HTML onclick= näkee vain window-globaalit. */
  global.tmHavaintoLiitaKaavio = liita;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
