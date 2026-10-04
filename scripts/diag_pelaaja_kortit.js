#!/usr/bin/env node
/* diag_pelaaja_kortit.js — KUIVA, VAIN LUKU. Mitä kortteja pelaaja (Pelaaja_v7) ja huoltaja (Vanhempi_v2) näkevät?
 *
 * Ajo (gcloud ADC, Teron tili — EI palvelutilin avainta):
 *   node scripts/diag_pelaaja_kortit.js                       (oletus: Topias Koskela, seura kpv, doc m93GBdOaGCUuenMiCL0I)
 *   node scripts/diag_pelaaja_kortit.js --seura=kpv --etunimi=Topias --sukunimi=Koskela
 *   node scripts/diag_pelaaja_kortit.js --seura=kpv --id=<pelaajaDocId>
 *
 * Tulostaa (docs/PELAAJA_KORTIT_TILANNE.md §2):
 *   1) korttien kannalta relevantit pikakentät (whitelist — EI PIN:iä, sähköposteja, huoltajatietoja, vapaatekstejä)
 *   2) alikokoelmien määrät (testitulokset per protokolla, kirjaukset, biologinen_ika, idp_kausi)
 *   3) per kortti: NÄKYY / TULOSSA-teksti / PIILO / LUKITTU + syy — sama ehtologiikka kuin
 *      TalentMaster_Pelaaja_v7.html ja TalentMaster_Vanhempi_v2.html (rivinumerot kommenteissa).
 *
 * TURVA: skriptissä ei ole yhtään kirjoitusoperaatiota — vain .get()-lukuja. Normilaskenta ladataan
 * samoista libeistä kuin selaimessa (lib/tm_eerikkila_normit.js + docs/testit_indeksit.js, vm-sandbox).
 */
'use strict';
const path = require('path');
const fs = require('fs');
const vm = require('vm');
const admin = require(path.join(__dirname, '..', 'functions', 'node_modules', 'firebase-admin'));
const PHV = require(path.join(__dirname, '..', 'lib', 'tm_phv_tila.js'));   // PR C: sama PHV-sääntö kuin Pelaaja_v7

const argv = process.argv.slice(2);
const arg = (n, d) => { const o = argv.find((a) => a.indexOf('--' + n + '=') === 0); return o ? o.split('=').slice(1).join('=') : d; };
const SEURA = arg('seura', 'kpv');
const ID = arg('id', null);
const ETU = arg('etunimi', 'Topias');
const SUKU = arg('sukunimi', 'Koskela');
const TOPIAS_ID = 'm93GBdOaGCUuenMiCL0I';   // CLAUDE.md §7.8 — KAKSI u:ta

/* ── Normilibit selaimen tapaan (globaalit) ── */
const L = { console: console };
L.window = L;
vm.createContext(L);
['lib/tm_eerikkila_normit.js', 'docs/testit_indeksit.js'].forEach((f) => {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), L, { filename: f });
});

/* Korttien kannalta relevantit pikakentät (whitelist). */
const KENTAT = [
  'syntymaVuosi', 'sukupuoli', 'joukkue', 'pelipaikka',
  'phv_tila', 'kehitysvaihe_kaista', 'kasvutahti_vyohyke',
  'hh_viimeisin', 'hh_pvm', 'hh_taso', 'hh_taso_edellinen', 'hh_vahvuus', 'hh_kehityskohde', 'sm_pallo_viimeisin',
  'mas_kmh', 'mas_ms', 'mas_historia',
  'tki_viimeisin', 'tki_pvm', 'tki_edellinen', 'tki_merkki', 'tki_vahvuus', 'tki_kehityskohde',
  'tk_lajit_viimeisin', 'tk_kokonaistulos_viimeisin', 'tk_kokonaistulos_edellinen',
  'd1_taso', 'd1_lahde', 'd2_taso', 'd2_lahde', 'd3_taso', 'd3_varmuus',
  'adar_havaintoja', 'adar_pvm',
  'flei_viimeisin', 'flei_pvm',
  'ennatykset',
  'streak', 'streak_paivitetty',
  'signaali', 'hidden_gem', 'x_factor', 'tekninen_varhaiskehitys', 'rae_kvartaali',
  'idp_tila', 'idp_sitoumus_pvm',
  'kortti', 'stage', 'treeneja_kausi', 'pelinumero'
];
const PITUUS = { hh_historia: 1, tki_historia: 1, flei_historia: 1 };

