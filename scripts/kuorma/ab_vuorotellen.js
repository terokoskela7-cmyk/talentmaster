#!/usr/bin/env node
'use strict';
/* ab_vuorotellen.js — vuorotteleva A/B-sivumittaus kahdelle stagingin esikatselukanavalle (A1-hidastuma-selvitys 15.11.2026).
 * Miksi: yksittäiset ajot eri kellonaikoina eivät erota muutosta kohinasta (a_main 11:16 vs c_ilman_a1 20:22 UTC). Tässä A ja B mitataan samalla koneella, samassa ikkunassa,
 * ja järjestys vaihtuu joka kierroksella (A,B / B,A / A,B …) → hitaus, joka seuraa AJANKOHTAA, ei muutosta, vaihtaa puolta; hitaus, joka seuraa MUUTOSTA, pysyy samalla puolella.
 *
 *   STAGING_APPCHECK_DEBUG_TOKEN=<token> ! node scripts/kuorma/ab_vuorotellen.js \
 *     --a=https://talentmaster-staging--kuorma-<tunniste>.web.app --b=https://talentmaster-staging--kuorma-b-<tunniste>.web.app \
 *     --kierrokset=3 --sivut=master --profiilit=tyopoyta --toistot=3 [--tunnukset=.briefit/staging_tunnukset.txt] [--seura=1] [--ulos=mittaus_tulokset/ab_<aika>] [--kuiva] [--ilman-tokenia]
 *   --ilman-tokenia = TAPAUS (b) kylmä App Check: ei debug-tokenia (STAGING_APPCHECK_DEBUG_TOKEN ei tarvita), kirjautumisen App Check -token poistetaan storageStatesta → reCAPTCHA latautuu oikeasti. VAATII ettei stagingin App Check ole enforce-tilassa (Firebase Console → App Check → palvelut = Unenforced; docs/STAGING_ASENNUS.md kohta 8: 'älä pakota') — muuten kirjautuminen/Firestore hylätään ja ajo päättyy virheeseen.
 * Token VAIN ympäristömuuttujasta (ei komentoriviltä, ei tulosteeseen). Jokainen ajo = oma mittaa_sivut.js-prosessi (sen URL-vartija: vain staging) → <ulos>/kierros<N>_<A|B>.json.
 * Lopuksi: mediaanit A ja B, erotus B−A ja per-kierros-erotus (kylmä/lämmin: FCP, TTI, auth-haun alku, ensimmäisen Firestore-pyynnön alku) + <ulos>/yhteenveto.json.
 * Tulkinta: muutos on syy vain jos B−A on SAMAA suuntaa myös kierroksilla, joilla järjestys on käännetty. Eri suunta tai ~0 → kohinaa/ajankohtaa. */
const fs = require('fs'), path = require('path'), cp = require('child_process');
const M = require('./mittaus_lib.js');

const MITTARIT = Object.freeze([
  { avain: 'fcp', nimi: 'FCP', ots: 'fcp_ms', ms: true },
  { avain: 'tti', nimi: 'interaktiivinen', ots: 'tti_ms', ms: true },
  { avain: 'init', nimi: 'initializeApp (auth/App Check alkaa)', ots: 'merkit.init', ms: true },   // vaihe 3 (§13.3): hyväksyntä puhelin kylmä ≥ −3 s
  { avain: 'act', nimi: 'App Check -tokenin vaihto valmis', ots: 'ajat.appcheck_vaihto.1', ms: true },   // null kun voimassa oleva token on välimuistissa (ei vaihtoa)
  { avain: 'auth', nimi: 'auth-haun alku', ots: 'ajat.auth_haku.0', ms: true },
  { avain: 'fs', nimi: '1. Firestore alkaa', ots: 'ajat.firestore_ensimmainen.0', ms: true },
]);
const TILAT = Object.freeze([{ avain: 'kylma', nimi: 'KYLMÄ' }, { avain: 'lampimat', nimi: 'LÄMMIN' }]);

