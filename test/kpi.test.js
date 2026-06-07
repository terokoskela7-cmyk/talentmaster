// ─────────────────────────────────────────────────────────────────────────────
// TalentMaster — KPI-laskennan yksikkötestit (Sprint 6, A2)
//
// Aja:  npm test     (= node --test test/)
//
// Nolla riippuvuutta — node:test + node:assert. Importtaa KPI-moduulit suoraan
// (molemmat ovat UMD: module.exports Nodessa, window.* selaimessa).
//
// Odotusarvot on johdettu validoiduista tapauksista + funktioiden dokumentoidusta
// kaavasta — EIVÄT pelkästä nykykäyttäytymisestä. Jos testi hajoaa, KPI-logiikka
// muuttui: tarkista onko muutos tarkoituksellinen.
// ─────────────────────────────────────────────────────────────────────────────
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');

const T = require('../docs/testit_indeksit.js');       // rikas KPI-moottori
const E = require('../lib/tm_eerikkila_normit.js');     // Eerikkilä-normit + indeksit

// ═══════════════════════════════════════════════════════════════════════════
// 1. EI — Elastisuusindeksi (CMJ − SJ)
// ═══════════════════════════════════════════════════════════════════════════
test('EI = CMJ − SJ (perustapaus)', () => {
  assert.equal(T.laskeEI(35, 30, 12).arvo, 5, 'EI pitää olla CMJ−SJ = 35−30 = 5');
  assert.equal(E.laskeEI(35, 30), 5, 'yksinkertainen number-versio antaa saman arvon');
});

test('EI: molemmat moduuliversiot ovat samaa mieltä ydinarvosta (A3-törmäys)', () => {
  // laskeEI on määritelty BÅDE testit_indeksit.js:ssä ETTÄ tm_eerikkila_normit.js:ssä.
  // Niiden TÄYTYY antaa sama ydinarvo, muuten last-loaded-wins tuottaa eri tuloksen
  // riippuen latausjärjestyksestä. Tämä testi vartioi A3-törmäystä kunnes se puretaan.
  for (const [cmj, sj] of [[40, 32], [28, 28], [50, 41]]) {
    assert.equal(T.laskeEI(cmj, sj, 13).arvo, E.laskeEI(cmj, sj),
      `laskeEI(${cmj},${sj}) eroaa moduulien välillä`);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. FVP — Voima–nopeusprofiili = Lin5m / (Lin30m / 6)
// ═══════════════════════════════════════════════════════════════════════════
test('FVP = Lin5m / (Lin30m / 6)', () => {
  // 1.1 / (4.3 / 6) = 1.1 / 0.71667 = 1.5349 → 1.53
  const odotettu = Math.round((1.1 / (4.3 / 6)) * 100) / 100;
  assert.equal(odotettu, 1.53, 'kaava-tarkistus');
  assert.equal(T.laskeFVP(1.1, 4.3, 'hyokkaaja').arvo, 1.53);
  assert.equal(E.laskeFVP(1.1, 4.3), 1.53, 'number-versio antaa saman');
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. TKI — Tekniikkakilpailut, kokonaisaika (EI per-laji; ks. CLAUDE.md §31)
// ═══════════════════════════════════════════════════════════════════════════
test('TKI: kokonaisaika → merkki → TKI-piste (interpolointi 0–100)', () => {
  // 60 s kokonaistulos, P12: kultaraja → merkki 'kulta', TKI 90.
  assert.equal(T.tkLaskeMerkki(60, 12, 'P'), 'kulta');
  assert.equal(T.tkLaskeTKI(60, 12, 'P'), 90);
});

test('TKI: pienempi kokonaisaika ei koskaan laske TKI-pistettä (monotonisuus)', () => {
  // Tekniikkakilpailu = aikalaji → pienempi aika on parempi → TKI ei saa pienentyä.
  const nopea = T.tkLaskeTKI(50, 12, 'P');
  const hidas = T.tkLaskeTKI(80, 12, 'P');
  assert.ok(nopea >= hidas, `nopeampi aika (${nopea}) ei saa antaa pienempää TKI:tä kuin hitaampi (${hidas})`);
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. MAS-yksikkö — REGRESSIO: eerikkilaTaso odottaa m/s, EI km/h
//    (Tämä bugi näytti aiemmin aina taso 5:n kun data tuli km/h-yksikössä.)
// ═══════════════════════════════════════════════════════════════════════════
test('MAS-normi on tallennettu m/s-yksikössä', () => {
  assert.equal(E.eerikkilaNormiarvo('mas', 13, 'P'), 4.3, 'P13 MAS taso-3-normi = 4.3 m/s');
});

test('REGRESSIO: km/h-arvon syöttäminen eerikkilaTasoon saturoi taso 5:een (bugi)', () => {
  // 14.4 km/h = 4.0 m/s. Jos raaka km/h-luku syötetään → saturoituu taso 5 (VÄÄRIN).
  assert.equal(E.eerikkilaTaso(14.4, 'mas', 13, 'P'), 5,
    'km/h-arvo (14.4) saturoituu taso 5 — tämä on miksi muunnos /3.6 on pakollinen');
  // Sama nopeus oikeassa m/s-yksikössä → ei saturoidu (taso 4).
  assert.equal(E.eerikkilaTaso(4.0, 'mas', 13, 'P'), 4,
    'm/s-arvo (4.0) antaa oikean tason 4');
  // Ydinväite: yksikkö ratkaisee tuloksen → kutsupaikan ON muunnettava km/h → m/s.
  assert.notEqual(E.eerikkilaTaso(14.4, 'mas', 13, 'P'), E.eerikkilaTaso(4.0, 'mas', 13, 'P'),
    'km/h ja m/s eivät saa antaa samaa tasoa — muunnos /3.6 on pakollinen');
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. eerikkilaTaso — paluuarvo on kelvollinen taso 1–5
// ═══════════════════════════════════════════════════════════════════════════
test('eerikkilaTaso palauttaa kokonaisluvun välillä 1–5', () => {
  for (const arvo of [3.5, 4.0, 4.3, 4.5]) {
    const taso = E.eerikkilaTaso(arvo, 'mas', 13, 'P');
    assert.ok(Number.isInteger(taso) && taso >= 1 && taso <= 5,
      `eerikkilaTaso(${arvo}) = ${taso} ei ole kelvollinen taso 1–5`);
  }
});
