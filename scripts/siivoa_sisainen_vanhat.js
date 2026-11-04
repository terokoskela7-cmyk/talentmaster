#!/usr/bin/env node
/* siivoa_sisainen_vanhat.js — Tietoturva vaihe 1 / PR 3 (henkilökunnan A-kentät): poistaa vanhat A-arvot pelaajadokumentista, kun sama tieto on jo `sisainen/tiedot`:issa.
 * Lähde: .briefit/INVENTAARIO_VAIHE1_PR2.md §5–§6 ("siivous"). Malli: siivoa_terveys_vanhat.js (samat säännöt, liput ja deploy-varmistus).
 *
 * MITÄ (yksi lähde: lib/tm_sisainen.js):
 *   1. A-kentät = tmSisainenAKentat() ilman D3:a (siivoa_d3_vanhat.js) ja terveyttä (siivoa_terveys_vanhat.js): henkilokunta + adar_sisainen + arviointi + kypsyys_sisainen + talentti.
 *   2. jaksofokus.<A> (RYHMAT.jaksofokus_sisainen) ↔ sisainen.jaksofokus_sisainen.<A>. Jos sisainen on leimattu toiselle jaksolle (jakso_avain), dual-read näyttää vanhan → JÄÄ (toinen_jakso).
 *   3. JAETUT ARVOT B-muotoon (PR 2d): signaali — vain talenttisignaali poistetaan ('phv' jää) · havainto_porras_ehdotus — hist_n kirjoitetaan SAMASSA päivityksessä kuin hist poistetaan
 *      · biologinenIka_viimeisin — pelaajalle jää tmBioIkaJaa-muoto (phv_tila, phv_tila_koodi, phv_ika, ika_mittaushetkella, mittauspaiva).
 *   4. Tunnisteet (PM 22.10., ei lukijoita): `tuoja` pelaajadokumentista; tuojaUid, tallensiUid, kirjaaja, mittaaja dokumenteista testitulokset/* ja biologinen_ika/* (tulokset jäävät).
 *   EI: talenttiOhjelma (C), tavoitteet (C), jaksofokus_historia / historia_sisainen (R8, oma viipale), D3, terveys.
 * EHTO (kohdat 1–3, PM 2.11.): poistetaan VAIN jos `sisainen/tiedot` on olemassa, sen `seuraId` == seura JA arvo on siellä SYVÄSTI SAMA (kanoninen JSON).
 *   Poikkeus: syvä kenttä (arviointi_havaittu, kirjoitetaan avaimittain) poistetaan myös, kun sisainen sisältää kaikki vanhan kentän avaimet samoina (sisainen = yläjoukko).
 *   Muuten JÄÄ ja lasketaan: sisainen_puuttuu (→ aja ensin migraatio, ks. AJO) · eroaa (--selita näyttää; PM päättää) · toinen_jakso.
 * DEPLOY-VARMISTUS (Tero 4.11.: ajo vasta kun 2d on ollut tuotannossa ≥ 24 h): --kirjoita vaatii, että
 *   (a) tuotannon tiedostot sisältävät 2d:n merkit (lib/tm_sisainen.js tmBioIkaJaa, Master ja ADAR TM_SISAINEN_PUUTTUU) = 2d ei ole peruttu, ja
 *   (b) ENSIMMÄINEN onnistunut Pages- JA Functions-deploy #1179:n mergen jälkeen valmistui ≥ 24 h sitten (GitHub Actions API; Last-Modified nollautuu joka deployssa, joten se ei kelpaa).
 *   Dry-run näyttää tilan, mutta ei vaadi sitä.
 * IDEMPOTENTTI: uusi ajo poistaa 0. TULOSTE: vain lukumäärät per seura (ei nimiä, ei arvoja).
 *   --listaa-id: jäljelle jäävien dokumentti-id:t ja kenttien nimet (ei arvoja).
 *   --selita:    eroaa-kentät ARVOINEEN (vanha → sisainen). SISÄLTÄÄ HENKILÖKUNNAN ARVIOITA: vain Teron päätteeseen, ei repoon, ei chattiin, ei tiedostoon.
 *
 * AJO (Teron kaista; gcloud ADC, EI palveluavainta). Järjestys:
 *   2d deployattu (Pages + functions) → node scripts/migroi_sisainen_s4.js (dry-run → --kirjoita; kopioi mm. biologinenIka_viimeisin:n sisainen:iin, 2d lisäsi sen ryhmään)
 *   → ≥ 24 h → node scripts/siivoa_sisainen_vanhat.js (dry-run) → PM kuittaa → --kirjoita → dry-run = 0 → ≥ 24 h → PR 2e (Rules hylkää A-avaimet pelaajadokumentissa).
 *   Dry-run (OLETUS, ei kirjoita):  node scripts/siivoa_sisainen_vanhat.js            [--seura=<id>] [--listaa-id] [--selita]
 *   Kirjoitus:                      node scripts/siivoa_sisainen_vanhat.js --kirjoita [--seura=<id>]   (+ kirjoita KIRJOITA vahvistukseksi; --kylla ohittaa kysymyksen)
 */
