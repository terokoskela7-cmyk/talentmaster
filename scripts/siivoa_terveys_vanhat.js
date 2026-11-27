#!/usr/bin/env node
/* siivoa_terveys_vanhat.js — Tietoturva vaihe 1 / PR 2a (terveys): poistaa vanhat terveyskentät pelaajadokumentista, kun sama tieto on jo `sisainen/terveys`:issa.
 *
 * Poistettavat kentät (lib/tm_sisainen.js tmTerveysKentat): kaytettavyys, loukkaantuminen_tyyppi, loukkaantuminen_alue, loukkaantuminen_pvm, paluu_arvio. Muihin kenttiin ei kosketa.
 * EHTO per kenttä (PM 2.11.): poistetaan VAIN jos `sisainen/terveys` on olemassa, sen `terveysSeuraId` == seura JA sama kenttä on siellä SYVÄSTI SAMA (kanoninen JSON) — myös kun arvo on 'aktiivinen'.
 *   Muuten kenttä JÄÄ ja lasketaan:
 *   terveys_puuttuu — ei terveys-dokumenttia / väärä tai puuttuva terveysSeuraId (→ aja ensin migroi_sisainen_s4.js)
 *   eroaa           — molemmissa, arvo eri (--selita näyttää; PM päättää)
 *   jaanne          — terveys-dokumentti on, mutta kenttää ei ole siellä (esim. palautuneen pelaajan vanhat loukkaantumistiedot ennen dual-writea). Sovellus ei enää näytä niitä
 *                     (PR 2a: terveys-dokumentti on määräävä). EI poisteta tässä PR:ssä — PM päättää (inventaario osa 1 §3 "erikoistapaus").
 * LISÄKSI lasketaan `loukk` (loukkaantumisten lukumäärä, Master näyttää; ei kirjoittajaa) — PM 2.11.: jos 0, näyttö poistetaan Masterista; muuten siivotaan kuten muut. Tämä skripti EI poista sitä.
 * DEPLOY-VARMISTUS (PM 2.11.): --kirjoita vaatii, että tuotannon TalentMaster_Seura.html JA lib/tm_sisainen.js sisältävät merkin TERVEYS_VAIN_SISAINEN (= vanha kenttä ei enää täyty)
 *   ja että niiden Last-Modified on ≥ 1 h sitten (vanhat välilehdet ehtivät latautua uudelleen). Dry-run näyttää tilan, mutta ei vaadi sitä.
 * IDEMPOTENTTI: uusi ajo poistaa 0. TULOSTE: vain lukumäärät per seura (ei nimiä, ei arvoja — GDPR art. 9).
 *   --listaa-id: jäljelle jäävien dokumentti-id:t ja kenttien nimet (ei arvoja).
 *   --selita:    eroaa-kentät ARVOINEEN (vanha → sisainen). SISÄLTÄÄ TERVEYSTIETOA: vain Teron päätteeseen, ei repoon, ei chattiin, ei tiedostoon.
 *
 * AJO (Teron kaista; gcloud ADC, EI palveluavainta). Järjestys: PR 2a deployattu → ≥ 1 h → dry-run → PM kuittaa → --kirjoita → dry-run = 0 → ≥ 24 h → PR 2b (Rules).
 *   Dry-run (OLETUS, ei kirjoita):  node scripts/siivoa_terveys_vanhat.js            [--seura=<id>] [--listaa-id] [--selita]
 *   Kirjoitus:                      node scripts/siivoa_terveys_vanhat.js --kirjoita [--seura=<id>]   (+ kirjoita KIRJOITA vahvistukseksi; --kylla ohittaa kysymyksen)
 */
'use strict';

