#!/usr/bin/env node
/* Sibbo-valmius: sv-kattavuusraportti näkymittäin (VAIN LUKU; Kaista: docs/tests/tools). Code EI kirjoita ruotsia (CLAUDE.md §0): tämä vain laskee ja listaa.
   Per näkymä: (1) fi-avaimet joilla ei ole sv:tä — tm_lang (polku), lib-kartat (tmLibT), reititinkartat (masterT/vpT/tmHT/phT);
               (2) "odottaa palautusta" = rivi on lähetetyssä erässä (ODOTTAVAT_ERAT; nyt tyhjä — 51 ja 52 palautettiin ja vietiin) → EI lasketa uudelleen puuttuvaksi;
               (3) kovakoodattu suomi joka ei kulje i18n:n kautta — staattinen skanneri (sv_staattinen.mjs, allowlist) HTML:lle ja näkymän libeille + ajonaikainen läpiajo (docs/i18n/sv_lapiajo_tulos.json).
   Ajo:  node tools/i18n/sv_kattavuus.mjs [--json=polku] [--md=polku] [--lapiajo=polku]
   Tulos: stdout-taulukko; --json antaa koneluettavan (myös scripts/i18n_luo_gemini_era53.cjs lukee sen logiikan samoilla funktioilla). */
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { skannaaHtml, lataaSallitut, onSallittu } from './sv_staattinen.mjs';
import { skannaaMarkup } from './sv_staattinen_markup.mjs';

const require = createRequire(import.meta.url);
const JUURI = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const argArvo = (n) => { const a = process.argv.find((x) => x.startsWith(n + '=')); return a ? a.slice(n.length + 1) : null; };
const lue = (f) => readFileSync(join(JUURI, f), 'utf8');
const _melu = console.log; console.log = (...a) => { if (!String(a[0]).startsWith('[TM Lang]') && !String(a[0]).startsWith('[tm-')) _melu(...a); };   // vaienna kirjastojen latauslokit

/* ── Näkymät. html = sovellussivut (staattinen skannaus + libit joita ne lataavat); lang = tm_lang-ryhmät; router = reititinkartan poiminta; libs = näkymän omat lib-FI-kartat (ylittää HTML-latauksen);
      runtime = läpiajon näkymäetuliitteet; libSkanni = libit joiden kovakoodattu suomi lasketaan näkymälle (HTML-skanneri ei näe libejä). */
export const NAKYMAT = [
  { id: 'pelaaja', nimi: 'Pelaaja_v7', html: ['TalentMaster_Pelaaja_v7.html'], lang: ['pelaaja'], runtime: ['pelaaja/'] },
  { id: 'vanhempi', nimi: 'Vanhempi_v2', html: ['TalentMaster_Vanhempi_v2.html'], lang: ['vanhempi'], runtime: ['vanhempi/'] },
  { id: 'master', nimi: 'Master_v16 (valmentaja)', html: ['TalentMaster_Master_v16.html'], router: 'master', runtime: ['master/'] },
  { id: 'vp', nimi: 'VP_v25', html: ['TalentMaster_VP_v25.html'], router: 'vp', runtime: ['vp/'] },
  { id: 'adar', nimi: 'ADAR_Pikakortti + Pelihavainto_Kentta', html: ['TalentMaster_ADAR_Pikakortti.html', 'TalentMaster_Pelihavainto_Kentta.html'], router: 'henkilosto', runtime: ['adar/', 'pelihavainto/'], libs: ['tm_adar_tekstit'] },
  { id: 'harjoitusarviointi', nimi: 'Harjoitusarviointi (lib/tm_harjoitusarviointi.js, Master + VP)', html: [], libs: [], libSkanni: ['tm_harjoitusarviointi'], runtime: [] },
  { id: 'suostumus', nimi: 'Suostumus- ja kutsuflow (Rekisterointi_Suostumus, Huoltajakutsu)', html: ['TalentMaster_Rekisterointi_Suostumus.html', 'TalentMaster_Huoltajakutsu.html'], markup: ['TalentMaster_Rekisterointi_Suostumus.html'], lang: ['suostumus', 'huoltajakutsu', 'rekisterointi'], libs: [], runtime: [] },
  { id: 'toimintakortti', nimi: 'Toimintakortti + kasvupyrähdys-fysiikka (#1073–1075)', html: [], libs: ['tm_kt_toimintakortti', 'tm_kasvupyrahdys'], libSkanni: [], runtime: [] },
  { id: 'kehitystyopoyta', nimi: 'Kehitystyöpöytä (Kehitystyopoyta.html)', html: ['TalentMaster_Kehitystyopoyta.html'], router: 'masterKt', libs: ['tm_kehitystyopoyta', 'tm_kt_sivu', 'tm_kt_havainto', 'tm_kt_arviointi', 'tm_kt_alue', 'tm_kt_polku'], libSkanni: ['tm_kehitystyopoyta', 'tm_kt_sivu', 'tm_kt_havainto', 'tm_kt_arviointi', 'tm_kt_alue', 'tm_kt_polku'], runtime: [] },
];

