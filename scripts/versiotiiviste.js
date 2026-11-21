#!/usr/bin/env node
'use strict';
/**
 * versiotiiviste.js — QG-2: välimuistiversiot lasketaan deployssa sisällöstä. Repossa ei ole käsin nostettavia numeroita.
 *
 * Repossa: <script src="lib/x.js"> ilman ?v:tä ja SW:ssä const CACHE = 'tm-<appi>-dev'.
 * Deployssa (deploy-pages.yml + deploy-hosting.yml, ennen julkaisua):
 *   - jokainen juuren HTML-sivun paikallinen skriptilataus saa ?v=<sha256(sisältö) 8 merkkiä>
 *     (<script src>, Masterin dynaaminen `s.src = 'tm-demo.js'` ja paikallinen <link rel="stylesheet" href>)
 *   - jokaisen SW:n cachenimi = tm-<appi>-<tiiviste>, joka lasketaan SW:n omasta koodista, sen kuorisivusta (jo tiivisteineen,
 *     eli kaikista sivun lataamista tiedostoista) ja manifestista. Mikä tahansa muutos → uusi cachenimi → activate siivoaa vanhan.
 *
 *   node scripts/versiotiiviste.js --kirjoita   → kirjoittaa tiivisteet tiedostoihin ja tarkistaa tuloksen; exit 1 jos jokin epäonnistuu
 *   node scripts/versiotiiviste.js --tulosta    → tulostaa odotetut tiivisteet (JSON) kirjoittamatta mitään (tuotannon vertailuun)
 *   node scripts/versiotiiviste.js --tarkista   → repon vartija: ei käsin kirjoitettuja ?v:itä eikä käsin nostettuja cachenimiä
 *
 * Tiiviste = sha256 tiedoston sisällöstä (CRLF → LF), 8 ensimmäistä heksamerkkiä. Sama sisältö → sama tiiviste joka ympäristössä
 * (Pages ja Hosting laskevat saman, tests/versiotiiviste.test.js).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const JUURI = path.join(__dirname, '..');

/* SW → oma kuorisivu + muut cache-first-tiedostot, joiden muutoksen on vaihdettava cachenimi. Uusi sw_*.js juureen → lisää tähän (vartija kaatuu muuten). */
const SW = {
  'sw_pelaaja.js': { nimi: 'tm-pelaaja', kuori: 'TalentMaster_Pelaaja_v7.html', muut: ['manifest_pelaaja.json'] },
  'sw_vanhempi.js': { nimi: 'tm-vanhempi', kuori: 'TalentMaster_Vanhempi_v2.html', muut: ['manifest_vanhempi.json'] },
  'sw_adar.js': { nimi: 'tm-adar', kuori: 'TalentMaster_ADAR_Pikakortti.html', muut: [] },
};

/* L6 (docs/KYLMA_AVAUS_DIAGNOOSI.md §9.4 vaihe 1): sivun viimeinen iso inline-pääskripti (Master: ~720 kt raakana / 239 kt gz) irrotetaan DEPLOYSSA omaan tiedostoonsa
   (`<script src="…?v=<tiiviste>" defer>`): HTML kutistuu (~12 kt), pääskripti on välimuistissa ja V8 code cache -kelpoinen → lämmin avaus nopeutuu ~1,2 s (puhelin). REPOSSA lähde pysyy
   inline-skriptinä (227 testiä skannaa HTML-lähdettä; lint ja diffit ennallaan) — sama periaate kuin ?v: repo ei sisällä deploy-artefaktia. DOM-ekvivalentti: skripti on dokumentin viimeinen
   (ei DOM:ia sen jälkeen), ja `defer` ajaa sen heti jäsennyksen jälkeen, ennen DOMContentLoadedia, kaikkien synkronisten skriptien jälkeen (kuten ennen). Uusi sivu → lisää taulukkoon. */
const PAASKRIPTI = { 'TalentMaster_Master_v16.html': 'tm_master_main.js' };
const PAASKRIPTI_MIN = 50000;   // merkkiä; pienempää ei irroteta (vartija: ei vahingossa pientä lopputagia)

