#!/usr/bin/env node
/* diag_valmentaja_joukkueet.js — VAIN LUKU. Tero ajaa (gcloud ADC):
 *     ! node scripts/diag_valmentaja_joukkueet.js --projekti=talentmaster-pilot [--seura=<seuran-id>]
 *
 * MIKSI: Masterin valmentajan joukkuevalitsin näytti saman joukkueen kahtena rivinä, kun joukkuetunniste (kayttajat.joukkueet[]) ei ole joukkueen nimen slug
 * (esim. tunniste 'kuorma_s01_u8_a' + nimi 'Testijoukkue U8 A'; Sibbo: 'sibbovargarna_2014_bl' + '2014 Blå'). Tämä skripti kertoo, KUINKA MONTA valmentajaa
 * seuroittain koskee ja onko vika oikeilla seuroilla — ennen kuin korjaus (lib/tm_joukkue.js: tmValmentajanJoukkueet) otetaan käyttöön.
 *
 * LUKEE: seurat/{s}/joukkueet (id, nimi, arkistoitu, aktiivinen) + seurat/{s}/kayttajat (rooli, joukkue-kentät). EI KIRJOITA MITÄÄN.
 * Valmentaja = rooli, jolle Master rakentaa valmentajan valitsimen (ei vp / urheilutoimenjohtaja / talenttivalmentaja; heillä on SA-tyyppinen valitsin).
 * TULOSTE: vain LUKUMÄÄRÄT seuroittain (seuran dokumentti-id). Ei nimiä, ei sähköposteja, ei käyttäjätunnisteita, ei joukkuenimiä eikä joukkuetunnisteita.
 *   valmentajia          · käyttäjiä joilla on vähintään yksi joukkue
 *   usea (≥2)            · uuden säännön mukaan vähintään 2 joukkuetta → valitsin näkyy
 *   id≠slug              · ≥2 joukkuetta JA vähintään yhden joukkueen tunniste ei ole sen nimen slug (nimi ja tunniste eivät normalisoidu samaksi) — vanha valitsin tuplaa
 *   tuplarivit_nyt       · vanhan valitsimen rivimäärä − uuden rivimäärä, summattuna (ylimääräiset rivit, jotka korjaus poistaa)
 *   orpo_tunniste        · valmentajia, joiden joukkueet[]:ssä on tunniste jota ei ole joukkue-dokumenteissa (ei ratkea; näkyy nimirivinä)
 *   arkistoitu_mukana    · valmentajia, joiden joukkueet[] viittaa arkistoituun / ei-aktiiviseen joukkueeseen (uusi valitsin jättää pois) */
'use strict';
const path = require('path');
const J = require(path.join(__dirname, '..', 'lib', 'tm_joukkue.js'));

const LAAJUUS_ROOLIT = ['vp', 'urheilutoimenjohtaja', 'talenttivalmentaja'];   // = Masterin _mSeuranLaajuusRooli
const slugAvain = (s) => J.tmNormJoukkueAvain(String(s == null ? '' : s).replace(/_/g, ' '));
function normVanha(j) { return !j ? j : String(j).replace(/_/g, ' ').toUpperCase().replace(/([A-Z]{2,})\s([PTU])(\d+)/, (_, s, sp, ika) => s + ' ' + sp + ika); }

/** Vanhan valitsimen rivimäärä (kopio poistetusta _valmentajanJoukkueNimet-logiikasta; vertailua varten). */
function vanhatRivit(d, nykyinen) {
  const nahty = {}, lisaa = (x) => { const r = String(x || '').trim(); if (!r) return; const a = normVanha(r); if (!a || nahty[a]) return; nahty[a] = true; };
  (Array.isArray(d.joukkueetNimet) ? d.joukkueetNimet : []).forEach(lisaa);
  (Array.isArray(d.joukkueet) ? d.joukkueet : []).forEach(lisaa);
  lisaa(d.joukkue); lisaa(d.joukkueNimi); lisaa(nykyinen);
  return Object.keys(nahty).length;
}