/* Läpiajon näkymät jotka ovat kehittäjäprototyyppejä, ei Sibbon käyttöpolkua (sv_staattinen_sallitut.json perustelut: rHaptic/rOffline/rParent/rVapaa/rHaaste) → raportoidaan erikseen, ei lasketa. */
const RUNTIME_PROTOTYYPIT = ['pelaaja/haptic', 'pelaaja/offline', 'pelaaja/parent', 'pelaaja/vapaa', 'pelaaja/haaste'];

/* ── Lähetetyt erät (odottaa palautusta): 51 ja 52. Muiden erien tyhjät sv-rivit raportoidaan erikseen ("muu erä"), ei lasketa odottaviksi. ── */
const ODOTTAVAT_ERAT = [];   // erä 69 (palaute-näkyvyys 0a: merkkinäkymä, 4 riviä) palautettiin ja vietiin 19.10. (scripts/i18n_vie_sv_era69.cjs) · aiemmin: erä 68 (A: klippikortti, 2 riviä) palautettiin ja vietiin 18.10. (scripts/i18n_vie_sv_era68.cjs) · aiemmin: erät 65 + 66 palautettiin ja vietiin 18.10. (scripts/i18n_vie_sv_era65.cjs, era66.cjs)
const ERA_OMA = 54;   // erä 54 on scripts/i18n_luo_gemini_era54.mjs:n OMA tuloste: generaattori laskee ilmanOmaaEraa:true (muuten rivit näkyisivät jo odottavina)
function eratIndeksi(ilmanOmaa) {
  const ulos = { odottaa: { avain: new Set(), fi: new Set() }, muu: { avain: new Map(), fi: new Map() }, palautettu: { avain: new Map(), fi: new Map() } };
  // Gemini-palautukset (docs/i18n/*palautus*.json): sv täytetty mutta EI välttämättä viety koodiin (osavienti) → "palautettu, ei viety"
  for (const f of readdirSync(join(JUURI, 'docs/i18n')).filter((x) => /palautus.*\.json$/.test(x))) {
    let j; try { j = JSON.parse(lue('docs/i18n/' + f)); } catch (e) { continue; }
    const n = (/(\d+)/.exec(f) || [])[1] || f;
    const visit = (k, r) => { if (!r || typeof r !== 'object') return; if ('fi' in r || 'sv' in r) { if (typeof r.sv === 'string' && r.sv.trim()) { ulos.palautettu.avain.set(k, n); if (r.fi) ulos.palautettu.fi.set(r.fi, n); } } else Object.entries(r).forEach(([kk, v]) => visit(kk, v)); };
    for (const o of Object.values(j.osiot || {})) for (const [k, r] of Object.entries(o.rivit || {})) visit(k, r);
  }
  for (const f of readdirSync(join(JUURI, 'docs/i18n'))) {
    const m = /^sv_kaannoserae_(\d+)_gemini\.json$/.exec(f); if (!m) continue; const n = Number(m[1]);
    if (ilmanOmaa && n === ERA_OMA) continue;   // generaattori: oma tuloste ei saa vaikuttaa omaan syötteeseensä
    let j; try { j = JSON.parse(lue('docs/i18n/' + f)); } catch (e) { continue; }
    const kohde = ODOTTAVAT_ERAT.includes(n) ? ulos.odottaa : null;
    for (const [osio, o] of Object.entries(j.osiot || {})) {
      const visit = (k, r) => { if (!r || typeof r !== 'object') return; if ('fi' in r || 'sv' in r) { const tyhja = !(typeof r.sv === 'string' && r.sv.trim()); if (kohde) { kohde.avain.add(k); if (r.fi) kohde.fi.add(r.fi); } else if (tyhja) { ulos.muu.avain.set(k, n); if (r.fi) ulos.muu.fi.set(r.fi, n); } } else Object.entries(r).forEach(([kk, v]) => visit(kk, v)); };   // sisäkkäiset (mv_pohjat) → lehtirivit
      for (const [k, r] of Object.entries(o.rivit || {})) visit(k, r);
    }
  }
  return ulos;
}

