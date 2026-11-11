#!/usr/bin/env node
'use strict';
/* mittaus_raportti.js — projekti 06 PR 3: kokoaa mittaustulokset (sivut.json, funktiot.json, dokumentit.json) → docs/MITTAUSRAPORTTI_STAGING.md: jokainen mittari vs. P11-raja (läpi / ei läpi) + ensimmäiseksi pettävä kohta.
 *   node scripts/kuorma/mittaus_raportti.js [--sivut=mittaus_tulokset/sivut.json] [--funktiot=…/funktiot.json] [--dokumentit=…/dokumentit.json] [--ulos=docs/MITTAUSRAPORTTI_STAGING.md] [--pelaajia=N --seuroja=N]
 * Puuttuva syöte → rivi "ei mitattu". Rajat: mittaus_lib.RAJAT (P11, VAIHE0.md) — EI tulkita jälkikäteen: sivut = KYLMÄN avauksen MEDIAANI (p95 raportoidaan, ⚠ jos ylittää); funktio = suurin ajo; ekstrapolaatio merkitään.
 * "Ensimmäiseksi pettävä kohta" = suurin ylitys (arvo/raja) ei-läpäisseistä; jos kaikki läpi → pienin kasvunvara (suurin arvo/raja). Pure muodosta(); levylle kirjoitus vain mainissa. */
const fs = require('fs'), path = require('path');
const M = require('./mittaus_lib.js');
const R = M.RAJAT;
const SIVUNIMI = { seura: 'Seura', vp: 'VP', master: 'Master', kehitys: 'Kehitystyöpöytä', testaus: 'Testaus', pelaaja: 'Pelaaja' };
const f1 = (x) => (x == null ? '–' : (Math.round(x * 10) / 10).toLocaleString('fi-FI'));
const KUVAKE = { lapi: '✅ läpi', ei: '❌ EI LÄPI', ei_mitattu: '⏳ ei mitattu', ennakko: '🔶 ennakko (ei staging-mittaus)', lapi_ekstra: '✅ läpi (ekstrapolaatio)', ei_ekstra: '❌ EI LÄPI (ekstrapolaatio)', ei_dataa: '⚠ ei pätevää mittausta' };

function rivi(id, nimi, arvo, yksikko, raja, tila, huom) { return { id, nimi, arvo, yksikko, raja, tila, suhde: arvo != null && raja ? arvo / raja : null, huom: huom || '' }; }
const arvioi = (arvo, raja) => (arvo == null ? 'ei_dataa' : arvo <= raja ? 'lapi' : 'ei');