const S = require('../lib/tm_sisainen.js');
const KENTAT = S.tmTerveysKentat({}).slice();
const MERKKI = 'TERVEYS_VAIN_SISAINEN';
const TUOTANTO = 'https://terokoskela7-cmyk.github.io/talentmaster/';
const TARKISTETTAVAT = ['TalentMaster_Seura.html', 'lib/tm_sisainen.js'];
const ODOTUS_MS = 60 * 60 * 1000;
const onArvo = (v) => v !== undefined && v !== null;
const kanon = (x) => JSON.stringify(x, (k, v) => (v && typeof v === 'object' && !Array.isArray(v)) ? Object.keys(v).sort().reduce((o, a) => { o[a] = v[a]; return o; }, {}) : v);
const sama = (a, b) => kanon(a) === kanon(b);

/* PURE: mitä tälle pelaajalle tehtäisiin? → { luokka, poista:[kentät], jata:{terveys_puuttuu, eroaa, jaanne}, eroavat:[{kentta, vanha, uusi}], loukk:bool }
   luokka: 'ei_terveys' | 'poista' (kaikki löytyneet poistetaan) | 'osittain' | 'jatetaan' (mitään ei voi poistaa) */
function suunnittele(pelaaja, terveys, sid) {
  const p = pelaaja || {}, t = terveys || null, seuraOk = !!t && t.terveysSeuraId === sid;
  const loukk = onArvo(p.loukk);
  const loydetyt = KENTAT.filter((k) => onArvo(p[k]));
  const jata = { terveys_puuttuu: [], eroaa: [], jaanne: [] }, poista = [], eroavat = [];
  if (!loydetyt.length) return { luokka: 'ei_terveys', poista, jata, eroavat, loukk };
  for (const k of loydetyt) {
    if (!seuraOk) jata.terveys_puuttuu.push(k);
    else if (!onArvo(t[k])) jata.jaanne.push(k);
    else if (!sama(p[k], t[k])) { jata.eroaa.push(k); eroavat.push({ kentta: k, vanha: p[k], uusi: t[k] }); }
    else poista.push(k);
  }
  const jaa = jata.terveys_puuttuu.length + jata.eroaa.length + jata.jaanne.length;
  return { luokka: !poista.length ? 'jatetaan' : jaa ? 'osittain' : 'poista', poista, jata, eroavat, loukk };
}

/* Deploy-varmistus: deps.fetch (injektoitava), deps.nyt (ms). → { ok, syy, tiedostot:[{polku, merkki, muokattu, ikaMin}] } */
async function tarkistaDeploy(deps) {
  const f = deps.fetch, nyt = deps.nyt || Date.now(), tiedostot = [];
  for (const polku of TARKISTETTAVAT) {
    let r; try { r = await f(TUOTANTO + polku + '?siivous=' + nyt, { cache: 'no-store' }); } catch (e) { return { ok: false, syy: polku + ': haku epäonnistui (' + (e && e.message) + ')', tiedostot }; }
    if (!r || !r.ok) return { ok: false, syy: polku + ': HTTP ' + (r && r.status), tiedostot };
    const teksti = await r.text(), lm = r.headers && r.headers.get ? r.headers.get('last-modified') : null, muokattu = lm ? Date.parse(lm) : NaN;
    const rivi = { polku, merkki: teksti.indexOf(MERKKI) >= 0, muokattu: isNaN(muokattu) ? null : new Date(muokattu).toISOString(), ikaMin: isNaN(muokattu) ? null : Math.floor((nyt - muokattu) / 60000) };
    tiedostot.push(rivi);
    if (!rivi.merkki) return { ok: false, syy: polku + ': merkki ' + MERKKI + ' puuttuu tuotannosta (PR 2a ei ole deployattu)', tiedostot };
    if (rivi.muokattu === null) return { ok: false, syy: polku + ': Last-Modified puuttuu — deployn ikää ei voi todeta', tiedostot };
    if (nyt - muokattu < ODOTUS_MS) return { ok: false, syy: polku + ': deploysta vasta ' + rivi.ikaMin + ' min (vaaditaan ≥ 60)', tiedostot };
  }
  return { ok: true, syy: null, tiedostot };
}