/* ── tm_lang ── */
function langAvaimet() {
  const L = require('../../lib/tm_lang.js').TM_LANG;
  const walk = (o, p, f) => { for (const k of Object.keys(o || {})) { const x = o[k], q = p ? p + '.' + k : k; if (x && typeof x === 'object') walk(x, q, f); else f(q, x); } };
  const fi = {}, sv = {}; walk(L.fi, '', (p, x) => { fi[p] = x; }); walk(L.sv, '', (p, x) => { sv[p] = x; });
  const odotus = require('../../tests/tm_lang_sv_odotuslista.cjs');
  return { fi, sv, odotus: new Set(odotus) };
}

/* ── lib-kartat ── */
function libAvaimet() {
  const SV = require('../../lib/tm_lib_i18n.js').TM_LIB_I18N.sv; const per = {};
  for (const f of readdirSync(join(JUURI, 'lib')).filter((x) => x.endsWith('.js') && x !== 'tm_lib_i18n.js')) {
    let m; try { m = require('../../lib/' + f); } catch (e) { continue; }
    const fi = m && (m.FI || (m.TM_ADAR_TEKSTIT && m.TM_ADAR_TEKSTIT.FI)); if (!fi || typeof fi !== 'object' || Array.isArray(fi)) continue;
    const nimi = f.replace(/\.js$/, ''), rivit = {};
    for (const [k, v] of Object.entries(fi)) if (typeof v === 'string' && !/^mv_pohja_/.test(k)) rivit[k] = { fi: v, sv: typeof SV[k] === 'string' && SV[k].trim() !== '' };
    if (Object.keys(rivit).length) per[nimi] = rivit;
  }
  return per;
}

