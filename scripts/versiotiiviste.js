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
    let irrotettu = null;
    if (PAASKRIPTI[sivu]) { const x = irrotaPaaskripti(html, PAASKRIPTI[sivu]); if (x) { irrotettu = { nimi: PAASKRIPTI[sivu], js: x.js, t: tiiviste(x.js) }; html = x.html.replace('<script src="' + irrotettu.nimi + '" defer></script>', '<!--@@PAASKRIPTI@@-->'); } }   // paikanpitäjä: korvaa-passi ei saa nähdä vielä-levyllä-puuttuvaa tiedostoa
    const korvaa = (all, alku, q, src) => {
      if (!paikallinen(src)) return all;
      const j = jasenna(src), t = tiedostonTiiviste(j.polku, sivu); if (!t) return all;
      rivi[j.polku] = t; return alku + q + kokoa(j, t) + q;
    };
    const uusi = html.replace(RE_SCRIPT, korvaa).replace(RE_DYN, korvaa)
      .replace(RE_LINK, (tagi) => (onTyylilinkki(tagi) ? tagi.replace(RE_HREF, korvaa) : tagi));
    let valmis = uusi;
    if (irrotettu) {   // ?v = irrotetun tiedoston tiiviste (tiedosto kirjoitetaan tämän ajon tuloksena, ei vielä levyllä)
      valmis = uusi.replace('<!--@@PAASKRIPTI@@-->', '<script src="' + irrotettu.nimi + '?v=' + irrotettu.t + '" defer></script>');
      tiedostot[irrotettu.nimi] = irrotettu.js; rivi[irrotettu.nimi] = irrotettu.t;
    }
    raportti.sivut[sivu] = rivi;
    if (irrotettu || valmis !== fs.readFileSync(path.join(juuri, sivu), 'utf8')) tiedostot[sivu] = valmis;
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

module.exports = { PAASKRIPTI, irrotaPaaskripti, SW, tiiviste, jasenna, lataukset, laske, kirjoita, tarkistaJulkaisu, tarkistaRepo };
if (require.main === module) process.exit(main(process.argv.slice(2)));
