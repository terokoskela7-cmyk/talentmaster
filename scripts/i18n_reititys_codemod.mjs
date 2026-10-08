#!/usr/bin/env node
/* i18n-reititys-codemod (sv-läpiajo PR 2, perheet): siirtää kovakoodatut suomenkieliset UI-tekstit Pelaaja_v7:ssa T('avain')-reitille ja kirjoittaa avaimet tm_lang.js:ään (fi + en),
   sv → odotuslista (tests/tm_lang_sv_odotuslista.cjs) + Gemini-erän JSON (docs/i18n/sv_kaannoserae_2.json). Code EI kirjoita ruotsia (CLAUDE.md §0).
   Automatisoi vain turvalliset tapaukset: (1) koko merkkijono-literaali = teksti, (2) HTML-tekstisolmu merkkijono-/template-literaalin sisällä (ei ${…}, ei escapeja), funktion SISÄLLÄ
   (ylätason taulukot evaluoituvat latausajassa → kieli ei ole vielä seuran kieli → käsin laiskaksi). Ohitetut raportoidaan (käsin).
   Käyttö: node scripts/i18n_reititys_codemod.mjs TalentMaster_Pelaaja_v7.html --kuiva [--ehdotukset=ulos.json]
           node scripts/i18n_reititys_codemod.mjs TalentMaster_Pelaaja_v7.html --kirjoita --en=en.json */
import { readFileSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
import { skannaaHtml } from '../tools/i18n/sv_staattinen.mjs';
const require = createRequire(import.meta.url);
const arg = (n) => { const a = process.argv.find((x) => x.startsWith(n + '=')); return a ? a.slice(n.length + 1) : null; };
const tiedosto = process.argv[2]; const KIRJOITA = process.argv.includes('--kirjoita');
const RYHMA = arg('--ryhma') || 'pelaaja', ROUTER = arg('--router') || 'T';
const SALLITUT = JSON.parse(readFileSync(new URL('../tools/i18n/sv_staattinen_sallitut.json', import.meta.url), 'utf8'));
const src = readFileSync(tiedosto, 'utf8');
const { loydot, virheet } = skannaaHtml(src, tiedosto);
if (virheet.length) { console.error('parse-virheitä', virheet); process.exit(1); }

const L = require('../lib/tm_lang.js').TM_LANG;
const olemassa = {};   // teksti → { polku, oma }  (oma = samaa ryhmää → T('avain'); muuten t('ryhmä.avain'))
['yleiset', RYHMA].forEach((g) => Object.entries(L.fi[g] || {}).forEach(([k, v]) => { if (typeof v === 'string' && !(v in olemassa)) olemassa[v] = { polku: g + '.' + k, oma: g === RYHMA, avain: k }; }));
const kaytetytAvaimet = new Set(Object.keys(L.fi[RYHMA] || {}));

const asciiMap = { ä: 'a', ö: 'o', å: 'a', Ä: 'a', Ö: 'o', Å: 'a', é: 'e', ü: 'u' };
function slug(t) {
  const s = t.replace(/[äöåÄÖÅéü]/g, (c) => asciiMap[c]).toLowerCase().replace(/&[a-z]+;/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean);
  let k = s.slice(0, 5).join('_').slice(0, 34).replace(/_+$/, ''); if (!k) k = 'teksti'; if (/^\d/.test(k)) k = 't_' + k; return k;
}
const uudet = new Map();   // teksti → avain
function kutsu(teksti, varjo) {   // → JS-lauseke T('k') | t('ryhmä.k'); varjo = paikallinen T varjostaa reitittimen → globaali alias _pT
  const k = avainTekstille(teksti), o = olemassa[teksti];
  return (o && !o.oma) ? (varjo ? '_pt' : 't') + "('" + o.polku + "')" : (varjo ? '_pT' : ROUTER) + "('" + k + "')";
}
function avainTekstille(teksti) {
  if (olemassa[teksti]) return olemassa[teksti].avain;
  if (uudet.has(teksti)) return uudet.get(teksti);
  let k = slug(teksti), i = 2; const base = k; while (kaytetytAvaimet.has(k)) k = base + '_' + i++;
  kaytetytAvaimet.add(k); uudet.set(teksti, k); return k;
}
const FRAGMENTTI = /^[a-zåäö]|^[—–·.,;:)!?\-]|[(\-—·,]$/;   // lauseenosa/jatke (yhdistyy muuttujaan/nimeen) → ei automaattisesti; hyväksytyt: tools/i18n/sv_reititys_fragmentit_ok.json
const FRAGMENTIT_OK = (() => { try { return new Set(JSON.parse(readFileSync(new URL('../tools/i18n/sv_reititys_fragmentit_ok.json', import.meta.url), 'utf8')).tekstit); } catch (e) { return new Set(); } })();
const KASIN = (() => { try { return new Set(JSON.parse(readFileSync(new URL('../tools/i18n/sv_reititys_kasin.json', import.meta.url), 'utf8')).tekstit); } catch (e) { return new Set(); } })();   // lauseenosat jotka käsitellään käsin placeholder-lauseina
const ohitaRenderoija = (r) => SALLITUT.renderoijat.some((x) => r === x || r.startsWith(x + ' '));
const ohitaTeksti = (t) => SALLITUT.tekstit.some((x) => t === x || (x.endsWith('*') && t.startsWith(x.slice(0, -1))));

const muokkaukset = [], ohitetut = []; const kursori = new Map();
for (const f of loydot) {
  const syy = (m) => ohitetut.push({ rivi: f.rivi, renderoija: f.renderoija, teksti: f.teksti.slice(0, 90), syy: m });
  if (ohitaRenderoija(f.renderoija)) { continue; }
  if (ohitaTeksti(f.teksti)) { continue; }
  if (KASIN.has((f.alkup || '').trim())) { syy('käsin (placeholder-lause)'); continue; }
  if (f.ylataso) { syy('ylätaso (latausaikainen; käsin laiskaksi)'); continue; }
  { const ydin0 = (f.alkup || '').trim(); if (FRAGMENTTI.test(ydin0) && !FRAGMENTIT_OK.has(ydin0)) { syy('fragmentti? (käsin: placeholder-lause)'); continue; } }
  if (f.tyyppi !== 'merkkijono' && f.tyyppi !== 'html-teksti') { syy('attribuutti (käsin)'); continue; }
  if (!f.alkup || /\$\{/.test(f.alkup)) { syy('sisältää ${…} (käsin: placeholder)'); continue; }
  const raw = src.slice(f.absAlku, f.absLoppu);
  if (f.solmu === 'Literal') {
    const q = raw[0];
    if (f.tyyppi === 'merkkijono') {
      if (raw.slice(1, -1) !== f.alkup) { syy('literaali ≠ teksti'); continue; }
      const k = avainTekstille(f.alkup.trim());
      const y0 = f.alkup.trim(), v0 = f.alkup.slice(0, f.alkup.indexOf(y0)), o0 = f.alkup.slice(f.alkup.indexOf(y0) + y0.length);   // literaalin reunavälit säilytetään literaaleina: 'Seuraava askel: ' → (T(k) + ' ')
      const ymp = (v0 || o0) ? '(' + (v0 ? q + v0 + q + ' + ' : '') + kutsu(y0, f.varjostaaT) + (o0 ? ' + ' + q + o0 + q : '') + ')' : kutsu(y0, f.varjostaaT);
      muokkaukset.push({ a: f.absAlku, b: f.absLoppu, uusi: ymp, teksti: f.alkup.trim(), avain: k, rivi: f.rivi, jasenObj: f.jasenObj });
    } else {
      const c = kursori.get(f.absAlku) || 0, i = raw.indexOf(f.alkup, Math.max(c, 1)); if (i < 0) { syy('segmenttiä ei löydy raw:sta'); continue; }
      kursori.set(f.absAlku, i + f.alkup.length);
      const ydin = f.alkup.trim(), vas = f.alkup.slice(0, f.alkup.indexOf(ydin)), oik = f.alkup.slice(f.alkup.indexOf(ydin) + ydin.length);
      const k = avainTekstille(ydin);
      muokkaukset.push({ a: f.absAlku + i, b: f.absAlku + i + f.alkup.length, uusi: vas + q + ' + ' + kutsu(ydin, f.varjostaaT) + ' + ' + q + oik, teksti: ydin, avain: k, rivi: f.rivi, sisaLiteraali: { a: f.absAlku, b: f.absLoppu, jasenObj: f.jasenObj } });
    }
  } else if (f.solmu === 'TemplateElement') {
    if (f.tyyppi !== 'html-teksti') { syy('template ilman markupia (käsin)'); continue; }
    if (/\\/.test(raw) && /\\/.test(f.alkup)) { syy('escape (käsin)'); continue; }
    const c = kursori.get(f.absAlku) || 0, i = raw.indexOf(f.alkup, c); if (i < 0) { syy('segmenttiä ei löydy raw:sta'); continue; }
    kursori.set(f.absAlku, i + f.alkup.length);
    const ydin = f.alkup.trim(), vas = f.alkup.slice(0, f.alkup.indexOf(ydin)), oik = f.alkup.slice(f.alkup.indexOf(ydin) + ydin.length);
    const k = avainTekstille(ydin);
    muokkaukset.push({ a: f.absAlku + i, b: f.absAlku + i + f.alkup.length, uusi: vas + '${' + kutsu(ydin, f.varjostaaT) + '}' + oik, teksti: ydin, avain: k, rivi: f.rivi });
  }
}
// jäsen-objekti (esim. '<b>..</b>'.length) → sulkeet; harvinainen, raportoidaan
const jasenet = muokkaukset.filter((m) => m.jasenObj || (m.sisaLiteraali && m.sisaLiteraali.jasenObj));
if (jasenet.length) console.error('HUOM jäsen-objekti-literaaleja:', jasenet.map((m) => m.rivi));

const polkuOf = (m) => { const o = olemassa[m.teksti]; return o ? o.polku : RYHMA + '.' + m.avain; };   // yksilöllinen (yleiset.valmis ≠ pelaaja.valmis)
const ehdotukset = [...new Map(muokkaukset.map((m) => [polkuOf(m), { avain: m.avain, polku: polkuOf(m), fi: m.teksti, uusi: !olemassa[m.teksti], rivit: [] }])).values()];
muokkaukset.forEach((m) => { ehdotukset.find((e) => e.polku === polkuOf(m)).rivit.push(m.rivi); });
console.error(`muokkauksia ${muokkaukset.length} · avaimia ${ehdotukset.length} (uusia ${ehdotukset.filter((e) => e.uusi).length}) · ohitettu käsin ${ohitetut.length}`);
if (arg('--ehdotukset')) writeFileSync(arg('--ehdotukset'), JSON.stringify({ ehdotukset, ohitetut }, null, 1) + '\n');
if (!KIRJOITA) { console.log(JSON.stringify({ ehdotukset: ehdotukset.filter((e) => e.uusi).map((e) => [e.avain, e.fi]), ohitetut: ohitetut.length }, null, 0).slice(0, 4000)); process.exit(0); }

// ── kirjoita ──
const enPolku = arg('--en'); const EN = enPolku ? JSON.parse(readFileSync(enPolku, 'utf8')) : {};
const puuttuuEn = ehdotukset.filter((e) => e.uusi && !EN[e.avain]);
if (puuttuuEn.length) { console.error('PUUTTUU en-käännös avaimille:', puuttuuEn.map((e) => e.avain + '=' + e.fi).join('\n')); process.exit(1); }
let ulos = src; muokkaukset.sort((x, y) => y.a - x.a).forEach((m) => { ulos = ulos.slice(0, m.a) + m.uusi + ulos.slice(m.b); });
// sisäkkäiset literaali-segmentit: jos sama literaali sai useita segmenttimuokkauksia, ne on jo sovellettu loppupäästä alkuun
writeFileSync(tiedosto, ulos);
const q = (s) => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
let lang = readFileSync('lib/tm_lang.js', 'utf8');
function lisaaRyhmaan(kieli, rivit) {
  const a = lang.indexOf('\n  ' + kieli + ': {'), kielet = ['fi', 'sv', 'en'], seur = kielet.map((k) => lang.indexOf('\n  ' + k + ': {', a + 1)).filter((x) => x > a).sort((x, y) => x - y)[0] || lang.indexOf('\n};', a);
  const alue = lang.slice(a, seur); const g = alue.indexOf('\n    ' + RYHMA + ': {'); if (g < 0) throw new Error('ryhmä puuttuu ' + kieli);
  const loppu = alue.indexOf('\n    },', g); lang = lang.slice(0, a) + alue.slice(0, loppu) + '\n' + rivit.join('\n') + alue.slice(loppu) + lang.slice(seur);
}
const uudetE = ehdotukset.filter((e) => e.uusi);
lisaaRyhmaan('fi', uudetE.map((e) => '      ' + e.avain + ': ' + q(e.fi) + ','));
lisaaRyhmaan('en', uudetE.map((e) => '      ' + e.avain + ': ' + q(EN[e.avain]) + ','));
writeFileSync('lib/tm_lang.js', lang);
let odot = readFileSync('tests/tm_lang_sv_odotuslista.cjs', 'utf8');
odot = odot.replace(/\n\];\s*$/, '\n  // sv-käännöserä 2 (sv-läpiajo PR 2, perheet): ' + tiedosto + '\n' + uudetE.map((e) => "  '" + RYHMA + '.' + e.avain + "',").join('\n') + '\n];\n');
writeFileSync('tests/tm_lang_sv_odotuslista.cjs', odot);
console.error('kirjoitettu: ' + uudetE.length + ' uutta avainta (fi+en), sv odotuslistalle');