/** Kokoaa rivit. syote: { sivut, funktiot, dokumentit, pelaajia, seuroja }. */
function rivit(s) {
  const out = [];
  const sivuData = s.sivut && s.sivut.mittaukset || [];
  ['tyopoyta', 'puhelin'].forEach((prof) => Object.keys(SIVUNIMI).forEach((avain) => {
    const m = sivuData.find((x) => x.sivu === avain && x.profiili === prof), raja = prof === 'tyopoyta' ? R.interaktiivinen_tyopoyta_s : R.interaktiivinen_slow4g_s, nimi = 'Aika interaktiiviseksi — ' + SIVUNIMI[avain] + ' (' + (prof === 'tyopoyta' ? 'työpöytä' : 'puhelin, Slow 4G') + ')';
    const pelaajaHuom = avain === 'pelaaja' ? ' · kirjautumaton (vain kirjautumisnäkymä)' : '';
    if (!m) { out.push(rivi('tti_' + prof + '_' + avain, nimi, null, 's', raja, 'ei_mitattu', pelaajaHuom)); return; }
    const y = m.yhteenveto.kylma.tti_s, huom = (m.yhteenveto.kylma.virheita ? m.yhteenveto.kylma.virheita + ' virhettä; ' : '') + 'p95 ' + f1(y.p95) + ' s' + (y.p95 != null && y.p95 > raja ? ' ⚠ p95 ylittää' : '') + ' · lämmin ' + f1(m.yhteenveto.lampimat.tti_s.mediaani) + ' s' + (m.rooli && m.kylma.some((k) => k.kirjautunut === false) ? ' · ⚠ kirjautuminen ei onnistunut kaikissa' : '') + pelaajaHuom;
    out.push(rivi('tti_' + prof + '_' + avain, nimi, y.mediaani, 's', raja, arvioi(y.mediaani, raja), huom));
  }));
  Object.keys(SIVUNIMI).forEach((avain) => {
    const ms = sivuData.filter((x) => x.sivu === avain), nimi = 'Firestore-lukuja per avaus — ' + SIVUNIMI[avain];
    if (!ms.length) { out.push(rivi('luvut_' + avain, nimi, null, 'lukua', R.lukuja_per_avaus, 'ei_mitattu')); return; }
    const arvot = ms.map((x) => x.yhteenveto.kylma.lukuja.mediaani).filter((x) => x != null), arvo = arvot.length ? Math.max.apply(null, arvot) : null;
    const top = topKokoelmat(ms); out.push(rivi('luvut_' + avain, nimi, arvo, 'lukua', R.lukuja_per_avaus, arvioi(arvo, R.lukuja_per_avaus), top ? 'suurimmat: ' + top : ''));
  });
  const fd = s.funktiot, pelaajia = s.pelaajia || (fd && fd.meta && fd.meta.pelaajia) || null;
  if (!fd) out.push(rivi('funktiot', 'Ajastetut funktiot (kesto)', null, 's', R.funktio_s, 'ei_mitattu'));
  else fd.funktiot.forEach((f) => {
    const nimi = 'Funktion kesto — ' + f.nimi, t = f.kesto_s, taysi = pelaajia != null && pelaajia >= 10000;
    if (!t || t.n === 0) { out.push(rivi('fn_' + f.nimi, nimi, null, 's', R.funktio_s, 'ei_dataa', 'ei lokirivejä')); return; }
    const kerroin = taysi || !pelaajia ? 1 : 10000 / pelaajia, arvo = t.max * kerroin, tila = arvioi(arvo, R.funktio_s);
    out.push(rivi('fn_' + f.nimi, nimi, arvo, 's', R.funktio_s, kerroin === 1 ? tila : tila + '_ekstra', 'suurin ' + t.n + ' ajosta: ' + f1(t.max) + ' s' + (kerroin !== 1 ? ' × ' + f1(kerroin) + ' (lineaarinen 10 000 pelaajaan; mitattu ' + pelaajia + ' pelaajalla)' : '') + (f.huippumuisti_mb != null && f.maaritys ? ' · huippumuisti ' + f.huippumuisti_mb + ' / ' + f.maaritys.muisti_mb + ' MB' : '') + (f.maaritys ? ' · aikaraja ' + f.maaritys.aikaraja_s + ' s' : '')));
  });
  const dd = s.dokumentit;
  if (!dd || !dd.isoinPelaaja) out.push(rivi('dok', 'Isoin pelaajadokumentti (3 kautta)', null, 'kt', R.pelaajadokumentti_kt, 'ei_mitattu'));
  else { const kt = dd.isoinPelaaja.koko_kt, tila = dd.meta && dd.meta.tila === 'offline' ? 'ennakko' : arvioi(kt, R.pelaajadokumentti_kt); out.push(rivi('dok', 'Isoin pelaajadokumentti (3 kautta)', kt, 'kt', R.pelaajadokumentti_kt, tila, 'suurin kenttä ' + dd.isoinPelaaja.kentat[0].kentta + ' ' + dd.isoinPelaaja.kentat[0].b + ' B' + (tila === 'ennakko' ? ' · ennakko: generaattorin data + Firestore-laskentakaava; staging-mittaus: mittaa_dokkoot.js --aja' : ''))); }
  const k = kustannusRivi(s, sivuData, fd, pelaajia);
  out.push(k);
  return out;
}
function topKokoelmat(ms) {
  const summa = {}; ms.forEach((m) => m.kylma.forEach((k) => Object.keys(k.luvut || {}).forEach((n) => { summa[n] = (summa[n] || 0) + k.luvut[n]; })));
  const n = ms.reduce((a, m) => a + m.kylma.length, 0) || 1; return Object.keys(summa).sort((a, b) => summa[b] - summa[a]).slice(0, 3).map((x) => x + ' ' + Math.round(summa[x] / n)).join(', ');
}
/** P7-profiili: 10 käyttäjää/seura + suurimmalle seuralle 25 (=+15), 2 avausta/pv, 20 pv/kk. Hinnat = oletuksia (trigger_arvio.HINNAT). */
function kustannusRivi(s, sivuData, fd, pelaajia) {
  const nimi = 'Infrakustannus per pelaaja per vuosi', seuroja = s.seuroja || (fd && fd.meta && fd.meta.seuroja) || null;
  const luvut = sivuData.filter((x) => x.sivu !== 'pelaaja').map((x) => x.yhteenveto.kylma.lukuja.mediaani).filter((x) => x != null);
  if (!luvut.length || !pelaajia || !seuroja) return rivi('kustannus', nimi, null, '€', R.kustannus_eur_pelaaja_vuosi, 'ei_mitattu', 'tarvitsee sivumittauksen (lukuja/avaus) ja pelaajamäärän');
  const kaytt = 10 * seuroja + 15, kutsut = { laskeSeuranKooste: 4.3, laskeSeuranKoosteMa: 4.3, valvontaPaivittain: 30, valvontaViikko: 4.3, kirjautumisaikaYo: 30, laskutusKuukausi: 1 };
  const funktiot = ((fd && fd.funktiot) || []).filter((f) => kutsut[f.nimi] && f.kesto_s && f.kesto_s.mediaani != null).map((f) => ({ kutsuja: kutsut[f.nimi], gbS: kutsut[f.nimi] * f.kesto_s.mediaani * ((f.maaritys && f.maaritys.muisti_mb || 256) / 1024) }));
  const c = M.kustannus({ lukujaAvaus: luvut.reduce((a, x) => a + x, 0) / luvut.length, pelaajia, kayttajia: kaytt, avauksiaPvKayttaja: 2, paivia: 20, funktiot });
  return rivi('kustannus', nimi, c.eurPelaajaVuosi, '€', R.kustannus_eur_pelaaja_vuosi, arvioi(c.eurPelaajaVuosi, R.kustannus_eur_pelaaja_vuosi), 'ARVIO: ' + kaytt + ' käyttäjää × 2 avausta/pv × 20 pv = ' + c.avauksiaKk + ' avausta/kk · ' + f1(c.luvutKk / 1e6) + ' milj. lukua/kk · ' + f1(c.eurKk) + ' €/kk (kurssi ' + c.kurssi + ', Firestore eur3 $0,06/100 000, Functions-hinnat oletuksia)');
}
const SYY = { ei: 1, ei_ekstra: 1 };
function ensimmainen(r) {
  const ei = r.filter((x) => SYY[x.tila] && x.suhde != null).sort((a, b) => b.suhde - a.suhde);
  if (ei.length) return { pettaa: true, rivi: ei[0], muut: ei.slice(1, 4) };
  const mit = r.filter((x) => x.suhde != null && x.tila !== 'ennakko').sort((a, b) => b.suhde - a.suhde);
  return mit.length ? { pettaa: false, rivi: mit[0], muut: [] } : null;
}

