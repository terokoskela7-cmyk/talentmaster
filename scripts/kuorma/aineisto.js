'use strict';
/* aineisto.js — projekti 06 PR 2: SYNTEETTISEN AINEISTON PUHDAS, DETERMINISTINEN GENERAATTORI (VAIHE0 §2.2, P10–P12). Ei Firestorea, ei kelloa, ei Math.random.
 * Sama (profiili, siemen) → täsmälleen sama aineisto (kaikki päivät johdetaan kiinteästä KAUSI-ikkunasta, ei "tänään"). Jokaiselle entiteetille oma siemen-alivirta (avain = polku),
 * joten yhden entiteetin muutos ei siirrä muiden satunnaislukuja.
 * Tietomuoto johdettu koodista/Rulesista, EI tuotantodatasta (GDPR): nimet ovat selvästi synteettisiä ("Testi Pelaaja S01-00001", tunniste SYNT-…), sähköpostit eivät esiinny lainkaan (poikkeus 2b: henkilökunnan @kuorma.test-osoitteet).
 * Kenttärakenteet:
 *   · pelaaja: joukkueet[] (id:t, totuus) + joukkueetNimet[] + joukkue/joukkueNimi (näyttönimi) — CLAUDE.md §7.18; ~3 % pelaajista kuuluu kahteen joukkueeseen (pelaa ylempänä)
 *   · testitulokset/{pvm}_{protokolla} RAAKADATANA (testit-kartta kuten Excel-tuonti: kuljetus_laukaus {y1,y2:{raaka,osumat}}), ei johdettuja arvoja ylikirjoitettuna
 *   · pikakentät (hh_*, d1_*, tki_*, tk_lajit_*, *_edellinen …) lasketaan KANONISELLA lib/tm_pikakentat.js:llä testikierros kerrallaan kronologisesti ja kirjoitetaan pelaajadokumenttiin
 *     YHDELLÄ set():llä → arvo + *_pvm -parit syntyvät aina yhdessä (§26 pari-invariantti). Vartijatesti tarkistaa parit jokaiselta pelaajalta. */
const path = require('path');
const crypto = require('crypto');
const PK = require(path.join(__dirname, '..', '..', 'lib', 'tm_pikakentat.js'));
const TJ = require(path.join(__dirname, '..', '..', 'lib', 'tm_jaksokooste.js'));
const PULSSI = require(path.join(__dirname, '..', '..', 'lib', 'tm_seuran_pulssi.js'));

const KAUSI = 2026;
const KAUSI_ALKU = '2026-01-05';      // maanantai
const KAUSI_LOPPU = '2026-11-08';     // sunnuntai
const TESTIKIERROKSET = ['2026-02-14', '2026-06-06', '2026-10-03'];
const IKARYHMAT = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

const SAVU = { nimi: 'savu', seurat: [{ koko: 500 }, { koko: 500 }], kirjaukset: 100, viikkokatsaukset: 35, havainnot: 25, kierroksia: [2, 3], kaksiJoukkuettaTodennakoisyys: 0.03 };
/* PR 2b: laaja aineisto (kalenteri + läsnäolijat, henkilökunta + Auth, toimenpiteet, jaksofokus_historia, 3 kautta suurimmalle seuralle). Profiili `savu` pysyy 2a:n muotoisena. */
const LAAJA = { kalenteri: { viikossa: 2, lasnaoloOsuus: 0.9 }, henkilokuntaa: 10, toimenpiteita: 30, jaksoHistoriaa: [4, 8], kausia3: { pelaajia: 20, jaksoHistoriaaKaudessa: 40 } };
/* VAIHE0 §2.2: 40 seuraa, 10 000 pelaajaa (P11/P12). Alkuperäinen jakauma (1×500, 3×400, 8×300, 14×200, 14×100) summautui vain 8 300:aan → 14 pienintä seuraa saa loput:
   1×500 + 3×400 + 8×300 + 14×250 + 14×(171–172) = 10 000. Suurin seura (mittauskohde) pysyy 500:ssa. */
const TAYSI_KOOT = (() => { const pienet = 10000 - 500 - 3 * 400 - 8 * 300 - 14 * 250, pohja = Math.floor(pienet / 14), yli = pienet - pohja * 14; return [500, 400, 400, 400].concat(Array(8).fill(300), Array(14).fill(250), Array.from({ length: 14 }, (_, i) => pohja + (i < yli ? 1 : 0))); })();
const PROFIILIT = {
  savu: SAVU,
  savu_taysi: Object.assign({}, SAVU, LAAJA, { nimi: 'savu_taysi' }),
  taysi: Object.assign({}, SAVU, LAAJA, { nimi: 'taysi', seurat: TAYSI_KOOT.map((koko) => ({ koko })) }),
};
const TILI_DOMAIN = 'kuorma.test';   // kaikki synteettiset Auth-tilit; tyhjennys koskee vain tätä

