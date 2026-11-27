/* QG-3 · tuotannon savutestin PUHTAAT osat (ei selainta, ei verkkoa) — testit tests/savutesti_lib.test.js.
   Vaihe 0: ~/.briefit/QG3_SAVUTESTI_VAIHE0.md (S1 synteettinen qg_savu · S2 Hosting-kanava + debug-token · S3 kolmikerroksinen kirjoitusesto).
   · secretitPuuttuvat(env)            → puuttuvien secretien nimet (tyhjä = kaikki on)
   · kanavaUrl(url)                     → { ok, url, syy } — VAIN talentmaster-pilot--savutesti-*.web.app (tunnukset ja debug-token eivät koskaan lähde muualle)
   · luokittelePyynto({url, method})    → { paatos: 'sallittu'|'estetty'|'vaimennettu', syy } — verkkoesto (kerros 2, varmistus)
   · vartijaLahde(viesti)               → sivun kirjoitusvartijan (kerros 2a) lähdekoodi addInitScriptille
   · luokitteleKirjoitus({op, polku, kentat, arvot, uid}, sivu) → { tunnettu, syy } — vartijan kirjaamat yritykset (tunnettu = nimetty polku + kentät + arvot)
   · svLoydot(tekstit, { sallitut, baseline }) → { uudet, tunnetut } — sv-ajon suomi (QG-1:n tunnistin + sallittulista + sv-baseline)
   · konsoliVirheet(viestit, sallitut, estetytUrlit) → virheet, joita ei selitä sallittulista eikä savutestin oma esto
   · epaonnistuneetPyynnot / liitaPyynnot / virheRivit → jokaisesta epäonnistuneesta pyynnöstä metodi + HTTP-status + URL ilman queryä
   · arvioi(nakyma) → tarkistusten tilat · yhteenvetoMarkdown(tulos) · issueRunko(tulos, ajoUrl) */
import { onkoSuomea } from '../i18n/sv_lapiajo_fi.mjs';

export const SECRETIT = ['TM_SAVU_EMAIL', 'TM_SAVU_SALASANA', 'TM_SAVU_PELAAJA_TUNNISTE', 'TM_SAVU_PELAAJA_PIN', 'TM_SAVU_APPCHECK_DEBUG'];
export const SEURA = 'qg_savu';
export const KANAVA_RE = /^https:\/\/talentmaster-pilot--savutesti-[a-z0-9]+\.web\.app$/;
export const ESTO_VIESTI = 'savutesti: kirjoitus estetty';

/* Mitkä pyynnöt reititetään luokittelijalle. Firestoren luku (Listen-kanava, runQuery) EI kulje reitityksen läpi: pitkä striimi pysyy koskemattomana. */
export const REITITA_RE = /^https:\/\/(?:firestore\.googleapis\.com\/(?:google\.firestore\.v1\.Firestore\/Write\/|v1(?:beta1)?\/projects\/)|[^/]+\.cloudfunctions\.net\/|[^/]+\.run\.app\/|firebasestorage\.googleapis\.com\/|storage\.googleapis\.com\/|identitytoolkit\.googleapis\.com\/|securetoken\.googleapis\.com\/|[^/]*sentry\.io\/)/;

export function secretitPuuttuvat(env) { return SECRETIT.filter((k) => !String((env && env[k]) || '').trim()); }

export function kanavaUrl(url) {
  const u = String(url || '').trim().replace(/\/+$/, '');
  if (!u) return { ok: false, url: '', syy: 'kanavan URL puuttuu (artefakti savutesti-kanava / syöte url / vars.TM_SAVU_URL)' };
  if (!KANAVA_RE.test(u)) return { ok: false, url: u, syy: 'URL ei ole savutesti-kanava (talentmaster-pilot--savutesti-*.web.app): tunnuksia ei lähetetä muualle' };
  return { ok: true, url: u, syy: '' };
}