'use strict';

const S = require('../lib/tm_sisainen.js');
const _vain = S.tmSisainenVainSisaiset(), _terv = S.tmTerveysKentat();
const KENTAT = S.tmSisainenAKentat().filter((k) => _vain.indexOf(k) < 0 && _terv.indexOf(k) < 0);
const SYVA = S.tmS4SyvaKentat();
const JF_A = S.RYHMAT.jaksofokus_sisainen.kentat.map((k) => k.replace(/^jaksofokus\./, ''));
const TUNNISTEET = ['tuojaUid', 'tallensiUid', 'kirjaaja', 'mittaaja'], ALIKOKOELMAT = ['testitulokset', 'biologinen_ika'];
const MERKIT = [{ polku: 'lib/tm_sisainen.js', merkki: 'tmBioIkaJaa' }, { polku: 'TalentMaster_Master_v16.html', merkki: 'TM_SISAINEN_PUUTTUU' }, { polku: 'TalentMaster_ADAR_Pikakortti.html', merkki: 'TM_SISAINEN_PUUTTUU' }];
const WORKFLOWT = ['deploy-pages.yml', 'deploy-functions.yml'];
const MERGE_2D = '2026-11-04T17:27:53Z';   // #1179 (PR 2d) merge mainiin
const TUOTANTO = 'https://terokoskela7-cmyk.github.io/talentmaster/', API = 'https://api.github.com/repos/terokoskela7-cmyk/talentmaster';
const ODOTUS_MS = 24 * 60 * 60 * 1000;
const onArvo = (v) => v !== undefined && v !== null;
const olio = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
const kanon = (x) => JSON.stringify(x, (k, v) => (v && typeof v === 'object' && !Array.isArray(v)) ? Object.keys(v).sort().reduce((o, a) => { o[a] = v[a]; return o; }, {}) : v);
const sama = (a, b) => kanon(a) === kanon(b);
const ylajoukko = (vanha, sis) => olio(vanha) && olio(sis) && Object.keys(vanha).every((a) => sama(vanha[a], sis[a]));

/* PURE: pelaajadokumentin suunnitelma → { paivitys: {polku: arvo|'DELETE'}, poista:[nimet], jata:{sisainen_puuttuu, eroaa, toinen_jakso}, eroavat:[{kentta, vanha, uusi}], luokka }
   paivitys-arvo 'DELETE' = FieldValue.delete() (aja vaihtaa sentinelin). luokka: 'ei_a' | 'poista' | 'osittain' | 'jatetaan'. */