function lueArgv(argv) {
  const o = { a: undefined, b: undefined, kierrokset: 3, sivut: 'master', profiilit: 'tyopoyta', toistot: 3, tunnukset: '.briefit/staging_tunnukset.txt', seura: 1, ulos: undefined, kuiva: false, ilmanTokenia: false, tuntematon: [] };
  (argv || []).forEach((x) => {
    const kv = /^--([a-z]+)=(.*)$/.exec(x);
    if (x === '--kuiva') o.kuiva = true;
    else if (x === '--ilman-tokenia') o.ilmanTokenia = true;
    else if (kv && ['a', 'b', 'sivut', 'profiilit', 'tunnukset', 'ulos'].indexOf(kv[1]) >= 0) o[kv[1]] = kv[1] === 'a' || kv[1] === 'b' ? kv[2].replace(/\/$/, '') : kv[2];
    else if (kv && ['kierrokset', 'toistot', 'seura'].indexOf(kv[1]) >= 0) o[kv[1]] = +kv[2];
    else o.tuntematon.push(/token/i.test(x) ? '--token…(token ei kuulu komentoriviltä)' : x.split('=')[0]);
  });
  return o;
}
function tarkista(o, env, urlSallittu) {
  if (o.tuntematon.length) return 'Tuntematon valinta: ' + o.tuntematon.join(', ') + '. (Token luetaan vain ympäristömuuttujasta STAGING_APPCHECK_DEBUG_TOKEN.)';
  const sallittu = urlSallittu || M.kanavaUrlSallittu;
  if (!o.a || !o.b) return 'Anna molemmat: --a=<url> --b=<url>.';
  if (!sallittu(o.a) || !sallittu(o.b)) return 'URL ei ole stagingin Hosting (https://talentmaster-staging[--kanava].web.app) — ajo keskeytetty (tuotantoa ei mitata).';
  if (o.a === o.b) return '--a ja --b ovat sama URL — vertailu ei kerro mitään.';
  if (!(o.kierrokset >= 2 && o.kierrokset <= 10)) return '--kierrokset 2–10 (vähintään 2, jotta järjestys ehtii vaihtua).';
  if (!(o.toistot >= 1 && o.toistot <= 20) || !(o.seura >= 1 && o.seura <= 99)) return 'Virheellinen --toistot tai --seura.';
  if (!o.kuiva && !o.ilmanTokenia && !(env && env.STAGING_APPCHECK_DEBUG_TOKEN)) return 'STAGING_APPCHECK_DEBUG_TOKEN puuttuu ympäristöstä (ei komentoriviltä).';
  return null;
}
/** Kierros k (0-alkuinen): parillinen A,B · pariton B,A. */
const jarjestys = (k) => (k % 2 === 0 ? ['A', 'B'] : ['B', 'A']);
const tiedostonimi = (k, v) => 'kierros' + (k + 1) + '_' + v + '.json';

