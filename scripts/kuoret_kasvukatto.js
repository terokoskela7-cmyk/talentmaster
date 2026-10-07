#!/usr/bin/env node
/**
 * kuoret_kasvukatto.js — Rakenne R0: isojen sovelluskuorten KASVUKATTO (docs/CODE_BRIEF_RAKENNE_R0_KASVUKATTO.md; Kaista: auto).
 * Periaate (strangler, SKAALAUTUVUUS_JA_TEKNINEN_VELKA.md B1): uusi toiminnallisuus menee lib/-moduuleihin, kuoreen vain kytkentä.
 *   node scripts/kuoret_kasvukatto.js             → taulukko: kuori · rivit · katto · muutos edelliseen (fixturen `rivit` = rivimäärä katon asettamishetkellä)
 *   node scripts/kuoret_kasvukatto.js --kirjoita  → RÄIKKÄ ALASPÄIN: kuoren pienentyessä katto lasketaan uuteen kokoon + pelivara; EI KOSKAAN nosta kattoa; puuttuvalle kuorelle luo alkukaton.
 * Katto = rivit + 2 % (Rules +5 %), pyöristetty ylöspäin satoihin. Katon NOSTO tehdään käsin fixtureen (tests/fixtures/kuoret_kasvukatto.json) perusteluineen (Teron kaista).
 * Rivit = rivinvaihtojen määrä (wc -l).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const JUURI = path.join(__dirname, '..');
const FIXTURE = path.join(JUURI, 'tests', 'fixtures', 'kuoret_kasvukatto.json');
const KUORET = ['TalentMaster_VP_v25.html', 'TalentMaster_Master_v16.html', 'TalentMaster_Seura.html', 'TalentMaster_Pelaaja_v7.html', 'TalentMaster_Admin.html', 'TalentMaster_Excel_Tuonti.html', 'TalentMaster_Vanhempi_v2.html', 'functions/index.js', 'tm_admin/firestore.rules'];
const PELIVARA = { 'tm_admin/firestore.rules': 0.05 }, PELIVARA_OLETUS = 0.02;

function rivit(kuori) { const s = fs.readFileSync(path.join(JUURI, kuori), 'utf8'); let n = 0; for (let i = s.indexOf('\n'); i !== -1; i = s.indexOf('\n', i + 1)) n++; return n; }
function pelivara(kuori) { return PELIVARA[kuori] != null ? PELIVARA[kuori] : PELIVARA_OLETUS; }
function laskeKatto(kuori, n) { return Math.ceil(n * (1 + pelivara(kuori)) / 100) * 100; }
function lueFixture() { try { return JSON.parse(fs.readFileSync(FIXTURE, 'utf8')); } catch (e) { return {}; } }

function taulukko(fixture) {
  return KUORET.map((k) => {
    const n = rivit(k), f = fixture[k] || null;
    return { kuori: k, rivit: n, katto: f ? f.katto : null, muutos: f && f.rivit != null ? n - f.rivit : null };
  });
}
function tulosta(rivitTaulu) {
  const pad = (s, l) => String(s).padEnd(l), padL = (s, l) => String(s).padStart(l);
  const k = Math.max(...rivitTaulu.map((r) => r.kuori.length));
  const ul = [pad('kuori', k) + ' ' + padL('rivit', 7) + ' ' + padL('katto', 7) + ' ' + padL('vapaa', 6) + ' ' + padL('muutos', 7)];
  rivitTaulu.forEach((r) => ul.push(pad(r.kuori, k) + ' ' + padL(r.rivit, 7) + ' ' + padL(r.katto == null ? '—' : r.katto, 7) + ' ' + padL(r.katto == null ? '—' : r.katto - r.rivit, 6) + ' ' + padL(r.muutos == null ? '—' : (r.muutos > 0 ? '+' : '') + r.muutos, 7)));
  return ul.join('\n');
}
/* Räikkä: palauttaa uuden fixturen. Katto ei koskaan nouse; puuttuva luodaan; pienentynyt kuori → katto = uusi koko + pelivara (jos pienempi kuin nykyinen katto). */
function ratkaise(fixture, mittaus) {
  const uusi = JSON.parse(JSON.stringify(fixture)), muutokset = [];
  KUORET.forEach((k) => {
    const n = mittaus[k], f = uusi[k], ehdotus = laskeKatto(k, n);
    if (!f) { uusi[k] = { katto: ehdotus, rivit: n, perustelu: 'Alkukatto: rivit + ' + Math.round(pelivara(k) * 100) + ' % (R0, ' + new Date().toISOString().slice(0, 10) + ')' }; muutokset.push([k, null, ehdotus]); return; }
    if (ehdotus < f.katto) { muutokset.push([k, f.katto, ehdotus]); uusi[k] = { katto: ehdotus, rivit: n, perustelu: 'Räikkä alaspäin: kuori pieneni ' + f.rivit + ' → ' + n + ' riviä (' + new Date().toISOString().slice(0, 10) + ')' }; }
  });
  return { fixture: uusi, muutokset };
}

/* Ylitykset: [{ kuori, rivit, katto, yli }] — testi failaa jos ei tyhjä. Kuori ilman kattoa = virhe (uusi kuori pitää lisätä fixtureen). */
function ylitykset(fixture, mittaus) {
  const ul = [];
  KUORET.forEach((k) => { const f = fixture[k], n = mittaus[k]; if (!f || typeof f.katto !== 'number') ul.push({ kuori: k, rivit: n, katto: null, yli: null }); else if (n > f.katto) ul.push({ kuori: k, rivit: n, katto: f.katto, yli: n - f.katto }); });
  return ul;
}
function ylitysViesti(y) {
  return y.map((x) => x.katto == null ? x.kuori + ': kattoa ei ole fixturessa (aja: node scripts/kuoret_kasvukatto.js --kirjoita)' : x.kuori + ' ylittää kasvukaton ' + x.yli + ' rivillä (' + x.rivit + ' > ' + x.katto + '). Siirrä logiikka lib/-moduuliin ja jätä kuoreen vain kytkentä. Jos katon nosto on perusteltu, muuta tests/fixtures/kuoret_kasvukatto.json ja kirjoita perustelu (Teron kaista).').join('\n');
}

if (require.main === module) {
  const kirjoita = process.argv.includes('--kirjoita');
  const fixture = lueFixture();
  if (kirjoita) {
    const mittaus = {}; KUORET.forEach((k) => { mittaus[k] = rivit(k); });
    const r = ratkaise(fixture, mittaus);
    if (r.muutokset.length) { fs.writeFileSync(FIXTURE, JSON.stringify(r.fixture, null, 2) + '\n'); r.muutokset.forEach((m) => console.log((m[1] == null ? 'LUOTU ' : 'LASKETTU ') + m[0] + ': ' + (m[1] == null ? '' : m[1] + ' → ') + m[2])); }
    else console.log('Ei muutoksia (katot eivät nouse eikä mikään kuori ole pienentynyt).');
  }
  console.log(tulosta(taulukko(kirjoita ? lueFixture() : fixture)));
}
module.exports = { ylitykset, ylitysViesti, KUORET, rivit, laskeKatto, pelivara, taulukko, tulosta, ratkaise, lueFixture, FIXTURE };