/* ── reititinkartat: avaimet = fi-teksti ── */
function reititinPuuttuu(laji) {
  const { masterAvaimet } = require('./master_avaimet.cjs'), { poimi } = require('./reititin_avaimet.cjs');
  const eiKaannettava = (t) => /^(var\(|#)/.test(t) || /^[:%]/.test(t) || t.length < 2;
  const K_VP = [['lib/tm_vp_i18n.js', 'TM_VP_I18N'], ['lib/tm_i18n_common.js', 'TM_I18N_COMMON'], ['lib/tm_lib_i18n.js', 'TM_LIB_I18N']], K_H = [['lib/tm_henkilosto_i18n.js', 'TM_HENKILOSTO_I18N'], ['lib/tm_i18n_common.js', 'TM_I18N_COMMON'], ['lib/tm_lib_i18n.js', 'TM_LIB_I18N']];
  const K_M = [['lib/tm_master_i18n.js', 'TM_MASTER_I18N'], ['lib/tm_i18n_common.js', 'TM_I18N_COMMON'], ['lib/tm_lib_i18n.js', 'TM_LIB_I18N']];
  let r;
  if (laji === 'master') r = masterAvaimet(JUURI);
  else if (laji === 'masterKt') r = poimi({ juuri: JUURI, tiedostot: ['TalentMaster_Kehitystyopoyta.html'], routerit: ['masterT'], kartat: K_M });
  else if (laji === 'vp') r = poimi({ juuri: JUURI, tiedostot: ['TalentMaster_VP_v25.html'], routerit: ['vpT', '_mT'], kartat: K_VP, taulukot: ['TM_TESTI_OHJEET', '_ONB_VP', '_PHV_LABEL', '_VP_POS_NIMI', '_TAL_LAJINIMI', '_VP_HH_FOKUS_NIMI', '_VP_OHJ_PHV_NIMI', '_JSV_HH_TEEMA', 'TK_LAJI_NIMET', '_VKO_LASNA', '_JA_POSRYHMA'] });
  else r = poimi({ juuri: JUURI, tiedostot: ['TalentMaster_Seura.html', 'TalentMaster_ADAR_Pikakortti.html', 'TalentMaster_Pelihavainto_Kentta.html'], routerit: ['tmHT', 'phT'], kartat: K_H });
  return { kaikki: r.kaikki.filter((t) => !eiKaannettava(t)), puuttuu: r.puuttuu.filter((t) => !eiKaannettava(t)) };
}

/* ── fi-teksti → onko sv missään kartassa (tm_lang, reititinkartat, lib FI→avain→sv)? "sv on" = pelkkä reititys puuttuu, ei käännöstä ── */
const _norm = (x) => String(x).replace(/&auml;/g, 'ä').replace(/&ouml;/g, 'ö').replace(/&Auml;/g, 'Ä').replace(/&Ouml;/g, 'Ö').replace(/&aring;/g, 'å').replace(/&mdash;/g, '—').replace(/&rarr;/g, '→').replace(/&rdquo;|&ldquo;/g, '"').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
export function svIndeksi() {
  const idx = new Set(), lisaa = (fi, sv) => { if (typeof fi === 'string' && typeof sv === 'string' && sv.trim()) idx.add(_norm(fi)); };
  const lang = langAvaimet(); for (const p of Object.keys(lang.fi)) lisaa(lang.fi[p], lang.sv[p]);
  for (const [f, n] of [['lib/tm_vp_i18n.js', 'TM_VP_I18N'], ['lib/tm_master_i18n.js', 'TM_MASTER_I18N'], ['lib/tm_i18n_common.js', 'TM_I18N_COMMON'], ['lib/tm_henkilosto_i18n.js', 'TM_HENKILOSTO_I18N'], ['lib/tm_lib_i18n.js', 'TM_LIB_I18N']]) {
    let K; try { K = require('../../' + f)[n].sv || {}; } catch (e) { continue; } for (const [k, v] of Object.entries(K)) lisaa(k, v);
  }
  const libit = libAvaimet(), SV = require('../../lib/tm_lib_i18n.js').TM_LIB_I18N.sv;
  for (const l of Object.values(libit)) for (const [k, r] of Object.entries(l)) if (r.sv) lisaa(r.fi, SV[k]);
  return { on: (teksti) => idx.has(_norm(teksti)) };
}

/* ── Harjoitusarviointilomake (lib/tm_harjoitusarviointi.js): lomakkeen tekstit = _T('…')-literaalit + kriteeritaulut (kysymys/kuvaus/matala/korkea). Avain = fi-teksti; sv tarvitaan SEKÄ masterT- että vpT-ketjussa
   (oma kartta → TM_I18N_COMMON → TM_LIB_I18N). ── */
export function harjoitusarviointiAvaimet() {
  const src = lue('lib/tm_harjoitusarviointi.js'), set = new Set();
  for (const m of src.matchAll(/_T\('((?:[^'\\]|\\.)*)'\)/g)) set.add(m[1].replace(/\\'/g, "'"));
  const a = src.indexOf('function KRITEERIT_A'), b = src.indexOf('// ── DOM → tila'), blk = src.slice(a, b);
  for (const m of blk.matchAll(/(?:kysymys|kuvaus|matala|korkea): (?:L \? )?'((?:[^'\\]|\\.)*)'/g)) set.add(m[1]);
  for (const m of blk.matchAll(/L \? '([^']*)' : '([^']*)'/g)) { set.add(m[1]); set.add(m[2]); }
  set.delete('');
  const ketju = (f, n) => { try { return require('../../' + f)[n].sv || {}; } catch (e) { return {}; } };
  const C = ketju('lib/tm_i18n_common.js', 'TM_I18N_COMMON'), L = ketju('lib/tm_lib_i18n.js', 'TM_LIB_I18N'), M = ketju('lib/tm_master_i18n.js', 'TM_MASTER_I18N'), V = ketju('lib/tm_vp_i18n.js', 'TM_VP_I18N');
  const on = (K, k) => [K, C, L].some((x) => typeof x[k] === 'string' && x[k] !== '');
  return [...set].map((fi) => ({ fi, master: on(M, fi), vp: on(V, fi), viite: (typeof V[fi] === 'string' && V[fi]) || (typeof M[fi] === 'string' && M[fi]) || null }));
}
/** Libin kuluttamat näkymäkohtaiset lisäavaimet (reititys lib → masterT/vpT, ei näy HTML:n literaaleina): { fi, router } */
const LISA_AVAIMET = { kehitystyopoyta: [{ fi: 'Leikkijä', router: 'master' }, { fi: 'Rakentaja', router: 'master' }, { fi: 'Showcase', router: 'master' }] };
export function lisaAvaimetPuuttuu(id) {
  const ketju = (f, n) => { try { return require('../../' + f)[n].sv || {}; } catch (e) { return {}; } };
  const C = ketju('lib/tm_i18n_common.js', 'TM_I18N_COMMON'), L = ketju('lib/tm_lib_i18n.js', 'TM_LIB_I18N'), M = ketju('lib/tm_master_i18n.js', 'TM_MASTER_I18N'), V = ketju('lib/tm_vp_i18n.js', 'TM_VP_I18N');
  return (LISA_AVAIMET[id] || []).map((x) => { const K = x.router === 'master' ? M : V; return { fi: x.fi, router: x.router, ok: [K, C, L].some((y) => typeof y[x.fi] === 'string' && y[x.fi] !== ''), viite: (typeof V[x.fi] === 'string' && V[x.fi]) || null }; });
}

