/* ══════════════════════════════════════════════════════════════════════════
   tm_aani.js — PUHDAS NAUHOITIN (record · stop · esikuuntelu · upload · litterointi)

   MIKSI OMA TIEDOSTO: nauhoitinta tarvitsee nyt kaksi toisiinsa liittymätöntä
   ominaisuutta — valmentajan reflektiopäiväkirja (lib/tm_reflektio.js) ja VP:n
   harjoitusarvioinnin ääripalaute (VP_v25). Recorder-ytimen koti ei voi olla
   reflektiolibissä: palauteääni ei ole reflektiota, ja se sitoisi kaksi eri
   ominaisuutta toisiinsa. Yksi lähde, kaksi kuluttajaa.

   ⚠ KOHDEPOLKU TULEE KUTSUJALTA. Nauhoitin ei tiedä mihin ääni kuuluu eikä
   kirjoita Firestoreen — se palauttaa { url, polku, kesto_s, transkriptio,
   mime } ja kutsuja päättää dokumentin. Näin sama ydin palvelee polkuja joilla
   on ERI näkyvyys (reflektio = vain oma uid · palaute_jaettu = seura kuulee ·
   palaute_yksityinen = johto-only) ilman että ydin tuntee niitä.

   INSTANSSIT, ei singletonia: reflektiomodaali ja palautelomake ovat eri
   pintoja omine DOM-id:ineen. Moduulitason jaettu tila vuotaisi niiden välillä
   (nauhoitat palautteen → avaat reflektion → sama blob tarjolla).

   §7.1 string concatenation · §7.17 window-globaalit kutsujan puolella.
   ══════════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var VERSIO = '1.0.0';

  var cfg = null;
  function _arvo(x) { return (typeof x === 'function') ? x() : x; }
  function _auth() { return _arvo(cfg && cfg.auth); }
  function _projectId() { return _arvo(cfg && cfg.projectId); }
  function _t(s) { return (cfg && typeof cfg.t === 'function') ? cfg.t(s) : s; }
  function _toast(viesti, tyyppi) { if (cfg && typeof cfg.toast === 'function') cfg.toast(viesti, tyyppi); }
  function _esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  function fmtKesto(s) { s = Math.round(s || 0); var m = Math.floor(s / 60), x = s % 60; return m + ':' + (x < 10 ? '0' : '') + x; }

  function valitseMime() {
    var ketju = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus'];
    if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return null;
    for (var i = 0; i < ketju.length; i++) { if (MediaRecorder.isTypeSupported(ketju[i])) return ketju[i]; }
    return null;
  }
  function extFor(mime) { mime = mime || ''; return mime.indexOf('mp4') >= 0 ? 'mp4' : mime.indexOf('ogg') >= 0 ? 'ogg' : 'webm'; }
  function tuettu() { return !!valitseMime() && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia); }

  function blobToBase64(blob) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { var s = String(r.result || ''); var i = s.indexOf(','); resolve(i >= 0 ? s.slice(i + 1) : s); };
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  }

  var OLETUS_MAX_S = 180;                    // 3 min auto-stop
  var OLETUS_MAX_BYTES = 12 * 1024 * 1024;   // ~12 MB — sama katto kuin storage.rulesissa

  /**
   * Luo nauhoitin-instanssin.
   * @param {object} opts
   *   btnId/aikaId/previewId — DOM-id:t joihin instanssi renderöi (kutsujan pinta)
   *   maxS, maxBytes         — rajat (oletukset yllä)
   *   litterointiNappiId     — litterointinapin id (oletus <btnId>Litteroi)
   */
  function luo(opts) {
    opts = opts || {};
    var BTN = opts.btnId || 'aaniRecBtn';
    var AIKA = opts.aikaId || 'aaniRecAika';
    var PREV = opts.previewId || 'aaniPreview';
    var LIT = opts.litterointiNappiId || (BTN + 'Litteroi');
    var MAX_S = opts.maxS || OLETUS_MAX_S;
    var MAX_BYTES = opts.maxBytes || OLETUS_MAX_BYTES;

    var mime = null, ext = null, recorder = null, stream = null, chunks = [];
    var blob = null, seconds = 0, timer = null, tila = 'idle';   // idle|recording|recorded
    var transkriptio = null;

    var self;

    function nollaa() {
      if (timer) { clearInterval(timer); timer = null; }
      if (recorder && recorder.state !== 'inactive') { try { recorder.stop(); } catch (e) {} }
      if (stream) { try { stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {} stream = null; }
      recorder = null; chunks = []; blob = null; seconds = 0; tila = 'idle'; transkriptio = null;
    }

    function renderoi() {
      var btn = document.getElementById(BTN), aika = document.getElementById(AIKA), prev = document.getElementById(PREV);
      if (!btn) return;
      if (tila === 'recording') {
        btn.textContent = _t('■ Lopeta'); btn.style.background = 'var(--red)'; btn.style.color = '#fff'; btn.style.border = 'none';
        if (prev) prev.innerHTML = '';
      } else if (tila === 'recorded') {
        btn.textContent = _t('↻ Nauhoita uudelleen'); btn.style.background = 'var(--surface)'; btn.style.color = 'var(--ink2)'; btn.style.border = '.5px solid var(--border)';
        if (aika) aika.textContent = '🎙 ' + fmtKesto(seconds);
        if (prev && blob) {
          var url = URL.createObjectURL(blob);
          var pv = '<audio controls src="' + url + '" style="width:100%;height:36px"></audio>';
          if (transkriptio) {
            pv += '<div style="font-size:12px;color:var(--ink2);background:var(--card);border:.5px solid var(--line);border-radius:8px;padding:8px 10px;margin-top:6px"><b style="color:var(--teal)">'
              + _t('Litterointi:') + '</b> ' + _esc(transkriptio) + '</div>';
          } else {
            pv += '<div style="margin-top:6px;display:flex;align-items:center;gap:8px;flex-wrap:wrap"><button type="button" id="' + LIT + '" style="font-size:11px;padding:5px 12px;border:.5px solid var(--teal);background:rgba(40,176,144,.1);color:var(--teal);border-radius:7px;cursor:pointer">'
              + _t('✍ Litteroi (valinnainen)') + '</button><span style="font-size:10px;color:var(--ink3)">' + _t('ääni lähetetään litteroitavaksi (opt-in)') + '</span></div>';
          }
          prev.innerHTML = pv;
          /* Kuuntelija koodista, ei onclick=-attribuutista: instanssilla ei ole
             globaalia nimeä johon attribuutti voisi viitata. */
          var lb = document.getElementById(LIT);
          if (lb) lb.addEventListener('click', function () { self.litteroi(); });
        }
      } else {
        btn.textContent = '● Nauhoita'; btn.style.background = 'var(--teal)'; btn.style.color = '#fff'; btn.style.border = 'none';
        if (aika) aika.textContent = ''; if (prev) prev.innerHTML = '';
      }
    }

    function stop() {
      if (timer) { clearInterval(timer); timer = null; }
      if (recorder && recorder.state !== 'inactive') { try { recorder.stop(); } catch (e) {} }
    }

    /* Käyttäjäele (iOS-vaatimus): getUserMedia/recorder vain napin klikistä. */
    function toggle() {
      if (tila === 'recording') { stop(); return Promise.resolve(); }
      if (tila === 'recorded') { nollaa(); renderoi(); }
      return navigator.mediaDevices.getUserMedia({ audio: true }).then(function (s) {
        stream = s;
        mime = valitseMime(); ext = extFor(mime);
        try { recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream); }
        catch (e) { recorder = new MediaRecorder(stream); }
        if (!mime) { mime = recorder.mimeType || 'audio/webm'; ext = extFor(mime); }
        chunks = []; blob = null; seconds = 0;
        recorder.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
        recorder.onstop = function () {
          blob = new Blob(chunks, { type: mime });
          if (stream) { try { stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {} stream = null; }
          tila = 'recorded'; renderoi();
        };
        recorder.start();
        tila = 'recording'; renderoi();
        timer = setInterval(function () {
          seconds++;
          var a = document.getElementById(AIKA);
          if (a) a.textContent = '● ' + fmtKesto(seconds) + ' / ' + fmtKesto(MAX_S);
          if (seconds >= MAX_S) stop();
        }, 1000);
      }, function () { _toast(_t('Mikrofonin käyttö estetty'), 'error'); });
    }

    /* Opt-in Whisper-litterointi (aiProxy voice_transcribe, CF §13). */
    function litteroi() {
      if (!blob) return Promise.resolve(null);
      var au = _auth(); var cu = au && au.currentUser;
      if (!cu) { _toast(_t('Kirjaudu ensin'), 'error'); return Promise.resolve(null); }
      var btn = document.getElementById(LIT); if (btn) { btn.disabled = true; btn.textContent = _t('Litteroidaan…'); }
      return blobToBase64(blob).then(function (base64) {
        return cu.getIdToken().then(function (idToken) {
          return fetch('https://europe-west1-' + _projectId() + '.cloudfunctions.net/aiProxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + idToken },
            body: JSON.stringify({ task: 'voice_transcribe', data: { audio: base64, mimeType: mime || 'audio/webm', language: 'fi' } })
          });
        });
      }).then(function (res) {
        if (!res.ok) throw new Error('palvelinvirhe ' + res.status);
        return res.json();
      }).then(function (j) {
        transkriptio = String((j && (j.text || j.transkriptio)) || '').trim();
        if (!transkriptio) throw new Error('tyhjä litterointi');
        renderoi();
        _toast(_t('✓ Litteroitu'), 'ok');
        return transkriptio;
      })['catch'](function () {
        _toast(_t('Litterointi epäonnistui — äänireflektio toimii silti.'), 'error');
        if (btn) { btn.disabled = false; btn.textContent = '✍ Litteroi (valinnainen)'; }
        return null;
      });
    }

    /**
     * Lataa nauhoitteen ANNETTUUN Storage-polkuun.
     * @param {string} kansio  polku ILMAN tiedostonimeä, esim.
     *                         'seurat/x/harjoitusarvioinnit/y/palaute_jaettu_audio'
     * @param {string} nimi    tiedoston runko (ilman päätettä)
     * @returns {Promise<{url,polku,kesto_s,transkriptio,mime}|null>}
     */
    function lataa(kansio, nimi) {
      if (!blob) return Promise.resolve(null);
      if (blob.size > MAX_BYTES) { _toast(_t('Äänitiedosto liian iso (max ~12 MB)'), 'error'); return Promise.reject(new Error('liian iso')); }
      var polku = String(kansio).replace(/\/+$/, '') + '/' + nimi + '.' + (ext || 'webm');
      var sref = global.firebase.storage().ref(polku);
      return sref.put(blob, { contentType: mime || 'audio/webm' })
        .then(function () { return sref.getDownloadURL(); })
        .then(function (url) {
          return { url: url, polku: polku, kesto_s: seconds, transkriptio: transkriptio, mime: mime || 'audio/webm' };
        });
    }

    self = {
      toggle: toggle,
      stop: stop,
      nollaa: nollaa,
      renderoi: renderoi,
      litteroi: litteroi,
      lataa: lataa,
      tila: function () { return tila; },
      kesto: function () { return seconds; },
      blob: function () { return blob; },
      ext: function () { return ext; },
      mime: function () { return mime; },
      transkriptio: function () { return transkriptio; },
      onNauhoite: function () { return !!blob; },
      liianIso: function () { return !!blob && blob.size > MAX_BYTES; },
      MAX_S: MAX_S,
      MAX_BYTES: MAX_BYTES,
      idt: { btn: BTN, aika: AIKA, preview: PREV, litterointi: LIT }
    };
    return self;
  }

  /** Nauhoitusalueen HTML (nappi + aika + esikuuntelu) — sama ulkoasu molemmilla pinnoilla. */
  function alueHTML(idt, onclickAttr) {
    return '<div><button type="button" id="' + idt.btn + '"' + (onclickAttr ? ' onclick="' + onclickAttr + '"' : '')
      + ' style="padding:8px 16px;border-radius:8px;border:none;background:var(--teal);color:#fff;font-size:12px;cursor:pointer">'
      + _t('● Nauhoita') + '</button> <span id="' + idt.aika + '" style="font-size:12px;color:var(--ink3)"></span></div>'
      + '<div id="' + idt.preview + '" style="margin-top:8px"></div>';
  }

  function mount(opts) { cfg = opts || {}; return API; }

  var API = {
    VERSIO: VERSIO,
    mount: mount,
    luo: luo,
    tuettu: tuettu,
    fmtKesto: fmtKesto,
    alueHTML: alueHTML,
    OLETUS_MAX_S: OLETUS_MAX_S,
    OLETUS_MAX_BYTES: OLETUS_MAX_BYTES
  };

  global.tmAani = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