const hae = (o, ots) => ots.split('.').reduce((x, k) => (x == null ? null : x[k]), o);
const luku = (x) => (typeof x === 'number' && isFinite(x) ? x : null);
/** Yhden mittaa_sivut.js-tuloksen avaukset: { 'sivu|profiili': { kylma: { fcp: [..], … }, lampimat: {…} } } */
function poimi(tulos) {
  const ulos = {};
  (tulos && tulos.mittaukset || []).forEach((m) => {
    const rivi = ulos[m.sivu + '|' + m.profiili] = {};
    TILAT.forEach((t) => { rivi[t.avain] = {}; MITTARIT.forEach((mi) => { rivi[t.avain][mi.avain] = (m[t.avain] || []).filter((a) => !a.virhe).map((a) => luku(hae(a, mi.ots))).filter((x) => x != null); }); });
  });
  return ulos;
}
/** Yhdistä: kaikki kierrokset → { avain: { A: {tila:{mittari:[kaikki arvot]}}, B: …, kierroksittain: [{ A: <mediaanit>, B: <mediaanit> }] } } */
function yhdista(kierrokset) {   // kierrokset = [{ A: tulosJson, B: tulosJson }, …]
  const kaikki = {};
  const med = (a) => { const t = M.tilasto(a); return t.mediaani == null ? null : Math.round(t.mediaani); };
  kierrokset.forEach((kr, k) => {
    ['A', 'B'].forEach((v) => {
      const p = poimi(kr[v]);
      Object.keys(p).forEach((avain) => {
        const r = kaikki[avain] = kaikki[avain] || { A: {}, B: {}, kierroksittain: [] };
        TILAT.forEach((t) => MITTARIT.forEach((mi) => { const kohde = r[v][t.avain] = r[v][t.avain] || {}; kohde[mi.avain] = (kohde[mi.avain] || []).concat(p[avain][t.avain][mi.avain]); }));
        const kk = r.kierroksittain[k] = r.kierroksittain[k] || { jarjestys: jarjestys(k).join(',') };
        kk[v] = {}; TILAT.forEach((t) => { kk[v][t.avain] = {}; MITTARIT.forEach((mi) => { kk[v][t.avain][mi.avain] = med(p[avain][t.avain][mi.avain]); }); });
      });
    });
  });
  const tulos = {};
  Object.keys(kaikki).forEach((avain) => {
    const r = kaikki[avain], rivit = [];
    TILAT.forEach((t) => MITTARIT.forEach((mi) => {
      const a = M.tilasto(r.A[t.avain][mi.avain]), b = M.tilasto(r.B[t.avain][mi.avain]);
      const ma = a.mediaani == null ? null : Math.round(a.mediaani), mb = b.mediaani == null ? null : Math.round(b.mediaani);
      const eroKierroksittain = r.kierroksittain.map((kk) => (kk && kk.A && kk.B && kk.A[t.avain][mi.avain] != null && kk.B[t.avain][mi.avain] != null ? kk.B[t.avain][mi.avain] - kk.A[t.avain][mi.avain] : null));
      rivit.push({ tila: t.avain, mittari: mi.avain, n_a: a.n, n_b: b.n, a: ma, b: mb, ero: ma == null || mb == null ? null : mb - ma, ero_kierroksittain: eroKierroksittain });
    }));
    tulos[avain] = { rivit, kierroksittain: r.kierroksittain };
  });
  return tulos;
}
/** Suuntajohdonmukaisuus: kaikilla kierroksilla (ilman null) sama etumerkki JA mediaanierotus ≥ kynnys → 'johdonmukainen'; muuten 'ei johdonmukainen'. */
function suunta(rivi, kynnysMs) {
  const k = (rivi.ero_kierroksittain || []).filter((x) => x != null);
  if (k.length < 2 || rivi.ero == null) return 'ei tarpeeksi dataa';
  const kaikkiPlus = k.every((x) => x > 0), kaikkiMiinus = k.every((x) => x < 0);
  if ((kaikkiPlus || kaikkiMiinus) && Math.abs(rivi.ero) >= (kynnysMs || 500)) return kaikkiPlus ? 'B hitaampi (johdonmukainen)' : 'A hitaampi (johdonmukainen)';
  return 'ei johdonmukainen (kohinaa/ajankohtaa)';
}
const ms = (x) => (x == null ? '   –  ' : String(x).padStart(6));
function raporttiTeksti(yht, o) {
  const ul = ['A = ' + o.a, 'B = ' + o.b, 'kierroksia ' + o.kierrokset + ' · järjestys: ' + Array.from({ length: o.kierrokset }, (_, k) => jarjestys(k).join('')).join(' / ') + ' · ' + o.toistot + ' toistoa / ajo · mediaanit ms'];
  Object.keys(yht).forEach((avain) => {
    ul.push('', '== ' + avain);
    TILAT.forEach((t) => {
      ul.push('  ' + t.nimi + '           A      B    B−A   per kierros (B−A)      suunta');
      yht[avain].rivit.filter((r) => r.tila === t.avain).forEach((r) => {
        const nimi = MITTARIT.find((m) => m.avain === r.mittari).nimi;
        ul.push('    ' + nimi.padEnd(20) + ms(r.a) + ms(r.b) + ms(r.ero) + '   ' + r.ero_kierroksittain.map((x) => (x == null ? '–' : (x > 0 ? '+' : '') + x)).join(' / ').padEnd(22) + ' ' + suunta(r));
      });
    });
  });
  ul.push('', 'Tulkinta: muutos on syy vain jos B−A on samaa suuntaa myös kierroksilla, joilla järjestys on käännetty (erotus ≥ 500 ms kaikilla kierroksilla).');
  return ul.join('\n');
}

