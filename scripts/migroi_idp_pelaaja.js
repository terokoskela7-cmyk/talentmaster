#!/usr/bin/env node
/* migroi_idp_pelaaja.js — Vaihe 1 / PR 1f-2: kopioi idp_kausi/{vuosi} → idp_pelaaja/{vuosi} (pelaajan §7.22-muotoinen IDP; löydös 7).
 *
 * Mitä: jokaiselle pelaajan idp_kausi-dokumentille (kaikki vuodet) kirjoitetaan idp_pelaaja/{vuosi} = { tavoitteet: puhdistettu (lib/tm_idp_pelaaja_dok.js tmIdpPelaajaTavoitteet), pelaaja_sitoumus, paivitetty }.
 * KOPIOI, EI POISTA: idp_kausi jää ennalleen (henkilökunnan raaka A-data; pelaajalta suljetaan siivouksessa lipun käännön jälkeen).
 * IDEMPOTENTTI (idp_kausi on tavoitteiden totuus dual-writen aikana):
 *   (1) idp_pelaaja puuttuu → luo (tavoitteet + sitoumus);
 *   (2) tavoitteet: puhdistettu idp_kausi ≠ idp_pelaaja.tavoitteet → idp_pelaaja on VANHENTUNUT → korvataan (vanhentunut++); samat → ei kirjoitusta;
 *   (3) pelaaja_sitoumus: idp_pelaaja VOITTAA (pelaaja/valmentaja voi olla kirjoittanut sinne uudemman); puuttuvat lehdet täydennetään idp_kausi:sta; eri arvo → eroaa++ (ei ylikirjoitusta).
 * Dokumentit joissa ei tavoitteita eikä sitoumusta ohitetaan (ei_dataa). Kirjoitus: yksi set mergeFields per dokumentti.
 * TULOSTE: vain lukumäärät (seuroittain) — ei nimiä, ei id:itä, ei sisältöä.
 *
 * AJO (Teron kaista; gcloud ADC, EI palveluavainta). EI AJETA ennen kuin Rules v3.71 on deployattu (on) ja PM on kuitannut dry-runin:
 *   Dry-run (OLETUS, ei kirjoita):                    node scripts/migroi_idp_pelaaja.js            [--seura=<id>]
 *   Kirjoitus (vasta dry-run-tarkistuksen jälkeen):   node scripts/migroi_idp_pelaaja.js --kirjoita [--seura=<id>]   (+ kirjoita KIRJOITA vahvistukseksi; --kylla ohittaa kysymyksen)
 */
'use strict';

const D = require('../lib/tm_idp_pelaaja_dok.js');
const onArvo = (v) => v !== undefined && v !== null;
const onKartta = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
const kanon = (x) => JSON.stringify(x, (k, v) => (v && typeof v === 'object' && !Array.isArray(v)) ? Object.keys(v).sort().reduce((o, a) => { o[a] = v[a]; return o; }, {}) : v);

/* Lehtitason täydennys: idp_pelaaja voittaa, puuttuvat lehdet idp_kausi:sta. → { tulos, lisatty, eroaa } */
function taydenna(vanha, uusi) {
  const tulos = Object.assign({}, vanha); let lisatty = 0, eroaa = 0;
  Object.keys(uusi).forEach((k) => {
    if (!onArvo(uusi[k])) return;
    if (!onArvo(vanha[k])) { tulos[k] = uusi[k]; lisatty++; }
    else if (onKartta(vanha[k]) && onKartta(uusi[k])) { const r = taydenna(vanha[k], uusi[k]); tulos[k] = r.tulos; lisatty += r.lisatty; eroaa += r.eroaa; }
    else if (kanon(vanha[k]) !== kanon(uusi[k])) eroaa++;
  });
  return { tulos, lisatty, eroaa };
}

/* PURE: mitä tälle vuosidokumentille kirjoitettaisiin? kausi = idp_kausi/{vuosi}.data(), pelaaja = idp_pelaaja/{vuosi}.data() | null
   → { luokka:'ei_dataa'|'jo_siirretty'|'kopioi', uusi:bool, vanhentunut:bool, eroaa, data|null, mergeFields|null } */
function suunnittele(kausi, pelaaja, nytISO) {
  const k = onKartta(kausi) ? kausi : {}, p = onKartta(pelaaja) ? pelaaja : null;
  const onTav = Array.isArray(k.tavoitteet), onSit = onKartta(k.pelaaja_sitoumus);
  if (!onTav && !onSit) return { luokka: 'ei_dataa', uusi: false, vanhentunut: false, eroaa: 0, data: null, mergeFields: null };
  const data = {}, kentat = []; let vanhentunut = false, eroaa = 0;
  if (onTav) {
    const puhdas = D.tmIdpPelaajaTavoitteet(k.tavoitteet);
    if (!p || !Array.isArray(p.tavoitteet)) { data.tavoitteet = puhdas; kentat.push('tavoitteet'); }
    else if (kanon(puhdas) !== kanon(p.tavoitteet)) { data.tavoitteet = puhdas; kentat.push('tavoitteet'); vanhentunut = true; }
  }
  if (onSit) {
    if (!p || !onKartta(p.pelaaja_sitoumus)) { data.pelaaja_sitoumus = k.pelaaja_sitoumus; kentat.push('pelaaja_sitoumus'); }
    else { const r = taydenna(p.pelaaja_sitoumus, k.pelaaja_sitoumus); eroaa += r.eroaa; if (r.lisatty) { data.pelaaja_sitoumus = r.tulos; kentat.push('pelaaja_sitoumus'); } }
  }
  if (!kentat.length) return { luokka: 'jo_siirretty', uusi: false, vanhentunut: false, eroaa, data: null, mergeFields: null };
  data.paivitetty = nytISO;
  return { luokka: 'kopioi', uusi: !p, vanhentunut, eroaa, data, mergeFields: kentat.concat(['paivitetty']) };
}

