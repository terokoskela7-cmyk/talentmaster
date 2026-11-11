'use strict';
/* aineisto.js — projekti 06 PR 2: SYNTEETTISEN AINEISTON PUHDAS, DETERMINISTINEN GENERAATTORI (VAIHE0 §2.2, P10–P12). Ei Firestorea, ei kelloa, ei Math.random.
 * Sama (profiili, siemen) → täsmälleen sama aineisto (kaikki päivät johdetaan kiinteästä KAUSI-ikkunasta, ei "tänään"). Jokaiselle entiteetille oma siemen-alivirta (avain = polku),
 * joten yhden entiteetin muutos ei siirrä muiden satunnaislukuja.
 * Tietomuoto johdettu koodista/Rulesista, EI tuotantodatasta (GDPR): nimet ovat selvästi synteettisiä ("Testi Pelaaja S01-00001", tunniste SYNT-…), sähköpostit eivät esiinny lainkaan.
 * Kenttärakenteet:
 *   · pelaaja: joukkueet[] (id:t, totuus) + joukkueetNimet[] + joukkue/joukkueNimi (näyttönimi) — CLAUDE.md §7.18; ~3 % pelaajista kuuluu kahteen joukkueeseen (pelaa ylempänä)
 *   · testitulokset/{pvm}_{protokolla} RAAKADATANA (testit-kartta kuten Excel-tuonti: kuljetus_laukaus {y1,y2:{raaka,osumat}}), ei johdettuja arvoja ylikirjoitettuna
 *   · pikakentät (hh_*, d1_*, tki_*, tk_lajit_*, *_edellinen …) lasketaan KANONISELLA lib/tm_pikakentat.js:llä testikierros kerrallaan kronologisesti ja kirjoitetaan pelaajadokumenttiin
 *     YHDELLÄ set():llä → arvo + *_pvm -parit syntyvät aina yhdessä (§26 pari-invariantti). Vartijatesti tarkistaa parit jokaiselta pelaajalta. */
const path = require('path');
const PK = require(path.join(__dirname, '..', '..', 'lib', 'tm_pikakentat.js'));

const KAUSI = 2026;
const KAUSI_ALKU = '2026-01-05';      // maanantai
const KAUSI_LOPPU = '2026-11-08';     // sunnuntai
const TESTIKIERROKSET = ['2026-02-14', '2026-06-06', '2026-10-03'];
const IKARYHMAT = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

const PROFIILIT = {
  savu: { nimi: 'savu', seurat: [{ koko: 500 }, { koko: 500 }], kirjaukset: 100, viikkokatsaukset: 35, havainnot: 25, kierroksia: [2, 3], kaksiJoukkuettaTodennakoisyys: 0.03 },
};

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

/** Yksi pelaaja → [{ polku, data }] (pelaajadokumentti viimeisenä: pikakentät laskettu kaikista kierroksista). */
function* pelaajanDokumentit(profiili, siemen, si, n, joukkueet, jid) {
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
  // Kirjaukset (id = päivä), viikkokatsaukset (id = sunnuntai), havainnot
  const kpvt = otosJarjestyksessa(KAIKKI_PAIVAT, profiili.kirjaukset, r);
  for (const pvm of kpvt) yield { polku: polku + '/kirjaukset/' + pvm, data: { pvm, tyyppi: r.valitse(['D', 'S', 'T', 'joukkue', 'vapaa']), arvo: r.int(1, 5), pelaajaId: pid, luoja_uid: pid, luotu: aikaleima(pvm, r.int(15, 21)) } };
  for (const pvm of otosJarjestyksessa(SUNNUNTAIT, profiili.viikkokatsaukset, r)) {
    yield { polku: polku + '/viikkokatsaukset/' + pvm, data: { vk: isoViikko(pvm), jakso_alkoi: iso(Date.parse(pvm + 'T00:00:00Z') - 6 * 86400000), vastaukset: [{ osa: 'D1', teksti: 'Synteettinen vastaus', arvo: r.valitse(['usein', 'joskus', 'ei_viela']) }], luotu: aikaleima(pvm, 19) } };
  }
  const hpvt = otosJarjestyksessa(KAIKKI_PAIVAT, profiili.havainnot, r);
  for (let i = 0; i < hpvt.length; i++) yield { polku: polku + '/havainnot/h' + nn(i + 1, 3), data: { pvm: hpvt[i], teksti: 'Synteettinen havainto', nakyvyys: r() < 0.3 ? 'pelaaja' : 'valmentajat', tekija_uid: 'kuorma_valmentaja', luotu: aikaleima(hpvt[i], 18), synteettinen: true } };
  // Testikierrokset: raakadata → testitulokset/{pvm}_{protokolla}; pikakentät kanonisella libillä kronologisesti (tila kertyy) → yhdellä set():llä pelaajadokumenttiin
  const kierroksia = r.int(profiili.kierroksia[0], profiili.kierroksia[1]), pvmt = TESTIKIERROKSET.slice(TESTIKIERROKSET.length - kierroksia);
  const tila = Object.assign({}, pelaaja);
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
  yield { polku, data: tila };
}

/** Koko aineisto virtana: seura → joukkueet → pelaajat. Pelaajat jaetaan joukkueisiin tasan (koko/joukkueet). */
function* generoi(profiili, siemen) {
  for (let si = 0; si < profiili.seurat.length; si++) {
    const koko = profiili.seurat[si].koko, joukkueet = rakennaJoukkueet(si, koko), sid = seuraId(si);
    yield { polku: 'seurat/' + sid, data: { nimi: seuraNimi(si), synteettinen: true, kuorma_profiili: profiili.nimi, kuorma_siemen: String(siemen), luotu: aikaleima(KAUSI_ALKU, 8), aktiivinen: true } };
    for (const j of joukkueet) yield { polku: 'seurat/' + sid + '/joukkueet/' + j.id, data: { nimi: j.nimi, ikaryhma: j.ikaryhma, sukupuoli: j.sukupuoli, luotu: aikaleima(KAUSI_ALKU, 8), synteettinen: true } };
    for (let n = 1; n <= koko; n++) yield* pelaajanDokumentit(profiili, siemen, si, n, joukkueet, (n - 1) % joukkueet.length);
  }
}

/** Kokoelmakohtainen dokumenttimäärä (kuiva-ajo): sama virta kuin kirjoituksessa → luvut täsmäävät kirjoitukseen. */
function laske(profiili, siemen) {
  const m = { yht: 0 };
  for (const d of generoi(profiili, siemen)) { const o = d.polku.split('/'), k = o.length % 2 === 0 ? o[o.length - 2] : o[o.length - 1]; m[k] = (m[k] || 0) + 1; m.yht++; }
  return m;
}

module.exports = { generoi, laske, rng, rakennaJoukkueet, PROFIILIT, KAUSI, TESTIKIERROKSET, seuraId, pelaajaId, KAIKKI_PAIVAT, SUNNUNTAIT, isoViikko };