const pvmStr = (t) => {
  if (!t) return null;
  if (t.toDate) return t.toDate().toISOString().slice(0, 10);
  return String(t).slice(0, 10);
};
const lyhyt = (v) => {
  if (v == null) return String(v);
  if (typeof v === 'object' && v.toDate) return pvmStr(v);
  const s = JSON.stringify(v);
  return s.length > 220 ? s.slice(0, 217) + '…' : s;
};

/* ── Pelaaja_v7-logiikan peilit (rivit = TalentMaster_Pelaaja_v7.html) ── */
function laskeStage(sy, pd) {   // Pelaaja_v7 _laskeStage (PR C: kanoninen tila vain mittauslähteestä + ilmoitettu PH)
  if (pd && (PHV.tmPhvTila(pd) === 'PH' || PHV.tmPhvIlmoitettuPH(pd))) return '1_leikkija';
  const ika = new Date().getFullYear() - (sy || 2010);
  if (ika <= 12) return '1_leikkija';
  if (ika <= 15) return '2_rakentaja';
  return '3_showcase';
}
function laskeStreak(ids) {      // :5833
  const setti = {};
  ids.filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s)).forEach((s) => { setti[s] = true; });
  const DAY = 86400000;
  const iso = (ms) => new Date(ms).toISOString().slice(0, 10);
  const now = new Date();
  let cur = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  if (!setti[iso(cur)]) { if (setti[iso(cur - DAY)]) cur -= DAY; else return 0; }
  let n = 0;
  while (setti[iso(cur)]) { n++; cur -= DAY; }
  return n;
}
function mitattujaKk(p) {        // :2770 (_kkMitattuja — KORTTI_KATALOGI.tasot)
  let c = 0;
  if (p.hh_viimeisin != null || p.hh_taso != null) c++;
  if (p.tki_viimeisin != null) c++;
  if (p.flei_viimeisin != null) c++;
  if (p.d1_taso != null) c++;
  if (p.d2_taso != null) c++;
  return c;
}
function merkkiTaso(p, laji) {   // :2782
  if (!p.tk_lajit_viimeisin) return 0;
  const arvo = p.tk_lajit_viimeisin[laji + '_s'];
  if (arvo == null) return 0;
  const sp = (String(p.sukupuoli || '').toUpperCase() === 'N') ? 'T' : 'P';
  const ika = p.syntymaVuosi ? (new Date().getFullYear() - p.syntymaVuosi) : null;
  const viite = (ika != null && L.tkLajiViite) ? L.tkLajiViite(laji, ika, sp) : null;
  if (!viite) return 1;
  if (arvo <= viite.erinomainen) return 3;
  if (arvo <= viite.hyva) return 2;
  return 1;
}
function fcDims(p) {             // :5159 (_fcKorttiData, vain 5D-tila + tier)
  const norm5 = (t) => Math.round(((t - 1) / 4) * 99);
  const phvKasvu = (PHV.tmPhvKoodi(p) === 'PRE' || PHV.tmPhvKoodi(p) === 'LAH');
  const dims = [];
  if (p.d1_taso != null && phvKasvu) dims.push({ key: 'FYS', tila: 'mitattu (🌱 kasvaa, ei tasoa)', counts: true, val: Math.max(norm5(p.d1_taso), 50) });
  else if (p.d1_taso != null) dims.push({ key: 'FYS', tila: 'mitattu', counts: true, val: norm5(p.d1_taso), taso5: Math.max(1, Math.min(5, Math.round(p.d1_taso))) });
  else dims.push({ key: 'FYS', tila: 'tulossa (⏳)', counts: false });
  const d2 = (p.tki_viimeisin != null) ? Math.round(p.tki_viimeisin) : (p.d2_taso != null ? norm5(p.d2_taso) : null);
  dims.push(d2 != null ? { key: 'TEK', tila: 'mitattu', counts: true, val: d2 } : { key: 'TEK', tila: 'tulossa (⏳)', counts: false });
  let d3 = null;
  if (p.d3_viimeisin && p.d3_viimeisin.pisteet) {
    const a = Object.values(p.d3_viimeisin.pisteet).map((x) => (x && x.avg != null) ? x.avg : x).filter((x) => typeof x === 'number');
    if (a.length) d3 = a.reduce((s, x) => s + x, 0) / a.length;
  }
  dims.push(d3 != null ? { key: 'PSY', tila: 'mitattu', counts: true, val: norm5(d3) } : { key: 'PSY', tila: 'seura avaa (🔒)', counts: false });
  const ad = p.adar_viimeisin;
  if (ad && ad.yht != null) { const luot = (p.adar_havaintoja || 0) >= 3; dims.push({ key: 'ÄLY', tila: luot ? 'mitattu' : 'varhainen (ei laske)', counts: luot, val: Math.round((ad.yht / 3) * 99) }); }
  else dims.push({ key: 'ÄLY', tila: 'tulossa (⏳)', counts: false });
  dims.push({ key: 'SOS', tila: 'seura avaa (🔒) — ei datalähdettä', counts: false });
  const mitatut = dims.filter((d) => d.counts).length;
  return { dims: dims, mitatut: mitatut, rakentuu: mitatut < 3 };
}