/* Ajo injektoidulla db:llä (testattavissa fake-Firestorella). deps: { db, kirjoita, seura, nytISO, loki(fn), BATCH } → yhteenveto */
async function aja(deps) {
  const db = deps.db, loki = deps.loki || (() => {}), BATCH = deps.BATCH || 400, nytISO = deps.nytISO || new Date().toISOString();
  const seurat = deps.seura ? [deps.seura] : (await db.collection('seurat').get()).docs.map((d) => d.id);
  const yht = { seuraa: seurat.length, pelaajia: 0, dokumentteja: 0, ei_dataa: 0, jo_siirretty: 0, kopioi: 0, uusia: 0, vanhentunut: 0, eroaa: 0, kirjoitettu: 0 };
  const kirj = [];
  for (const sid of seurat) {
    const snap = await db.collection('seurat').doc(sid).collection('pelaajat').get();
    const r = { dok: 0, ei_dataa: 0, jo_siirretty: 0, kopioi: 0, uusia: 0, vanh: 0, eroaa: 0 };
    for (const d of snap.docs) {
      const kausit = await d.ref.collection('idp_kausi').get();
      for (const kd of kausit.docs) {
        const pref = d.ref.collection('idp_pelaaja').doc(kd.id), ps = await pref.get();
        const pl = suunnittele(kd.data() || {}, ps.exists ? ps.data() : null, nytISO);
        r.dok++; r[pl.luokka]++; if (pl.uusi) r.uusia++; if (pl.vanhentunut) r.vanh++; r.eroaa += pl.eroaa;
        if (pl.luokka === 'kopioi') kirj.push({ ref: pref, data: pl.data, mergeFields: pl.mergeFields });
      }
    }
    yht.pelaajia += snap.docs.length; yht.dokumentteja += r.dok; yht.ei_dataa += r.ei_dataa; yht.jo_siirretty += r.jo_siirretty; yht.kopioi += r.kopioi; yht.uusia += r.uusia; yht.vanhentunut += r.vanh; yht.eroaa += r.eroaa;
    loki('[' + sid + '] pelaajia ' + snap.docs.length + ' · idp_kausi-dokumentteja ' + r.dok + ' · ei dataa ' + r.ei_dataa + ' · jo siirretty ' + r.jo_siirretty + ' · kopioitavia ' + r.kopioi + ' (uusia ' + r.uusia + ') · vanhentunut idp_pelaaja ' + r.vanh + ' · sitoumus eroaa ' + r.eroaa);
  }
  if (deps.kirjoita) {
    for (let i = 0; i < kirj.length; i += BATCH) {
      const b = db.batch();
      kirj.slice(i, i + BATCH).forEach((k) => b.set(k.ref, k.data, { mergeFields: k.mergeFields }));
      await b.commit(); yht.kirjoitettu += Math.min(BATCH, kirj.length - i);
    }
  }
  return yht;
}

async function main() {
  const path = require('path'), readline = require('readline');
  let admin; try { admin = require(path.join(__dirname, '..', 'functions', 'node_modules', 'firebase-admin')); } catch (e) { admin = require('firebase-admin'); }
  const argv = process.argv.slice(2), KIRJOITA = argv.includes('--kirjoita'), KYLLA = argv.includes('--kylla');
  const seura = (argv.find((a) => a.indexOf('--seura=') === 0) || '').split('=')[1] || null;
  admin.initializeApp({ projectId: 'talentmaster-pilot', credential: admin.credential.applicationDefault() });   // gcloud ADC
  const db = admin.firestore();
  console.log('=== idp_kausi → idp_pelaaja · ' + (KIRJOITA ? 'KIRJOITUS (vaatii vahvistuksen)' : 'DRY-RUN (ei kirjoita)') + ' ===');
  if (KIRJOITA && !KYLLA) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const vastaus = await new Promise((res) => rl.question('Kirjoita KIRJOITA vahvistukseksi: ', res)); rl.close();
    if (vastaus.trim() !== 'KIRJOITA') { console.log('Peruttu — mitään ei kirjoitettu.'); return; }
  }
  const y = await aja({ db, kirjoita: KIRJOITA, seura, loki: console.log });
  console.log('YHTEENVETO', JSON.stringify(y));
  if (!KIRJOITA) console.log('DRY-RUN — mitään ei kirjoitettu. Kirjoitus: --kirjoita');
}

if (require.main === module) main().catch((e) => { console.error('VIRHE:', e && e.message ? e.message : e); process.exit(1); });
else if (!(typeof process !== 'undefined' && process.env && process.env.VITEST)) throw new Error('scripts/migroi_idp_pelaaja.js käsittelee tuotantodataa — aja suoraan: node scripts/migroi_idp_pelaaja.js (ei require/import)');
module.exports = { suunnittele, aja };