/* ── kovakoodattu suomi: staattinen (HTML + libit) ── */
function skannaa(tiedostot, S, onLib, svI) {
  const rivit = [];
  for (const f of tiedostot) {
    let src; try { src = lue(f); } catch (e) { continue; }
    const { loydot } = skannaaHtml(onLib ? '<script>\n' + src + '\n</script>' : src, f);
    for (const x of loydot) {
      if (onSallittu(x, S)) continue;
      if (onLib && (/^\(ylätaso\) (FI|SV|EN|TAULU|UUDET)\b/.test(x.renderoija || '') || /[{};]\s*[a-z-]+\s*:/.test(x.teksti) || /^"|data-|^tm[A-Z]\w*:/.test(x.teksti))) continue;   // FI-kartan/lähdetaulun arvot = lähdekieltä (erät 51/52), CSS, HTML-attribuuttipätkät ja kehittäjävirheet eivät ole käyttäjätekstiä
      rivit.push({ tiedosto: f, rivi: x.rivi - (onLib ? 1 : 0), renderoija: x.renderoija, tyyppi: x.tyyppi, teksti: x.teksti, svOn: svI.on(x.teksti) });
    }
  }
  return rivit;
}

function laske(lapiajoPolku, opts) {
  opts = opts || {};
  const era = eratIndeksi(!!opts.ilmanOmaaEraa), lang = langAvaimet(), libit = libAvaimet(), S = lataaSallitut(), svI = svIndeksi();
  const lapiajo = existsSync(lapiajoPolku) ? JSON.parse(readFileSync(lapiajoPolku, 'utf8')) : null;
  const tulos = [];
  for (const n of NAKYMAT) {
    const rivit = [];   // { lahde, avain, fi, tila: ok|puuttuu|odottaa }
    const tila = (avain, fi) => (era.odottaa.avain.has(avain) || (fi && era.odottaa.fi.has(fi))) ? 'odottaa' : (era.palautettu.avain.has(avain) || (fi && era.palautettu.fi.has(fi))) ? 'palautettu' : 'puuttuu';
    // tm_lang
    for (const ryhma of n.lang || []) for (const p of Object.keys(lang.fi)) if (p.split('.')[0] === ryhma) {
      const onSv = typeof lang.sv[p] === 'string' && lang.sv[p].trim() !== '';
      rivit.push({ lahde: 'tm_lang', avain: p, fi: lang.fi[p], tila: onSv ? 'ok' : (lang.odotus.has(p) ? 'odottaa' : tila(p, lang.fi[p])) });
    }
    // lib-FI-kartat: näkymän omat tai HTML:n lataamat
    const libNimet = n.libs ? n.libs : [...new Set(n.html.flatMap((h) => [...lue(h).matchAll(/src="(?:\.\/)?lib\/([^"?]+)\.js/g)].map((m) => m[1])))];
    for (const l of libNimet) for (const [k, r] of Object.entries(libit[l] || {})) rivit.push({ lahde: 'lib.' + l, avain: k, fi: r.fi, tila: r.sv ? 'ok' : tila(k, r.fi) });
    // reititinkartta
    if (n.router) { const r = reititinPuuttuu(n.router), puuttuu = new Set(r.puuttuu); for (const fi of r.kaikki) rivit.push({ lahde: 'kartta.' + n.router, avain: fi, fi, tila: puuttuu.has(fi) ? tila(fi, fi) : 'ok' }); }
    if (n.id === 'harjoitusarviointi') for (const r of harjoitusarviointiAvaimet()) rivit.push({ lahde: 'lib.tm_harjoitusarviointi', avain: r.fi, fi: r.fi, tila: (r.master && r.vp) ? 'ok' : tila(r.fi, r.fi) });
    for (const r of lisaAvaimetPuuttuu(n.id)) rivit.push({ lahde: 'lib.' + n.id + '.lisa', avain: r.fi, fi: r.fi, tila: r.ok ? 'ok' : tila(r.fi, r.fi) });
    // dedup (sama lahde+avain)
    const nahty = new Set(), uniq = rivit.filter((r) => { const id = r.lahde + '|' + r.avain; if (nahty.has(id)) return false; nahty.add(id); return true; });
    const luku = (t) => uniq.filter((r) => r.tila === t).length;
    // muut erät (ei 51/52): puuttuvat joiden fi/avain on jonkin MUUN lähetetyn erän tyhjissä riveissä
    const puuttuvat = uniq.filter((r) => r.tila === 'puuttuu');
    const muuEra = puuttuvat.filter((r) => era.muu.avain.has(r.avain) || era.muu.fi.has(r.fi)).map((r) => ({ avain: r.avain, era: era.muu.avain.get(r.avain) || era.muu.fi.get(r.fi) }));
    // kovakoodattu: staattinen
    const staat = [...skannaa(n.html, S, false, svI), ...skannaa((n.libSkanni || []).map((l) => 'lib/' + l + '.js'), S, true, svI)];
    // staattinen MARKUP (HTML-runko; skannaaHtml lukee vain inline-skriptit) — vain näkymät joille `markup` on listattu (Sibbo 1.11. suostumus vaihe 1)
    for (const f of n.markup || []) for (const x of skannaaMarkup(lue(f))) staat.push({ tiedosto: f, rivi: x.rivi, renderoija: '(markup) ' + x.tyyppi, tyyppi: x.tyyppi, teksti: x.teksti, svOn: svI.on(x.teksti) });
    // kovakoodattu: ajonaikainen (läpiajo, sv-tila, demo-data)
    const aja = { ui: [], data: [], prototyypit: [] };
    if (lapiajo) for (const [nim, v] of Object.entries(lapiajo.nakymat || {})) if ((n.runtime || []).some((p) => nim.startsWith(p))) for (const r of v.fi || []) {
      const rivi = { nakyma: nim, teksti: r.teksti, lahde: (r.lahde || [])[0] || null, varmuus: r.varmuus, svOn: svI.on(r.teksti) };
      if (RUNTIME_PROTOTYYPIT.some((p) => nim.startsWith(p))) aja.prototyypit.push(rivi); else (r.luokka === 'ui' ? aja.ui : aja.data).push(rivi);
    }
    const uniqT = (a) => [...new Map(a.map((x) => [x.teksti, x])).values()];
    tulos.push({ id: n.id, nimi: n.nimi, avaimia: uniq.length, ok: luku('ok'), puuttuu: luku('puuttuu'), odottaa: luku('odottaa'), palautettu: luku('palautettu'), palautetut: uniq.filter((r) => r.tila === 'palautettu').map((r) => ({ lahde: r.lahde, avain: r.avain, era: era.palautettu.avain.get(r.avain) || era.palautettu.fi.get(r.fi) })), puuttuvat, odottavat: uniq.filter((r) => r.tila === 'odottaa').map((r) => ({ lahde: r.lahde, avain: r.avain })), muuEra, kovakoodattuStaattinen: staat, ajonaikainen: { ui: uniqT(aja.ui), data: uniqT(aja.data), prototyypit: uniqT(aja.prototyypit), kaytetty: !!lapiajo && (n.runtime || []).length > 0 } });
  }
  return { luotu: new Date().toISOString().slice(0, 10), odottavatErat: ODOTTAVAT_ERAT, lapiajoLuotu: lapiajo ? lapiajo.luotu : null, nakymat: tulos };
}