/** → { html (src+defer ilman ?v:tä), js } | null. Vain dokumentin viimeinen paljas `<script>…</script>` ennen `</body>`ia, kun se on ≥ PAASKRIPTI_MIN merkkiä. */
function irrotaPaaskripti(html, tiedosto) {
  const runko = html.lastIndexOf('</body>'); if (runko < 0) return null;
  const loppu = html.lastIndexOf('</script>', runko); if (loppu < 0 || html.slice(loppu + 9, runko).trim() !== '') return null;
  const alku = html.lastIndexOf('<script>', loppu); if (alku < 0) return null;
  const js = html.slice(alku + 8, loppu);
  if (js.length < PAASKRIPTI_MIN || js.indexOf('</script') >= 0) return null;
  return { html: html.slice(0, alku) + '<script src="' + tiedosto + '" defer></script>' + html.slice(loppu + 9), js: js.replace(/^\r?\n/, '') };
}

/* L6 vaihe 2 (KYLMA_AVAUS_DIAGNOOSI §9.4, §12): kaikki synkroniset skriptilataukset `defer`iksi, jotta HTML jäsentyy ja kirjautumiskuori (spinneri) piirtyy ENNEN kuin kirjastot on haettu. DEPLOY-muunnos (repo ennallaan, kuten vaihe 1).
   Sisältö: (1) lib-riippumattomat head-lohkot (taktiikkataulun host-adapteri, __TM_SEURA, _lataaDemoScript) → yksi `tm_master_alku.js` (defer) ensimmäisen lohkon paikalle — suoritus ennen kaikkia muita deferattuja, joten
   "ennen tm_kaavio_ui / ennen tm-bus" säilyy; (2) kirjautumisnapit (login, kirjauduGooglella, loginDemo, _unohditSalasana) saavat no-op-tynkän + `tm-main-odottaa`-luokan (napit pois käytöstä) kunnes pääskripti alkaa ajaa;
   pääskripti poistaa luokan heti 'use strict' -rivin jälkeen (funktiodeklaraatiot on silloin jo nostettu; ei tapahtumia ennen skriptin loppua) → tynkä korvautuu oikeilla funktioilla. Pienet inline-lohkot jotka ovat ENNEN ensimmäistä maalausta pakollisia (luokat
   tm-auth-odottaa / tm-upotettu, versiotarkistus, TM_SENTRY-asetus) jäävät inline. Uusi sivu → lisää taulukkoon. */
const LYKKAYS = {
  'TalentMaster_Master_v16.html': {
    alku: 'tm_master_alku.js', luokka: 'tm-main-odottaa', tynkat: ['login', 'kirjauduGooglella', 'loginDemo', '_unohditSalasana'],
    lohkot: ['window.TM_KAAVIO_HOST = {', "window.__TM_SEURA = localStorage.getItem('tm-sa-seura')", 'function _lataaDemoScript(',],
    /* Vaihe 3 (§13.3): boot-tiedosto ENSIN. null = pois (rollback → vaiheen 2 muoto). ketju = resurssit, jotka saavat fetchpriority=high + preload (auth-käynnistyksen kriittinen polku). */
    boot: { tiedosto: 'tm_master_boot.js', ketju: ['firebase-app-compat.js', 'firebase-app-check-compat.js', 'firebase-auth-compat.js', 'lib/tm_appcheck.js', 'tm_master_boot.js'] },
  },
};
const BOOT_ALKU = 'const _FB = {', BOOT_LOPPU = 'const _auth = firebase.auth();', BOOT_MERKKI = '/* tm_master_boot.js (deploy): _FB, firebase.initializeApp, tmAppCheckAktivoi, _auth */';
const RE_SDK_AUTH = /<script src="https:\/\/www\.gstatic\.com\/firebasejs\/[^"]+\/firebase-auth-compat\.js"><\/script>/g;
const TAGI_APPCHECK = '<script src="lib/tm_appcheck.js"></script>';
const ODOTA_ALKU = "document.documentElement.classList.add('tm-auth-odottaa');";
const RE_PAIKALLINEN_INLINE = /<script>([\s\S]*?)<\/script>/g;