/* ── Pääohjelma ── */
(async () => {
  admin.initializeApp({ projectId: 'talentmaster-pilot' });
  const db = admin.firestore();
  const pel = db.collection('seurat').doc(SEURA).collection('pelaajat');

  let docSnap = null;
  const tryId = ID || ((SEURA === 'kpv' && ETU === 'Topias' && SUKU === 'Koskela') ? TOPIAS_ID : null);
  if (tryId) { const s = await pel.doc(tryId).get(); if (s.exists) docSnap = s; }
  if (!docSnap) {
    const qs = await pel.where('etunimi', '==', ETU).get();
    const osumat = qs.docs.filter((d) => String(d.data().sukunimi || '').toLowerCase() === String(SUKU).toLowerCase());
    console.log('nimihaku', ETU, SUKU, '→ osumia:', osumat.length);
    docSnap = osumat[0] || null;
  }
  if (!docSnap) { console.log('Pelaajaa ei löytynyt (seura ' + SEURA + ').'); return; }
  const p = docSnap.data() || {};
  console.log('\n=== Pelaaja seurat/' + SEURA + '/pelaajat/' + docSnap.id.slice(0, 6) + '…  (' + (p.etunimi || '?') + ' ' + ((p.sukunimi || '?')[0]) + '.)');

  /* 1) Pikakentät */
  console.log('\n--- 1) Korttien pikakentät (puuttuva = undefined) ---');
  KENTAT.forEach((k) => console.log('  ' + k.padEnd(28) + lyhyt(p[k])));
  Object.keys(PITUUS).forEach((k) => console.log('  ' + k.padEnd(28) + (Array.isArray(p[k]) ? ('[' + p[k].length + ' pistettä] ' + p[k].map((x) => x && x.pvm).filter(Boolean).join(', ')) : 'undefined')));
  const bio = p.biologinenIka_viimeisin || null;
  console.log('  ' + 'biologinenIka_viimeisin'.padEnd(28) + (bio ? ('mittauspaiva=' + bio.mittauspaiva + ' phv_tila_koodi=' + bio.phv_tila_koodi + ' poikkeuslupa=' + !!(bio.yli_ikaisyys && bio.yli_ikaisyys.poikkeuslupa)) : 'undefined'));
  console.log('  ' + 'adar_viimeisin'.padEnd(28) + (p.adar_viimeisin ? ('yht=' + p.adar_viimeisin.yht + ' pvm=' + pvmStr(p.adar_viimeisin.pvm)) : 'undefined'));
  console.log('  ' + 'd3_viimeisin'.padEnd(28) + (p.d3_viimeisin ? ('pvm=' + p.d3_viimeisin.pvm + ' lahteet=' + JSON.stringify(p.d3_viimeisin.lahteet || [])) : 'undefined'));
  console.log('  ' + 'jaksofokus'.padEnd(28) + (p.jaksofokus ? ('konsepti_avain=' + p.jaksofokus.konsepti_avain + ' alkoi=' + p.jaksofokus.alkoi) : 'undefined'));
  console.log('  ' + 'idp_fokus'.padEnd(28) + (p.idp_fokus ? ('nimi=' + p.idp_fokus.nimi) : 'undefined'));

  /* 2) Alikokoelmat (vain luku) */
  console.log('\n--- 2) Alikokoelmat ---');
  const tt = await docSnap.ref.collection('testitulokset').get();
  const proto = {};
  tt.docs.forEach((d) => { const x = d.data() || {}; const k = x.protokolla || '(ei protokollaa)'; proto[k] = (proto[k] || 0) + 1; });
  console.log('  testitulokset:', tt.size, JSON.stringify(proto));
  tt.docs.filter((d) => (d.data() || {}).protokolla === 'pikakirjaus').forEach((d) => console.log('    · pikakirjaus', d.id, 'testit:', Object.keys((d.data() || {}).testit || {}).join(',')));
  const kir = await docSnap.ref.collection('kirjaukset').limit(60).get();
  const kirIds = kir.docs.map((d) => d.id);
  const streak = laskeStreak(kirIds);
  console.log('  kirjaukset (≤60):', kir.size, '| laskettu streak:', streak, '| uusin:', kirIds.filter((s) => /^\d{4}-/.test(s)).sort().reverse()[0] || '—');
  const bi = await docSnap.ref.collection('biologinen_ika').get();
  console.log('  biologinen_ika:', bi.size, bi.docs.map((d) => d.id).join(', '));
  const vuosi = String(new Date().getFullYear());
  const idp = await docSnap.ref.collection('idp_kausi').doc(vuosi).get();
  console.log('  idp_kausi/' + vuosi + ':', idp.exists ? ('olemassa (pelaaja_sitoumus: ' + !!(idp.data() || {}).pelaaja_sitoumus + ')') : 'ei');

  /* 3) Kortit */
  const ika = p.syntymaVuosi ? (new Date().getFullYear() - p.syntymaVuosi) : null;
  const stage = laskeStage(p.syntymaVuosi, p);
  const spMN = (String(p.sukupuoli || '').toUpperCase() === 'N') ? 'N' : 'M';
  const spPT = spMN === 'N' ? 'T' : 'P';
  const vanhAge = ika == null ? '?' : (ika <= 12 ? 'u12' : ika <= 15 ? 'u15' : 'u19');   // Vanhempi_v2 :1619
  console.log('\n--- 3) Kortit — ikä ' + ika + ' v · Pelaaja-stage ' + stage + ' · Vanhempi-ikäryhmä ' + vanhAge + ' ---');
  const out = (alue, nimi, tila, syy) => console.log('  [' + alue + '] ' + nimi.padEnd(34) + tila.padEnd(10) + (syy ? ' — ' + syy : ''));

  // TÄNÄÄN
  out('TÄNÄÄN', 'Kultakortti-OVR (:1158)', 'NÄKYY', 'luku ' + Math.round((p.flei_viimeisin || 0) * 0.9 + 10) + ' (= flei_viimeisin×0,9+10, EI ikäportitettu)');
  out('TÄNÄÄN', 'S-kortti (FLEI, :1033)', p.flei_viimeisin != null ? 'NÄKYY' : 'PIILO', 'flei_viimeisin=' + p.flei_viimeisin);
  out('TÄNÄÄN', 'Signaalimerkki (:6067)', ['x-factor', 'gem', 'phv'].indexOf(p.signaali) >= 0 || streak >= 7 ? 'NÄKYY' : 'PIILO', 'signaali=' + lyhyt(p.signaali) + ' streak=' + streak);
  const q = p.rae_kvartaali || (L.raeKvartaali ? L.raeKvartaali(p.syntymaaika) : null);
  out('TÄNÄÄN', 'RAE Q4 -kortti (:976)', q === 'Q4' ? 'NÄKYY' : 'PIILO', 'kvartaali=' + q);

  // MINÄ hero + kokoelma
  const F = fcDims(p);
  out('MINÄ', 'Hero/FC-kortti 5D (:2895/:5159)', 'NÄKYY', F.dims.map((d) => d.key + ':' + d.tila + (d.taso5 && stage === '2_rakentaja' ? ' (näyttää ' + d.taso5 + '/5)' : '')).join(' · '));
  out('MINÄ', 'Tier', 'NÄKYY', F.rakentuu ? 'Starter (mitattu ' + F.mitatut + '/5 < 3)' : 'Sharp/Elite (mitattu ' + F.mitatut + ')');
  out('MINÄ', 'KORTTI_KATALOGI.tasot (_kkMitattuja)', 'INFO', 'laskisi ' + mitattujaKk(p) + ' mitattua (eri määritelmä kuin hero: ' + F.mitatut + ')');

  const leg = [
    ['legend_tekniikka', p.tki_merkki === 'kulta', 'tki_merkki=' + lyhyt(p.tki_merkki)],
    ['legend_nopeus (:2820)', (() => { const v = p.hh_viimeisin && p.hh_viimeisin.lin30m; if (v == null || ika == null) return false; return L.hhLaskeTaso('lin30m', v, ika, spMN) >= 5; })(),
      'koodi kutsuu hhLaskeTaso(\'lin30m\',…,\'' + spMN + '\') → ' + (p.hh_viimeisin && p.hh_viimeisin.lin30m != null && ika != null ? L.hhLaskeTaso('lin30m', p.hh_viimeisin.lin30m, ika, spMN) : 'n/a')
      + '; oikeilla avaimilla (\'30m\',\'' + spPT + '\') taso = ' + (p.hh_viimeisin && p.hh_viimeisin.lin30m != null && ika != null ? L.hhLaskeTaso('30m', p.hh_viimeisin.lin30m, ika, spPT) : 'n/a')],
    ['rare_piilohelmi', !!p.hidden_gem, 'hidden_gem=' + lyhyt(p.hidden_gem)],
    ['rare_varhais', !!p.tekninen_varhaiskehitys, 'tekninen_varhaiskehitys=' + lyhyt(p.tekninen_varhaiskehitys)],
    ['rare_xfactor', !!p.x_factor, 'x_factor=' + lyhyt(p.x_factor)]
  ];
  leg.forEach((r) => out('KOKOELMA', r[0], r[1] ? 'ANSAITTU' : 'LUKITTU', r[2]));
  out('KOKOELMA', 'idol (★ Idoli)', 'ANSAITTU', 'aina — viikkoteeman idoli (_fcKorttiData), ei lapsen valinta');
  const saav = [
    ['ach_ensitreeni', streak > 0 || kir.size > 0], ['ach_liekki7', streak >= 7], ['ach_liekki14', streak >= 14],
    ['ach_ekamittaus', p.tki_viimeisin != null || p.hh_viimeisin != null || p.flei_viimeisin != null]
  ];
  saav.forEach((r) => out('KOKOELMA', r[0], r[1] ? 'ANSAITTU' : 'LUKITTU', ''));
  ['kuljetus_laukaus', 'syotto', 'pujottelu', 'ponnauttelu'].forEach((l) => { const t = merkkiTaso(p, l); out('KOKOELMA', 'merkki_' + l, t ? 'ANSAITTU' : 'LUKITTU', t ? ['', 'pronssi', 'hopea', 'kulta'][t] : 'tk_lajit_viimeisin.' + l + '_s puuttuu'); });

  // MINÄ-ryhmät
  out('MINÄ', 'Kausitavoite (:2476)', (p.idp_tila || (p.idp_fokus && p.idp_fokus.nimi)) ? 'NÄKYY' : 'TULOSSA', 'idp_tila=' + lyhyt(p.idp_tila));
  out('MINÄ', 'Tekniikkaprofiili (:2098)', (proto.tekniikkakilpailu || 0) > 0 ? 'NÄKYY' : 'TULOSSA',
    (proto.tekniikkakilpailu || 0) > 0 ? 'TKI-luku näkyy (:2125)' : ((p.hh_viimeisin && (p.hh_viimeisin.syotto != null || p.hh_viimeisin.pujottelu != null)) ? 'H-H syöttö/pujottelu-sekunnit' : '"Mittaukset tulossa"'));
  // Vauhti & pallo (:1754)
  if (!p.hh_viimeisin) out('MINÄ', 'Vauhti & pallo (:1754)', 'PIILO', 'ei hh_viimeisin');
  else {
    const hv = p.hh_viimeisin;
    const kk = p.hh_kehityskohde;
    const tavoite = (kk && kk !== 'sm_pallo') || p.sm_pallo_viimeisin != null;
    const huiput = Object.keys(hv).filter((k) => k !== 'sm_pallo' && hv[k] != null && !isNaN(hv[k])).filter((k) => { const s = ika != null ? L.hhSeuraavaTaso(k, Number(hv[k]), ika, spMN) : null; return s && s.seuraavaTaso == null && s.nykyinenTaso != null; });
    out('MINÄ', 'Vauhti & pallo (:1754)', 'NÄKYY', 'hh_vahvuus=' + lyhyt(p.hh_vahvuus) + ' hh_kehityskohde=' + lyhyt(kk) + (tavoite ? ' → tavoiterivi mahdollinen' : '') + (huiput.length ? ' · "Huippuvauhtia" (taso max: ' + huiput.join(',') + ')' : ''));
  }
  const mas = p.mas_kmh != null ? p.mas_kmh : (p.hh_viimeisin && p.hh_viimeisin.mas != null ? p.hh_viimeisin.mas : null);
  out('MINÄ', 'Juoksumoottori/MAS (:1563)', mas != null ? 'NÄKYY' : 'PIILO', 'mas=' + mas + (stage === '3_showcase' ? ' (trendi vaatii mas_historia — ei kirjoittajaa)' : ''));
  out('MINÄ', 'Kehitysvaihe (rMinaKehitysvaihe)', PHV.tmPhvKoodi(p) ? 'NÄKYY' : 'PIILO', PHV.tmPhvKoodi(p) ? ('phv_tila=' + PHV.tmPhvKoodi(p) + (bio && bio.mittauspaiva ? ' · Mitattu ' + bio.mittauspaiva : ' · ei mittauspäivää (biologinenIka_viimeisin puuttuu)') + ' · "Biologinen ikä: Tulossa myöhemmin" AINA') : 'ei kasvumittausta');
  out('MINÄ', 'Konseptifokus (:2078)', 'NÄKYY', 'avain=' + ((p.jaksofokus && p.jaksofokus.konsepti_avain) || 'fallback (kehityskohde/y_h1)'));
  out('MINÄ', 'Itsearvio (:2567)', 'NÄKYY', p.d3_viimeisin ? 'tehty' : 'tekemättä (toimintapiste)');
  const onHist = (p.hh_historia && p.hh_historia.length) || (p.tki_historia && p.tki_historia.length) || p.adar_viimeisin;
  out('MINÄ', 'Kehityskaari (:3028)', onHist ? 'NÄKYY' : 'PIILO', onHist ? ((p.hh_historia || []).length + ' hh-pistettä' + ((p.hh_historia || []).length < 2 ? ' → "täyttyy kun ≥2 mittausta"' : '')) : 'ei historiaa');
  const ennat = (p.ennatykset && typeof p.ennatykset === 'object') ? Object.keys(p.ennatykset).filter((k) => p.ennatykset[k] && p.ennatykset[k].paras != null) : [];
  out('MINÄ', 'Ennätykset (:2870)', ennat.length ? 'NÄKYY' : 'TYHJÄ', ennat.length ? ennat.join(',') : '"Ei ennätyksiä vielä — tee testi…" (Pikakirjaus ei kirjoita ennatykset-kenttää → korjauksessa)');

  // Vanhempi
  out('HUOLTAJA', 'Tekniikkaprofiili (:1169)', (p.tk_lajit_viimeisin && p.tki_viimeisin != null) ? 'NÄKYY' : 'TULOSSA', (p.tk_lajit_viimeisin && p.tki_viimeisin != null) ? 'TKI-luku ' + p.tki_viimeisin + ' näkyy (:1188)' : '"Mittaukset tulossa"');
  out('HUOLTAJA', 'Kausikortti (:1247)', 'NÄKYY', 'kortti=' + lyhyt(p.kortti) + ' streak=' + lyhyt(p.streak) + ' treeneja_kausi=' + lyhyt(p.treeneja_kausi) + ' stage=' + lyhyt(p.stage) + ' signaali=' + lyhyt(p.signaali));
  out('HUOLTAJA', 'Kehityskaari (U16+, :763)', vanhAge === 'u19' ? 'TYHJÄ' : 'PIILO', vanhAge === 'u19' ? 'aina tyhjä tila' : 'vain U16+');
})().catch((e) => { console.error('VIRHE', e.message); process.exit(1); });