function suunnittele(pelaaja, sisainen, sid) {
  const p = pelaaja || {}, s = sisainen || null, seuraOk = !!s && s.seuraId === sid;
  const paivitys = {}, poista = [], jata = { sisainen_puuttuu: [], eroaa: [], toinen_jakso: [] }, eroavat = [];
  let loytyi = 0;
  const vertaa = (nimi, vanha, sis, polku, uusi, syva) => {   // uusi === undefined → poisto; muuten arvo (B-muoto)
    loytyi++;
    if (!seuraOk || sis === undefined) return jata.sisainen_puuttuu.push(nimi);
    if (!sama(vanha, sis) && !(syva && ylajoukko(vanha, sis))) { jata.eroaa.push(nimi); return eroavat.push({ kentta: nimi, vanha, uusi: sis }); }
    poista.push(nimi); Object.assign(paivitys, polku);
  };
  KENTAT.forEach((k) => { if (onArvo(p[k])) vertaa(k, p[k], s ? s[k] : undefined, { [k]: 'DELETE' }, undefined, SYVA.indexOf(k) >= 0); });
  if (olio(p.jaksofokus)) {
    const js = s && olio(s.jaksofokus_sisainen) ? s.jaksofokus_sisainen : {}, ja = S.tmJaksoAvain(p.jaksofokus);
    JF_A.forEach((a) => {
      if (!onArvo(p.jaksofokus[a])) return;
      if (ja && typeof js.jakso_avain === 'string' && js.jakso_avain !== ja) { loytyi++; return jata.toinen_jakso.push('jaksofokus.' + a); }   // dual-read näyttää vanhan → ei poisteta
      vertaa('jaksofokus.' + a, p.jaksofokus[a], js[a], { ['jaksofokus.' + a]: 'DELETE' });
    });
  }
  if (onArvo(p.signaali) && S.tmSignaaliJaa(p.signaali).pelaaja === null) vertaa('signaali', p.signaali, s ? s.signaali : undefined, { signaali: 'DELETE' });   // 'phv' ja muut jäävät
  const e = p.havainto_porras_ehdotus;
  if (olio(e) && Array.isArray(e.hist)) {
    const polut = { 'havainto_porras_ehdotus.hist_n': e.hist.length, 'havainto_porras_ehdotus.hist': 'DELETE' };   // hist_n samassa päivityksessä (P7 lukee hist_n ?? hist.length)
    if (!e.hist.length) { loytyi++; poista.push('havainto_porras_ehdotus.hist'); Object.assign(paivitys, polut); }   // tyhjä hist: ei raakapisteitä, ei menetettävää
    else vertaa('havainto_porras_ehdotus.hist', e.hist, s ? s.havainto_porras_hist : undefined, polut);
  }
  const b = p.biologinenIka_viimeisin, bB = S.tmBioIkaJaa(b).pelaaja;
  if (olio(b) && Object.keys(bB).length < Object.keys(b).length) vertaa('biologinenIka_viimeisin', b, s ? s.biologinenIka_viimeisin : undefined, { biologinenIka_viimeisin: bB });
  if (p.tuoja !== undefined) { loytyi++; poista.push('tuoja'); paivitys.tuoja = 'DELETE'; }   // tunniste: ei sisainen-ehtoa (PM 22.10.)
  const jaa = jata.sisainen_puuttuu.length + jata.eroaa.length + jata.toinen_jakso.length;
  return { luokka: !loytyi ? 'ei_a' : !poista.length ? 'jatetaan' : jaa ? 'osittain' : 'poista', paivitys, poista, jata, eroavat };
}
/* PURE: testitulokset/biologinen_ika-dokumentin tunnisteet → poistettavat kentät */
function tunnisteet(d) { return TUNNISTEET.filter((k) => d && d[k] !== undefined); }