// ── Deterministinen satunnaisuus ──────────────────────────────────────────────────────────────────
function hash32(s) { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
function rng(siemen, avain) {
  let a = hash32(String(siemen) + '|' + avain);
  const r = function () { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  r.int = (lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
  r.valitse = (arr) => arr[Math.floor(r() * arr.length)];
  r.normaali = () => { const u = Math.max(r(), 1e-9), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  return r;
}
/** n erillistä alkiota listasta (Fisher–Yates osittain), järjestys säilytetään kronologisena (listan järjestys). */
function otosJarjestyksessa(lista, n, r) {
  const idx = lista.map((_, i) => i);
  for (let i = 0; i < Math.min(n, idx.length); i++) { const j = i + Math.floor(r() * (idx.length - i)); const t = idx[i]; idx[i] = idx[j]; idx[j] = t; }
  return idx.slice(0, Math.min(n, idx.length)).sort((a, b) => a - b).map((i) => lista[i]);
}

// ── Päivämäärät (UTC-laskenta, ei paikallista aikaa) ──────────────────────────────────────────────
const iso = (ms) => new Date(ms).toISOString().slice(0, 10);
function paivat(alku, loppu, vainSunnuntait) {
  const ulos = []; const a = Date.parse(alku + 'T00:00:00Z'), b = Date.parse(loppu + 'T00:00:00Z');
  for (let t = a; t <= b; t += 86400000) { if (!vainSunnuntait || new Date(t).getUTCDay() === 0) ulos.push(iso(t)); }
  return ulos;
}
const KAIKKI_PAIVAT = paivat(KAUSI_ALKU, KAUSI_LOPPU, false);
const SUNNUNTAIT = paivat(KAUSI_ALKU, KAUSI_LOPPU, true);
function isoViikko(pvm) { // ISO 8601 -viikkonumero 1–53 (viikkokatsauksen vk: int 1–52 → 53 → 52)
  const d = new Date(Date.parse(pvm + 'T00:00:00Z')); const dn = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - dn + 3);
  const eka = new Date(Date.UTC(d.getUTCFullYear(), 0, 4)); const vk = 1 + Math.round(((d - eka) / 86400000 - 3 + ((eka.getUTCDay() + 6) % 7)) / 7);
  return Math.min(52, Math.max(1, vk));
}
const aikaleima = (pvm, h) => new Date(Date.parse(pvm + 'T' + String(h || 12).padStart(2, '0') + ':00:00Z'));

// ── Nimet ja tunnisteet: selvästi synteettiset ────────────────────────────────────────────────────
const nn = (n, l) => String(n).padStart(l, '0');
const seuraId = (i) => 'kuorma_seura_' + nn(i + 1, 2);
const seuraNimi = (i) => 'Testiseura ' + nn(i + 1, 2) + ' (synteettinen)';
const joukkueId = (si, ika, kirjain) => 'kuorma_s' + nn(si + 1, 2) + '_u' + ika + '_' + kirjain;
const joukkueNimi = (ika, kirjain) => 'Testijoukkue U' + ika + ' ' + kirjain.toUpperCase();
const pelaajaId = (si, n) => 'kuorma_s' + nn(si + 1, 2) + '_p' + nn(n, 5);
const tunniste = (si, n) => 'SYNT-' + nn(si + 1, 2) + '-' + nn(n, 5);

/** Joukkuerakenne: n joukkuetta (12–25), ikäluokat kierrossa U8…U19, kirjain A,B,… per ikäluokka; joka neljäs joukkue on tyttöjoukkue (N). */
function rakennaJoukkueet(si, koko) {
  const n = Math.min(25, Math.max(12, Math.ceil(koko / 18))), joukkueet = [], laskuri = {};
  for (let k = 0; k < n; k++) {
    const ika = IKARYHMAT[k % IKARYHMAT.length]; laskuri[ika] = (laskuri[ika] || 0);
    const kirjain = String.fromCharCode(97 + laskuri[ika]++);
    joukkueet.push({ id: joukkueId(si, ika, kirjain), nimi: joukkueNimi(ika, kirjain), ikaryhma: 'U' + ika, ika, sukupuoli: (k % 4 === 3) ? 'N' : 'M' });
  }
  return joukkueet;
}

// ── Testiarvot (raakadata): ikä- ja sukupuoliriippuva perustaso + pelaajakohtainen kyky + pieni kehitys kierroksittain ──
function testit(r, ika, sp, kyky, kierros, protokolla) {
  const p = (x) => Math.round(x * 100) / 100, e = ika - 8, kehitys = 1 - 0.012 * kierros, sukup = sp === 'N' ? 1.03 : 1;
  if (protokolla === 'hh_laaja') {
    return {
      lin_5m: p((1.30 - 0.015 * e) * sukup * (1 - 0.03 * kyky + 0.01 * r.normaali()) * kehitys),
      lin_10m: p((2.25 - 0.04 * e) * sukup * (1 - 0.03 * kyky + 0.01 * r.normaali()) * kehitys),
      lin_30m: p((6.20 - 0.13 * e) * sukup * (1 - 0.03 * kyky + 0.012 * r.normaali()) * kehitys),
      hyppy_cj: p((20 + 1.9 * e) / sukup * (1 + 0.06 * kyky + 0.02 * r.normaali()) / kehitys),
      mas: p((11.2 + 0.25 * e) / sukup * (1 + 0.04 * kyky + 0.015 * r.normaali()) / kehitys),
    };
  }
  const aika = (a, b) => p((a - b * e) * (1 - 0.05 * kyky + 0.02 * r.normaali()) * kehitys);
  const kl = () => { const raaka = p(29 - 0.5 * e + 1.6 * r.normaali() - 1.2 * kyky), osumat = [0, 0, 0, 0].map(() => (r() < 0.45 ? r.valitse([1, 2, 3, 5]) : 0)); return { raaka: Math.max(8, raaka), osumat }; };
  return { ponnauttelu: aika(24, 0.4), syotto: aika(26, 0.45), pujottelu: aika(22, 0.4), kuljetus_laukaus: { y1: kl(), y2: kl() } };
}
const PROTOKOLLAT = [['hh_laaja', 'H-H'], ['tekniikkakilpailu', 'TKI']];
const PHV_VAIHTOEHDOT = (ika, r) => (ika <= 11 ? 'PRE' : ika <= 13 ? r.valitse(['PRE', 'LAH', 'PH']) : ika <= 15 ? r.valitse(['LAH', 'PH', 'POST']) : 'POST');


/** Yhden kauden kirjaukset (id = päivä), viikkokatsaukset (id = sunnuntai), havainnot. Sama r-virta ja järjestys kuin 2a:ssa (kausi 2026 → ennallaan). */
function* kausiHistoria(profiili, r, polku, pid, ikkuna, havEtu) {
  const kpvt = otosJarjestyksessa(ikkuna.paivat, profiili.kirjaukset, r);
  for (const pvm of kpvt) yield { polku: polku + '/kirjaukset/' + pvm, data: { pvm, tyyppi: r.valitse(['D', 'S', 'T', 'joukkue', 'vapaa']), arvo: r.int(1, 5), pelaajaId: pid, luoja_uid: pid, luotu: aikaleima(pvm, r.int(15, 21)) } };
  for (const pvm of otosJarjestyksessa(ikkuna.sunnuntait, profiili.viikkokatsaukset, r)) {
    yield { polku: polku + '/viikkokatsaukset/' + pvm, data: { vk: isoViikko(pvm), jakso_alkoi: iso(Date.parse(pvm + 'T00:00:00Z') - 6 * 86400000), vastaukset: [{ osa: 'D1', teksti: 'Synteettinen vastaus', arvo: r.valitse(['usein', 'joskus', 'ei_viela']) }], luotu: aikaleima(pvm, 19) } };
  }
  const hpvt = otosJarjestyksessa(ikkuna.paivat, profiili.havainnot, r);
  for (let i = 0; i < hpvt.length; i++) yield { polku: polku + '/havainnot/' + havEtu + nn(i + 1, 3), data: { pvm: hpvt[i], teksti: 'Synteettinen havainto', nakyvyys: r() < 0.3 ? 'pelaaja' : 'valmentajat', tekija_uid: 'kuorma_valmentaja', luotu: aikaleima(hpvt[i], 18), synteettinen: true } };
}

/** Yksi pelaaja → [{ polku, data }] (pelaajadokumentti viimeisenä: pikakentät laskettu kaikista kierroksista). */
function* pelaajanDokumentit(profiili, siemen, si, n, joukkueet, jid, k3) {
  const sid = seuraId(si), pid = pelaajaId(si, n), polku = 'seurat/' + sid + '/pelaajat/' + pid;
  const r = rng(siemen, polku), joukkue = joukkueet[jid], ika = joukkue.ika, sp = joukkue.sukupuoli;
  const ylempi = (r() < profiili.kaksiJoukkuettaTodennakoisyys) ? joukkueet.filter((j) => j.ika === ika + 1 && j.sukupuoli === sp)[0] : null;
  const jasenet = ylempi ? [joukkue, ylempi] : [joukkue];
  const syntymaVuosi = KAUSI - ika, kyky = r.normaali(), phv = PHV_VAIHTOEHDOT(ika, r);
  const pelaaja = {
    etunimi: 'Testi', sukunimi: 'Pelaaja S' + nn(si + 1, 2) + '-' + nn(n, 5), tunniste: tunniste(si, n), palloID: tunniste(si, n), tunnistetyyppi: 'palloID',
    syntymaVuosi, sukupuoli: sp, phv_tila: phv,
    joukkue: joukkue.nimi, joukkueNimi: joukkue.nimi, joukkueet: jasenet.map((j) => j.id), joukkueetNimet: jasenet.map((j) => j.nimi),
    tila: 'aktiivinen', aktiivinen: true, synteettinen: true, luotu: aikaleima(KAUSI_ALKU, 8),
  };
  yield* kausiHistoria(profiili, r, polku, pid, { paivat: KAIKKI_PAIVAT, sunnuntait: SUNNUNTAIT }, 'h');
  // Testikierrokset: raakadata → testitulokset/{pvm}_{protokolla}; pikakentät kanonisella libillä kronologisesti (tila kertyy) → yhdellä set():llä pelaajadokumenttiin
  const kierroksia = r.int(profiili.kierroksia[0], profiili.kierroksia[1]), pvmt = TESTIKIERROKSET.slice(TESTIKIERROKSET.length - kierroksia);
  const tila = Object.assign({}, pelaaja);
  if (k3) yield* aiemmatKaudet(profiili, siemen, polku, pid, pelaaja, joukkue, tila);   // 2b: kaudet KAUSI-2, KAUSI-1 (erilliset siemenvirrat → kausi 2026 ennallaan)
  for (let k = 0; k < pvmt.length; k++) {
    const pvm = pvmt[k];
    for (const [protokolla] of PROTOKOLLAT) {
      if (protokolla === 'tekniikkakilpailu' && ika > 13) continue;   // TKI vain ikä 8–13 (lib)
      const t = testit(r, ika, sp, kyky, k, protokolla);
      const upd = PK.tmLaskePikakentat(tila, t, pvm);
      Object.assign(tila, upd);
      const tulos = { testit: t, pelaajaId: pid, tunnistetyyppi: 'palloID', sukunimi: pelaaja.sukunimi, etunimi: pelaaja.etunimi, phv_tila: phv, testauspvm: pvm, pvm_arvio: false, kausi: String(KAUSI), protokolla, tallennettu: aikaleima(pvm, 20), ika, sukupuoli: sp, joukkue: joukkue.nimi, lahde: 'historiapohja' };
      if (upd.tki_viimeisin != null) { tulos.tki = upd.tki_viimeisin; if (upd.tki_merkki) tulos.merkki = upd.tki_merkki; }
      yield { polku: polku + '/testitulokset/' + pvm + '_' + protokolla, data: tulos };
    }
  }
  if (profiili.jaksoHistoriaa) Object.assign(tila, jaksofokus(profiili, siemen, polku, k3));
  yield { polku, data: tila };
}

// ── 2b: henkilökunta, aiemmat kaudet, jaksofokus, kalenteri, toimenpiteet ───────────────────────────
const HENKILOKUNTA_ROOLIT = ['vp', 'urheilutoimenjohtaja', 'seurasihteeri', 'talenttivalmentaja', 'fysiikkavalmentaja'];
const tiliUid = (si, avain) => 'kuorma_s' + nn(si + 1, 2) + '_' + avain;
const tiliEmail = (si, avain) => avain + '.s' + nn(si + 1, 2) + '@' + TILI_DOMAIN;

/** Seuran henkilökunta: vp, utj, sihteeri, talenttivalm., fysiikkavalm. + valmentajat (joukkueet jaetaan tasan). Sama lista → kayttajat-dokumentit JA Auth-tilit. Ei salasanoja täällä. */
function henkilokunta(profiili, si, joukkueet) {
  const lkm = profiili.henkilokuntaa || 0, valm = Math.max(0, lkm - HENKILOKUNTA_ROOLIT.length), ulos = [];
  for (let i = 0; i < Math.min(lkm, HENKILOKUNTA_ROOLIT.length); i++) ulos.push({ avain: HENKILOKUNTA_ROOLIT[i], rooli: HENKILOKUNTA_ROOLIT[i], joukkueet: [] });
  for (let v = 1; v <= valm; v++) ulos.push({ avain: 'valmentaja' + v, rooli: 'valmentaja', joukkueet: joukkueet.filter((_, k) => k % valm === v - 1) });
  return ulos.map((h) => ({ uid: tiliUid(si, h.avain), email: tiliEmail(si, h.avain), rooli: h.rooli, seuraId: seuraId(si), etunimi: 'Testi', sukunimi: 'Henkilö S' + nn(si + 1, 2) + '-' + h.avain.toUpperCase(),
    joukkueet: h.joukkueet.map((j) => j.id), joukkueetNimet: h.joukkueet.map((j) => j.nimi) }));
}
/** Kaikki Auth-tilit profiilille (kuiva-ajon lukumäärät + luonti). */
function tilit(profiili) { const ulos = []; for (let si = 0; si < profiili.seurat.length; si++) henkilokunta(profiili, si, rakennaJoukkueet(si, profiili.seurat[si].koko)).forEach((h) => ulos.push(h)); return ulos; }
function kayttajaDokumentti(h) {
  const nimi = h.etunimi + ' ' + h.sukunimi, t = aikaleima(KAUSI_ALKU, 8);
  return { uid: h.uid, email: h.email, etunimi: h.etunimi, sukunimi: h.sukunimi, nimi, rooli: h.rooli, seuraId: h.seuraId, joukkue: h.joukkueet[0] || null, joukkueNimi: h.joukkueetNimet[0] || null,
    joukkueet: h.joukkueet, joukkueetNimet: h.joukkueetNimet, aktiivinen: true, luotu: t, kutsuttu: t, luonut_uid: 'kuorma_generaattori', kutsuja: '', claimsAsetettu: true, synteettinen: true };
}

const ikkuna = (v) => ({ paivat: paivat(v + '-01-01', v + '-12-31', false), sunnuntait: paivat(v + '-01-01', v + '-12-31', true) });
const kierrokset = (v) => TESTIKIERROKSET.map((d) => v + d.slice(4));

/** Kaudet KAUSI-2 ja KAUSI-1 yhdelle pelaajalle (kirjaukset, viikkokatsaukset, havainnot, testitulokset). Päivittää `tila`n pikakentät kronologisesti (aiemmat ensin → 2026 jatkaa tilaa). */
function* aiemmatKaudet(profiili, siemen, polku, pid, pelaaja, joukkue, tila) {
  for (let ero = 2; ero >= 1; ero--) {
    const v = KAUSI - ero, ika = joukkue.ika - ero, sp = joukkue.sukupuoli, r = rng(siemen, polku + '#kausi' + v);
    yield* kausiHistoria(profiili, r, polku, pid, ikkuna(v), 'h' + v + '_');
    const kyky = rng(siemen, polku).normaali();
    const pvmt = kierrokset(v);
    for (let k = 0; k < pvmt.length; k++) for (const [protokolla] of PROTOKOLLAT) {
      if (protokolla === 'tekniikkakilpailu' && ika > 13) continue;
      const t = testit(r, ika, sp, kyky, k - 3 * ero, protokolla), upd = PK.tmLaskePikakentat(tila, t, pvmt[k]);
      Object.assign(tila, upd);
      const tulos = { testit: t, pelaajaId: pid, tunnistetyyppi: 'palloID', sukunimi: pelaaja.sukunimi, etunimi: pelaaja.etunimi, phv_tila: PHV_VAIHTOEHDOT(ika, r), testauspvm: pvmt[k], pvm_arvio: false, kausi: String(v), protokolla, tallennettu: aikaleima(pvmt[k], 20), ika, sukupuoli: sp, joukkue: joukkue.nimi, lahde: 'historiapohja' };
      if (upd.tki_viimeisin != null) { tulos.tki = upd.tki_viimeisin; if (upd.tki_merkki) tulos.merkki = upd.tki_merkki; }
      yield { polku: polku + '/testitulokset/' + pvmt[k] + '_' + protokolla, data: tulos };
    }
  }
}

/** jaksofokus (aktiivinen) + jaksofokus_historia (rivit kanonisella tmHistoriaEntry:llä). 3 kauden pelaajalla kaudessa profiili.kausia3.jaksoHistoriaaKaudessa riviä (pahin tapaus dokumenttikokoon, VAIHE0 §3.3). */
const KONSEPTIT = ['saynti', 'kaantyminen', 'pallonhallinta', 'ylivoima', 'suojautuminen', 'rytmi', 'suuntamuutos', 'viimeistely'];
function jaksoRivit(r, vuosi, lkm) {
  const rivit = [], paivaa = 330 / Math.max(lkm, 1);
  for (let i = 0; i < lkm; i++) {
    const a = Math.floor(i * paivaa), alku = iso(Date.parse(vuosi + '-01-05T00:00:00Z') + a * 86400000), loppu = iso(Date.parse(alku + 'T00:00:00Z') + Math.max(6, Math.floor(paivaa) - 1) * 86400000), k = KONSEPTIT[r.int(0, KONSEPTIT.length - 1)];
    rivit.push(TJ.tmHistoriaEntry({ konsepti_avain: 'teema_synt_' + k, konsepti_nimi: 'Synteettinen teema ' + k, alkoi: alku, paattyi: loppu, harjoituksia: r.int(3, 14), lasnaolo: null, arvio_ennen: r.int(1, 3), arvio_jalkeen: r.int(2, 4), arvioija_rooli: 'valmentaja', suljettu: loppu + 'T18:00:00.000Z' }));
    rivit[rivit.length - 1].sulkutapa = 'suljettu';
  }
  return rivit;
}
function jaksofokus(profiili, siemen, polku, k3) {
  const r = rng(siemen, polku + '#jaksot'), historia = [];
  if (k3) { for (let v = KAUSI - 2; v <= KAUSI - 1; v++) historia.push.apply(historia, jaksoRivit(r, v, profiili.kausia3.jaksoHistoriaaKaudessa)); historia.push.apply(historia, jaksoRivit(r, KAUSI, profiili.kausia3.jaksoHistoriaaKaudessa)); }
  else historia.push.apply(historia, jaksoRivit(r, KAUSI, r.int(profiili.jaksoHistoriaa[0], profiili.jaksoHistoriaa[1])));
  const k = KONSEPTIT[r.int(0, KONSEPTIT.length - 1)];
  return { jaksofokus: { domeeni: 'teknis_taktinen', konsepti_avain: 'teema_synt_' + k, konsepti_nimi: 'Synteettinen teema ' + k, alkoi: KAUSI_LOPPU + 'T00:00:00.000Z' }, jaksofokus_historia: historia };
}

/** Seuran kalenteri: joukkueittain `viikossa` harjoitusta/viikko kauden ikkunassa + lasnaolijat (joukkueen pääjäsenet = (n-1) % joukkueita). */
function* kalenteri(profiili, siemen, si, koko, joukkueet, henkilot) {
  const sid = seuraId(si), cfg = profiili.kalenteri, J = joukkueet.length, viikot = Math.floor(KAIKKI_PAIVAT.length / 7), valmentajat = henkilot.filter((h) => h.rooli === 'valmentaja');
  for (let ji = 0; ji < J; ji++) {
    const j = joukkueet[ji], roster = []; for (let n = ji + 1; n <= koko; n += J) roster.push(n);
    const paivaOffset = [(ji % 5), ((ji + 2) % 5), ((ji + 4) % 5)].slice(0, cfg.viikossa), valm = valmentajat.length ? valmentajat[ji % valmentajat.length].uid : 'kuorma_valmentaja';
    for (let w = 0; w < viikot; w++) for (const off of paivaOffset) {
      const pvm = KAIKKI_PAIVAT[w * 7 + off], eid = j.id + '_' + pvm, polku = 'seurat/' + sid + '/kalenteri/' + eid, r = rng(siemen, polku), alkuH = 16 + (ji % 3);
      const kooste = { paikalla: 0, myohassa: 0, poissa: 0, merkitsematta: 0 }, rivit = [];
      for (const n of roster) {
        const x = r();
        if (x >= cfg.lasnaoloOsuus) { kooste.merkitsematta++; continue; }
        const tila = x < cfg.lasnaoloOsuus * 0.82 ? 'paikalla' : x < cfg.lasnaoloOsuus * 0.9 ? 'myohassa' : 'poissa'; kooste[tila]++;
        rivit.push({ polku: polku + '/lasnaolijat/' + pelaajaId(si, n), data: { tila, syy: tila === 'poissa' ? r.valitse(['sairas', 'koulu', 'matka', 'muu']) : null, nimi: 'Testi Pelaaja S' + nn(si + 1, 2) + '-' + nn(n, 5), merkitsija_uid: valm, merkitty: aikaleima(pvm, alkuH + 3) } });
      }
      yield { polku, data: { nimi: 'Harjoitus', tyyppi: 'harjoitus', alkaa: aikaleima(pvm, alkuH), paattyy: aikaleima(pvm, alkuH + 2), koko_paiva: false, joukkue: j.id, joukkue_nimi: j.nimi, joukkueet: [j.id], kohde: { tyyppi: 'joukkue', joukkue: j.id }, nakyvyys: 'kaikki',
        osallistujat_uid: [], pelaajat_id: [], paikka: 'Testikenttä', luoja_uid: valm, luotu: aikaleima(KAUSI_ALKU, 9), paivitetty: aikaleima(pvm, alkuH + 3), muokkaaja_uid: valm, tila: 'suunniteltu', poistettu: false, lahde: 'manuaalinen', lasnaolo_kooste: kooste, synteettinen: true } };
      yield* rivit;
    }
  }
}

/** Toimenpiteet: automaattiset ehdotukset (id kuten palvelin: auto_{signaali}_{joukkue}_{vvvv-Www}_{sha1[:10]}) + pulssikuittaukset kanonisella tmPulssiKuittausDoc:lla. */
const SIGNAALIT = ['hh_taso_alhainen', 'suunta_lasku', 'tkk_puuttuu', 'tki_alhainen', 'tki_lahella_merkkia', 'flei_kartoitus_puuttuu'];
function* toimenpiteet(profiili, siemen, si, joukkueet) {
  const sid = seuraId(si), vk = '2026-W' + nn(isoViikko(KAUSI_LOPPU), 2), r = rng(siemen, 'seurat/' + sid + '/toimenpiteet');
  for (let i = 0; i < profiili.toimenpiteita; i++) {
    const j = joukkueet[i % joukkueet.length], signaali = SIGNAALIT[i % SIGNAALIT.length], teksti = 'Synteettinen ehdotus ' + nn(i + 1, 3) + ' (' + signaali + ') ' + j.nimi, kuitattu = r() < 0.3;
    const id = 'auto_' + signaali + '_' + j.id + '_' + vk + '_' + crypto.createHash('sha1').update(teksti).digest('hex').slice(0, 10);
    yield { polku: 'seurat/' + sid + '/toimenpiteet/' + id, data: { tyyppi: 'automaattinen', signaali, joukkue: j.nimi, teksti, tila: kuitattu ? 'kuitattu' : 'ehdotus', vp_teksti: null, luotu: aikaleima(KAUSI_LOPPU, 6), kuitattu_pvm: kuitattu ? aikaleima(KAUSI_LOPPU, 10) : null, kuitattu_uid: kuitattu ? tiliUid(si, 'vp') : null, synteettinen: true } };
  }
  for (let i = 0; i < Math.min(10, joukkueet.length); i++) {
    const s = { tyyppi: SIGNAALIT[i % SIGNAALIT.length], jid: joukkueet[i].id, ehto: 'synteettinen' }, siirretty = i % 3 === 0;
    yield { polku: 'seurat/' + sid + '/toimenpiteet/' + PULSSI.tmPulssiKuittausId(s), data: Object.assign({}, PULSSI.tmPulssiKuittausDoc(s, siirretty ? 'siirretty' : 'kuitattu', vk), { kuitattu_pvm: aikaleima(KAUSI_LOPPU, 9), kuitattu_uid: tiliUid(si, 'vp'), luotu: aikaleima(KAUSI_LOPPU, 9), synteettinen: true }) };
  }
}

/** Koko aineisto virtana: seura → joukkueet → (henkilökunta) → pelaajat → (kalenteri, toimenpiteet, kausikuvat). */
function* generoi(profiili, siemen) {
  for (let si = 0; si < profiili.seurat.length; si++) {
    const koko = profiili.seurat[si].koko, joukkueet = rakennaJoukkueet(si, koko), sid = seuraId(si), laaja = !!profiili.henkilokuntaa, henkilot = laaja ? henkilokunta(profiili, si, joukkueet) : [];
    const seuraData = { nimi: seuraNimi(si), synteettinen: true, kuorma_profiili: profiili.nimi, kuorma_siemen: String(siemen), luotu: aikaleima(KAUSI_ALKU, 8), aktiivinen: true };
    const vp = henkilot.filter((h) => h.rooli === 'vp')[0]; if (vp) { seuraData.vp_uid = vp.uid; seuraData.vp_email = vp.email; }
    yield { polku: 'seurat/' + sid, data: seuraData };
    for (const j of joukkueet) yield { polku: 'seurat/' + sid + '/joukkueet/' + j.id, data: Object.assign({ nimi: j.nimi, ikaryhma: j.ikaryhma, sukupuoli: j.sukupuoli, luotu: aikaleima(KAUSI_ALKU, 8), synteettinen: true }, laaja ? { jaksofokus_historia: jaksoRivit(rng(siemen, 'seurat/' + sid + '/joukkueet/' + j.id), KAUSI, 3) } : {}) };
    for (const h of henkilot) yield { polku: 'seurat/' + sid + '/kayttajat/' + h.uid, data: kayttajaDokumentti(h) };
    let kolme = 0; const kolmenKauden = [];
    for (let n = 1; n <= koko; n++) {
      const jid = (n - 1) % joukkueet.length, k3 = !!(profiili.kausia3 && si === 0 && joukkueet[jid].ika >= 10 && kolme < profiili.kausia3.pelaajia && ++kolme);
      if (k3) kolmenKauden.push({ id: pelaajaId(si, n), joukkue: joukkueet[jid].nimi, ikaluokka: (joukkueet[jid].sukupuoli === 'N' ? 'T' : 'P') + joukkueet[jid].ika, sukupuoli: joukkueet[jid].sukupuoli, syntymavuosi: KAUSI - joukkueet[jid].ika });
      yield* pelaajanDokumentit(profiili, siemen, si, n, joukkueet, jid, k3);
    }
    if (kolmenKauden.length) for (const v of [KAUSI - 2, KAUSI - 1]) yield { polku: 'seurat/' + sid + '/kausikuvat/' + v, data: { kausi: String(v), luotu: aikaleima(v + '-12-31', 12), luoja: tiliUid(si, 'vp'), pelaajat: kolmenKauden.map((p) => Object.assign({}, p, { syntymavuosi: p.syntymavuosi, talenttiOhjelma: false, tila: 'aktiivinen' })), synteettinen: true } };
    if (profiili.kalenteri) yield* kalenteri(profiili, siemen, si, koko, joukkueet, henkilot);
    if (profiili.toimenpiteita) yield* toimenpiteet(profiili, siemen, si, joukkueet);
  }
}

/** Kokoelmakohtainen dokumenttimäärä + seuroittain (kuiva-ajo, trigger-arvio): sama virta kuin kirjoituksessa → luvut täsmäävät kirjoitukseen. */
function laskeSeuroittain(profiili, siemen) {
  const m = { yht: 0 }, seurat = [];
  profiili.seurat.forEach((x, si) => seurat.push({ joukkueet: rakennaJoukkueet(si, x.koko).length, kirjaukset: 0, lasnaolijat: 0, kalenteri: 0 }));
  for (const d of generoi(profiili, siemen)) {
    const o = d.polku.split('/'), k = o.length % 2 === 0 ? o[o.length - 2] : o[o.length - 1]; m[k] = (m[k] || 0) + 1; m.yht++;
    if (k === 'kirjaukset' || k === 'lasnaolijat' || k === 'kalenteri') seurat[+o[1].slice(-2) - 1][k]++;
  }
  return { m, seurat };
}
function laske(profiili, siemen) { return laskeSeuroittain(profiili, siemen).m; }

/** PIN-pelaajat (PR 3b): seuran ENSIMMÄINEN pelaaja, jonka joukkueen ikä ≥ 10 (8–9-vuotiaana kirjautuminen estetty, functions/tm_pelaaja_ika.js) → [{ si, sid, pid, palloId }].
 *  palloId = normalisoitu muoto ('SYNT' + seura + nro, ei väliviivoja): pelaajakirjautuminen.normalisoiTunnus poistaa väliviivat, ja haku on tarkka (collectionGroup where palloId == tunnus),
 *  joten tuotantokoodin hakema avain on tämä, ei dokumentin `tunniste` ('SYNT-01-00001'). Ei satunnaisuutta: sama profiili → sama pelaaja. */
function pinPelaajat(profiili) {
  const ulos = [];
  for (let si = 0; si < profiili.seurat.length; si++) {
    const joukkueet = rakennaJoukkueet(si, profiili.seurat[si].koko);
    for (let n = 1; n <= profiili.seurat[si].koko; n++) {
      if (joukkueet[(n - 1) % joukkueet.length].ika < 10) continue;
      ulos.push({ si, sid: seuraId(si), pid: pelaajaId(si, n), palloId: 'SYNT' + nn(si + 1, 2) + nn(n, 5) });
      break;
    }
  }
  return ulos;
}

module.exports = { generoi, laske, pinPelaajat, laskeSeuroittain, tilit, henkilokunta, TILI_DOMAIN, tiliUid, rng, rakennaJoukkueet, PROFIILIT, KAUSI, TESTIKIERROKSET, seuraId, pelaajaId, KAIKKI_PAIVAT, SUNNUNTAIT, isoViikko };