function muodosta(s) {
  const r = rivit(s), e = ensimmainen(r), L = [];
  const meta = (s.sivut && s.sivut.meta) || {}, fmeta = (s.funktiot && s.funktiot.meta) || {};
  L.push('# Mittausraportti — staging (projekti 06)', '', '> Generoitu `scripts/kuorma/mittaus_raportti.js`:llä mittaustuloksista. **Älä muokkaa käsin** — aja mittaukset ja generoi uudelleen. Rajat: P11 (`.briefit/projektit/06-staging-ja-kuormamittaus/VAIHE0.md`), `scripts/kuorma/mittaus_lib.js` (RAJAT).', '');
  L.push('**Aineisto:** ' + (fmeta.profiili || (s.pelaajia ? s.pelaajia + ' pelaajaa' : 'ei tiedossa')) + (fmeta.pelaajia ? ' (' + fmeta.seuroja + ' seuraa, ' + fmeta.pelaajia + ' pelaajaa)' : '') + ' · sivumittaus ' + (meta.aika ? meta.aika.slice(0, 16).replace('T', ' ') + ' UTC, isäntä kanava, ' + meta.toistot + ' toistoa' : 'ei ajettu') + '.', '');
  L.push('## 1. Tulokset vs. P11-rajat', '', '| Mittari | Mitattu | Raja (P11) | Tulos | Huomio |', '|---|---:|---:|---|---|');
  r.forEach((x) => L.push('| ' + x.nimi + ' | ' + (x.arvo != null ? f1(x.arvo) + ' ' + x.yksikko : '–') + ' | ' + (x.id.indexOf('tti_') === 0 || x.id.indexOf('luvut_') === 0 || x.id.indexOf('fn_') === 0 || x.id === 'dok' || x.id === 'kustannus' ? '< ' + f1(x.raja) + ' ' + x.yksikko : '') + ' | ' + (KUVAKE[x.tila] || x.tila) + ' | ' + x.huom.replace(/\|/g, '/') + ' |'));
  const mitatut = r.filter((x) => x.tila !== 'ei_mitattu'), lapi = r.filter((x) => x.tila === 'lapi' || x.tila === 'lapi_ekstra').length, eiLapi = r.filter((x) => SYY[x.tila]).length;
  L.push('', '**Yhteenveto:** ' + r.length + ' mittaria · ' + lapi + ' läpi · ' + eiLapi + ' ei läpi · ' + r.filter((x) => x.tila === 'ei_mitattu').length + ' ei vielä mitattu · ' + r.filter((x) => x.tila === 'ennakko').length + ' ennakko (offline).', '');
  L.push('## 2. Ensimmäiseksi pettävä kohta', '');
  if (!e) L.push('Ei vielä pätevää mittausta — aja `mittaa_sivut.js`, `mittaa_funktiot.js`, `mittaa_dokkoot.js` (ks. `docs/STAGING_ASENNUS.md` kohta G) ja generoi raportti uudelleen.');
  else if (e.pettaa) { L.push('**' + e.rivi.nimi + '**: ' + f1(e.rivi.arvo) + ' ' + e.rivi.yksikko + ' vs. raja ' + f1(e.rivi.raja) + ' ' + e.rivi.yksikko + ' (' + f1(e.rivi.suhde * 100) + ' % rajasta). ' + e.rivi.huom + '.'); if (e.muut.length) L.push('', 'Seuraavaksi suurimmat ylitykset: ' + e.muut.map((x) => x.nimi + ' (' + f1(x.suhde * 100) + ' %)').join('; ') + '.'); }
  else L.push('Mikään mitattu mittari ei ylitä rajaa. Pienin kasvunvara: **' + e.rivi.nimi + '** ' + f1(e.rivi.arvo) + ' ' + e.rivi.yksikko + ' (' + f1(e.rivi.suhde * 100) + ' % rajasta).');
  L.push('', '_Määritelmä: ensimmäiseksi pettävä = suurin ylitys (mitattu/raja) ei-läpäisseistä; ei aikajärjestys. Korjauksia ei tehdä ennen mittausta (P11) — raportti vain osoittaa kohdan._', '');
  L.push('## 3. Sivut', '');
  const sd = (s.sivut && s.sivut.mittaukset) || [];
  if (!sd.length) L.push('_Ei vielä ajettu._', '');
  else { L.push('| Sivu | Profiili | Interaktiivinen kylmä (med / p95) | Lämmin (med) | FCP kylmä (med) | Lukuja kylmä (med / p95) | MB kylmä (med) | Suurimmat lukijat |', '|---|---|---:|---:|---:|---:|---:|---|');
    sd.forEach((m) => { const k = m.yhteenveto.kylma; L.push('| ' + SIVUNIMI[m.sivu] + ' | ' + m.profiili + ' | ' + f1(k.tti_s.mediaani) + ' / ' + f1(k.tti_s.p95) + ' s | ' + f1(m.yhteenveto.lampimat.tti_s.mediaani) + ' s | ' + f1(k.fcp_s.mediaani) + ' s | ' + f1(k.lukuja.mediaani) + ' / ' + f1(k.lukuja.p95) + ' | ' + f1(k.mb.mediaani) + ' | ' + (topKokoelmat([m]) || '–') + ' |'); });
    if (s.sivut.monitoring) L.push('', 'Cloud Monitoring `document/read_count` mittausikkunassa: **' + s.sivut.monitoring.read_count + '** (laskutuksen totuus; sisältää myös kirjautumisen ja taustaluvut). Instrumentoitu summa: ' + sd.reduce((a, m) => a + m.kylma.concat(m.lampimat).reduce((x, y) => x + (y.yht || 0), 0), 0) + '.', ''); }
  L.push('## 4. Ajastetut funktiot', '');
  const fn = (s.funktiot && s.funktiot.funktiot) || [];
  if (!fn.length) L.push('_Ei vielä ajettu._', '');
  else { L.push('| Funktio | Ajot (s) | Suurin | Huippumuisti / määritetty | Aikaraja |', '|---|---|---:|---:|---:|'); fn.forEach((f) => L.push('| ' + f.nimi + ' | ' + f.ajot.map((a) => (a.ms != null ? f1(a.ms / 1000) : '✗') + (a.ensimmainen ? '*' : '')).join(' · ') + ' | ' + (f.kesto_s && f.kesto_s.max != null ? f1(f.kesto_s.max) + ' s' : '–') + ' | ' + (f.huippumuisti_mb != null ? f.huippumuisti_mb : '–') + ' / ' + (f.maaritys ? f.maaritys.muisti_mb : '–') + ' MB | ' + (f.maaritys ? f.maaritys.aikaraja_s + ' s' : '–') + ' |')); L.push('', '`*` = ensimmäinen ajo (mahdollisesti kylmäkäynnistys). Muisti: Monitoring `user_memory_bytes` p99. `tasoHaeMaatcheck` on kommentoitu pois koodista → ei deployattu → ei mitattu.', ''); }
  L.push('## 5. Dokumenttikoot', '');
  const dk = s.dokumentit;
  if (!dk) L.push('_Ei vielä ajettu._', '');
  else { L.push('Tila: **' + (dk.meta && dk.meta.tila === 'offline' ? 'offline-ennakko (generaattorin data, ' + dk.meta.profiili + ')' : 'staging') + '**. Koko = Firestore-tallennuskoon laskentakaava.', '', '| Ryhmä | Dokumentteja | Suurin | Mediaani | p95 |', '|---|---:|---:|---:|---:|'); Object.keys(dk.ryhmat).forEach((g) => { const x = dk.ryhmat[g]; L.push('| ' + g + ' | ' + x.n + ' | ' + f1(x.max_kt) + ' kt | ' + Math.round(x.mediaani_b) + ' B | ' + Math.round(x.p95_b) + ' B |'); }); L.push('', 'Isoimman pelaajadokumentin suurimmat kentät: ' + dk.isoinPelaaja.kentat.map((k) => '`' + k.kentta + '` ' + k.b + ' B').join(', ') + '.', ''); }
  L.push('## 6. Menetelmä ja rajoitteet', '', '- **Sivut:** Playwright + järjestelmän Chrome, stagingin Hosting-kanava `kuorma`, App Check -debug-token ympäristömuuttujasta. Profiilit: työpöytä (1366×768, ei kuristusta) ja puhelin (390×844 mobiili, Slow 4G 1,6 Mbit/s + 150 ms, CPU 4×). Kylmä = uusi selainkonteksti; lämmin = toinen avaus samassa kontekstissa.', '- **Interaktiivinen** = aikaisin hetki FCP:n jälkeen, josta eteenpäin 2 s ajan ei ole pitkiä tehtäviä (> 50 ms) eikä avoimia Firestore-lukuja (Lighthouse-TTI:n lyhyen ikkunan approksimaatio; sivuilla ei ole `tm-ready`-merkkiä).', '- **Lukumäärä:** compat-SDK:n `Query.get`/`DocumentReference.get`/`onSnapshot`-kietominen (laskutusta vastaava approksimaatio: kysely = palautetut dokumentit, väh. 1) + Cloud Monitoring `read_count`.', '- **Pelaaja-sivu:** mitataan kirjautumattomana (pelaajakirjautuminen = PalloID + PIN; aineistossa ei pelaaja-Auth-tilejä) → lukuja/aika kuvaavat vain kirjautumisnäkymää.', '- **Funktiot:** Cloud Schedulerin job käsin (`gcloud scheduler jobs run`), kesto Cloud Loggingista (`Function execution took`), 3 ajoa/funktio. Pienellä aineistolla 40 seuran luku on **lineaarinen ekstrapolaatio pelaajamäärällä** (merkitty); täysi aineisto korvaa sen mittauksella.', '- **Kustannus:** arvio P7-profiililla (ks. rivi); hinnat ja kurssi oletuksia.');
  return L.join('\n') + '\n';
}