/* Deploy-varmistus. deps: { fetch, nyt (ms), token? } → { ok, syy, merkit:[{polku, ok}], deployt:[{workflow, valmis, ikaH}] } */
async function tarkistaDeploy(deps) {
  const f = deps.fetch, nyt = deps.nyt || Date.now(), merkit = [], deployt = [], ei = (syy) => ({ ok: false, syy, merkit, deployt });
  for (const m of MERKIT) {
    let r; try { r = await f(TUOTANTO + m.polku + '?siivous=' + nyt, { cache: 'no-store' }); } catch (e) { return ei(m.polku + ': haku epäonnistui (' + (e && e.message) + ')'); }
    if (!r || !r.ok) return ei(m.polku + ': HTTP ' + (r && r.status));
    const ok = (await r.text()).indexOf(m.merkki) >= 0; merkit.push({ polku: m.polku, ok });
    if (!ok) return ei(m.polku + ': merkki ' + m.merkki + ' puuttuu tuotannosta (2d ei ole tuotannossa)');
  }
  const otsakkeet = Object.assign({ Accept: 'application/vnd.github+json' }, deps.token ? { Authorization: 'Bearer ' + deps.token } : {});
  for (const wf of WORKFLOWT) {
    let runs = [];
    for (let sivu = 1; sivu <= 5; sivu++) {   // GitHub palauttaa uusimman ensin → haetaan kunnes sivu vajaa
      let r; try { r = await f(API + '/actions/workflows/' + wf + '/runs?branch=main&status=success&per_page=100&page=' + sivu + '&created=%3E%3D' + MERGE_2D, { headers: otsakkeet }); } catch (e) { return ei(wf + ': GitHub-haku epäonnistui (' + (e && e.message) + ')'); }
      if (!r || !r.ok) return ei(wf + ': GitHub HTTP ' + (r && r.status));
      const j = await r.json(), osa = (j && j.workflow_runs) || []; runs = runs.concat(osa); if (osa.length < 100) break;
    }
    const ok = runs.filter((x) => x.head_branch === 'main' && x.conclusion === 'success' && Date.parse(x.created_at) >= Date.parse(MERGE_2D)).sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
    if (!ok.length) return ei(wf + ': ei onnistunutta deployta #1179:n mergen (' + MERGE_2D + ') jälkeen');
    const valmis = Date.parse(ok[0].updated_at), ikaH = Math.floor((nyt - valmis) / 36e5); deployt.push({ workflow: wf, valmis: new Date(valmis).toISOString(), ikaH });
    if (nyt - valmis < ODOTUS_MS) return ei(wf + ': 2d tuotannossa vasta ' + ikaH + ' h (vaaditaan ≥ 24)');
  }
  return { ok: true, syy: null, merkit, deployt };
}

