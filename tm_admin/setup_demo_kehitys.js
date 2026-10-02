#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════════════════════════════
   TalentMaster™ — setup_demo_kehitys.js · Demo FC Kehitystilanne v0:aa varten (2.10.2026)
   Brief: "CODE BRIEF: Seurakehitysdashboard v0" → osio "Demodata: Demo FC".

   Luo Demo FC:n KOKONAAN: seuradokumentti seurat/demo-fc, VP-käyttäjä vp.demo@talentmaster.fi (Auth + claims
   { rooli:'vp', seuraId:'demo-fc' } + kayttajat-dokumentti) ja synteettinen data. Ei oikeita henkilöitä.

   TURVA (ehdoton):
     · kirjoittaa VAIN polkuihin seurat/demo-fc ja seurat/demo-fc/** — jokainen kirjoitus tarkistetaan, muuten keskeytys
     · jokainen dokumentti demo: true
     · vanhaan seuraan "demo" EI kosketa, oikeisiin seuroihin eikä suojattuihin pelaajiin EI kosketa
     · Auth: luo/päivittää vain käyttäjän vp.demo@talentmaster.fi; keskeyttää, jos sillä on toisen seuran claimit
     · salasana VAIN ympäristömuuttujasta TM_DEMO_PW (ei argumenttina, ei tulosteessa)
     · --dry-run (oletus jos --kirjoita puuttuu) tulostaa kaiken kirjoitettavan eikä kirjoita mitään
     · kirjoittava ajo vain Teron hyväksynnällä: node tm_admin/setup_demo_kehitys.js --kirjoita

   Dokumenttien muoto = oikeiden kirjoittajien muoto (Testaus_v9 / Excel_Tuonti / VP_v25 / Master_v16 / lib/*).
   Data on deterministinen (siemenluku) ja päivämäärät kiinteitä (DEMO_NYT) → sama tuloste joka ajolla.
   Ajo: gcloud ADC (Teron tili). Skripti ei käytä palvelutilin avainta.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */
'use strict';
const path = require('path');
const EN = require(path.join(__dirname, '..', 'lib', 'tm_eerikkila_normit.js'));

const SEURA_ID = 'demo-fc';
const SEURA_POLKU = 'seurat/' + SEURA_ID;
const VP_EMAIL = 'vp.demo@talentmaster.fi';
const DEMO_NYT = '2026-10-02';
const VUOSI = 2026;   // seurantavuosi (kehitysasetukset/seuratuki/kausikuvat): kuluva kalenterivuosi

/* ── Argumentit ── */
const ARGS = process.argv.slice(2);
const KIRJOITA = ARGS.includes('--kirjoita');
const DRY = !KIRJOITA || ARGS.includes('--dry-run');
const kohdeArg = (ARGS.find((a) => a.startsWith('--seura=')) || '').split('=')[1];
if (kohdeArg && kohdeArg !== SEURA_ID) { console.error('KESKEYTETTY: kohde "' + kohdeArg + '" ei ole ' + SEURA_ID + '. Skripti kirjoittaa vain Demo FC:hen.'); process.exit(2); }