const FS_KIRJOITUS = /\/google\.firestore\.v1\.Firestore\/Write\//;
const FS_REST_KIRJOITUS = /\/documents(?:\/[^?]*)?:(commit|batchWrite|beginTransaction|rollback)\b/;
const CALLABLE = /^https:\/\/europe-west1-talentmaster-pilot\.cloudfunctions\.net\/([A-Za-z0-9_]+)/;
const AUTH_SALLITUT = /^(?:accounts:(?:signInWithPassword|signInWithCustomToken|lookup)|token)$/;

/* req = { url, method }. callablet = sallittulistan nimet. Tuntematon muu liikenne (CDN, oma kanava) = sallittu: se ei kirjoita backendiin. */
export function luokittelePyynto(req, callablet) {
  const url = String((req && req.url) || ''), m = String((req && req.method) || 'GET').toUpperCase();
  let u; try { u = new URL(url); } catch (e) { return { paatos: 'sallittu', syy: 'ei http-osoite' }; }
  const h = u.hostname, p = u.pathname;
  if (h === 'firestore.googleapis.com') {
    if (FS_KIRJOITUS.test(p)) return { paatos: 'estetty', syy: 'Firestore Write -kanava' };
    if (FS_REST_KIRJOITUS.test(p)) return { paatos: 'estetty', syy: 'Firestore REST ' + p.match(FS_REST_KIRJOITUS)[1] };
    if (/\/documents\//.test(p) && /^(PATCH|DELETE|PUT)$/.test(m)) return { paatos: 'estetty', syy: 'Firestore REST ' + m };
    return { paatos: 'sallittu', syy: 'Firestore-luku' };
  }
  const c = url.match(CALLABLE);
  if (c) return (callablet || []).includes(c[1]) ? { paatos: 'sallittu', syy: 'callable ' + c[1] + ' (sallittulista)' } : { paatos: 'estetty', syy: 'callable ' + c[1] + ' (ei sallittulistalla)' };
  if (/cloudfunctions\.net$|\.run\.app$/.test(h)) return { paatos: 'estetty', syy: 'tuntematon funktio ' + h + p };
  if (h === 'firebasestorage.googleapis.com' || h === 'storage.googleapis.com') return /^(GET|HEAD|OPTIONS)$/.test(m) ? { paatos: 'sallittu', syy: 'Storage-luku' } : { paatos: 'estetty', syy: 'Storage ' + m };
  if (h === 'identitytoolkit.googleapis.com' || h === 'securetoken.googleapis.com') {
    const toim = p.split('/').pop();
    return AUTH_SALLITUT.test(toim) ? { paatos: 'sallittu', syy: 'Auth ' + toim } : { paatos: 'estetty', syy: 'Auth ' + toim };
  }
  if (/(^|\.)sentry\.io$/.test(h)) return { paatos: 'vaimennettu', syy: 'Sentry-raportti (savutestin estämät kirjoitukset eivät kuulu tuotannon virheisiin)' };
  return { paatos: 'sallittu', syy: 'muu liikenne' };
}

/* Sivun Firestore-kirjoitusvartija (kerros 2a), ajetaan selaimessa addInitScriptinä. compat-SDK:n luokat ovat jaettuja kaikille apeille (myös P7:n nimetty 'tm-pelaaja').
   Kirjaa jokaisesta yrityksestä { op, polku, kentat, arvot, uid }: kentat = ylätason kenttänimet (update(kenttä, arvo, …) -muodossa parittomat argumentit),
   arvot = ylätason skalaariarvot (merkkijono ≤ 80), uid = kirjoittavan apin kirjautunut käyttäjä. Luokittelu: luokitteleKirjoitus. */
export function vartijaLahde(viesti) {
  return `(function () {
  window.__savuKirj = []; var VIESTI = ${JSON.stringify(viesti)};
  function virhe(op, polku) { var e = new Error(VIESTI + ' (' + op + ' ' + polku + ')'); e.code = 'permission-denied'; return e; }
  function kuvaa(op, ref, args, polku) {
    var k = { op: op, polku: String(polku || (ref && ref.path) || ''), kentat: [], arvot: {}, uid: null }, d = args && args[0];
    try {
      var FP = window.firebase && window.firebase.firestore && window.firebase.firestore.FieldPath;
      var onFP = function (x) { return !!(x && typeof x === 'object' && FP && x instanceof FP); };
      var nimi = function (x) { if (!onFP(x)) return String(x); var s = x._delegate || x;
        try { return s._internalPath && s._internalPath.canonicalString ? s._internalPath.canonicalString() : String(x); } catch (e) { return String(x); } };
      if (typeof d === 'string' || onFP(d)) {
        for (var i = 0; i < args.length; i += 2) k.kentat.push(nimi(args[i]));
      } else if (d && typeof d === 'object') {
        Object.keys(d).forEach(function (x) { k.kentat.push(x); var v = d[x];
          if (v === null || typeof v === 'number' || typeof v === 'boolean') k.arvot[x] = v; else if (typeof v === 'string') k.arvot[x] = v.slice(0, 80); });
      }
      k.kentat.sort();
      var app = ref && ref.firestore && ref.firestore.app, F = window.firebase, a = app && F && F.auth ? F.auth(app) : null;
      k.uid = a && a.currentUser ? String(a.currentUser.uid) : null;
    } catch (e) { /* kuvaus jää vajaaksi → luokittelija ei tunnista → kaataa (turvallinen suunta) */ }
    return k;
  }
  function kirjaa(k) { window.__savuKirj.push(k); }
  function asenna() {
    var F = window.firebase && window.firebase.firestore; if (!F || !F.DocumentReference || !F.CollectionReference) return false;
    if (window.__savuVartija) return true;
    var DR = F.DocumentReference.prototype;
    ['set', 'update', 'delete'].forEach(function (m) { DR[m] = function () { kirjaa(kuvaa(m, this, [].slice.call(arguments))); return Promise.reject(virhe(m, this.path)); }; });
    F.CollectionReference.prototype.add = function () { kirjaa(kuvaa('add', this, [].slice.call(arguments), this.path + '/*')); return Promise.reject(virhe('add', this.path)); };
    if (F.WriteBatch) { var WB = F.WriteBatch.prototype;
      ['set', 'update', 'delete'].forEach(function (m) { WB[m] = function (ref) { (this.__savu = this.__savu || []).push(kuvaa('batch.' + m, ref, [].slice.call(arguments, 1))); return this; }; });
      WB.commit = function () { var l = this.__savu || []; l.forEach(kirjaa); return Promise.reject(virhe('commit', l.length + ' kirjoitusta')); }; }
    if (F.Transaction) { var TR = F.Transaction.prototype;
      ['set', 'update', 'delete'].forEach(function (m) { TR[m] = function (ref) { kirjaa(kuvaa('tx.' + m, ref, [].slice.call(arguments, 1))); throw virhe('tx.' + m, ref && ref.path); }; }); }
    window.__savuVartija = true; return true;
  }
  if (!asenna()) { var t = setInterval(function () { if (asenna()) clearInterval(t); }, 2); setTimeout(function () { clearInterval(t); }, 60000); }
})();`;
}

/* kirjoitus = vartijan kirjaus { op, polku, kentat, arvot, uid }. sallitut = savutesti_sallitut.json tunnetut_kirjoitukset.
   Tunnettu (⚠) VAIN kun kaikki täsmää: op täsmälleen (batch./tx. ei kelpaa yksittäisen kirjoituksen tilalle), sivu, ankkuroitu polku
   ({oma_uid} = kirjoittajan oma kirjautunut uid), kenttäjoukko täsmälleen sama ja nimetyt arvot samat. Kaikki muu = tuntematon → kaataa. */
const UID_RE = /^[A-Za-z0-9]{1,128}$/;
function polkuOsuu(malli, polku, uid) {
  if (malli.includes('{oma_uid}')) { if (!uid || !UID_RE.test(uid)) return false; malli = malli.split('{oma_uid}').join(uid); }
  return new RegExp(malli).test(polku);
}
export function luokitteleKirjoitus(kirjoitus, sivu, sallitut) {
  const k = kirjoitus || {}, op = String(k.op || ''), polku = String(k.polku || '');
  const kentat = Array.isArray(k.kentat) ? k.kentat.map(String).sort() : null, arvot = (k.arvot && typeof k.arvot === 'object') ? k.arvot : {};
  const uid = typeof k.uid === 'string' ? k.uid : null;
  const r = (sallitut || []).find((s) => s.op === op && (!s.sivu || s.sivu === sivu) && polkuOsuu(s.polku, polku, uid) &&
    !!kentat && Array.isArray(s.kentat) && s.kentat.length === kentat.length && [...s.kentat].sort().every((x, i) => x === kentat[i]) &&
    Object.keys(s.arvot || {}).every((a) => Object.prototype.hasOwnProperty.call(arvot, a) && arvot[a] === s.arvot[a]));
  return r ? { tunnettu: true, syy: r.perustelu } : { tunnettu: false, syy: 'tuntematon kirjoitus ' + op + ' ' + polku + (kentat && kentat.length ? ' [' + kentat.join(',') + ']' : '') };
}

const norm = (s) => String(s).replace(/\s+/g, ' ').trim();
const avain = (s) => norm(s).toLowerCase();
export function onSallittu(t, sallitut) {
  const a = avain(t), S = sallitut || { tekstit: [], alkavat: [] };
  return (S.tekstit || []).includes(a) || (S.alkavat || []).some((p) => a.startsWith(String(p).toLowerCase())) || !/[a-zåäö]{3}/i.test(t);
}
/* Seed-datan henkilönimet (scripts/savutesti_seura_luo.js SALLITUT_NIMET) pois tekstistä ennen suomen tunnistusta: "Jo Strand" ei ole suomea,
   vaikka "jo" on suomen sana. Vain isolla alkukirjaimella kirjoitettu kokonainen sana (pieni "jo" lauseessa jää tunnistettavaksi). */
export function poistaNimet(teksti, nimet) {
  const l = [...(nimet || [])].filter((x) => typeof x === 'string' && /^\p{Lu}\p{L}*$/u.test(x));
  if (!l.length) return String(teksti);
  const re = new RegExp('(?<!\\p{L})(?:' + l.join('|') + ')(?!\\p{L})', 'gu');
  return String(teksti).replace(re, ' ');
}
/* Suomi sv-ajossa: sallittu → ohitetaan · sv-baselinessa (tunnettu, PM:n sv-erä odottaa; tools/i18n/sv_lapiajo_baseline.json) → varoitus · muu → virhe.
   opts.nimet = seed-datan nimet: tunnistetaan vain nimien jälkeen jäävä teksti. */
/* Baseline-vertailu ilman numeroita: QG-1 mittaa kiinteällä kellolla ja fixture-datalla, tuotannossa päivä ja luvut vaihtelevat
   ("Kehitystilanne · koko vuosi 2026 · päivitetty 14.10.2026", "0 / 0 tavoitetta raiteilla"). Sama teksti eri luvuilla = sama baselinen teksti. */
export const ilmanLukuja = (s) => avain(s).replace(/\d+/g, '#');
/* Sähköpostiosoite on tunnuksen dataa, ei käännettävää tekstiä (savutesti 6.11.: Seuran yläpalkin #topbarEmail = savutestitunnuksen osoite,
   "savutesti@…" osui suomen tunnistimeen "testi"-vartalolla ja kaatoi kaikki Seuran sv-näkymät; lokissa GitHub peitti sen ***:ksi). */
export const SAHKOPOSTI_RE = /[^\s@<>()"',;]+@[^\s@<>()"',;]+\.[a-z]{2,}/gi;
export const poistaSahkopostit = (s) => String(s).replace(SAHKOPOSTI_RE, ' ');
export function svLoydot(tekstit, opts) {
  const o = opts || {}, base = new Set(((o.baseline && o.baseline.tekstit) || []).map(ilmanLukuja)), uudet = [], tunnetut = [], nahty = new Set();
  for (const t0 of tekstit || []) {
    const t = norm(t0); if (!t || nahty.has(avain(t))) continue; nahty.add(avain(t));
    if (onSallittu(t, o.sallitut) || !onkoSuomea(poistaNimet(poistaSahkopostit(t), o.nimet)).fi) continue;
    (base.has(ilmanLukuja(t)) ? tunnetut : uudet).push(t);
  }
  return { uudet, tunnetut };
}

/* viestit = [{ tyyppi: 'pageerror'|'console', teksti, url? }]. Pois: sallittulista (malli = RegExp-lähde, valinnainen url-malli), savutestin oma esto (ESTO_VIESTI) ja estettyjen osoitteiden latausvirheet. */
export function konsoliVirheet(viestit, sallitut, estetytUrlit) {
  const est = new Set(estetytUrlit || []);
  return (viestit || []).filter((v) => {
    const t = String(v.teksti || '');
    if (t.includes(ESTO_VIESTI)) return false;
    if (v.url && est.has(v.url)) return false;
    return !(sallitut || []).some((s) => new RegExp(s.malli).test(t) && (!s.url || new RegExp(s.url).test(String(v.url || ''))));
  });
}

/* Epäonnistuneet pyynnöt (Playwrightin response-tapahtuma status ≥ 400 + requestfailed). Query-osa pois kaikkialta tuloksesta:
   siinä kulkee istuntotunnisteita (gsessionid, SID) ja API-avain, eikä se kerro vian syytä. */
export function ilmanQuerya(url) {
  try { const u = new URL(String(url)); return u.origin + u.pathname; } catch (e) { return String(url || '').split(/[?#]/)[0]; }
}
/* pyynto = { metodi, url (täysi tai ilman queryä), status (0 = ei vastausta), virhe? } → "400 POST https://…/Listen/channel" */
export function pyyntoRivi(p) {
  return (p.status ? String(p.status) : 'ei vastausta' + (p.virhe ? ' (' + p.virhe + ')' : '')) + ' ' + String(p.metodi || '?').toUpperCase() + ' ' + ilmanQuerya(p.url);
}
/* pyynnot = [{ metodi, url (täysi), status, virhe?, t? }]. Savutestin omat estot pois (estetytUrlit) → [{ metodi, url ilman queryä, status, virhe?, t? }]. */
export function epaonnistuneetPyynnot(pyynnot, estetytUrlit) {
  const est = new Set(estetytUrlit || []);
  return (pyynnot || []).filter((p) => !est.has(p.url)).map((p) => Object.assign({}, p, { url: ilmanQuerya(p.url) }));
}
/* Konsolin "Failed to load resource" ei kerro pyyntöä: liitetään viestiin saman täyden URL:n pyyntö (metodi + status) ja
   viestin URL tallennetaan ilman queryä. viestit = konsoliVirheet()-tulos, pyynnot = täysillä URL:eilla. */
export function liitaPyynnot(viestit, pyynnot) {
  const kartta = new Map(); for (const p of pyynnot || []) if (p.url && !kartta.has(p.url)) kartta.set(p.url, p);
  return (viestit || []).map((v) => {
    const o = Object.assign({}, v); if (!v.url) return o;
    const p = kartta.get(v.url);
    if (p) { o.pyynto = { metodi: p.metodi, url: ilmanQuerya(p.url), status: p.status }; if (p.virhe) o.pyynto.virhe = p.virhe; }
    o.url = ilmanQuerya(v.url);
    return o;
  });
}
/* Firestoren Listen-kanavan uusinta (WebChannel avaa yhteyden uudelleen → vanhan istunnon pyyntö saa 400/404) on kohinaa (PM 6.11.:
   VP Koti sv, aiemmin P7). Sallitaan VAIN tämä osoite ja VAIN status 400/404, ja vain kun näkymä muuten valmistui; muut 400/404 kaatavat.
   v = liitaPyynnot()-rivi: status pyynnöstä, muuten konsolitekstistä ("status of 400"). */
export const LISTEN_KANAVA_RE = /^https:\/\/firestore\.googleapis\.com\/(?:[^?#]*\/)?Listen\/channel$/;
export function onListenKohina(v) {
  if (!v || !LISTEN_KANAVA_RE.test(ilmanQuerya((v.pyynto && v.pyynto.url) || v.url || ''))) return false;
  const s = v.pyynto ? Number(v.pyynto.status) : Number((String(v.teksti || '').match(/status of (\d{3})\b/) || [])[1]);
  return s === 400 || s === 404;
}
/* → { virheet (kaatavat), kohina (sallitut Listen-uusinnat, näkyvät ⚠:na) }. valmistui = false → kaikki pysyvät virheinä. */
export function erotaListenKohina(virheet, valmistui) {
  const kaikki = virheet || [];
  if (!valmistui) return { virheet: kaikki, kohina: [] };
  return { virheet: kaikki.filter((v) => !onListenKohina(v)), kohina: kaikki.filter(onListenKohina) };
}
/* App Checkin reCAPTCHA-iframe ja report-only-CSP (PM 6.11.): Chrome kirjaa "Framing 'https://www.google.com/' violates the
   following report-only Content Security Policy directive …". Report-only ei estä mitään → sallitaan ⚠:na, kun viestissä on
   MOLEMMAT: "report-only Content Security Policy" JA "Framing 'https://www.google.com/'". Muut CSP-viestit (myös estävät
   google-kehykset ja muiden osoitteiden report-only-rikkeet) kaatavat edelleen. */
export const CSP_RAPORTTI_RE = /report-only Content Security Policy/;
export const CSP_GOOGLE_KEHYS_RE = /Framing ['‘’"]https:\/\/www\.google\.com\/['‘’"]/;
export function onCspGoogleKehysKohina(v) {
  const t = String((v && v.teksti) || '');
  return CSP_RAPORTTI_RE.test(t) && CSP_GOOGLE_KEHYS_RE.test(t);
}
/* → { virheet (kaatavat), kohina (sallitut report-only-ilmoitukset, näkyvät ⚠:na) } */
export function erotaCspKohina(virheet) {
  const kaikki = virheet || [];
  return { virheet: kaikki.filter((v) => !onCspGoogleKehysKohina(v)), kohina: kaikki.filter(onCspGoogleKehysKohina) };
}

/* Virheen näyttöteksti: pyyntö (status metodi URL) jos tiedossa, muuten konsolin teksti. Samat rivit kootaan (×n). */
export function virheRivit(virheet) {
  const m = new Map();
  for (const v of virheet || []) { const r = v.pyynto ? pyyntoRivi(v.pyynto) : String(v.teksti || ''); m.set(r, (m.get(r) || 0) + 1); }
  return [...m].map(([r, n]) => (n > 1 ? r + ' ×' + n : r));
}

/* nakyma.ohitettu = syy (näkymää ei ajettu, esim. lippu pois) → kaikki tarkistukset '–', ei kaada yksinään.
   nakyma = { nimi, kieli, sivu, virheet:[], listenKohina?:[], cspKohina?:[], lohkot:{ ok, puuttuu:[] }, sv?:{uudet,tunnetut}, lippu?:{ ok, syy }, kirjoitukset:{ tuntemattomat:[], tunnetut:[], verkko:[] }, vartija:bool, kaatui? }
   → { virheet, lohkot, kieli, lippu, kirjoitukset }: kukin { tila: 'ok'|'varoitus'|'virhe'|'-', tieto } */
/* Sallitut kohinat ⚠-tietona (ei kaada): Listen-uusinta ja App Checkin report-only-CSP. */
function sallitutKohinat(n) {
  const ulos = [];
  if ((n.listenKohina || []).length) ulos.push('Listen-kanavan uusinta sallittu: ' + virheRivit(n.listenKohina).slice(0, 3).join(' | '));
  if ((n.cspKohina || []).length) ulos.push('report-only CSP (App Checkin reCAPTCHA-kehys www.google.com) sallittu ×' + n.cspKohina.length);
  return ulos;
}
export function arvioi(n) {
  const t = (tila, tieto) => ({ tila, tieto: tieto || '' });
  if (n.ohitettu) { const o = t('-', n.ohitettu); return { virheet: o, lohkot: o, kieli: o, lippu: o, kirjoitukset: o }; }   // syy näkyy omana löydöksenään (↷); ajon kaataa syy-tarkistus (esim. VP Kodin lippu ✗)
  if (n.kaatui) { const k = t('virhe', n.kaatui); return { virheet: k, lohkot: k, kieli: n.kieli === 'sv' ? k : t('-'), lippu: n.lippu ? k : t('-'), kirjoitukset: k }; }
  const kirj = n.kirjoitukset || { tuntemattomat: [], tunnetut: [], verkko: [] };
  return {
    virheet: (n.virheet || []).length ? t('virhe', virheRivit(n.virheet).slice(0, 5).join(' | ')) : sallitutKohinat(n).length ? t('varoitus', sallitutKohinat(n).join(' · ')) : t('ok'),
    lohkot: n.lohkot && n.lohkot.ok ? t('ok') : t('virhe', 'puuttuu: ' + ((n.lohkot && n.lohkot.puuttuu) || []).join(', ')),
    kieli: n.kieli !== 'sv' ? t('-') : n.sv && n.sv.uudet.length ? t('virhe', n.sv.uudet.slice(0, 8).join(' | ')) : n.sv && n.sv.tunnetut.length ? t('varoitus', n.sv.tunnetut.length + ' tunnettua (sv-baseline)') : t('ok'),
    lippu: !n.lippu ? t('-') : n.lippu.ok ? t('ok') : t('virhe', n.lippu.syy),
    kirjoitukset: !n.vartija ? t('virhe', 'kirjoitusvartija ei asentunut') : (kirj.tuntemattomat.length || kirj.verkko.length) ? t('virhe', kirj.tuntemattomat.concat(kirj.verkko).slice(0, 5).join(' | ')) : kirj.tunnetut.length ? t('varoitus', kirj.tunnetut.length + ' tunnettua avauskirjoitusta estetty') : t('ok'),
  };
}
export const TARKISTUKSET = [['virheet', 'Ei virheitä'], ['lohkot', 'Lohkot'], ['kieli', 'sv: ei suomea'], ['lippu', 'Lippu → Kehitystyöpöytä'], ['kirjoitukset', 'Ei kirjoituksia']];
const MERKKI = { ok: '✓', varoitus: '⚠', virhe: '✗', '-': '–' };
export function onnistui(tulos) { return !!tulos && !tulos.ohitettu && (tulos.nakymat || []).length > 0 && (tulos.nakymat || []).every((n) => Object.values(arvioi(n)).every((x) => x.tila !== 'virhe')); }
const solu = (s) => String(s).replace(/\|/g, '\\|').replace(/\s+/g, ' ').slice(0, 300);

export function yhteenvetoMarkdown(tulos) {
  if (tulos.ohitettu) return '## Savutesti — ohitettu\n\nohitettu: ' + tulos.ohitettu + '\n';
  const r = ['## Savutesti ' + (onnistui(tulos) ? '✓' : '✗') + ' — ' + (tulos.url || ''), '', (tulos.kesto_s != null ? 'Kesto ' + tulos.kesto_s + ' s · ' : '') + 'seura `' + SEURA + '` (synteettinen)', '',
    '| Näkymä | Kieli | ' + TARKISTUKSET.map((x) => x[1]).join(' | ') + ' |', '|---|---|' + TARKISTUKSET.map(() => '---').join('|') + '|'];
  const tiedot = [];
  for (const n of tulos.nakymat || []) {
    const a = arvioi(n);
    r.push('| ' + n.nimi + ' | ' + n.kieli + ' | ' + TARKISTUKSET.map(([k]) => MERKKI[a[k].tila]).join(' | ') + ' |');
    if (n.ohitettu) { tiedot.push('- ↷ **' + n.nimi + ' (' + n.kieli + ')** · ohitettu: ' + solu(n.ohitettu)); continue; }
    for (const [k, nimi] of TARKISTUKSET) if (a[k].tila === 'virhe' || a[k].tila === 'varoitus') tiedot.push('- ' + MERKKI[a[k].tila] + ' **' + n.nimi + ' (' + n.kieli + ')** · ' + nimi + ': ' + solu(a[k].tieto));
  }
  if (tiedot.length) r.push('', '### Löydökset', '', ...tiedot);
  return r.join('\n') + '\n';
}
export function issueRunko(tulos, ajoUrl) { return 'Savutesti epäonnistui: ' + (ajoUrl || '') + '\n\n' + yhteenvetoMarkdown(tulos); }