/** Lisää `defer` jokaiseen skriptilatauksen tagiin, jolla ei ole defer/async/type-attribuuttia (type=text/plain-laiskatagit ja moduulit ennallaan). Idempotentti. */
function lisaaDefer(html) {
  return html.replace(/<script\b([^>]*\bsrc\s*=[^>]*)>/gi, (all, attr) => (/\b(defer|async|type)\b/i.test(attr) ? all : '<script' + attr + ' defer>'));
}

/** Master (LYKKAYS): → { html, alku: js|null, virhe: string|null }. html sisältää paikanpitäjän `<!--@@ALKU@@-->` kun alku-tiedosto irrotettiin tällä ajolla. Idempotentti (jo muunnettu sivu ei muutu). */
function lykkaaSivu(html, maar) {
  let alku = null;
  if (html.indexOf('src="' + maar.alku) < 0) {
    const osumat = [...html.matchAll(RE_PAIKALLINEN_INLINE)].filter((m) => maar.lohkot.some((x) => m[1].indexOf(x) >= 0));
    if (osumat.length !== maar.lohkot.length) return { html, alku: null, virhe: 'lykkäys: odotettiin ' + maar.lohkot.length + ' siirrettävää head-lohkoa, löytyi ' + osumat.length };
    for (const x of maar.lohkot) if (osumat.filter((m) => m[1].indexOf(x) >= 0).length !== 1) return { html, alku: null, virhe: 'lykkäys: lohkoa ei löydy täsmälleen kerran: ' + x };
    if (osumat.some((m) => m[1].indexOf('</script') >= 0)) return { html, alku: null, virhe: 'lykkäys: lohko sisältää </script' };
    alku = osumat.map((m) => m[1].trim()).join('\n\n') + '\n';
    let ulos = '', kohta = 0;
    osumat.forEach((m, i) => { ulos += html.slice(kohta, m.index) + (i === 0 ? '<!--@@ALKU@@-->' : ''); kohta = m.index + m[0].length; });
    html = ulos + html.slice(kohta);
  }
  if (html.indexOf(maar.luokka) < 0) {
    const vanha = '<script>' + ODOTA_ALKU + '</script>';
    if (html.split(vanha).length !== 2) return { html, alku, virhe: 'lykkäys: tm-auth-odottaa-lohkoa ei löydy täsmälleen kerran' };
    const tynkat = maar.tynkat.map((n) => 'window.' + n).join('=') + '=function(){};';
    html = html.replace(vanha, '<script>' + ODOTA_ALKU.replace("'tm-auth-odottaa'", "'tm-auth-odottaa','" + maar.luokka + "'") + tynkat + '</script>\n'
      + '<style>html.' + maar.luokka + ' #sLogin button,html.' + maar.luokka + ' #sLogin [onclick]{pointer-events:none;opacity:.55}</style>');
  }
  return { html: lisaaDefer(html), alku, virhe: null };
}

/** Vaihe 3: erottaa pääskriptin alusta boot-lohkon (`const _FB` … `const _auth = firebase.auth();`: config, initializeApp, tmAppCheckAktivoi, _auth). `const _db = firebase.firestore()` JÄÄ pääskriptiin (Firestore-SDK ei kuulu auth-kriittiselle polulle).
 *  → { main, boot, virhe }. Lohkon rajat täsmälleen kerran ja järjestyksessä initializeApp < tmAppCheckAktivoi < firebase.auth() — muuten deploy kaatuu (ei hiljaista ohitusta). */