/* ── Deterministinen satunnaisuus ── */
let _s = 20261002;
function rnd() { _s |= 0; _s = (_s + 0x6D2B79F5) | 0; let t = Math.imul(_s ^ (_s >>> 15), 1 | _s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
const valitse = (arr) => arr[Math.floor(rnd() * arr.length)];
/* Oma generaattori avaimelle (esim. pelaaja + testi): siemen = DEMO-siemen + avain (FNV-1a) → jokainen testi saa oman
   arvonnan, eikä päävirta (rnd) kulu → muu demodata pysyy ennallaan. Sama avain → sama sarja joka ajolla. */
function rndAvaimelle() {
  let h = 2166136261; const s = '20261002|' + Array.prototype.join.call(arguments, '|');
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  let a = h >>> 0;
  return function () { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const r2 = (x) => Math.round(x * 100) / 100;
const r1 = (x) => Math.round(x * 10) / 10;

/* ── Aikaleimat (Admin SDK Timestamp vasta ajossa; dry-runissa merkkijono) ── */
let Timestamp = null, ServerTS = null;
const ts = (iso) => (Timestamp ? Timestamp.fromDate(new Date(iso)) : { __ts: iso });
const serverTs = () => (ServerTS ? ServerTS() : { __serverTimestamp: true });
const isoAika = (pvm, hh) => new Date(pvm + 'T' + (hh || '12:00') + ':00Z').toISOString();
const lisaaPv = (pvm, n) => { const d = new Date(pvm + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

/* ── Kirjoitusjono + turvavartija ── */
const JONO = [];
function kirjoita(polku, data) {
  if (polku !== SEURA_POLKU && !polku.startsWith(SEURA_POLKU + '/')) throw new Error('TURVA: polku ' + polku + ' ei ole ' + SEURA_POLKU + ' -alla');
  if (!data || data.demo !== true) throw new Error('TURVA: demo:true puuttuu polussa ' + polku);
  JONO.push({ polku, data });
}

/* ════════════════ DATA ════════════════ */
const JOUKKUEET = [
  { id: 'p14_demo', nimi: 'P14 Demo', ikaryhma: 'P14', sp: 'M', sv: 2012, n: 18 },
  { id: 't14_demo', nimi: 'T14 Demo', ikaryhma: 'T14', sp: 'N', sv: 2012, n: 16 },
  { id: 't12_demo', nimi: 'T12 Demo', ikaryhma: 'T12', sp: 'N', sv: 2014, n: 4 },
];
const VALMENTAJAT = [
  { uid: 'demo-valmentaja-p14', etunimi: 'Pekka', sukunimi: 'Demovalmentaja', joukkue: 'p14_demo' },
  { uid: 'demo-valmentaja-t14', etunimi: 'Tiina', sukunimi: 'Demovalmentaja', joukkue: 't14_demo' },
  { uid: 'demo-valmentaja-t12', etunimi: 'Taru', sukunimi: 'Demovalmentaja', joukkue: 't12_demo' },
];
const ETU_M = ['Aatu', 'Eeli', 'Veeti', 'Onni', 'Leevi', 'Niilo', 'Eetu', 'Joona', 'Lenni', 'Väinö', 'Kasper', 'Oiva', 'Hugo', 'Elmeri', 'Ukko', 'Topi', 'Rasmus', 'Aapo'];
const ETU_N = ['Aino', 'Helmi', 'Iida', 'Venla', 'Ella', 'Lilja', 'Siiri', 'Pihla', 'Enni', 'Sofia', 'Kerttu', 'Linnea', 'Emma', 'Hilla', 'Minea', 'Vilma', 'Selma', 'Olivia', 'Saga', 'Nelli'];
const SUKU = ['Demola', 'Kuvitelma', 'Esimerkki', 'Testinen', 'Mallinen', 'Keksitty', 'Harjoitus', 'Kokeilu'];
const TESTIPVM = ['2025-04-15', '2025-10-14', '2026-04-14'];
const T12_TESTIPVM = ['2025-10-14', '2026-04-14'];

/* Normin mukainen arvo: t3-raja + z × (SD-arvio). SD = |t5 − t2| / 1,6832 (sama oletus kuin SWC). */
const TESTIT = [
  ['lin5m', 'nopeus_5m', true], ['lin10m', 'nopeus_10m', true], ['lin30m', 'nopeus_30m', true],
  ['cmj', 'hyppy_cj', false], ['mas', 'mas', false, true], ['sm_juoksu', 'sm_juoksu', true], ['sm_pallo', 'sm_pallo', true],
];
function normiArvo(eer, ika, sp, z, pienempi, kmh) {
  const r = EN.EERIKKILA_NORMIT[eer][sp === 'M' ? 'pojat' : 'tytot'][ika];
  const sd = Math.abs(r[3] - r[0]) / 1.6832;
  const t3 = r[1] + (r[2] - r[1]) / 2;   // tasojen 3 ja 4 rajan väli ≈ mediaani
  let v = pienempi ? t3 - z * sd : t3 + z * sd;
  if (kmh) v *= 3.6;
  return r2(v);
}

/* Maturiteetti: offset kasvaa ~1 v / v. phv-koodi samoilla rajoilla kuin lib/tm_bioika.js. */
const phvKoodi = (o) => (o < -1.0 ? 'PRE' : o < -0.5 ? 'LAH' : o <= 0.5 ? 'PH' : o <= 1.0 ? 'POST' : 'AN');
const kaista = (k) => (k === 'PRE' ? 'pre' : k === 'AN' ? 'post' : 'circa');
const kasvuVyohyke = (cm) => (cm == null ? null : cm < 3.0 ? 'hidas' : cm < 7.2 ? 'kohtalainen' : 'nopea');

const pelaajat = [];
let nro = 0;
JOUKKUEET.forEach((j) => {
  for (let i = 0; i < j.n; i++) {
    nro++;
    const id = 'demo_' + j.id.split('_')[0] + '_' + String(i + 1).padStart(2, '0');
    const etu = (j.sp === 'M' ? ETU_M : ETU_N)[i % (j.sp === 'M' ? ETU_M.length : ETU_N.length)];
    const suku = SUKU[(i + nro) % SUKU.length];
    // RAE: Q1 yliedustettu (5/4/3/... jakso), kaikki kvartaalit mukana
    const kk = [1, 2, 3, 1, 4, 5, 2, 6, 7, 3, 8, 9, 1, 10, 11, 12, 2, 5][i % 18];
    const pv = 1 + Math.floor(rnd() * 27);
    const synt = j.sv + '-' + String(kk).padStart(2, '0') + '-' + String(pv).padStart(2, '0');
    pelaajat.push({ id, j, etu, suku, synt, i });
  }
});

/* Reunatapaukset (brief): PH kummallakin kerralla, yli 9 kk testiväli, vain yksi mittaus, pysähtynyt IDP. */
const REUNA = { ph_molemmat: 'demo_p14_03', ph_viimeinen: 'demo_t14_08', pitka_vali: 'demo_p14_07', yksi_mittaus: 'demo_t14_05', pysahtynyt: 'demo_p14_02' };

/* Fyysisten testien kehitys: pelaajan taipumus + testikohtainen vaihtelu (yksikkö: normin SD / testikierros).
   SWC = 0,2 SD, joten 0,22–0,30 SD osuu lähelle rajaa (osa ↑, osa →). Yläraja 0,42 SD pitää muutokset testin
   yksikössä uskottavina: 30 m ≤ ~0,1 s, CMJ ≤ ~2 cm, MAS ≤ ~0,4 km/h (+ mittauskohina). Kasvupyrähdyksessä (PH) iso hyppy sallittu,
   koska heitä ei verrata. Ei kiinteää kaavaa: osa paranee kaikissa, osa ei missään, useimmilla sekaisin. */
function taipumus(pid) {
  if (pid === REUNA.ph_molemmat || pid === REUNA.ph_viimeinen) return 'kasvupyrahdys';
  const x = rndAvaimelle(pid, 'taipumus')();
  return x < 0.18 ? 'kaikki_paranee' : x < 0.32 ? 'ei_parane' : 'sekaisin';
}
function testinTrendi(pid, testi, tp) {
  const r = rndAvaimelle(pid, testi), suunta = r(), koko = r();
  const paranee = (min) => min + koko * (0.42 - min), ennallaan = () => (koko - 0.5) * 0.24, laskee = () => -(0.22 + koko * 0.16);
  if (tp === 'kasvupyrahdys') return suunta < 0.75 ? 0.8 + koko * 0.7 : -(0.3 + koko * 0.5);
  if (tp === 'kaikki_paranee') return paranee(0.3);
  if (tp === 'ei_parane') return suunta < 0.55 ? ennallaan() : laskee();
  return suunta < 0.45 ? paranee(0.22) : suunta < 0.78 ? ennallaan() : laskee();
}

/* ── Seura, joukkueet, käyttäjät ── */
kirjoita(SEURA_POLKU, {
  id: SEURA_ID, nimi: 'Demo FC', paketti: 'kehitystaso', laji: 'jalkapallo', aktiivinen: true,
  palloliittoKori: 3, tukikausi: '2027–2028', kausimalli: 'kalenteri', maa: 'FI',
  luotu: serverTs(), luoja: 'setup_demo_kehitys', demo: true,
});
JOUKKUEET.forEach((j) => kirjoita(SEURA_POLKU + '/joukkueet/' + j.id, {
  nimi: j.nimi, ikaryhma: j.ikaryhma, vuosi: String(j.sv), jarjestys: parseInt(j.ikaryhma.slice(1), 10), luotu: serverTs(), demo: true,
}));
VALMENTAJAT.forEach((v) => {
  const j = JOUKKUEET.find((x) => x.id === v.joukkue);
  kirjoita(SEURA_POLKU + '/kayttajat/' + v.uid, {
    uid: v.uid, email: null, etunimi: v.etunimi, sukunimi: v.sukunimi, nimi: v.etunimi + ' ' + v.sukunimi, rooli: 'valmentaja',
    seuraId: SEURA_ID, joukkue: j.id, joukkueNimi: j.nimi, joukkueet: [j.id], joukkueetNimet: [j.nimi],
    aktiivinen: true, luotu: serverTs(), demo: true, demo_huom: 'ei Auth-tunnusta (vain nimi ja joukkue näkymiä varten)',
  });
});

/* ── Pelaajat + alikokoelmat ── */
const LIIKKEET = ['valakyykky', 'luistelijakyykky', 'askelkyykky', 'hyvahuomenta', 'punnerrus_arv', 'lankku', 'naruhypyt', 'pituushyppy', 'viisloikka'];
const D_AVAIMET = {
  D2: ['ball_control', 'running_with_ball', 'ball_protection', 'long_passing', 'heading', 'weaker_foot'],
  D3: ['attitude', 'work_ethic', 'confidence', 'communication', 'desire_improve', 'learning_ability'],
  D4: ['vision', 'decision_making', 'anticipation', 'positioning', 'pressing', 'timing'],
  D5: ['team_role', 'social_interaction'],
};
const ARVIOINTIPVM = ['2026-02-10T15:00:00.000Z', '2026-09-08T15:00:00.000Z'];
const TALENTIT = ['demo_p14_01', 'demo_p14_04', 'demo_p14_09', 'demo_t14_02', 'demo_t14_06', 'demo_t14_11'];
const XFACTOR = ['demo_p14_01', 'demo_p14_09', 'demo_t14_02', 'demo_t14_06'];

pelaajat.forEach((p) => {
  const j = p.j, P = SEURA_POLKU + '/pelaajat/' + p.id;
  const tp = taipumus(p.id), trendit = {};
  TESTIT.forEach(([avain]) => { trendit[avain] = testinTrendi(p.id, avain, tp); });
  if (p.i % 5 >= 2) rnd();   // päävirta kuluu kuten ennen testikohtaisia trendejä → biologia, arvioinnit ym. ennallaan
  const arvioSuunta = p.i % 5 === 0 ? -1 : p.i % 5 === 1 ? 0 : 1;   // D2–D5-arviointien suunta (ei sidottu fyysisiin testeihin)
  const zPohja = -0.6 + rnd() * 1.2;
  let pvmt = j.id === 't12_demo' ? T12_TESTIPVM.slice() : TESTIPVM.slice();
  if (p.id === REUNA.pitka_vali) pvmt = [TESTIPVM[0], TESTIPVM[2]];   // 12 kk väli (> 9 kk, ≤ 15 kk)
  if (p.id === REUNA.yksi_mittaus) pvmt = [TESTIPVM[2]];
  // Maturiteetti: offset viimeisellä mittauksella −1,5…+1,5; PH-reunatapaus ≈ 0 kummallakin
  // Kaistat: PRE / AN / LAH vuorotellen → viimeinen mittauspari EI osu kasvupyrähdykseen (PH vain nimetyillä reunatapauksilla)
  const kaistaArvo = [-1.2 - rnd() * 0.3, 1.2 + rnd() * 0.3, -0.7 - rnd() * 0.25, 1.15 + rnd() * 0.35][p.i % 4];
  const offsetNyt = p.id === REUNA.ph_molemmat ? 0.2 : p.id === REUNA.ph_viimeinen ? 0.1 : r2(kaistaArvo);
  const pituusNyt = j.sp === 'M' ? 160 + rnd() * 14 : 155 + rnd() * 10;

  const historia = [], bio = [];
  let edPituus = null, edPvm = null;
  pvmt.forEach((pvm, k) => {
    const kierros = TESTIPVM.indexOf(pvm) >= 0 ? TESTIPVM.indexOf(pvm) : 2;
    // Arvot SAMAN viiteiän normista (ensimmäinen kierros) → kierrosten ero = todellinen muutos (trendi), ei normin ikäsiirtymää
    const ika = EN.normiIka(j.sv, pvmt[0]);          // arvojen tuottaminen (viiteikä)
    const mittausIka = EN.normiIka(j.sv, pvm);       // tasot mittaushetken iällä (kuten Excel_Tuonti, normiIka §26)
    const hv = {};
    TESTIT.forEach(([avain, eer, pienempi, kmh]) => {
      if (avain === 'mas' && j.id === 't12_demo') return;   // T12: ei MAS-testiä (realistinen vajaa patteri)
      hv[avain] = normiArvo(eer, ika, j.sp, zPohja + trendit[avain] * kierros + (rnd() - 0.5) * 0.15, pienempi, kmh);
    });
    // Puolet pisteistä Excel-muotoon (tasot mukana), puolet Testaus_v9-muotoon (raaka + alusta, ei tasoja → K1b laskee)
    const excelMuoto = (p.i + k) % 2 === 0;
    const snap = Object.assign({ pvm }, hv);
    if (excelMuoto) {
      const hh = EN.laskeHHTaso({ lin30m: hv.lin30m, hyppy_cj: hv.cmj, mas: hv.mas }, mittausIka, j.sp);
      const d1 = EN.laskeD1Joustava(hv, mittausIka, j.sp);
      if (hh != null) snap.hh_taso = hh;
      if (d1) snap.d1_taso = d1.taso;
    } else snap.alusta = 'tekonurmi';
    historia.push(snap);
    // biologinen_ika samalle päivälle
    const offset = p.id === REUNA.ph_molemmat ? (k === pvmt.length - 1 ? 0.2 : -0.3) : r2(offsetNyt - (pvmt.length - 1 - k) * 0.5);
    const pituus = r1(pituusNyt - (pvmt.length - 1 - k) * (3 + rnd() * 3));
    const tahti = edPituus == null ? null : r1((pituus - edPituus) / ((new Date(pvm) - new Date(edPvm)) / 3.15576e10));
    const koodi = phvKoodi(offset);
    const ikaDes = r2((new Date(pvm) - new Date(p.synt)) / 3.15576e10);
    bio.push({
      mittauspaiva: pvm, konteksti: 'kasvumittaus', mittaaja: null,
      mittaukset: { pituus, paino: r1(pituus * 0.29 + rnd() * 4), istumapituus: r1(pituus * 0.52), sukupuoli: j.sp === 'M' ? 'P' : 'T' },
      ika_mittaushetkella: ikaDes, menetelma: 'mirwald_2002', maturity_offset: offset, phv_ika: r2(ikaDes - offset),
      phv_tila_koodi: koodi, kehitysvaihe_kaista: kaista(koodi), kasvutahti_cm_v: tahti, kasvutahti_vyohyke: kasvuVyohyke(tahti),
      yli_ikaisyys: null, krono: ikaDes, laskettu: isoAika(pvm), demo: true,
    });
    edPituus = pituus; edPvm = pvm;
  });
  const viim = historia[historia.length - 1], viimBio = bio[bio.length - 1];
  const ikaNyt = EN.normiIka(j.sv, viim.pvm);
  const hhNyt = EN.laskeHHTaso({ lin30m: viim.lin30m, hyppy_cj: viim.cmj, mas: viim.mas }, ikaNyt, j.sp);
  const d1Nyt = EN.laskeD1Joustava(viim, ikaNyt, j.sp);
  // D2 testeistä kuten Excel_Tuonti: H-H syöttö/pujottelu puuttuu → sm_pallo-varapolku (d2SmPalloFallback) → Hidden Gem (S3)
  const d2Nyt = EN.d2SmPalloFallback({ sm_pallo_viimeisin: viim.sm_pallo }, ikaNyt, j.sp, false);
  const hvNyt = {}; Object.keys(viim).forEach((k) => { if (!['pvm', 'alusta', 'hh_taso', 'd1_taso'].includes(k)) hvNyt[k] = viim[k]; });

  // Arviointikerrat D2–D5 kahdelta kerralta (sama arvioija). Osa paranee, osa ei.
  const arvioija = VALMENTAJAT.find((v) => v.joukkue === j.id);
  const kerrat = ARVIOINTIPVM.map((pvmIso, k) => {
    const kohteet = {};
    Object.keys(D_AVAIMET).forEach((dim) => D_AVAIMET[dim].forEach((avain) => {
      const pohja = 2 + Math.floor(rnd() * 3);
      const v = Math.max(1, Math.min(5, pohja + (k === 1 && arvioSuunta > 0 && rnd() < 0.6 ? 1 : 0) - (k === 1 && arvioSuunta < 0 && rnd() < 0.4 ? 1 : 0)));
      kohteet[avain] = { arvo: v, pvm: pvmIso };
    }));
    return { pvmIso, kohteet };
  });
  const viimKohteet = {}; Object.keys(kerrat[1].kohteet).forEach((a) => { viimKohteet[a] = kerrat[1].kohteet[a].arvo; });
  const ka = (dim) => r1(D_AVAIMET[dim].reduce((s, a) => s + viimKohteet[a], 0) / D_AVAIMET[dim].length);

  // IDP: noin 70 % tavoite; osa vahvuustyyppisiä; yksi pysähtynyt (luotu > 56 pv sitten, ei edistystä)
  const onIdp = p.i % 10 < 7 || p.id === REUNA.pysahtynyt;
  const vahvuus = onIdp && p.i % 4 === 3;
  let idp = null;
  if (onIdp) {
    const luotu = p.id === REUNA.pysahtynyt ? '2026-06-01T09:00:00.000Z' : (p.i % 3 === 0 ? '2026-05-10T09:00:00.000Z' : '2026-09-01T09:00:00.000Z');
    const lahto = viim.lin10m;
    const arviot = p.id === REUNA.pysahtynyt ? [{ pvm: '2026-08-20', arvo: lahto, pelaajan_arvio: 3, pelaajan_note: '', valmentajan_kommentti: '', dvi_suunta: 'flat', kirjaaja_uid: arvioija.uid }]
      : (luotu < '2026-08-01' ? [{ pvm: '2026-08-25', arvo: r2(lahto * 0.95), pelaajan_arvio: 4, pelaajan_note: '', valmentajan_kommentti: '', dvi_suunta: 'up', kirjaaja_uid: arvioija.uid }] : []);
    idp = {
      tavoitteet: [{
        fokus: { alue: vahvuus ? 'acceleration' : 'acceleration', dim: 'D1', nimi: 'Kiihdytys 10 m', lahde: 'mitattu', lahdeTieto: { tyyppi: 'hh', pvm: viim.pvm }, vapaa: false },
        mittari: { testId: 'lin10m', yksikko: 's', suunta: 'pienempi' }, lahto: { arvo: lahto, pvm: viim.pvm }, tavoitearvo: r2(lahto * 0.96),
        kuvaus: 'Kiihdytys 10 m', aikaraami: { kausi: 'syksy 2026', kesto_vk: 6, arvio_pvm: lisaaPv(luotu.slice(0, 10), 42) },
        perustelu: { teksti: 'Demotavoite', pelilause: '', kultaikkuna: false, kypsyysvaroitus: null, lahde: 'valmentaja' },
        ankkuri_7030: null, pelaajan_tavoite: '', omistaja: 'yhdessa', status: 'aktiivinen', tyyppi: vahvuus ? 'vahvuus' : 'heikkous',
        lahde: 'valmentaja', luotu, arviot, hyvaksytty: luotu,
      }],
      paivitetty: '2026-09-01T09:00:00.000Z', demo: true,
    };
    if (p.i % 2 === 0) idp.pelaaja_sitoumus = { itsearvio: { q1: 4, q2: 3, q3: 4 }, rekisteri: 'rakentaja', fokus_nimi: 'Kiihdytys 10 m', jakso_alkoi: null,
      sitoumus_pvm: '2026-09-03T17:00:00.000Z', vahvistettu_pvm: p.i % 4 === 0 ? '2026-09-05T10:00:00.000Z' : null, vahvistettu_jakso_alkoi: null, vahvistaja_rooli: p.i % 4 === 0 ? 'vp' : null };
  }

  const talentti = TALENTIT.includes(p.id);
  const pelaaja = {
    etunimi: p.etu, sukunimi: p.suku, nimi: p.etu + ' ' + p.suku, sukupuoli: j.sp, syntymaVuosi: j.sv, syntymaaika: ts(p.synt + 'T00:00:00Z'),
    joukkue: j.nimi, joukkueNimi: j.nimi, joukkueet: [j.id], joukkueetNimet: [j.nimi], seuraId: SEURA_ID, pelaajaId: p.id,
    suostumusTila: 'annettu', tila: 'aktiivinen', lahde: 'demo',
    hh_viimeisin: hvNyt, hh_pvm: viim.pvm, hh_taso: hhNyt, d1_taso: d1Nyt ? d1Nyt.taso : null, d1_lahde: d1Nyt ? 'hh' : null,
    d1_kattavuus: d1Nyt ? d1Nyt.kattavuus : null, d1_pvm: viim.pvm, hh_historia: historia,
    d2_taso: d2Nyt ? d2Nyt.taso : null, d2_lahde: d2Nyt ? d2Nyt.lahde : null, d2_pvm: d2Nyt ? viim.pvm : null,
    sm_pallo_viimeisin: viim.sm_pallo, sm_juoksu_viimeisin: viim.sm_juoksu,
    phv_tila: viimBio.phv_tila_koodi, biologinenIka_viimeisin: Object.assign({}, viimBio), kehitysvaihe_kaista: viimBio.kehitysvaihe_kaista,
    kasvutahti_cm_v: viimBio.kasvutahti_cm_v, kasvutahti_vyohyke: viimBio.kasvutahti_vyohyke,
    arviointi_havaittu: viimKohteet, arviointi_pvm: ARVIOINTIPVM[1], arviointi_kehys: 'palloliitto',
    d3_taso: ka('D3'), d3_pvm: ARVIOINTIPVM[1].slice(0, 10),
    adar_viimeisin: { a: Math.min(3, Math.max(1, Math.round(ka('D4') * 3 / 5))), d: 2, ac: 2, r: 2, yht: r1(ka('D4') * 3 / 5), pvm: ARVIOINTIPVM[1] },
    adar_pvm: ARVIOINTIPVM[1], adar_havaintoja: 2,
    talenttiOhjelma: talentti, talenttiTaso: talentti ? 'perus' : null, talenttiAlku: talentti ? ts('2026-01-15T10:00:00Z') : null,
    signaali: XFACTOR.includes(p.id) ? 'xfactor' : '',
    luotu: serverTs(), demo: true,
  };
  if (onIdp) {
    const t = idp.tavoitteet[0];
    Object.assign(pelaaja, { idp_tila: 'aktiivinen', idp_edistyma: null, idp_fokus: { alue: t.fokus.alue, dim: 'D1', nimi: t.fokus.nimi },
      idp_viim_review: t.arviot.length ? t.arviot[t.arviot.length - 1].pvm : null, idp_dvi: { suunta: t.arviot.length ? t.arviot[0].dvi_suunta : 'flat', n: t.arviot.length } });
    if (idp.pelaaja_sitoumus) pelaaja.idp_sitoumus_pvm = idp.pelaaja_sitoumus.sitoumus_pvm;
  }
  if (p.i % 3 === 0) pelaaja.jaksofokus = { konsepti_avain: 'nopeus', konsepti_nimi: 'Nopeus', konsepti_koodi: null, domeeni: 'fyysinen',
    alkoi: '2026-09-01T08:00:00.000Z', kesto_vk: 4, lahde: 'valmentaja' };
  kirjoita(P, pelaaja);
  bio.forEach((b) => kirjoita(P + '/biologinen_ika/' + b.mittauspaiva, b));
  if (idp) kirjoita(P + '/idp_kausi/' + VUOSI, idp);
  kerrat.forEach((k) => {
    const kertaId = k.pvmIso.slice(0, 10) + '_' + arvioija.uid.replace(/\W/g, '_') + '_harjoitus';
    kirjoita(P + '/arviointikerrat/' + kertaId, {
      kehys: 'palloliitto', kausi: k.pvmIso.slice(0, 4), pvm: k.pvmIso, palloId: null, seuraId_arviohetkella: SEURA_ID, nakyvyys: 'seuralle',
      arvioija_uid: arvioija.uid, arvioija_nimi: arvioija.etunimi + ' ' + arvioija.sukunimi, arvioija_rooli: 'valmentaja', arvioija_org: 'seura',
      konteksti: { tyyppi: 'harjoitus', kuvaus: null, taso_ottelu_id: null, pelipaikka: null, minuutit: null, vastustajataso: null },
      kohteet: k.kohteet, paivitetty: serverTs(), luotu: serverTs(), demo: true,
    });
  });
  // Testitulokset (Excel_Tuonti Moodi B -muoto) hh_laaja-kierroksille
  historia.forEach((h) => {
    const testit = { lin30m: h.lin30m, lin10m: h.lin10m, lin5m: h.lin5m, sm_juoksu: h.sm_juoksu, sm_pallo: h.sm_pallo, hyppy_cj: h.cmj };
    if (h.mas != null) testit.mas = h.mas;
    kirjoita(P + '/testitulokset/' + h.pvm + '_hh_laaja', {
      testit, pelaajaId: p.id, tunnistetyyppi: 'demo', sukunimi: p.suku, etunimi: p.etu, phv_tila: '', testauspvm: h.pvm,
      kausi: h.pvm.slice(0, 4) + (h.pvm.slice(5, 7) < '07' ? '-kevat' : '-syksy'), protokolla: 'hh_laaja', tallennettu: serverTs(),
      tallensiUid: 'setup_demo_kehitys', lahde: 'historiapohja', tuotu: isoAika(DEMO_NYT), tuojaUid: 'setup_demo_kehitys',
      sukupuoli: j.sp, joukkue: j.nimi, demo: true,
    });
  });
  // K7 liikkuvuuskartoitus (harjoitettavuus_u12) T12-joukkueelle, Excel-tunnisteet 1–3 p
  if (j.id === 't12_demo') {
    const testit = {}; let summa = 0;
    LIIKKEET.forEach((l) => { const v = 1 + Math.floor(rnd() * 3); testit[l] = v; summa += v; });
    kirjoita(P + '/testitulokset/2026-05-12_harjoitettavuus_u12', {
      testit, pelaajaId: p.id, tunnistetyyppi: 'demo', sukunimi: p.suku, etunimi: p.etu, phv_tila: '', testauspvm: '2026-05-12', kausi: '2026-kevat',
      protokolla: 'harjoitettavuus_u12', tallennettu: serverTs(), tallensiUid: 'setup_demo_kehitys', lahde: 'historiapohja',
      tuotu: isoAika(DEMO_NYT), tuojaUid: 'setup_demo_kehitys', flei_pct: Math.round(summa / (3 * LIIKKEET.length) * 100),
      sukupuoli: j.sp, joukkue: j.nimi, demo: true,
    });
    // K8 omatoimiset kirjaukset kolmelle T12-pelaajalle (viimeiset 4 viikkoa, 3–6 päivää / vk)
    if (p.i < 3) {
      for (let d = 27; d >= 0; d--) {
        if (rnd() < (p.i === 0 ? 0.85 : 0.5)) {
          const pvm = lisaaPv(DEMO_NYT, -d);
          kirjoita(P + '/kirjaukset/' + pvm, {
            tyyppi: 'vapaa', tehty: true, tehty_vapaa: true, lahde: 'pelaaja', xp: 10, aika: 'ilta', pvm, kesto_min: 20 + Math.floor(rnd() * 40),
            rpe: 3 + Math.floor(rnd() * 4), fiilinki: 3 + Math.floor(rnd() * 3), joukkuetreeni: false, konteksti: 'pihapeli', kirjaustapa: 'heti',
            luotu: ts(pvm + 'T00:00:00Z'), paivitetty: serverTs(), demo: true,
          });
        }
      }
    }
  }
});

/* ── Harjoitusarvioinnit (~40): malli palloliitto (havainnointi, arvioija = VP ≠ valmentaja) + valmennustaidot (itsearvio) ── */
const VP_UID_PAIKKA = '__VP_UID__';   // korvataan oikealla uid:llä ajossa (Auth-luonnin jälkeen)
let hNro = 0;
for (let k = 0; k < 40; k++) {
  const v = VALMENTAJAT[k % 2];   // P14 ja T14
  const j = JOUKKUEET.find((x) => x.id === v.joukkue);
  const pvm = lisaaPv('2026-01-12', Math.floor(k * 6.5));
  const malliA = k % 3 !== 2;
  const vastaukset = malliA
    ? { a1: 6 + Math.floor(rnd() * 3), a2: 55 + 5 * Math.floor(rnd() * 8), a3: 6 + Math.floor(rnd() * 4), a4: 5 + Math.floor(rnd() * 4), a5: 6 + Math.floor(rnd() * 3), a6: 40 + 5 * Math.floor(rnd() * 8), a7: 6 + Math.floor(rnd() * 3) }
    : { b1: 3 + Math.floor(rnd() * 3), b2: 3, b3: 4, b4: 3, b5: 4, b6: 3, b7: 4 };
  const doc = {
    malli: malliA ? 'palloliitto' : 'valmennustaidot', arviointitapa: malliA ? 'havainnointi' : 'itsearvio', ikavaihe: 'nuoruus',
    joukkue: j.nimi, valmentaja: v.etunimi + ' ' + v.sukunimi, valmentajaUid: v.uid,
    arvioija: malliA ? 'Demo VP' : v.etunimi + ' ' + v.sukunimi, arvioijaUid: malliA ? VP_UID_PAIKKA : v.uid,
    pvm, vastaukset, tasmennykset: {}, luotu: serverTs(), demo: true,
  };
  if (malliA) doc.henk_palaute = rnd() < 0.7;
  else doc.reflektio = { onnistui: 'Demo', toisin: 'Demo', kehityskohde: 'Demo' };
  kirjoita(SEURA_POLKU + '/harjoitusarvioinnit/demo_ha_' + String(++hNro).padStart(2, '0'), doc);
}

/* ── Mentoroinnit (~15 viestiä) ── */
for (let k = 0; k < 15; k++) {
  const v = VALMENTAJAT[k % 3];
  kirjoita(SEURA_POLKU + '/mentoroinnit/demo_ment_' + String(k + 1).padStart(2, '0'), {
    valmentajaId: v.uid, valmentajaUid: v.uid, joukkueId: v.joukkue, tyyppi: 'viesti', kategoria: 'muu', teksti: 'Demoviesti ' + (k + 1),
    fromRole: 'vp', fromNimi: 'VP', vpUid: VP_UID_PAIKKA, aika: ts(isoAika(lisaaPv('2026-02-02', k * 16), '09:00')), luettu: k % 4 !== 0,
    nakyvyys: 'valmentajalle', demo: true,
  });
}

/* ── Kalenteri + läsnäolo: 8 viikkoa, 2 harjoitusta / vk, P14 ja T14 (VP-muoto: joukkue = joukkueen tunnus) ── */
['p14_demo', 't14_demo'].forEach((jid) => {
  const j = JOUKKUEET.find((x) => x.id === jid);
  const jPelaajat = pelaajat.filter((p) => p.j.id === jid);
  for (let vk = 0; vk < 8; vk++) {
    [1, 3].forEach((wd, n) => {   // ti + to
      const pvm = lisaaPv('2026-08-04', vk * 7 + wd + (jid === 't14_demo' ? 0 : -1));
      const tid = 'demo_kal_' + jid.split('_')[0] + '_' + pvm;
      const tilat = jPelaajat.map((p) => { const x = rnd(); return { p, tila: x < 0.82 ? 'paikalla' : x < 0.9 ? 'myohassa' : 'poissa' }; });
      kirjoita(SEURA_POLKU + '/kalenteri/' + tid, {
        nimi: j.nimi + ' harjoitus', tyyppi: 'harjoitus', alkaa: ts(isoAika(pvm, '15:00')), paattyy: ts(isoAika(pvm, '16:30')), koko_paiva: false,
        joukkue: jid, joukkue_nimi: j.nimi, joukkueet: [jid], osallistujat_uid: [VALMENTAJAT.find((v) => v.joukkue === jid).uid], pelaajat_id: [],
        paikka: 'Demokenttä', toistuvuus: null, toistuvuus_sarja_id: null, luoja_uid: VALMENTAJAT.find((v) => v.joukkue === jid).uid,
        luotu: serverTs(), paivitetty: serverTs(), tila: 'suunniteltu', poistettu: false, muistiinpanot: null, pelaajaviesti: null, lahde: 'manuaalinen',
        lasnaolo_kooste: { paikalla: tilat.filter((x) => x.tila === 'paikalla').length, myohassa: tilat.filter((x) => x.tila === 'myohassa').length,
          poissa: tilat.filter((x) => x.tila === 'poissa').length, merkitsematta: 0 }, demo: true,
      });
      tilat.forEach((x) => kirjoita(SEURA_POLKU + '/kalenteri/' + tid + '/lasnaolijat/' + x.p.id, {
        tila: x.tila, syy: x.tila === 'poissa' ? 'Demo' : null, nimi: x.p.etu + ' ' + x.p.suku,
        merkitsija_uid: VALMENTAJAT.find((v) => v.joukkue === jid).uid, merkitty: serverTs(), demo: true,
      }));
    });
  }
});

/* ── Seuratuki, kehitysasetukset, kausikuva ── */
kirjoita(SEURA_POLKU + '/seuratuki/' + VUOSI, {
  vuosi: VUOSI,
  lisenssit: { fvs: 72, muut: 63 },                                   // C1: 135 ≥ 130 → Täyttynyt
  tapahtumat: [                                                     // C2b: 4 / 6 → ennuste < tavoite → Riskissä
    { pvm: '2026-02-14', ikavaihe: 'lapsuus', aihe: 'Ydintaidot: kuljetus' },
    { pvm: '2026-04-11', ikavaihe: 'lapsuus', aihe: 'Ydintaidot: syöttö' },
    { pvm: '2026-08-22', ikavaihe: 'lapsuus', aihe: 'Ydintaidot: laukaus' },
    { pvm: '2026-09-19', ikavaihe: 'nuoruus', aihe: 'Ydintaidot: 1v1' },
  ],
  roolit: { valmennusosaamisen_kehittaja_htv: 0.5, omavastuu_eur: 4000, tayttyy: true },   // J2 → Täyttynyt
  yhteistyoseurat: null,                                            // J3 → Puuttuu
  t3: { osallistuu: true },                                         // J5 → Täyttynyt
  paivitetty: serverTs(), demo: true,
});
kirjoita(SEURA_POLKU + '/kehitysasetukset/' + VUOSI, {
  vuosi: VUOSI,
  tavoitteet: {
    A_kehittyvat: { arvo: 60 },
    C3_havainnot: { arvo: 35 },      // seuran tavoite Palloliiton tasoa (250) matalampi → rivillä myös Palloliiton tila; 27 nyt, ennuste 36 → Raiteilla
    C2a_kohtaamiset: { arvo: 40 },
    C3_a1: { arvo: 8 },
  },
  c3_kriteerit: ['a1', 'a2'],
  paivitetty: serverTs(), demo: true,
});
kirjoita(SEURA_POLKU + '/kausikuvat/' + VUOSI, {
  kausi: String(VUOSI), luotu: serverTs(), luoja: 'setup_demo_kehitys',
  pelaajat: pelaajat.map((p) => ({ id: p.id, joukkue: p.j.nimi, ikaluokka: p.j.ikaryhma, sukupuoli: p.j.sp, syntymavuosi: p.j.sv,
    talenttiOhjelma: TALENTIT.includes(p.id), tila: 'aktiivinen' })),
  demo: true,
});

/* ════════════════ TULOSTE / AJO ════════════════ */
function tiivistelma() {
  const kokoelmat = {};
  JONO.forEach(({ polku }) => {
    const osat = polku.split('/');
    const avain = osat.length === 2 ? 'seurat/demo-fc (seuradokumentti)' : osat.filter((_, i) => i >= 2 && i % 2 === 0).join('/');
    kokoelmat[avain] = (kokoelmat[avain] || 0) + 1;
  });
  return kokoelmat;
}
/* Dry-runin yhteenveto: K1-luokittelu SAMALLA kirjastolla kuin näkymä (lib/tm_mittarit.js k1Tila, SWC normista).
   Ei kopioitua logiikkaa. Kaikki ikäluokat (12–14 v) ovat normissa, joten seuran varaskaalaa ei tarvita. */
function yhteenveto() {
  const M = require(path.join(__dirname, '..', 'lib', 'tm_mittarit.js'));
  const fi = (x, d) => String(Math.round(x * Math.pow(10, d)) / Math.pow(10, d)).replace('.', ',');
  const yks = { lin5m: 's', lin10m: 's', lin30m: 's', cmj: 'cm', mas: 'km/h', sm_juoksu: 's', sm_pallo: 's' };
  const pDocs = JONO.filter((x) => /^seurat\/demo-fc\/pelaajat\/[^/]+$/.test(x.polku)).map((x) => x.data);
  const bioDocs = {}; JONO.forEach((x) => { const o = x.polku.split('/'); if (o[4] === 'biologinen_ika') (bioDocs[o[3]] = bioDocs[o[3]] || []).push(x.data); });
  const tilat = {};   // pelaajaId → { testi → k1Tila }
  pDocs.forEach((p) => {
    tilat[p.pelaajaId] = {};
    Object.keys(M.TESTIT).forEach((t) => {
      if (!(p.hh_historia || []).some((h) => typeof h[t] === 'number')) return;
      tilat[p.pelaajaId][t] = M.k1Tila({ historia: p.hh_historia, testi: t, sukupuoli: p.sukupuoli, syntymaVuosi: p.syntymaVuosi, joukkue: p.joukkue, bioDocs: bioDocs[p.pelaajaId] });
    });
  });
  console.log('\n── YHTEENVETO (K1, lib/tm_mittarit.js · SWC normista, sama luokittelu kuin näkymässä) ──');
  console.log('  testi        parani  vaihtelun sis.  laski  ei vk  |  SWC-raja          |  muutos (vertailukelpoiset) mediaani / max');
  Object.keys(M.TESTIT).forEach((t) => {
    const r = Object.values(tilat).map((x) => x[t]).filter(Boolean); if (!r.length) return;
    const n = (k) => r.filter((x) => x.tila === k).length;
    const swc = r.map((x) => x.swc).filter((x) => typeof x === 'number');
    const muut = r.filter((x) => x.tila !== 'ei_vertailukelpoinen').map((x) => Math.abs(x.muutos)).sort((a, b) => a - b);
    const d = yks[t] === 'cm' ? 1 : yks[t] === 's' ? 3 : 2;
    console.log('  ' + M.TESTIT[t].nimi.padEnd(15) + String(n('vahva_ylos')).padStart(4) + String(n('vaihtelu') + n('mahd_ylos') + n('mahd_alas')).padStart(14)
      + String(n('vahva_alas')).padStart(9) + String(n('ei_vertailukelpoinen')).padStart(7) + '  |  ' + (fi(Math.min.apply(null, swc), d) + '–' + fi(Math.max.apply(null, swc), d) + ' ' + yks[t]).padEnd(17)
      + ' |  ' + (muut.length ? fi(muut[Math.floor(muut.length / 2)], d) + ' / ' + fi(muut[muut.length - 1], d) + ' ' + yks[t] : '–'));
  });
  const vertailtavat = (id) => Object.values(tilat[id]).filter((x) => x.tila !== 'ei_vertailukelpoinen');
  const kaikki = Object.keys(tilat).filter((id) => vertailtavat(id).length && vertailtavat(id).every((x) => x.tila === 'vahva_ylos'));
  const eiMitaan = Object.keys(tilat).filter((id) => vertailtavat(id).length && !vertailtavat(id).some((x) => x.tila === 'vahva_ylos'));
  const lyh = (a) => a.map((id) => id.replace('demo_', '')).join(', ') || '–';
  console.log('\n  Kaikki vertailukelpoiset testit paranevat (' + kaikki.length + '): ' + lyh(kaikki));
  console.log('  Mikään testi ei parane (' + eiMitaan.length + '): ' + lyh(eiMitaan));
  console.log('  Muut ' + (Object.keys(tilat).length - kaikki.length - eiMitaan.length) + ' pelaajaa: sekaisin tai ei vertailukelpoista paria');

  console.log('\n  Reunatapaukset:');
  const kuvaa = (id) => { const x = Object.values(tilat[id] || {}); const syyt = {}; x.forEach((k) => { const s = k.tila === 'ei_vertailukelpoinen' ? 'ei vk: ' + k.syy : k.symboli + (k.pitkaVali ? ' (pitkä väli)' : ''); syyt[s] = (syyt[s] || 0) + 1; }); return Object.keys(syyt).map((s) => syyt[s] + '× ' + s).join(', '); };
  const idpDoc = (JONO.find((x) => x.polku === SEURA_POLKU + '/pelaajat/' + REUNA.pysahtynyt + '/idp_kausi/' + VUOSI) || {}).data;
  const t0 = idpDoc && idpDoc.tavoitteet[0];
  [['PH kummallakin mittauksella', REUNA.ph_molemmat], ['PH viimeisellä mittauksella', REUNA.ph_viimeinen], ['yli 9 kk testiväli', REUNA.pitka_vali], ['vain yksi mittaus', REUNA.yksi_mittaus]]
    .forEach(([nimi, id]) => console.log('    ' + id.replace('demo_', '') + '  ' + nimi.padEnd(28) + kuvaa(id)));
  console.log('    ' + REUNA.pysahtynyt.replace('demo_', '') + '  ' + 'pysähtynyt IDP'.padEnd(28) + (t0 ? 'tavoite luotu ' + t0.luotu.slice(0, 10) + ', arviot: ' + t0.arviot.map((a) => a.pvm + ' ' + a.dvi_suunta).join(', ') : 'PUUTTUU'));

  const juuret = {}; JONO.forEach(({ polku }) => { const o = polku.split('/'); const k = o.slice(0, Math.min(o.length, 3)).join('/'); juuret[k] = (juuret[k] || 0) + 1; });
  const ulkona = JONO.filter(({ polku }) => polku !== SEURA_POLKU && !polku.startsWith(SEURA_POLKU + '/')).length;
  console.log('\n  Kohdepolkujen juuret (' + JONO.length + ' dokumenttia, ' + (ulkona ? ulkona + ' DEMOSEURAN ULKOPUOLELLA' : 'kaikki ' + SEURA_POLKU + ' -alla') + '):');
  Object.keys(juuret).sort().forEach((k) => console.log('    ' + String(juuret[k]).padStart(5) + '  ' + k));
}
const korvaaTs = (o) => JSON.parse(JSON.stringify(o, (k, v) => (v && v.__ts ? 'Timestamp(' + v.__ts + ')' : v && v.__serverTimestamp ? 'serverTimestamp()' : v)));

async function main() {
  console.log('════ setup_demo_kehitys.js · ' + (DRY ? 'DRY-RUN (ei kirjoita mitään)' : 'KIRJOITTAVA AJO') + ' ════');
  console.log('Kohde: ' + SEURA_POLKU + ' (muihin polkuihin kirjoitus estetty)');
  yhteenveto();
  console.log('\n── Dokumentit kokoelmittain ──');
  const t = tiivistelma(); let yht = 0;
  Object.keys(t).forEach((k) => { console.log('  ' + String(t[k]).padStart(5) + '  ' + k); yht += t[k]; });
  console.log('  ' + String(yht).padStart(5) + '  YHTEENSÄ (kaikissa demo: true)');

  let admin = null;
  try {
    admin = require('firebase-admin');
    if (!admin.apps.length) admin.initializeApp({ projectId: 'talentmaster-pilot' });
    Timestamp = admin.firestore.Timestamp; ServerTS = admin.firestore.FieldValue.serverTimestamp;
  } catch (e) { admin = null; }

  console.log('\n── Auth-käyttäjä (oma kohtansa) ──');
  let olemassa = null;
  if (admin) {
    try { olemassa = await admin.auth().getUserByEmail(VP_EMAIL); } catch (e) { if (e.code !== 'auth/user-not-found') console.log('  (Auth-tarkistus ei onnistunut: ' + e.code + ')'); }
    try {
      const s = await admin.firestore().doc(SEURA_POLKU).get();
      console.log('  Firestore: ' + SEURA_POLKU + ' ' + (s.exists ? 'ON JO OLEMASSA (dokumentit kirjoitetaan samoille tunnuksille)' : 'ei vielä olemassa'));
    } catch (e) { console.log('  (Firestore-tarkistus ei onnistunut: ' + e.message + ')'); }
  }
  const claims = { rooli: 'vp', seuraId: SEURA_ID };
  if (olemassa) {
    const c = olemassa.customClaims || {};
    if (c.seuraId && c.seuraId !== SEURA_ID) { console.error('  KESKEYTETTY: ' + VP_EMAIL + ' kuuluu seuraan ' + c.seuraId); process.exit(3); }
    console.log('  ' + VP_EMAIL + ' on olemassa → päivitetään salasana (TM_DEMO_PW) ja claims ' + JSON.stringify(claims));
  } else {
    console.log('  LUODAAN Auth-käyttäjä ' + VP_EMAIL + ' · salasana ympäristömuuttujasta TM_DEMO_PW' + (DRY ? ' (luetaan vasta kirjoittavassa ajossa)' : ''));
    console.log('  custom claims ' + JSON.stringify(claims));
  }
  console.log('  + ' + SEURA_POLKU + '/kayttajat/{uid}: rooli vp, aktiivinen, claimsAsetettu, demo: true');
  console.log('  + ' + SEURA_POLKU + ': vp_uid, vp_email; VP:n uid harjoitusarviointien arvioijaUid- ja mentorointien vpUid-kenttiin');

  console.log('\n── Esimerkkipelaaja kokonaisuudessaan ──');
  const esim = JONO.filter((x) => x.polku.startsWith(SEURA_POLKU + '/pelaajat/demo_p14_02'));
  esim.forEach((x) => { console.log('\n# ' + x.polku); console.log(JSON.stringify(korvaaTs(x.data), null, 2)); });

  console.log('\n── Reunatapaukset ──');
  console.log('  PH kummallakin mittauksella: ' + REUNA.ph_molemmat + ' · PH vain viimeisellä: ' + REUNA.ph_viimeinen + ' · yli 9 kk testiväli: ' + REUNA.pitka_vali
    + ' · vain yksi mittaus: ' + REUNA.yksi_mittaus + ' · pysähtynyt IDP: ' + REUNA.pysahtynyt);
  console.log('  Lohko 1: C1 Täyttynyt (135/130) · C3 havainnot Raiteilla omaa tavoitetta 50 vasten (Palloliitto 250: Riskissä) · a1 Riskissä · J3 Puuttuu');

  if (DRY) { console.log('\nDRY-RUN valmis. Mitään ei kirjoitettu. Kirjoittava ajo omassa terminaalissa: read -s TM_DEMO_PW && export TM_DEMO_PW && node tm_admin/setup_demo_kehitys.js --kirjoita'); return; }

  /* ── KIRJOITTAVA AJO ── */
  if (!admin) throw new Error('firebase-admin puuttuu');
  const pw = process.env.TM_DEMO_PW;
  if (!pw || pw.length < 12) throw new Error('TM_DEMO_PW puuttuu tai on alle 12 merkkiä');
  const user = olemassa ? await admin.auth().updateUser(olemassa.uid, { password: pw, disabled: false })
    : await admin.auth().createUser({ email: VP_EMAIL, password: pw, displayName: 'Demo VP', emailVerified: true });
  await admin.auth().setCustomUserClaims(user.uid, claims);
  kirjoita(SEURA_POLKU + '/kayttajat/' + user.uid, { uid: user.uid, email: VP_EMAIL, etunimi: 'Demo', sukunimi: 'VP', nimi: 'Demo VP', rooli: 'vp',
    seuraId: SEURA_ID, joukkue: null, joukkueNimi: null, joukkueet: [], joukkueetNimet: [], aktiivinen: true, claimsAsetettu: true,
    luotu: serverTs(), demo: true });
  const seuraDoc = JONO.find((x) => x.polku === SEURA_POLKU);
  seuraDoc.data.vp_uid = user.uid; seuraDoc.data.vp_email = VP_EMAIL;
  JONO.forEach((x) => { ['arvioijaUid', 'vpUid'].forEach((k) => { if (x.data[k] === VP_UID_PAIKKA) x.data[k] = user.uid; }); });
  // Aikaleimat oikeiksi (dry-runin paikkamerkit → Timestamp / serverTimestamp)
  const muunna = (v) => (v && v.__ts ? Timestamp.fromDate(new Date(v.__ts)) : v && v.__serverTimestamp ? ServerTS()
    : Array.isArray(v) ? v.map(muunna) : (v && typeof v === 'object' && !(v instanceof Timestamp)) ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, muunna(x)])) : v);
  const db = admin.firestore();
  for (let i = 0; i < JONO.length; i += 400) {
    const b = db.batch();
    JONO.slice(i, i + 400).forEach((x) => {
      if (x.polku !== SEURA_POLKU && !x.polku.startsWith(SEURA_POLKU + '/')) throw new Error('TURVA');
      b.set(db.doc(x.polku), muunna(x.data));
    });
    await b.commit();
    console.log('  kirjoitettu ' + Math.min(i + 400, JONO.length) + ' / ' + JONO.length);
  }
  console.log('VALMIS: ' + JONO.length + ' dokumenttia + Auth-käyttäjä ' + VP_EMAIL + ' (uid ' + user.uid.slice(0, 4) + '…)');
}

if (require.main === module) main().then(() => process.exit(0)).catch((e) => { console.error('Virhe:', e.message); process.exit(1); });
module.exports = { JONO, SEURA_POLKU, kirjoita, tiivistelma, yhteenveto };