function md(t) {
  const L = [];
  L.push('| Näkymä | fi-avaimia | ok | puuttuu sv | odottaa palautusta (lähetetty erä) | palautettu, ei viety koodiin | kovakoodattu (staattinen; sv puuttuu / vain reititys) | kovakoodattu (ajonaik., UI) |', '|---|---:|---:|---:|---:|---:|---:|---:|');
  for (const n of t.nakymat) L.push(`| ${n.nimi} | ${n.avaimia} | ${n.ok} | **${n.puuttuu}** | ${n.odottaa} | ${n.palautettu} | **${n.kovakoodattuStaattinen.length}** (${n.kovakoodattuStaattinen.filter((r) => !r.svOn).length} / ${n.kovakoodattuStaattinen.filter((r) => r.svOn).length}) | ${n.ajonaikainen.kaytetty ? n.ajonaikainen.ui.length + ' (+ data? ' + n.ajonaikainen.data.length + ')' : '–'} |`);
  return L.join('\n');
}

function raportti(t) {
  const L = ['## Taulukko', '', md(t), '', '_fi-avaimia = tm_lang-ryhmän / lib-FI-karttojen / reititinkartan (masterT, vpT, tmHT, phT) avaimet, jotka näkymä lataa. "odottaa" = rivi on lähetetyssä erässä (' + (t.odottavatErat.join(', ') || 'ei yhtään: 51 ja 52 vietiin tässä PR:ssä') + '), palautus puuttuu. Sama lib-avain voi näkyä usealla näkymällä._', ''];
  L.push('## Odottaa palautusta (lähetetyt erät: ' + (t.odottavatErat.join(', ') || 'ei yhtään') + ')', '');
  for (const n of t.nakymat) if (n.odottaa) { const g = {}; n.odottavat.forEach((r) => { g[r.lahde] = (g[r.lahde] || 0) + 1; }); L.push('- **' + n.nimi + '**: ' + Object.entries(g).map(([k, v]) => k + ' ' + v).join(' · ')); }
  L.push('', '## Palautettu Geminiltä, ei viety koodiin', '');
  for (const n of t.nakymat) if (n.palautettu) { const g = {}; n.palautetut.forEach((r) => { const k = r.lahde + ' (palautus ' + r.era + ')'; g[k] = (g[k] || 0) + 1; }); L.push('- **' + n.nimi + '**: ' + Object.entries(g).map(([k, v]) => k + ' ' + v).join(' · ')); }
  L.push('', '## Puuttuu sv (ei lähetettynä odottavassa erässä, ei palautettuna) → erä 53', '');
  for (const n of t.nakymat) if (n.puuttuu) { const g = {}; n.puuttuvat.forEach((r) => { (g[r.lahde] = g[r.lahde] || []).push(r); }); for (const [k, v] of Object.entries(g)) { const era = {}; v.forEach((r) => { const m = n.muuEra.find((x) => x.avain === r.avain); const e = m ? m.era : 'uusi'; era[e] = (era[e] || 0) + 1; }); L.push('- **' + n.nimi + '** · ' + k + ': ' + v.length + ' (' + Object.entries(era).map(([e, c]) => (e === 'uusi' ? 'ei missään lähetetyssä erässä' : 'jo lähetetyssä erässä ' + e + ' (sv tyhjä repossa)') + ' ' + c).join(', ') + ')'); } }
  L.push('', '## Kovakoodattu suomi (ei i18n-reittiä) — staattinen, tiedosto:rivi', '');
  for (const n of t.nakymat) { L.push('### ' + n.nimi + ' — ' + n.kovakoodattuStaattinen.length); n.kovakoodattuStaattinen.forEach((r) => L.push('- `' + r.tiedosto + ':' + r.rivi + '` (' + r.renderoija + ') ' + (r.svOn ? '[sv on, vain reititys] ' : '[sv puuttuu] ') + r.teksti.replace(/\s+/g, ' ').slice(0, 110))); L.push(''); }
  L.push('## Kovakoodattu suomi sv-tilassa — ajonaikainen läpiajo (demo-data, ' + t.lapiajoLuotu + ')', '');
  for (const n of t.nakymat) if (n.ajonaikainen.kaytetty) { L.push('### ' + n.nimi + ' — UI ' + n.ajonaikainen.ui.length + ', data? ' + n.ajonaikainen.data.length + (n.ajonaikainen.prototyypit.length ? ', prototyyppinäkymät (ei Sibbo-polkua) ' + n.ajonaikainen.prototyypit.length : '')); n.ajonaikainen.ui.forEach((r) => L.push('- `' + (r.lahde || '?') + '` [' + r.nakyma + '] ' + (r.svOn ? '[sv on, vain reititys] ' : '[sv puuttuu] ') + r.teksti.slice(0, 100))); L.push(''); }
  return L.join('\n');
}

export { laske, md, raportti };

if (process.argv[1] && process.argv[1].endsWith('sv_kattavuus.mjs')) {
  const t = laske(argArvo('--lapiajo') || join(JUURI, 'docs/i18n/sv_lapiajo_tulos.json'));
  if (argArvo('--json')) writeFileSync(argArvo('--json'), JSON.stringify(t, null, 1) + '\n');
  _melu(md(t));
  _melu('');
  for (const n of t.nakymat) {
    if (n.puuttuu) _melu(`PUUTTUU [${n.id}] ${n.puuttuu}: ` + n.puuttuvat.map((r) => r.avain).slice(0, 12).join(' · ') + (n.puuttuu > 12 ? ' …' : ''));
    if (n.muuEra.length) _melu(`  muun erän tyhjä sv [${n.id}]: ` + n.muuEra.length);
    if (n.kovakoodattuStaattinen.length) _melu(`KOVAKOODATTU [${n.id}] ${n.kovakoodattuStaattinen.length}`);
  }
  if (argArvo('--md')) writeFileSync(argArvo('--md'), raportti(t) + '\n');
}
