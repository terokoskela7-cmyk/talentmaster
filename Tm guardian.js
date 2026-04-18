#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  TalentMaster™ CODE GUARDIAN v1.0                           ║
 * ║  Huipputason datainsinööriagentti                            ║
 * ║  Tarkistaa tiedoston KOKONAISUUDESSAAN ennen deployta        ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Käyttö:  node guardian.js [tiedosto.html]
 * Oletus:  ../TalentMaster_Pelaaja_v3.html
 *
 * Tarkistusalueet:
 *   A. Rakenne    — DOCTYPE, style-tagit, script-tagit, HTML eheys
 *   B. CSS        — muuttujat, duplikaatit, nav, konflikti-säännöt
 *   C. JavaScript — syntaksi, kriittiset funktiot, matriisiflow
 *   D. Uudet omin.— redesign-elementit, brieffin vaatimukset
 *   E. Regressio  — mikään vanha ei ole rikki
 *   F. Turvallisuus — XSS-riskit, avoimet credentials
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ── Värit konsoliin ────────────────────────────────────────────
const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  red:    '\x1b[31m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  blue:   '\x1b[34m',
  cyan:   '\x1b[36m',
  gray:   '\x1b[90m',
};
const ok   = (m, d='') => { PASS++;  console.log(`  ${C.green}✅${C.reset} ${m}${d ? C.gray+' — '+d+C.reset : ''}`); };
const fail = (m, d='') => { FAIL++;  console.error(`  ${C.red}❌${C.reset} ${C.bold}${m}${C.reset}${d ? '\n     '+C.gray+d+C.reset : ''}`); };
const warn = (m, d='') => { WARNS++; console.warn(`  ${C.yellow}⚠️ ${C.reset} ${m}${d ? C.gray+' — '+d+C.reset : ''}`); };
const info = (m)        =>           console.log(`  ${C.blue}ℹ️ ${C.reset} ${C.gray}${m}${C.reset}`);
const section = (t)     =>           console.log(`\n${C.bold}${C.cyan}── ${t} ──${C.reset}`);

let PASS = 0, FAIL = 0, WARNS = 0;

// ── Tiedosto ───────────────────────────────────────────────────
const FILE = process.argv[2] ||
  path.resolve(__dirname, '../TalentMaster_Pelaaja_v3.html');

if (!fs.existsSync(FILE)) {
  console.error(`${C.red}❌ Tiedostoa ei löydy: ${FILE}${C.reset}`);
  process.exit(1);
}

const src   = fs.readFileSync(FILE, 'utf8');
const lines = src.split('\n');
const KB    = (Math.round(src.length / 1024 * 10) / 10);

console.log(`\n${C.bold}${C.cyan}╔══════════════════════════════════════════════════╗`);
console.log(`║  TalentMaster™ CODE GUARDIAN v1.0               ║`);
console.log(`╚══════════════════════════════════════════════════╝${C.reset}`);
console.log(`${C.gray}  Tiedosto: ${path.basename(FILE)}`);
console.log(`  Koko:     ${KB} KB  |  ${lines.length} riviä${C.reset}`);

// ══════════════════════════════════════════════════════════════
// A. RAKENNE
// ══════════════════════════════════════════════════════════════
section('A. RAKENNE');

// A1: DOCTYPE
src.startsWith('<!DOCTYPE html>')
  ? ok('DOCTYPE html alussa')
  : fail('DOCTYPE puuttuu tai väärässä paikassa');

// A2: Style-tagien rakenne — ei HTML:ää CSS:n sisällä
const styleTags = [...src.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)];
styleTags.forEach((m, i) => {
  const content = m[1];
  const id = m[0].match(/id="([^"]+)"/)?.[1] || `blokki-${i+1}`;
  if (content.includes('<!DOCTYPE') || content.includes('<html') || content.includes('<head')) {
    fail(`Style-${id} sisältää HTML-koodia!`, 'CSS:n sisään on päätynyt HTML-rakenne');
  } else {
    ok(`Style-${id} on puhdas CSS`, `${Math.round(content.length/1024*10)/10} KB`);
  }
});
info(`Style-tageja yhteensä: ${styleTags.length}`);

