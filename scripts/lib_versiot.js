#!/usr/bin/env node
'use strict';
/**
 * lib_versiot.js — ?v-bumppiportti (SW-välimuisti): jokaisen juuren HTML-sivun lataaman PAIKALLISEN skriptin (lib/*.js + juuren skriptit) sisältöhajautus vs ?v-parametri.
 * Ongelma: SW tarjoaa versioidun URL:n cache-first → jos skriptin sisältö muuttuu mutta ?v ei, käyttäjä saa vanhaa koodia (#855).
 *
 *   node scripts/lib_versiot.js            → tulostaa tilan (poikkeamat) ja poistuu 1:llä jos lista ei vastaa
 *   node scripts/lib_versiot.js --kirjoita → kirjoittaa tests/fixtures/lib_versiot.json uudelleen (aja sen JÄLKEEN kun olet bumpannut ?v)
 *
 * Lista: tests/fixtures/lib_versiot.json = [{ sivu, tiedosto, v, hash }] (hash = sha256 sisällöstä, CRLF→LF). Testi: tests/lib_versiot.test.js.
 * Päivitys: sisältö muuttui → bumppaa ?v HTML:ssä → aja `node scripts/lib_versiot.js --kirjoita` → commitoi lista.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const JUURI = path.join(__dirname, '..');
/* KAIKKI juuren HTML-sivut (ei vain Pelaaja/Vanhempi): selaimen HTTP-välimuisti tarjoaa versioidun URL:n samoin → VP:llä KPV:n live-bugi (vanha tm_kt_komponentit.js?v=1 → oletustyylit). */
const SIVUT = fs.readdirSync(JUURI).filter((f) => /\.html$/i.test(f)).sort();
const LISTA = path.join(JUURI, 'tests', 'fixtures', 'lib_versiot.json');
/* APPEND-ONLY historia (#1029-opetus): jokaiselle (sivu|tiedosto) kirjataan KAIKKI käytetyt ?v → sisältöhajautus. Jo kirjattua ?v:tä ei voi kirjoittaa uudelleen eri sisällölle → pelkkä listan uudelleengenerointi ei riitä: ?v on nostettava. */
const HISTORIA = path.join(JUURI, 'tests', 'fixtures', 'lib_versiot_historia.json');

function hajautus(sisalto) { return crypto.createHash('sha256').update(String(sisalto).replace(/\r\n/g, '\n')).digest('hex'); }