/** Oletusajaja: yksi mittaa_sivut.js-prosessi, ympäristö periytyy (token ei kulje argumentteina). */
function ajaaMittaus(argit, env) {
  const r = cp.spawnSync(process.execPath, [path.join(__dirname, 'mittaa_sivut.js')].concat(argit), { stdio: 'inherit', env: env });
  return r.status == null ? 1 : r.status;
}
async function main(argv, deps) {
  const d = deps || {}, kirjaa = d.kirjaa || ((r) => console.log(r)), virhe = d.virhe || ((r) => console.error(r)), env = d.env || process.env, ajaa = d.ajaa || ajaaMittaus;
  const o = lueArgv(argv), v = tarkista(o, env, d.urlSallittu);
  if (v) { virhe(v); return 2; }
  const ulos = o.ulos || path.join('mittaus_tulokset', 'ab_' + new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19));
  const ajoja = o.kierrokset * 2, avauksia = ajoja * o.sivut.split(',').length * o.profiilit.split(',').length * o.toistot * 2;
  kirjaa('A/B VUOROTELLEN · ' + o.kierrokset + ' kierrosta × 2 ajoa = ' + ajoja + ' mittaa_sivut-ajoa (' + avauksia + ' avausta; kokonaiskesto karkeasti ' + Math.ceil(ajoja * 5 * o.toistot / 5) + '–' + Math.ceil(ajoja * 8 * o.toistot / 5) + ' min, ml. kirjautuminen) · sivut ' + o.sivut + ' · profiilit ' + o.profiilit + ' → ' + ulos);
  if (o.kuiva) { for (let k = 0; k < o.kierrokset; k++) kirjaa('  kierros ' + (k + 1) + ': ' + jarjestys(k).join(' → ') + '  (' + jarjestys(k).map((x) => tiedostonimi(k, x)).join(', ') + ')'); return 0; }
  fs.mkdirSync(ulos, { recursive: true });
  const tulokset = [];
  for (let k = 0; k < o.kierrokset; k++) {
    const kr = {};
    for (const x of jarjestys(k)) {
      const tiedosto = path.join(ulos, tiedostonimi(k, x)), url = x === 'A' ? o.a : o.b;
      kirjaa('\n--- kierros ' + (k + 1) + '/' + o.kierrokset + ' · ' + x + ' · ' + url);
      const koodi = ajaa(['--url=' + url, '--tunnukset=' + o.tunnukset, '--seura=' + o.seura, '--toistot=' + o.toistot, '--sivut=' + o.sivut, '--profiilit=' + o.profiilit, '--ulos=' + tiedosto].concat(o.ilmanTokenia ? ['--ilman-tokenia'] : []), env);
      if (koodi !== 0) { virhe('mittaa_sivut.js päättyi koodiin ' + koodi + ' (kierros ' + (k + 1) + ', ' + x + ') — A/B keskeytetty; aiemmat kierrokset: ' + ulos); return koodi; }
      try { kr[x] = JSON.parse(fs.readFileSync(tiedosto, 'utf8')); } catch (e) { virhe('Tulostiedostoa ei voitu lukea: ' + tiedosto); return 1; }
    }
    tulokset.push(kr);
  }
  const yht = yhdista(tulokset), teksti = raporttiTeksti(yht, o);
  fs.writeFileSync(path.join(ulos, 'yhteenveto.json'), JSON.stringify({ meta: { a: o.a, b: o.b, kierrokset: o.kierrokset, toistot: o.toistot, sivut: o.sivut, profiilit: o.profiilit, aika: new Date().toISOString() }, tulos: yht }, null, 2) + '\n');
  kirjaa('\n' + teksti + '\n\nTallennettu: ' + path.join(ulos, 'yhteenveto.json'));
  return 0;
}
if (require.main === module) main(process.argv.slice(2)).then((c) => process.exit(c)).catch((e) => { console.error('Virhe: ' + String(e && e.message || e).split('\n')[0]); process.exit(2); });
module.exports = { lueArgv, tarkista, jarjestys, tiedostonimi, poimi, yhdista, suunta, raporttiTeksti, main, MITTARIT };