/* Ajo injektoidulla db:llä. deps: { db, kirjoita, seura, loki, BATCH, DELETE, listaaId, selita, deploy (tarkistaDeploy-tulos; pakollinen ok kun kirjoita) } → yhteenveto */
async function aja(deps) {
  const db = deps.db, loki = deps.loki || (() => {}), BATCH = deps.BATCH || 400, DELETE = deps.DELETE;
  if (deps.kirjoita && DELETE === undefined) throw new Error('siivoa_terveys_vanhat: DELETE-sentinel puuttuu');
  if (deps.kirjoita && !(deps.deploy && deps.deploy.ok)) throw new Error('siivoa_terveys_vanhat: deploy-varmistus ei läpäissyt — ' + ((deps.deploy && deps.deploy.syy) || 'tarkistusta ei tehty'));
  const seurat = deps.seura ? [deps.seura] : (await db.collection('seurat').get()).docs.map((d) => d.id);
  const yht = { seuraa: seurat.length, pelaajia: 0, ei_terveys: 0, poista: 0, osittain: 0, jatetaan: 0, kenttia_poistetaan: 0, jaa_terveys_puuttuu: 0, jaa_eroaa: 0, jaa_jaanne: 0, loukk: 0, kirjoitettu: 0, kentat: {} };
  KENTAT.forEach((k) => { yht.kentat[k] = 0; });
  const kirj = [], idt = [], selitykset = [];
  for (const sid of seurat) {
    const snap = await db.collection('seurat').doc(sid).collection('pelaajat').get();
    const r = { ei_terveys: 0, poista: 0, osittain: 0, jatetaan: 0, kenttia: 0, puuttuu: 0, eroaa: 0, jaanne: 0, loukk: 0 };
    for (const d of snap.docs) {
      const ts = await d.ref.collection('sisainen').doc('terveys').get();
      const pl = suunnittele(d.data() || {}, ts.exists ? ts.data() : null, sid);
      r[pl.luokka]++; r.kenttia += pl.poista.length; r.puuttuu += pl.jata.terveys_puuttuu.length; r.eroaa += pl.jata.eroaa.length; r.jaanne += pl.jata.jaanne.length; if (pl.loukk) r.loukk++;
      pl.poista.forEach((k) => { yht.kentat[k]++; });
      if (pl.poista.length) kirj.push({ ref: d.ref, poista: pl.poista });
      const jaa = Object.keys(pl.jata).filter((k) => pl.jata[k].length).map((k) => k + ':' + pl.jata[k].join(','));
      if (deps.listaaId && (jaa.length || pl.loukk)) idt.push(sid + '/' + d.id + ' (' + jaa.concat(pl.loukk ? ['loukk'] : []).join(' ') + ')');
      if (deps.selita) pl.eroavat.forEach((e) => selitykset.push(sid + '/' + d.id + ' ' + e.kentta + ': vanha ' + JSON.stringify(e.vanha) + ' → sisainen ' + JSON.stringify(e.uusi)));
    }
    yht.pelaajia += snap.docs.length; ['ei_terveys', 'poista', 'osittain', 'jatetaan'].forEach((k) => { yht[k] += r[k]; });
    yht.kenttia_poistetaan += r.kenttia; yht.jaa_terveys_puuttuu += r.puuttuu; yht.jaa_eroaa += r.eroaa; yht.jaa_jaanne += r.jaanne; yht.loukk += r.loukk;
    loki('[' + sid + '] pelaajia ' + snap.docs.length + ' · ei vanhoja terveyskenttiä ' + r.ei_terveys + ' · poistetaan kokonaan ' + r.poista + ' · osittain ' + r.osittain + ' · ei voi poistaa ' + r.jatetaan
      + ' · kenttiä poistetaan ' + r.kenttia + ' · jää (terveys puuttuu) ' + r.puuttuu + ' · jää (eroaa) ' + r.eroaa + ' · jää (jäänne) ' + r.jaanne + ' · loukk-kenttä ' + r.loukk);
  }
  idt.forEach((x) => loki('  jää: ' + x));
  if (selitykset.length) { loki('--selita (SISÄLTÄÄ TERVEYSTIETOA — ei repoon, ei chattiin):'); selitykset.forEach((x) => loki('  eroaa: ' + x)); }
  if (deps.kirjoita) {
    for (let i = 0; i < kirj.length; i += BATCH) {
      const b = db.batch();
      kirj.slice(i, i + BATCH).forEach((k) => { const u = {}; k.poista.forEach((f) => { u[f] = DELETE; }); b.update(k.ref, u); });
      await b.commit(); yht.kirjoitettu += Math.min(BATCH, kirj.length - i);
    }
  }
  return yht;
}