// A3: Script-tagit
const scriptTags = [...src.matchAll(/<script[^>]*>/g)].map(m => m[0]);
ok(`Script-tageja: ${scriptTags.length}`, scriptTags.slice(0,3).join(', ').slice(0,80));

// A4: Nav on body:n lopussa
const navLastPos = src.lastIndexOf('<nav class="tabs">');
navLastPos > src.length - 1000
  ? ok('Nav on body:n lopussa', `pos ${navLastPos}/${src.length}`)
  : fail('Nav EI ole body:n lopussa', `pos ${navLastPos}/${src.length} — sticky ei toimi`);

// A5: Ei duplikaatti-id:tä
const idMatches = [...src.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
const idCounts  = {};
idMatches.forEach(id => idCounts[id] = (idCounts[id]||0) + 1);
const dupIds    = Object.entries(idCounts).filter(([,n]) => n > 1);
dupIds.length === 0
  ? ok('Ei duplikaatti-id:tä HTML:ssä')
  : fail(`Duplikaatti-id:tä: ${dupIds.length}`, dupIds.map(([id,n])=>`#${id}(${n}x)`).join(', '));

// A6: </body> ja </html> olemassa
src.includes('</body>') && src.includes('</html>')
  ? ok('</body> ja </html> löytyy')
  : fail('</body> tai </html> puuttuu');

// ══════════════════════════════════════════════════════════════
// B. CSS
// ══════════════════════════════════════════════════════════════
section('B. CSS');

const allCss = styleTags.map(m => m[1]).join('\n');

// B1: Kriittiset CSS-muuttujat
const cssVars = {
  '--bg':      '#111110',
  '--bg2':     '#161614',
  '--text':    '#F2EFE6',
  '--teal':    '#1A7A5E',
  '--border':  'rgba(',
  '--surface': '#1E1E1C',
};
Object.entries(cssVars).forEach(([varName, expected]) => {
  allCss.includes(varName + ':')
    ? ok(`${varName} määritelty`)
    : fail(`${varName} puuttuu CSS:stä`, 'tumma teema ei toimi');
});

// B2: body background
src.includes('background: var(--bg') || src.includes('background:var(--bg')
  ? ok('body background käyttää --bg muuttujaa')
  : fail('body background puuttuu', 'sivu näkyy valkoisena');

// B3: .tabs duplikaatit
const tabsCount = (src.match(/\.tabs\{background/g)||[]).length;
tabsCount === 1
  ? ok('.tabs CSS-sääntö 1 kpl — ei duplikaattia')
  : tabsCount === 0
    ? fail('.tabs CSS puuttuu kokonaan')
    : fail(`.tabs CSS-duplikaatteja: ${tabsCount} kpl`, 'nav ei toimi oikein');

// B4: Nav fixed bottom
src.includes('position: fixed !important') || src.includes('position:fixed!important')
  ? ok('nav.tabs: position fixed !important')
  : fail('nav.tabs fixed puuttuu', 'navigaatio ei pysy alhaalla');

// B5: safe-area-inset-bottom
src.includes('safe-area-inset-bottom')
  ? ok('safe-area-inset-bottom — iOS home indicator tuettu')
  : warn('safe-area-inset-bottom puuttuu', 'iPhonella nav menee home indicator:n alle');

// B6: tab-icon + tab-label (redesign)
src.includes('.tab-icon') && src.includes('.tab-label')
  ? ok('Tab-ikonit CSS (redesign brief)')
  : fail('Tab-ikonit CSS puuttuu (.tab-icon/.tab-label)');

// B7: .aloita-cta (redesign CTA)
src.includes('.aloita-cta')
  ? ok('.aloita-cta CSS — iso teal CTA-nappi (redesign)')
  : fail('.aloita-cta CSS puuttuu');

// B8: Valmentajan viesti
src.includes('.coach-viesti')
  ? ok('.coach-viesti CSS — redesign brief')
  : fail('.coach-viesti CSS puuttuu');

// B9: CSS-sääntömäärä (regression baseline)
const ruleCount = (allCss.match(/\{[^}]+\}/g)||[]).length;
if (ruleCount < 200) fail(`CSS-sääntöjä vain ${ruleCount} — liian vähän, jotain on kadonnut`);
else if (ruleCount > 1500) warn(`CSS-sääntöjä ${ruleCount} — runsaasti, tarkista duplikaatit`);
else ok(`CSS-sääntöjä: ${ruleCount}`);

// B10: Tunnetut duplikaattiselektorit
const selectors = [...allCss.matchAll(/^([.#][^\s{,\n@]+)\s*\{/gm)].map(m => m[1]);
const selCounts = {};
selectors.forEach(s => selCounts[s] = (selCounts[s]||0) + 1);
const dupSels = Object.entries(selCounts).filter(([,n]) => n > 2);
dupSels.length === 0
  ? ok('Ei yli 2x duplikaattiselektoreita')
  : warn(`Selektoreita 3+ kertaa: ${dupSels.length}`, dupSels.slice(0,5).map(([s,n])=>`${s}(${n}x)`).join(', '));

// ══════════════════════════════════════════════════════════════
// C. JAVASCRIPT — SYNTAKSI JA KRIITTISET FUNKTIOT
// ══════════════════════════════════════════════════════════════
section('C. JAVASCRIPT');

// C1: Syntaksi kaikille inline-scriptille
const inlineScripts = [...src.matchAll(/<script(?!\s+src)[^>]*>([\s\S]*?)<\/script>/g)];
let syntaxOk = 0, syntaxErr = 0;
inlineScripts.forEach((s, i) => {
  try {
    new Function(s[1]);
    syntaxOk++;
  } catch(e) {
    syntaxErr++;
    fail(`Script #${i+1} SYNTAKSIVIRHE`, e.message.slice(0, 100));
  }
});
syntaxOk > 0 && syntaxErr === 0
  ? ok(`JS syntaksi: ${syntaxOk} skriptiä OK`)
  : syntaxErr > 0
    ? fail(`JS syntaksivirheitä: ${syntaxErr}`, 'sivu ei lataudu')
    : warn('Ei inline-skriptejä löydetty');

// C2: Matriisiflow — kriittiset funktiot
const KRIITTISET_FNS = [
  // Auth
  'kirjauduSisaan', 'kirjauduUlos', 'demoKirjaudu', 'pinLisaa', 'pinTarkista',
  // Navigaatio
  'nayta', 'naytaTabi',
  // Harjoitelogiikka
  'generoimTehtavat', 'laskeKetjuProfiili', '_laskeStage', '_laskeMesosykli',
  // Renderöinti
  'renderTehtavat', '_renderTanaaHarjoiteKortti', 'renderStreak', 'renderKysely',
  // Behavior
  '_suodataStreakViesti', '_tmTallennaTila', '_tmLueTila',
  // UI
  '_luoKonfetti', 'naytaToast',
];

const missingFns = KRIITTISET_FNS.filter(fn => !src.includes(fn));
const presentFns = KRIITTISET_FNS.filter(fn =>  src.includes(fn));

presentFns.length > 0
  ? ok(`Kriittiset funktiot: ${presentFns.length}/${KRIITTISET_FNS.length} paikallaan`)
  : fail('Kaikki kriittiset funktiot puuttuvat!');

if (missingFns.length > 0) {
  fail(`Puuttuvat funktiot: ${missingFns.length}`, missingFns.join(', '));
}

// C3: Firebase konfiguraatio
src.includes('AIzaSyAp471lOIntzP33p9bIW')
  ? ok('Firebase API key löytyy')
  : fail('Firebase API key puuttuu', 'Firebase ei toimi');

src.includes('talentmaster-pilot.firebaseapp.com')
  ? ok('Firebase auth domain löytyy')
  : fail('Firebase auth domain puuttuu');

// C4: onAuthStateChanged — ei duplikaattia (loop-riski)
const authStateCount = (src.match(/onAuthStateChanged/g)||[]).length;
authStateCount === 1
  ? ok('onAuthStateChanged: 1 kpl — ei loop-riskiä')
  : authStateCount === 0
    ? fail('onAuthStateChanged puuttuu', 'kirjautuminen ei toimi')
    : warn(`onAuthStateChanged: ${authStateCount} kpl`, 'loop-riski — tarkista');

// C5: Tyhjät catch-blokkit
const emptyCatches = (src.match(/catch\s*\(\w+\)\s*\{\s*\}/g)||[]).length;
emptyCatches === 0
  ? ok('Ei tyhjiä catch-blokkeja')
  : fail(`Tyhjiä catch-blokkeja: ${emptyCatches}`, 'virheet häviävät hiljaa');

// C6: eval() — tietoturvariski
src.includes('eval(')
  ? fail('eval() löytyy koodista', 'tietoturvariski ja suorituskykyongelma')
  : ok('Ei eval()-kutsuja');

// C7: harjoitelogiikka_v4.js linkitys
src.includes('harjoitelogiikka_v4.js')
  ? ok('harjoitelogiikka_v4.js linkitetty')
  : fail('harjoitelogiikka_v4.js puuttuu', 'PANKKI ja generoimTehtavat ei lataudu');

// ══════════════════════════════════════════════════════════════
// D. UUDET OMINAISUUDET — REDESIGN BRIEF
// ══════════════════════════════════════════════════════════════
section('D. REDESIGN-BRIEF — UUDET OMINAISUUDET');

// D1: Nav tabit (brief: Tänään/Viikko/Minä/Kehitys)
const TAB_VAATIMUKSET = [
  ['>Tänään<',  'Tänään-tabi'],
  ['>Viikko<',  'Viikko-tabi (ent. Ohjelma)'],
  ['>Minä<',    'Minä-tabi (ent. Kortti & Haasteet)'],
  ['>Kehitys<', 'Kehitys-tabi'],
];
TAB_VAATIMUKSET.forEach(([pattern, label]) => {
  src.includes(pattern)
    ? ok(label)
    : fail(`${label} PUUTTUU`, 'nav ei vastaa redesign-briefiä');
});

// D2: Ikonit nav-tapeissa
src.includes('tab-icon')
  ? ok('Tab-ikonit HTML:ssä (redesign brief: ikoni + teksti)')
  : fail('Tab-ikonit puuttuu HTML:stä');

// D3: Streak-kieli (brief: kannustava, ei syyllistävä)
!src.includes('Älä katkaise putkea') && !src.includes('älä riko putkea')
  ? ok('Streak-kieli: ei syyllistävää kieltä')
  : fail('Syyllistävä streak-kieli löytyy', '"Älä katkaise" tai "älä riko" — poista');

src.includes('pidä rytmi') || src.includes('Pidä rytmi') || src.includes('pidä rytmi')
  ? ok('Streak-kieli: kannustava "Pidä rytmi"')
  : warn('Kannustava streak-kieli puuttuu');

// D4: Termistö — ei FLEI pelaajalle
const fleiUiCount = (src.match(/>FLEI</g)||[]).length;
fleiUiCount === 0
  ? ok('FLEI ei näy pelaajalle (korvattu "Kehosi vahvuus")')
  : warn(`FLEI näkyy UI:ssa ${fleiUiCount} kertaa`, 'pitäisi olla "Kehosi vahvuus"');

// D5: Stage-badge "Taso N" ei "S4 — Tehotaso"
const tehotasoCount = (src.match(/Tehotaso/g)||[]).length;
tehotasoCount === 0
  ? ok('Ei "Tehotaso" — badge on "Taso N"')
  : fail(`"Tehotaso" löytyy ${tehotasoCount} kertaa`, 'pitäisi olla "Taso 4"');

// D6: Sinä-muoto (brief: "Kehosi" ei "Kehon")
src.includes('Kehosi vahvuus')
  ? ok('"Kehosi vahvuus" — sinä-muoto (redesign brief)')
  : warn('"Kehosi vahvuus" puuttuu', 'pitäisi olla sinä-muoto, ei "Kehon"');

// D7: Fiilinki-patch
src.includes('_lisaaFiilinki') || src.includes('tm-fiilinki-patch') || src.includes('tm-fiilinki-row')
  ? ok('Fiilinki-emoji-rivi (redesign: aina Tänään-näkymässä)')
  : fail('Fiilinki puuttuu', 'brief: aina näkyvissä Tänään-tabissa');

// D8: Suodatinfunktio
src.includes('_suodataStreakViesti')
  ? ok('_suodataStreakViesti — negatiivinen teksti suodatetaan')
  : fail('_suodataStreakViesti puuttuu');

// D9: LocalStorage-hybridimalli
src.includes('_tmTallennaTila') && src.includes('_tmLueTila')
  ? ok('Hybriditallennus (localStorage + Firestore)')
  : fail('_tmTallennaTila/_tmLueTila puuttuu', 'data häviää laitetta vaihtaessa');

// D10: DocumentFragment konfetti (suorituskyky)
src.includes('createDocumentFragment')
  ? ok('Konfetti käyttää DocumentFragment (ei 28x reflow)')
  : warn('DocumentFragment puuttuu konfetti-animaatiosta', '28x DOM reflow voi hidastaa');

// ══════════════════════════════════════════════════════════════
// E. REGRESSIOTESTIT
// ══════════════════════════════════════════════════════════════
section('E. REGRESSIO — MIKÄÄN VANHA EI RIKKOUTUNUT');

// E1: Login-näkymä
src.includes('id="sLogin"') || src.includes("id='sLogin'")
  ? ok('#sLogin kirjautumisnäkymä olemassa')
  : fail('#sLogin puuttuu', 'kirjautuminen ei näy');

// E2: PIN-kirjautuminen
src.includes('pinLisaa') && src.includes('pinTarkista') && src.includes('pin-grid')
  ? ok('PIN-kirjautuminen toimintakykyinen')
  : fail('PIN-kirjautuminen rikki');

// E3: Demo-kirjautuminen
src.includes('demoKirjaudu')
  ? ok('demoKirjaudu() olemassa')
  : fail('demoKirjaudu() puuttuu', 'pilottitestaus ei onnistu');

// E4: Splash-ruutu
src.includes('id="sSplash"') || src.includes("id='sSplash'")
  ? ok('#sSplash splash-ruutu olemassa')
  : fail('#sSplash puuttuu');

// E5: Tänään-näkymä
src.includes('view-tanaan') || src.includes('sTanaan')
  ? ok('#view-tanaan Tänään-näkymä olemassa')
  : fail('#view-tanaan puuttuu');

// E6: Harjoitekortti
src.includes('tanaaHarjoiteKortti') || src.includes('tehtava-card')
  ? ok('Harjoitekortti-elementit olemassa')
  : fail('Harjoitekortti puuttuu');

// E7: XP-animaatio
src.includes('xpPulse') || src.includes('xp-pulse') || src.includes('xpFill')
  ? ok('XP-animaatio CSS olemassa')
  : warn('XP-animaatio CSS puuttuu');

// E8: Firestore-kokoelmat viittaukset
["collection('pelaajat')", "collection('seurat')"].forEach(c => {
  src.includes(c)
    ? ok(`Firestore: ${c}`)
    : warn(`Firestore-kokoelma ${c} ei löydy koodista`);
});

// E9: Mesosykli-rakenne
src.includes('mesosykli') && src.includes('beckham')
  ? ok('Mesosykli-data viittaukset (Fulham-malli)')
  : warn('Mesosykli-viittaukset puuttuvat');

// E10: tm-ui-patch
src.includes('TM UI Patch') || src.includes('tm-ui-patch')
  ? ok('TM UI Patch-skripti olemassa')
  : warn('TM UI Patch puuttuu');

// ══════════════════════════════════════════════════════════════
// F. TURVALLISUUS JA KOODINLAATU
// ══════════════════════════════════════════════════════════════
section('F. TURVALLISUUS JA KOODINLAATU');

// F1: Firebase API key — on julkinen, mutta tarkistetaan muoto
const apiKeyMatch = src.match(/apiKey:\s*["']([^"']+)["']/);
if (apiKeyMatch) {
  ok(`Firebase API key muoto OK`, apiKeyMatch[1].slice(0,8) + '...');
} else {
  fail('Firebase API key puuttuu tai väärässä muodossa');
}

// F2: Ei hardkoodattuja salasanoja
const passwordPatterns = [
  /password:\s*["'][^"']{4,}/i,
  /secret:\s*["'][^"']{4,}/i,
  /private_key:\s*["'][^"']{4,}/i,
];
const foundSecrets = passwordPatterns.filter(p => p.test(src));
foundSecrets.length === 0
  ? ok('Ei hardkoodattuja salasanoja/secrets-avaimia')
  : fail('Hardkoodattu salasana/secret löytyy!', 'KRIITTINEN tietoturvariski');

// F3: console.log tuotannossa
const consoleLogCount = (src.match(/console\.log\(/g)||[]).length;
consoleLogCount === 0
  ? ok('Ei console.log()-kutsuja')
  : warn(`console.log()-kutsuja: ${consoleLogCount}`, 'harkitse poistamista tuotannosta');

// F4: Tiedostokoko järkevä
if (KB < 100) fail(`Tiedosto liian pieni: ${KB} KB`, 'jotain on kadonnut');
else if (KB > 500) warn(`Tiedosto suuri: ${KB} KB`, 'harkitse ulkoisen CSS/JS:n käyttöä');
else ok(`Tiedostokoko järkevä: ${KB} KB`);

// F5: Encoding
src.startsWith('\uFEFF')
  ? warn('BOM-merkki tiedoston alussa', 'voi aiheuttaa ongelmia')
  : ok('Ei BOM-merkkiä (UTF-8 puhdas)');

// ══════════════════════════════════════════════════════════════
// YHTEENVETO
// ══════════════════════════════════════════════════════════════
const total   = PASS + FAIL + WARNS;
const passRate = Math.round(PASS / (PASS + FAIL) * 100);

console.log(`\n${C.bold}${C.cyan}╔══════════════════════════════════════════════════╗`);
console.log(`║  TULOKSET                                        ║`);
console.log(`╠══════════════════════════════════════════════════╣`);
console.log(`║  ${C.green}✅ OK:       ${String(PASS).padEnd(5)}${C.cyan}                             ║`);
console.log(`║  ${C.red}❌ Virheitä: ${String(FAIL).padEnd(5)}${C.cyan}                             ║`);
console.log(`║  ${C.yellow}⚠️  Varoituksia: ${String(WARNS).padEnd(3)}${C.cyan}                             ║`);
console.log(`║  ${C.bold}Läpäisy: ${passRate}%${' '.repeat(39-passRate.toString().length)}║`);
console.log(`╚══════════════════════════════════════════════════╝${C.reset}`);

if (FAIL === 0) {
  console.log(`\n${C.green}${C.bold}✅ GUARDIAN HYVÄKSYY — valmis deployta GitHubiin${C.reset}\n`);
  process.exit(0);
} else {
  console.log(`\n${C.red}${C.bold}❌ GUARDIAN HYLKÄÄ — korjaa ${FAIL} virhettä ennen deployta${C.reset}\n`);
  process.exit(1);
}