/* Ajo injektoidulla db:llä. deps: { db, kirjoita, seura, loki, BATCH, DELETE, listaaId, selita, deploy (tarkistaDeploy-tulos; pakollinen ok kun kirjoita) } → yhteenveto */
async function aja(deps) {
  const db = deps.db, loki = deps.loki || (() => {}), BATCH = deps.BATCH || 400, DELETE = deps.DELETE;
  if (deps.kirjoita && DELETE === undefined) throw new Error('siivoa_sisainen_vanhat: DELETE-sentinel puuttuu');
  if (deps.kirjoita && !(deps.deploy && deps.deploy.ok)) throw new Error('siivoa_sisainen_vanhat: deploy-varmistus ei läpäissyt — ' + ((deps.deploy && deps.deploy.syy) || 'tarkistusta ei tehty'));
  const seurat = deps.seura ? [deps.seura] : (await db.collection('seurat').get()).docs.map((d) => d.id);
  const yht = { seuraa: seurat.length, pelaajia: 0, ei_a: 0, poista: 0, osittain: 0, jatetaan: 0, kenttia_poistetaan: 0, jaa_sisainen_puuttuu: 0, jaa_eroaa: 0, jaa_toinen_jakso: 0,
    alidokumentteja: 0, alikenttia: 0, kirjoitettu: 0, kentat: {} };
  const ops = [], idt = [], selitykset = [];
  for (const sid of seurat) {
    const snap = await db.collection('seurat').doc(sid).collection('pelaajat').get();
    const r = { ei_a: 0, poista: 0, osittain: 0, jatetaan: 0, kenttia: 0, puuttuu: 0, eroaa: 0, toinen: 0, alidok: 0, alik: 0 };
    for (const d of snap.docs) {
      const ss = await d.ref.collection('sisainen').doc('tiedot').get();
      const pl = suunnittele(d.data() || {}, ss.exists ? ss.data() : null, sid);
      r[pl.luokka]++; r.kenttia += pl.poista.length; r.puuttuu += pl.jata.sisainen_puuttuu.length; r.eroaa += pl.jata.eroaa.length; r.toinen += pl.jata.toinen_jakso.length;
      pl.poista.forEach((k) => { yht.kentat[k] = (yht.kentat[k] || 0) + 1; });
      if (pl.poista.length) ops.push({ ref: d.ref, paivitys: pl.paivitys });
      for (const ak of ALIKOKOELMAT) {
        const as = await d.ref.collection(ak).get();
        as.docs.forEach((a) => { const t = tunnisteet(a.data()); if (!t.length) return; r.alidok++; r.alik += t.length; const u = {}; t.forEach((k) => { u[k] = 'DELETE'; yht.kentat[ak + '/*.' + k] = (yht.kentat[ak + '/*.' + k] || 0) + 1; }); ops.push({ ref: a.ref, paivitys: u }); });
      }
      const jaa = Object.keys(pl.jata).filter((k) => pl.jata[k].length).map((k) => k + ':' + pl.jata[k].join(','));
      if (deps.listaaId && jaa.length) idt.push(sid + '/' + d.id + ' (' + jaa.join(' ') + ')');
      if (deps.selita) pl.eroavat.forEach((x) => selitykset.push(sid + '/' + d.id + ' ' + x.kentta + ': vanha ' + JSON.stringify(x.vanha) + ' → sisainen ' + JSON.stringify(x.uusi)));
    }
    yht.pelaajia += snap.docs.length; ['ei_a', 'poista', 'osittain', 'jatetaan'].forEach((k) => { yht[k] += r[k]; });
    yht.kenttia_poistetaan += r.kenttia; yht.jaa_sisainen_puuttuu += r.puuttuu; yht.jaa_eroaa += r.eroaa; yht.jaa_toinen_jakso += r.toinen; yht.alidokumentteja += r.alidok; yht.alikenttia += r.alik;
    loki('[' + sid + '] pelaajia ' + snap.docs.length + ' · ei vanhoja A-kenttiä ' + r.ei_a + ' · siivotaan kokonaan ' + r.poista + ' · osittain ' + r.osittain + ' · ei voi siivota ' + r.jatetaan
      + ' · kenttiä ' + r.kenttia + ' · jää (sisainen puuttuu) ' + r.puuttuu + ' · jää (eroaa) ' + r.eroaa + ' · jää (toinen jakso) ' + r.toinen + ' · tunnisteet: ' + r.alidok + ' alidokumenttia / ' + r.alik + ' kenttää');
  }
  idt.forEach((x) => loki('  jää: ' + x));
  if (selitykset.length) { loki('--selita (SISÄLTÄÄ HENKILÖKUNNAN ARVIOITA — ei repoon, ei chattiin):'); selitykset.forEach((x) => loki('  eroaa: ' + x)); }
  if (deps.kirjoita) {
    for (let i = 0; i < ops.length; i += BATCH) {
      const b = db.batch();
      ops.slice(i, i + BATCH).forEach((o) => { const u = {}; Object.keys(o.paivitys).forEach((k) => { u[k] = o.paivitys[k] === 'DELETE' ? DELETE : o.paivitys[k]; }); b.update(o.ref, u); });
      await b.commit(); yht.kirjoitettu += Math.min(BATCH, ops.length - i);
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
  console.log('=== Vanhat A-kentät pois pelaajadokumentista (PR 3) · ' + (KIRJOITA ? 'KIRJOITUS (vaatii vahvistuksen)' : 'DRY-RUN (ei kirjoita)') + ' ===');
  const deploy = await tarkistaDeploy({ fetch: globalThis.fetch, token: process.env.GITHUB_TOKEN || null });
  deploy.merkit.forEach((m) => console.log('deploy: ' + m.polku + ' · merkki ' + (m.ok ? 'OK' : 'PUUTTUU')));
  deploy.deployt.forEach((x) => console.log('deploy: ' + x.workflow + ' · ensimmäinen 2d-deploy valmis ' + x.valmis + ' (' + x.ikaH + ' h sitten)'));
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
  if (!KIRJOITA) console.log('DRY-RUN — mitään ei kirjoitettu. Kirjoitus: --kirjoita (vasta kun PM on kuitannut tämän tulosteen ja 2d on ollut tuotannossa ≥ 24 h)');
}

if (require.main === module) main().catch((e) => { console.error('VIRHE:', e && e.message ? e.message : e); process.exit(1); });
else if (!(typeof process !== 'undefined' && process.env && process.env.VITEST)) throw new Error('scripts/siivoa_sisainen_vanhat.js käsittelee tuotantodataa — aja suoraan: node scripts/siivoa_sisainen_vanhat.js (ei require/import)');
module.exports = { KENTAT, JF_A, TUNNISTEET, ALIKOKOELMAT, MERKIT, WORKFLOWT, MERGE_2D, suunnittele, tunnisteet, tarkistaDeploy, aja };