function erotaBoot(js) {
  const cnt = (x) => js.split(x).length - 1, a = js.indexOf(BOOT_ALKU), b = js.indexOf(BOOT_LOPPU);
  if (cnt(BOOT_ALKU) !== 1 || cnt(BOOT_LOPPU) !== 1 || b < a) return { main: js, boot: null, virhe: 'boot: lohkon rajoja (' + BOOT_ALKU + ' … ' + BOOT_LOPPU + ') ei löydy täsmälleen kerran oikeassa järjestyksessä' };
  const loppu = b + BOOT_LOPPU.length, lohko = js.slice(a, loppu);
  const i1 = lohko.indexOf('firebase.initializeApp('), i2 = lohko.indexOf('tmAppCheckAktivoi()'), i3 = lohko.indexOf('firebase.auth()');
  if (!(i1 >= 0 && i2 > i1 && i3 > i2)) return { main: js, boot: null, virhe: 'boot: lohkossa pitää olla initializeApp → tmAppCheckAktivoi() → firebase.auth() tässä järjestyksessä' };
  if (/firebase\.(firestore|functions|storage)\b|\b_db\b|\b_user\b/.test(lohko)) return { main: js, boot: null, virhe: 'boot: lohko ei saa riippua Firestoresta/Functionsista/Storagesta eikä sovelluksen tilasta' };
  return { main: js.slice(0, a) + BOOT_MERKKI + js.slice(loppu), boot: "'use strict';\n" + lohko + '\n', virhe: null };
}

/** Vaihe 3: siirtää `lib/tm_appcheck.js`-tagin heti firebase-auth-compat-tagin perään ja jättää sen perään paikanpitäjän `<!--@@BOOT@@-->` (boot-tiedoston paikka). Jälkeen: app → app-check → auth → tm_appcheck → boot; Firestore/Functions/Storage-SDK:t tulevat vasta sen jälkeen.
 *  tm_appcheck.js on riippumaton muista libeistä (vain firebase kutsuhetkellä) → siirto ei muuta muiden skriptien suoritusjärjestystä. → { html, virhe } */
function siirraBoot(html) {
  const auth = html.match(RE_SDK_AUTH);
  if (!auth || auth.length !== 1) return { html, virhe: 'boot: firebase-auth-compat-tagia ei löydy täsmälleen kerran' };
  if (html.split(TAGI_APPCHECK).length !== 2) return { html, virhe: 'boot: ' + TAGI_APPCHECK + ' ei löydy täsmälleen kerran' };
  if (html.indexOf(TAGI_APPCHECK) < html.indexOf(auth[0])) return { html, virhe: 'boot: tm_appcheck.js on jo ennen firebase-auth-compat-tagia' };
  html = html.replace(TAGI_APPCHECK, '').replace(auth[0], () => auth[0] + '\n' + TAGI_APPCHECK + '\n<!--@@BOOT@@-->');
  return { html, virhe: null };
}

/** Vaihe 3: auth-käynnistyksen kriittinen ketju (SDK:t app/app-check/auth + tm_appcheck + boot) → `fetchpriority="high"` + `<link rel="preload" as="script">` heti <head>:n alkuun. Muut deferit jäävät selaimen oletukseen (low).
 *  Preloadin href = tagin src täsmälleen (sama ?v), eikä crossorigin-attribuuttia (tagit eivät sitä käytä) → selain käyttää preloadin uudelleen eikä hae kahdesti. Idempotentti. */