/** HTML → paikalliset skriptilataukset [{ tiedosto, v }] (ei http(s)://-, //-, data:-URLeja). v = ?v-arvo tai null. */
function skriptit(html) {
  const ulos = [], re = /<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi; let m;
  while ((m = re.exec(html))) {
    const src = m[1]; if (/^([a-z][a-z0-9+.-]*:|\/\/)/i.test(src)) continue;
    const q = /^([^?#]+)(?:\?([^#]*))?/.exec(src), pv = q[2] ? /(?:^|&)v=([^&]*)/.exec(q[2]) : null;
    ulos.push({ tiedosto: q[1].replace(/^\.\//, ''), v: pv ? pv[1] : null });
  }
  return ulos;
}

/** Nykytila levyltä: [{ sivu, tiedosto, v, hash }] (järjestys: sivu, lataus). Puuttuva tiedosto → hash null. */
function laske(juuri, sivut) {
  juuri = juuri || JUURI; const ulos = [];
  (sivut || SIVUT).forEach((sivu) => {
    const html = fs.readFileSync(path.join(juuri, sivu), 'utf8');
    skriptit(html).forEach((s) => { const p = path.join(juuri, s.tiedosto); ulos.push({ sivu, tiedosto: s.tiedosto, v: s.v, hash: fs.existsSync(p) ? hajautus(fs.readFileSync(p, 'utf8')) : null }); });
  });
  return ulos;
}

/** Vertaa tallennettua listaa nykytilaan → [{ tyyppi, sivu, tiedosto, viesti }]. Tyhjä = ok.
 *  muuttui_ilman_bumppia: hash ≠ tallennettu MUTTA v = tallennettu v → SW tarjoaisi vanhaa (PUNAINEN, pääsyy)
 *  vanhentunut: v tai hash eroaa (bumpattu tai uusi/poistunut lataus) → lista pitää kirjoittaa uudelleen, jotta seuraava muutos havaitaan */
function vertaa(tallennettu, nyt) {
  const ero = [], avain = (x) => x.sivu + '|' + x.tiedosto, vanha = new Map((tallennettu || []).map((x) => [avain(x), x])), tuore = new Map(nyt.map((x) => [avain(x), x]));
  nyt.forEach((x) => {
    const v = vanha.get(avain(x));
    if (x.hash === null) { ero.push({ tyyppi: 'puuttuu', sivu: x.sivu, tiedosto: x.tiedosto, viesti: x.tiedosto + ' (' + x.sivu + '): ladattava tiedosto puuttuu levyltä' }); return; }
    if (!v) { ero.push({ tyyppi: 'vanhentunut', sivu: x.sivu, tiedosto: x.tiedosto, viesti: x.tiedosto + ' (' + x.sivu + '): uusi lataus listalla ei — aja node scripts/lib_versiot.js --kirjoita' }); return; }
    if (v.hash !== x.hash && v.v === x.v) ero.push({ tyyppi: 'muuttui_ilman_bumppia', sivu: x.sivu, tiedosto: x.tiedosto, viesti: x.tiedosto + ' (' + x.sivu + '): sisältö muuttui mutta ?v ei (' + (x.v === null ? 'ei ?v:tä' : '?v=' + x.v) + ') — bumppaa ?v ja aja node scripts/lib_versiot.js --kirjoita' });
    else if (v.hash !== x.hash || v.v !== x.v) ero.push({ tyyppi: 'vanhentunut', sivu: x.sivu, tiedosto: x.tiedosto, viesti: x.tiedosto + ' (' + x.sivu + '): ?v tai sisältö eroaa listasta (' + v.v + ' → ' + x.v + ') — aja node scripts/lib_versiot.js --kirjoita' });
  });
  vanha.forEach((v, k) => { if (!tuore.has(k)) ero.push({ tyyppi: 'vanhentunut', sivu: v.sivu, tiedosto: v.tiedosto, viesti: v.tiedosto + ' (' + v.sivu + '): ei enää ladata — aja node scripts/lib_versiot.js --kirjoita' }); });
  return ero;
}

function lueLista() { return JSON.parse(fs.readFileSync(LISTA, 'utf8')); }
function kirjoitaLista(nyt) { fs.writeFileSync(LISTA, JSON.stringify(nyt, null, 1) + '\n'); }

function lueHistoria() { return fs.existsSync(HISTORIA) ? JSON.parse(fs.readFileSync(HISTORIA, 'utf8')) : {}; }
const hKey = (x) => x.sivu + '|' + x.tiedosto;
/** Historia vs nykytila → [{ sivu, tiedosto, v, viesti }] jokaisesta (sivu, tiedosto, ?v) jonka kirjattu hash ≠ nykyinen (sisältö muuttui, ?v ei noussut) tai jota ei ole kirjattu. ?v-tön lataus ohitetaan (null). */
function historiaEro(hist, nyt) {
  const ero = []; hist = hist || {};
  nyt.forEach((x) => {
    if (x.v === null || x.hash === null) return; const kirj = (hist[hKey(x)] || {})[x.v];
    if (kirj === undefined) ero.push({ tyyppi: 'vanhentunut', sivu: x.sivu, tiedosto: x.tiedosto, v: x.v, viesti: x.tiedosto + ' (' + x.sivu + '): ?v=' + x.v + ' ei ole historiassa — aja node scripts/lib_versiot.js --kirjoita' });
    else if (kirj !== x.hash) ero.push({ tyyppi: 'muuttui_ilman_bumppia', sivu: x.sivu, tiedosto: x.tiedosto, v: x.v, viesti: x.tiedosto + ' (' + x.sivu + '): sisältö muuttui mutta ?v=' + x.v + ' ei noussut (historia vartioi; listan uudelleengenerointi ei riitä) — nosta ?v' });
  });
  return ero;
}
/** Lisää nykyiset (sivu, tiedosto, ?v) → hash historiaan; ei koskaan ylikirjoita olemassa olevaa. */
function laajennaHistoria(hist, nyt) { const u = JSON.parse(JSON.stringify(hist || {})); nyt.forEach((x) => { if (x.v === null || x.hash === null) return; const k = hKey(x); u[k] = u[k] || {}; if (u[k][x.v] === undefined) u[k][x.v] = x.hash; }); return u; }

function main(args) {
  const nyt = laske();
  if (args.indexOf('--kirjoita') >= 0) {
    const ristiriidat = historiaEro(lueHistoria(), nyt).filter((e) => e.tyyppi === 'muuttui_ilman_bumppia');
    if (ristiriidat.length) { ristiriidat.forEach((e) => console.error('PUNAINEN  ' + e.viesti)); console.error('Keskeytetty: bumppaa ?v ensin (listaa ei kirjoitettu).'); return 1; }
    kirjoitaLista(nyt); fs.writeFileSync(HISTORIA, JSON.stringify(laajennaHistoria(lueHistoria(), nyt), null, 1) + '\n'); console.log('Kirjoitettu ' + nyt.length + ' riviä → tests/fixtures/lib_versiot.json (+ historia)'); return 0;
  }
  const ero = vertaa(fs.existsSync(LISTA) ? lueLista() : [], nyt);
  historiaEro(lueHistoria(), nyt).forEach((e) => ero.push(e));
  if (!ero.length) { console.log('lib_versiot: ok (' + nyt.length + ' latausta)'); return 0; }
  ero.forEach((e) => console.error((e.tyyppi === 'muuttui_ilman_bumppia' ? 'PUNAINEN  ' : 'vanhentunut ') + e.viesti)); return 1;
}

module.exports = { SIVUT, LISTA, HISTORIA, lueHistoria, historiaEro, laajennaHistoria, hajautus, skriptit, laske, vertaa, lueLista, kirjoitaLista };
if (require.main === module) process.exit(main(process.argv.slice(2)));