async function main() {
  const path = require('path'), readline = require('readline');
  let admin; try { admin = require(path.join(__dirname, '..', 'functions', 'node_modules', 'firebase-admin')); } catch (e) { admin = require('firebase-admin'); }
  const argv = process.argv.slice(2), KIRJOITA = argv.includes('--kirjoita'), KYLLA = argv.includes('--kylla'), LISTAA = argv.includes('--listaa-id'), SELITA = argv.includes('--selita');
  const seura = (argv.find((a) => a.indexOf('--seura=') === 0) || '').split('=')[1] || null;
  if (KIRJOITA && SELITA) throw new Error('--selita vain dry-runissa');
  console.log('=== Vanhat terveyskentät pois pelaajadokumentista · ' + (KIRJOITA ? 'KIRJOITUS (vaatii vahvistuksen)' : 'DRY-RUN (ei kirjoita)') + ' ===');
  const deploy = await tarkistaDeploy({ fetch: globalThis.fetch });
  deploy.tiedostot.forEach((t) => console.log('deploy: ' + t.polku + ' · merkki ' + (t.merkki ? 'OK' : 'PUUTTUU') + ' · muokattu ' + (t.muokattu || '?') + ' (' + (t.ikaMin === null ? '?' : t.ikaMin) + ' min sitten)'));
  console.log('deploy-varmistus: ' + (deploy.ok ? 'OK' : 'EI — ' + deploy.syy));
  if (KIRJOITA && !deploy.ok) { console.log('Peruttu — mitään ei kirjoitettu.'); process.exitCode = 2; return; }
  admin.initializeApp({ projectId: 'talentmaster-pilot', credential: admin.credential.applicationDefault() });   // gcloud ADC
  const db = admin.firestore();
  if (KIRJOITA && !KYLLA) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const vastaus = await new Promise((res) => rl.question('Kirjoita KIRJOITA vahvistukseksi: ', res)); rl.close();
    if (vastaus.trim() !== 'KIRJOITA') { console.log('Peruttu — mitään ei kirjoitettu.'); return; }
  }
  const y = await aja({ db, kirjoita: KIRJOITA, seura, listaaId: LISTAA, selita: SELITA, deploy, DELETE: admin.firestore.FieldValue.delete(), loki: console.log });
  console.log('YHTEENVETO', JSON.stringify(y));
  if (!KIRJOITA) console.log('DRY-RUN — mitään ei kirjoitettu. Kirjoitus: --kirjoita (vasta kun PM on kuitannut tämän tulosteen)');
}

if (require.main === module) main().catch((e) => { console.error('VIRHE:', e && e.message ? e.message : e); process.exit(1); });
else if (!(typeof process !== 'undefined' && process.env && process.env.VITEST)) throw new Error('scripts/siivoa_terveys_vanhat.js käsittelee tuotantodataa — aja suoraan: node scripts/siivoa_terveys_vanhat.js (ei require/import)');
module.exports = { KENTAT, MERKKI, TARKISTETTAVAT, suunnittele, tarkistaDeploy, aja };