function lueJson(p) { try { return p && fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null; } catch (e) { return null; } }
function lueArgv(argv) {
  const o = { sivut: 'mittaus_tulokset/sivut.json', funktiot: 'mittaus_tulokset/funktiot.json', dokumentit: 'mittaus_tulokset/dokumentit.json', ulos: 'docs/MITTAUSRAPORTTI_STAGING.md', pelaajia: undefined, seuroja: undefined, tuntematon: [] };
  (argv || []).forEach((a) => { const m = /^--(sivut|funktiot|dokumentit|ulos)=(.+)$/.exec(a), n = /^--(pelaajia|seuroja)=(\d+)$/.exec(a); if (m) o[m[1]] = m[2]; else if (n) o[n[1]] = +n[2]; else o.tuntematon.push(a); });
  return o;
}
function main(argv, deps) {
  const d = deps || {}, kirjaa = d.kirjaa || ((r) => console.log(r)), virhe = d.virhe || ((r) => console.error(r)), a = lueArgv(argv);
  if (a.tuntematon.length) { virhe('Tuntematon valinta (' + a.tuntematon.length + ' kpl).'); return 2; }
  const teksti = muodosta({ sivut: lueJson(a.sivut), funktiot: lueJson(a.funktiot), dokumentit: lueJson(a.dokumentit), pelaajia: a.pelaajia, seuroja: a.seuroja });
  fs.mkdirSync(path.dirname(a.ulos), { recursive: true }); fs.writeFileSync(a.ulos, teksti); kirjaa('Raportti kirjoitettu: ' + a.ulos + ' (' + teksti.split('\n').length + ' riviä).'); return 0;
}
if (require.main === module) process.exit(main(process.argv.slice(2)));
module.exports = { main, muodosta, rivit, ensimmainen, lueArgv };