/** Puhdas ydin: docs = [{id, nimi, arkistoitu?, aktiivinen?}], kayttajat = [kayttajat-dokumentin data]. → lukumääräobjekti. */
function analysoi(kayttajat, docs) {
  const r = { valmentajia: 0, usea: 0, id_ei_slug: 0, tuplarivit_nyt: 0, orpo_tunniste: 0, arkistoitu_mukana: 0 };
  const idMap = {}; (docs || []).forEach((d) => { idMap[String(d.id)] = d; });
  (kayttajat || []).forEach((d) => {
    d = d || {};
    if (LAAJUUS_ROOLIT.indexOf(d.rooli) >= 0) return;
    const ids = Array.isArray(d.joukkueet) ? d.joukkueet.filter((x) => x != null && x !== '') : [];
    const nykyinen = d.joukkue || d.joukkueNimi || ids[0] || '';
    const uusi = J.tmValmentajanJoukkueet(d, docs, nykyinen), vanha = vanhatRivit(d, nykyinen);
    if (!ids.length && !uusi.length && !vanha) return;
    r.valmentajia++;
    if (ids.some((x) => !idMap[String(x)])) r.orpo_tunniste++;
    if (ids.some((x) => { const doc = idMap[String(x)]; return doc && (doc.arkistoitu === true || doc.aktiivinen === false); })) r.arkistoitu_mukana++;
    if (uusi.length >= 2) {
      r.usea++;
      if (ids.some((x) => { const doc = idMap[String(x)]; return doc && slugAvain(x) !== slugAvain(doc.nimi); })) r.id_ei_slug++;
    }
    if (vanha > uusi.length) r.tuplarivit_nyt += vanha - uusi.length;
  });
  return r;
}

async function ajaMain() {
  const admin = require(path.join(__dirname, '..', 'functions', 'node_modules', 'firebase-admin'));
  const argv = process.argv.slice(2);
  const arg = (n, d) => { const o = argv.find((a) => a.indexOf('--' + n + '=') === 0); return o ? o.split('=').slice(1).join('=') : d; };
  const projekti = arg('projekti', 'talentmaster-pilot'), vainSeura = arg('seura', null);
  admin.initializeApp({ projectId: projekti });
  const db = admin.firestore();
  const sidit = vainSeura ? [vainSeura] : (await db.collection('seurat').select().get()).docs.map((x) => x.id);
  console.log('Projekti: ' + projekti + ' · seuroja ' + sidit.length + ' · VAIN LUKU\n');
  const yht = { valmentajia: 0, usea: 0, id_ei_slug: 0, tuplarivit_nyt: 0, orpo_tunniste: 0, arkistoitu_mukana: 0 };
  console.log(['seura'.padEnd(28), 'valm'.padStart(5), 'usea'.padStart(5), 'id≠slug'.padStart(8), 'tuplarivit'.padStart(11), 'orpo'.padStart(5), 'arkist.'.padStart(8)].join(' '));
  for (const sid of sidit) {
    const [jSn, kSn] = await Promise.all([
      db.collection('seurat').doc(sid).collection('joukkueet').select('nimi', 'arkistoitu', 'aktiivinen').get(),
      db.collection('seurat').doc(sid).collection('kayttajat').select('rooli', 'joukkue', 'joukkueNimi', 'joukkueet', 'joukkueetNimet').get()
    ]);
    const docs = jSn.docs.map((x) => Object.assign({ id: x.id }, x.data())), r = analysoi(kSn.docs.map((x) => x.data()), docs);
    Object.keys(yht).forEach((k) => { yht[k] += r[k]; });
    if (!r.valmentajia) continue;
    console.log([sid.slice(0, 28).padEnd(28), String(r.valmentajia).padStart(5), String(r.usea).padStart(5), String(r.id_ei_slug).padStart(8), String(r.tuplarivit_nyt).padStart(11), String(r.orpo_tunniste).padStart(5), String(r.arkistoitu_mukana).padStart(8)].join(' '));
  }
  console.log('\nYHTEENSÄ: valmentajia ' + yht.valmentajia + ' · usea (≥2) ' + yht.usea + ' · id≠slug ' + yht.id_ei_slug + ' · ylimääräisiä rivejä nyt ' + yht.tuplarivit_nyt + ' · orpo tunniste ' + yht.orpo_tunniste + ' · arkistoitu mukana ' + yht.arkistoitu_mukana);
  console.log('Tulkinta: id≠slug > 0 → vika on oikeilla seuroilla (vanha valitsin näyttää saman joukkueen kahdesti). EI kirjoita mitään.');
}

module.exports = { analysoi, vanhatRivit, LAAJUUS_ROOLIT };
if (require.main === module) ajaMain().catch((e) => { console.error('Virhe:', e && e.message); process.exit(2); });