function esilataus(html, ketju) {
  if (html.indexOf('rel="preload" as="script"') >= 0) return html;
  const linkit = [];
  for (const osa of ketju) {
    const re = new RegExp('<script\\b([^>]*\\bsrc="([^"]*' + osa.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[^"]*)"[^>]*)>');
    html = html.replace(re, (all, attr, href) => { if (!/\bfetchpriority=/.test(attr)) linkit.push('<link rel="preload" as="script" href="' + href + '" fetchpriority="high">'); return /\bfetchpriority=/.test(attr) ? all : '<script' + attr + ' fetchpriority="high">'; });
  }
  if (!linkit.length) return html;
  const paikka = /<meta\s+charset=[^>]*>/i.test(html) ? /<meta\s+charset=[^>]*>/i : /<head[^>]*>/i;   // charset-meta pysyy ensimmäisenä (kuuluu ensimmäiseen 1024 tavuun)
  return html.replace(paikka, (h) => h + '\n' + linkit.join('\n'));
}

const RE_SCRIPT = /(<script\b[^>]*\bsrc\s*=\s*)(["'])([^"']+)\2/gi;
const RE_DYN = /(\.src\s*=\s*)(["'])([^"'+\s]+\.js(?:\?[^"']*)?)\2/g;
const RE_REKISTEROI = /serviceWorker\.register\(\s*["']([^"']+)["']/g;
const RE_CACHE = /^const CACHE = '([^']*)';/m;
/* Paikallinen tyylitiedosto (rivikattojen purku S1: seura/seura.css): <link rel="stylesheet" href="…">. Muut <link>-tagit (manifest, ikonit, fontit) eivät kuulu tähän. */
const RE_LINK = /<link\b[^>]*>/gi;
const RE_HREF = /(\bhref\s*=\s*)(["'])([^"']+)\2/i;
const onTyylilinkki = (tagi) => /\brel\s*=\s*(["'])stylesheet\1/i.test(tagi);

function tiiviste(sisalto) { return crypto.createHash('sha256').update(String(sisalto).replace(/\r\n/g, '\n')).digest('hex').slice(0, 8); }
function paikallinen(src) { return !/^([a-z][a-z0-9+.-]*:|\/\/)/i.test(src); }
function sivut(juuri) { return fs.readdirSync(juuri).filter((f) => /\.html$/i.test(f)).sort(); }
function swTiedostot(juuri) { return fs.readdirSync(juuri).filter((f) => /^sw_.*\.js$/.test(f)).sort(); }

/** 'lib/x.js?a=1&v=3#h' → { polku: 'lib/x.js', muut: ['a=1'], v: '3', hash: '#h' } */
function jasenna(src) {
  const m = /^([^?#]+)(?:\?([^#]*))?(#.*)?$/.exec(src) || [src, src];
  const osat = (m[2] || '').split('&').filter(Boolean);
  const v = osat.find((x) => /^v=/.test(x));
  return { polku: m[1].replace(/^\.\//, ''), muut: osat.filter((x) => !/^v=/.test(x)), v: v ? v.slice(2) : null, hash: m[3] || '' };
}
function kokoa(j, v) { const q = j.muut.slice(); if (v) q.push('v=' + v); return j.polku + (q.length ? '?' + q.join('&') : '') + j.hash; }

/** Kaikki sivun paikalliset skriptilataukset: [{ src, polku, v, tapa }]. */
function lataukset(html) {
  const ulos = [];
  for (const m of html.matchAll(RE_SCRIPT)) if (paikallinen(m[3])) ulos.push(Object.assign({ src: m[3], tapa: 'script' }, jasenna(m[3])));
  for (const m of html.matchAll(RE_DYN)) if (paikallinen(m[3])) ulos.push(Object.assign({ src: m[3], tapa: 'dynaaminen' }, jasenna(m[3])));
  for (const m of html.matchAll(RE_LINK)) {
    if (!onTyylilinkki(m[0])) continue;
    const h = RE_HREF.exec(m[0]); if (h && paikallinen(h[3])) ulos.push(Object.assign({ src: h[3], tapa: 'css' }, jasenna(h[3])));
  }
  return ulos;
}

/** Laskee julkaistavat sisällöt muistissa: { tiedostot: {nimi: uusiSisalto}, raportti, virheet[] }. Ei kirjoita mitään. */
function laske(juuri) {
  juuri = juuri || JUURI;
  const virheet = [], tiedostot = {}, raportti = { sivut: {}, sw: {} }, muisti = new Map();
  const tiedostonTiiviste = (polku, sivu) => {
    const p = path.join(juuri, polku);
    if (!muisti.has(p)) muisti.set(p, fs.existsSync(p) && fs.statSync(p).isFile() ? tiiviste(fs.readFileSync(p, 'utf8')) : null);
    const t = muisti.get(p); if (t === null) virheet.push(sivu + ': ladattava tiedosto puuttuu: ' + polku); return t;
  };
  for (const sivu of sivut(juuri)) {
    let html = fs.readFileSync(path.join(juuri, sivu), 'utf8'); const rivi = {};
    let irrotettu = null, alkuIrrotettu = null, bootIrrotettu = null; const lykkays = LYKKAYS[sivu];
    if (PAASKRIPTI[sivu]) {
      const x = irrotaPaaskripti(html, PAASKRIPTI[sivu]);
      if (x) {
        let js = x.js;
        if (lykkays) {   // pääskripti vapauttaa kirjautumisnapit heti alussa ('use strict' -direktiivin jälkeen: direktiivi pysyy ensimmäisenä)
          if (!/^'use strict';/.test(js)) { virheet.push(sivu + ": pääskripti ei ala 'use strict';-direktiivillä — vapautus ei voi mennä sen jälkeen"); } else js = js.replace(/^'use strict';/, "'use strict';\ndocument.documentElement.classList.remove('" + lykkays.luokka + "');");
        }
        if (lykkays && lykkays.boot) {   // vaihe 3: boot-lohko omaan tiedostoonsa + sen paikka (tm_appcheck siirtyy auth-SDK:n perään)
          const e = erotaBoot(js), h = siirraBoot(x.html);
          if (e.virhe) virheet.push(sivu + ': ' + e.virhe); else if (h.virhe) virheet.push(sivu + ': ' + h.virhe); else { js = e.main; x.html = h.html; bootIrrotettu = { nimi: lykkays.boot.tiedosto, js: e.boot, t: tiiviste(e.boot) }; }
        }
        irrotettu = { nimi: PAASKRIPTI[sivu], js: js, t: tiiviste(js) }; html = x.html.replace('<script src="' + irrotettu.nimi + '" defer></script>', '<!--@@PAASKRIPTI@@-->');   // paikanpitäjä: korvaa-passi ei saa nähdä vielä-levyllä-puutt
      }
    }
    if (lykkays) {
      const y = lykkaaSivu(html, lykkays);
      if (y.virhe) virheet.push(sivu + ': ' + y.virhe); else { html = y.html; if (y.alku) alkuIrrotettu = { nimi: lykkays.alku, js: y.alku, t: tiiviste(y.alku) }; }
    }
    const korvaa = (all, alku, q, src) => {
      if (!paikallinen(src)) return all;
      const j = jasenna(src), t = tiedostonTiiviste(j.polku, sivu); if (!t) return all;
      rivi[j.polku] = t; return alku + q + kokoa(j, t) + q;
    };
    const uusi = html.replace(RE_SCRIPT, korvaa).replace(RE_DYN, korvaa)
      .replace(RE_LINK, (tagi) => (onTyylilinkki(tagi) ? tagi.replace(RE_HREF, korvaa) : tagi));
    if (alkuIrrotettu) { alkuIrrotettu.js = alkuIrrotettu.js.replace(RE_DYN, korvaa); alkuIrrotettu.t = tiiviste(alkuIrrotettu.js); }   // dynaaminen lataus (tm-demo.js) siirtyi HTML:stä alku-tiedostoon → sama ?v-korvaus siellä, ennen tiivisteen laskua
    let valmis = uusi;
    if (alkuIrrotettu) { valmis = valmis.replace('<!--@@ALKU@@-->', '<script src="' + alkuIrrotettu.nimi + '?v=' + alkuIrrotettu.t + '" defer></script>'); tiedostot[alkuIrrotettu.nimi] = alkuIrrotettu.js; rivi[alkuIrrotettu.nimi] = alkuIrrotettu.t; }
    if (bootIrrotettu) { valmis = valmis.replace('<!--@@BOOT@@-->', '<script src="' + bootIrrotettu.nimi + '?v=' + bootIrrotettu.t + '" defer></script>'); tiedostot[bootIrrotettu.nimi] = bootIrrotettu.js; rivi[bootIrrotettu.nimi] = bootIrrotettu.t; }
    if (irrotettu) {   // ?v = irrotetun tiedoston tiiviste (tiedosto kirjoitetaan tämän ajon tuloksena, ei vielä levyllä)
      valmis = valmis.replace('<!--@@PAASKRIPTI@@-->', '<script src="' + irrotettu.nimi + '?v=' + irrotettu.t + '" defer></script>');
      tiedostot[irrotettu.nimi] = irrotettu.js; rivi[irrotettu.nimi] = irrotettu.t;
    }
    if (bootIrrotettu) valmis = esilataus(valmis, lykkays.boot.ketju);
    raportti.sivut[sivu] = rivi;
    if (irrotettu || alkuIrrotettu || valmis !== fs.readFileSync(path.join(juuri, sivu), 'utf8')) tiedostot[sivu] = valmis;
  }
  for (const sw of swTiedostot(juuri)) {
    const maar = SW[sw];
    if (!maar) { virheet.push(sw + ': tuntematon SW — lisää se scripts/versiotiiviste.js:n SW-tauluun (kuori + manifest)'); continue; }
    const lahde = fs.readFileSync(path.join(juuri, sw), 'utf8');
    if (!RE_CACHE.test(lahde)) { virheet.push(sw + ": rivi const CACHE = '…'; puuttuu"); continue; }
    if (lahde.indexOf(maar.kuori) < 0) virheet.push(sw + ': ei mainitse kuortaan ' + maar.kuori + ' — SW-taulu ei vastaa SW:tä');
    const perus = lahde.replace(RE_CACHE, "const CACHE = '" + maar.nimi + "-dev';");   // idempotentti: tiiviste ei riipu aiemmasta ajosta
    const kuoriP = path.join(juuri, maar.kuori);
    if (!fs.existsSync(kuoriP)) { virheet.push(sw + ': kuori puuttuu: ' + maar.kuori); continue; }
    const osat = [perus, tiedostot[maar.kuori] || fs.readFileSync(kuoriP, 'utf8')];
    for (const m of maar.muut) { const p = path.join(juuri, m); if (!fs.existsSync(p)) { virheet.push(sw + ': puuttuu ' + m); continue; } osat.push(fs.readFileSync(p, 'utf8')); }
    const nimi = maar.nimi + '-' + tiiviste(osat.join('\n\0\n'));
    raportti.sw[sw] = nimi;
    tiedostot[sw] = perus.replace(RE_CACHE, "const CACHE = '" + nimi + "';");
  }
  return { tiedostot, raportti, virheet };
}

/** Tarkistaa julkaistavan puun: jokainen paikallinen lataus = ?v=<oikea tiiviste>, SW-cachenimet = laskettu, eikä uusi ajo muuttaisi mitään. */
function tarkistaJulkaisu(juuri) {
  juuri = juuri || JUURI; const ongelmat = [];
  for (const sivu of sivut(juuri)) {
    for (const l of lataukset(fs.readFileSync(path.join(juuri, sivu), 'utf8'))) {
      const p = path.join(juuri, l.polku);
      if (!fs.existsSync(p)) { ongelmat.push(sivu + ': puuttuu ' + l.polku); continue; }
      const odotus = tiiviste(fs.readFileSync(p, 'utf8'));
      if (l.v !== odotus) ongelmat.push(sivu + ': ' + l.polku + ' ?v=' + l.v + ', odotettu ' + odotus);
    }
  }
  for (const [sivu, maar] of Object.entries(LYKKAYS)) {   // alku-tiedoston dynaamiset lataukset (tm-demo.js) = nykyinen tiiviste
    const p = path.join(juuri, maar.alku); if (!fs.existsSync(p)) continue;
    for (const m of fs.readFileSync(p, 'utf8').matchAll(RE_DYN)) if (paikallinen(m[3])) { const j = jasenna(m[3]), q = path.join(juuri, j.polku); if (!fs.existsSync(q)) ongelmat.push(maar.alku + ': puuttuu ' + j.polku); else if (j.v !== tiiviste(fs.readFileSync(q, 'utf8'))) ongelmat.push(maar.alku + ': ' + j.polku + ' ?v=' + j.v + ' ≠ nykyinen tiiviste'); }
  }
  const uusi = laske(juuri);
  uusi.virheet.forEach((v) => ongelmat.push(v));
  for (const sw of swTiedostot(juuri)) {
    const m = RE_CACHE.exec(fs.readFileSync(path.join(juuri, sw), 'utf8'));
    if (!m || m[1] !== uusi.raportti.sw[sw]) ongelmat.push(sw + ': CACHE ' + (m && m[1]) + ', odotettu ' + uusi.raportti.sw[sw]);
  }
  for (const [nimi, sisalto] of Object.entries(uusi.tiedostot)) if (fs.readFileSync(path.join(juuri, nimi), 'utf8') !== sisalto) ongelmat.push(nimi + ': uusi ajo muuttaisi tiedostoa (ei idempotentti)');
  return ongelmat;
}

/** Repon vartija: ei käsin kirjoitettuja ?v:itä eikä käsin nostettuja cachenimiä. */
function tarkistaRepo(juuri) {
  juuri = juuri || JUURI; const ongelmat = [];
  for (const sivu of sivut(juuri)) {
    const html = fs.readFileSync(path.join(juuri, sivu), 'utf8');
    for (const l of lataukset(html)) if (l.v !== null) ongelmat.push(sivu + ': ' + l.src + ' — poista ?v (deploy lisää tiivisteen)');
    for (const m of html.matchAll(RE_REKISTEROI)) if (/[?&]v=/.test(m[1])) ongelmat.push(sivu + ': SW-rekisteröinnissä ?v (' + m[1] + ') — poista');
  }
  for (const sw of swTiedostot(juuri)) {
    const maar = SW[sw], m = RE_CACHE.exec(fs.readFileSync(path.join(juuri, sw), 'utf8'));
    if (!maar) { ongelmat.push(sw + ': tuntematon SW — lisää SW-tauluun'); continue; }
    if (!m || m[1] !== maar.nimi + '-dev') ongelmat.push(sw + ": CACHE pitää olla repossa '" + maar.nimi + "-dev' (deploy laskee nimen), nyt " + (m && m[1]));
  }
  return ongelmat;
}

function kirjoita(juuri) {
  juuri = juuri || JUURI;
  const tulos = laske(juuri);
  if (tulos.virheet.length) return { ok: false, ongelmat: tulos.virheet };
  for (const [nimi, sisalto] of Object.entries(tulos.tiedostot)) fs.writeFileSync(path.join(juuri, nimi), sisalto);
  const ongelmat = tarkistaJulkaisu(juuri);
  return { ok: ongelmat.length === 0, ongelmat, raportti: tulos.raportti };
}

function main(args) {
  if (args.includes('--kirjoita')) {
    const r = kirjoita();
    if (!r.ok) { r.ongelmat.forEach((o) => console.error('VIRHE  ' + o)); console.error('versiotiiviste: epäonnistui — älä julkaise.'); return 1; }
    const n = Object.values(r.raportti.sivut).reduce((a, s) => a + Object.keys(s).length, 0);
    console.log('versiotiiviste: ' + n + ' latausta ' + Object.keys(r.raportti.sivut).length + ' sivulla; SW: ' + Object.values(r.raportti.sw).join(', '));
    return 0;
  }
  if (args.includes('--tulosta')) {
    const t = laske(); if (t.virheet.length) { t.virheet.forEach((o) => console.error('VIRHE  ' + o)); return 1; }
    console.log(JSON.stringify(t.raportti, null, 1)); return 0;
  }
  const o = tarkistaRepo();
  if (o.length) { o.forEach((x) => console.error('PUNAINEN  ' + x)); return 1; }
  console.log('versiotiiviste: repo ok (ei käsin kirjoitettuja versioita)'); return 0;
}

module.exports = { PAASKRIPTI, LYKKAYS, lykkaaSivu, lisaaDefer, irrotaPaaskripti, erotaBoot, siirraBoot, esilataus, SW, tiiviste, jasenna, lataukset, laske, kirjoita, tarkistaJulkaisu, tarkistaRepo };
if (require.main === module) process.exit(main(process.argv.slice(2)));
