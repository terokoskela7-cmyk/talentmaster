/* TalentMaster — tm_sentry.js : jaettu Sentry-virheseuranta-wrapper (B2)
   VAIN onboarding-kriittiset appit (Pelaaja / Vanhempi / Rekisterointi).
   PII-SKRUBI PAKOLLINEN (alaikäisten data, CLAUDE.md §33 B4).
   GUARD: jos Sentry-CDN ei latautunut (offline / CDN blocked) → kaikki no-op,
   appi EI kaadu (Pelaaja/Vanhempi ovat offline-first PWA:ita).
   Lataa ENNEN Firebase-SDK:ta; tarvitsee window.TM_SENTRY.app asetettuna ensin.
   Sentry Browser SDK v10.58.0 (errors-only bundle, tracesSampleRate:0). */
(function () {
  'use strict';

  // ⚠️ LIITÄ EU-DSN TÄHÄN ENNEN KÄYTTÖÄ. Placeholderilla init ohitetaan hallitusti (guard).
  var TM_SENTRY_DSN = 'https://5ee45f46c735176690c07995ca09f321@o4511571051741184.ingest.de.sentry.io/4511571104890960';

  var TMS = window.TM_SENTRY = window.TM_SENTRY || {};
  var APP = TMS.app || 'tuntematon';

  // ── GUARD: ilman Sentryä tai ilman oikeaa DSN:ää → kaikki no-op, appi ei kaadu ──
  if (typeof Sentry === 'undefined' || !TM_SENTRY_DSN || TM_SENTRY_DSN.charAt(0) === '<') {
    window.tmSentryContext = window.tmSentryContext || function () {};
    return;  // offline / CDN estetty / DSN täyttämättä → hiljainen no-op
  }

  // ── PII-SKRUBI (EHDOTON) ──────────────────────────────────────────────────────
  // Avaimet joiden NIMI täsmää → arvo redaktoidaan. Stringeistä maskataan 4-num PIN-jonot.
  // URL-kentistä strippataan query-parametrit. EI koskaan email/nimi/displayName eventteihin.
  var SENSITIVE = /email|nimi|etunimi|sukunimi|huoltaja|pin|puhelin|osoite/i;
  function _stripQuery(u) { return (typeof u === 'string') ? u.split('?')[0].split('#')[0] : u; }
  function _maskPin(s) {
    if (typeof s !== 'string') return s;
    return s
      .replace(/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/gi, '[email]')   // emailit ensin
      .replace(/\b\d{4}\b/g, '****');                          // sitten 4-num PIN
  }
  function _redact(node, depth) {
    if (node == null || depth > 8) return node;
    if (typeof node === 'string') return _maskPin(node);
    if (typeof node !== 'object') return node;
    if (Array.isArray(node)) { for (var i = 0; i < node.length; i++) node[i] = _redact(node[i], depth + 1); return node; }
    for (var k in node) {
      if (!Object.prototype.hasOwnProperty.call(node, k)) continue;
      if (SENSITIVE.test(k)) { node[k] = '[redacted]'; }
      else { node[k] = _redact(node[k], depth + 1); }
    }
    return node;
  }
  function _scrubBreadcrumb(crumb) {
    if (!crumb) return crumb;
    if (crumb.data) {
      if (crumb.data.url)  crumb.data.url  = _stripQuery(crumb.data.url);
      if (crumb.data.to)   crumb.data.to   = _stripQuery(crumb.data.to);
      if (crumb.data.from) crumb.data.from = _stripQuery(crumb.data.from);
      crumb.data = _redact(crumb.data, 0);
    }
    if (crumb.message) crumb.message = _maskPin(crumb.message);
    return crumb;
  }
  function _scrubEvent(event) {
    try {
      // 1. user: VAIN pseudonyymi id (ei email/username/ip/nimi)
      if (event.user) { event.user = event.user.id ? { id: String(event.user.id) } : undefined; }
      // 2. request: strippaa query + poista arkaluonteiset
      if (event.request) {
        if (event.request.url) event.request.url = _stripQuery(event.request.url);
        delete event.request.query_string;
        delete event.request.cookies;
        delete event.request.headers;
        if (event.request.data) event.request.data = _redact(event.request.data, 0);
      }
      // 3. käyttäjäperäiset säkit: deep-redact
      if (event.extra)    event.extra    = _redact(event.extra, 0);
      if (event.contexts) event.contexts = _redact(event.contexts, 0);
      if (event.tags)     event.tags     = _redact(event.tags, 0);
      // 4. viesti + poikkeustekstit: maskaa PIN-jonot
      if (event.message) event.message = _maskPin(event.message);
      if (event.exception && event.exception.values) {
        event.exception.values.forEach(function (v) { if (v && v.value) v.value = _maskPin(v.value); });
      }
      // 5. breadcrumbit
      if (event.breadcrumbs) event.breadcrumbs.forEach(_scrubBreadcrumb);
      return event;
    } catch (e) {
      return null;  // skrubin epäonnistuessa PUDOTA event (PII-turva > virhenäkyvyys alaikäisten datassa)
    }
  }

  // ── INIT ──────────────────────────────────────────────────────────────────────
  try {
    Sentry.init({
      dsn: TM_SENTRY_DSN,
      environment: (location.hostname.indexOf('github.io') !== -1) ? 'production' : 'dev',
      release: (TMS.release || undefined),                                   // best-effort
      tracesSampleRate: 0,            // VAIN virheet — ei performance-tracingia (kustannus/volyymi matala)
      sendDefaultPii: false,          // EHDOTON: ei automaattista PII:tä (alaikäiset, §33 B4)
      beforeSend: _scrubEvent,
      beforeBreadcrumb: function (crumb) { return _scrubBreadcrumb(crumb); }
    });
    Sentry.setTag('app', APP);
  } catch (e) {
    window.tmSentryContext = window.tmSentryContext || function () {};
    return;  // init epäonnistui (esim. placeholder-DSN) → no-op, appi ei kaadu
  }

  // ── AUTH-KONTEKSTI — VAIN pseudonyymit (uid, seuraId, rooli). EI email/nimi/displayName. ──
  window.tmSentryContext = function (o) {
    if (typeof Sentry === 'undefined' || !o) return;
    try {
      if (o.seuraId) Sentry.setTag('seuraId', String(o.seuraId));
      if (o.rooli)   Sentry.setTag('rooli', String(o.rooli));
      if (o.uid)     Sentry.setUser({ id: String(o.uid) });   // VAIN id — ei email/username/nimi
    } catch (e) { /* no-op */ }
  };
})();
