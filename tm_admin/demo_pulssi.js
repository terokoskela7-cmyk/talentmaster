'use strict';
/* ══════════════════════════════════════════════════════════════════════════════════════════════
   demo_pulssi.js — Demo FC:n SEURAN PULSSI -demodata (docs/CODE_BRIEF_S2_DEMODATA.md; mockupit 23 + 25).
   Käyttö: tm_admin/setup_demo_kehitys.js --vain=pulssi [--kirjoita] [--kayttoonotto] [--nyt=ISO]. Tämä moduuli on PURE: ei Firebasea, ei kelloa
   (nytMs annetaan sisään), palauttaa vain kirjoitettavat dokumentit. Kirjoitus + turvavartija on setup_demo_kehitys.js:ssä.

   PERIAATE: yksi PELAAJAMALLI tuottaa sekä (a) kuluvan viikon silmukkadatan Firestore-dokumentteina (samoilla kentillä kuin oikeat kirjoittajat:
   Pelaaja_v7 kirjaukset + viikkokatsaukset, huoltajan jakso_kuittaus, jaksofokus + jaksofokus_historia, suostumusTila) että (b) neljän edellisen viikon
   koosteen — SAMALLA lib/tm_seuran_kooste.js -laskennalla kuin palvelin (tmKoosteAnalysoi + tmKoosteTulos). Kuluvan viikon kooste lasketaan palvelimella
   ("📊 Päivitä seuran kooste"); testi varmistaa, että palvelimen tulos = tämän mallin w=0-tulos.
   PÄIVÄMÄÄRÄT: kaikki suhteessa nytMs:ään (viikko = Helsingin ISO-viikko). Saman ajon voi toistaa ennen jokaista demoa.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */
const path = require('path');
const K = require(path.join(__dirname, '..', 'lib', 'tm_seuran_kooste.js'));
const H = require(path.join(__dirname, '..', 'functions', 'helsinki_paiva.js'));

const SEURA_POLKU = 'seurat/demo-fc';
const KAUSI = 2026;                 // joukkuenimen ikä = KAUSI − syntymävuosi (sama kuin setup_demo_kehitys.js:n P14 = 2012)
const DAY = 86400000;
const POISTA = { __poista: true };  // → FieldValue.delete() kirjoittavassa ajossa

/* ── Joukkueet ──────────────────────────────────────────────────────────────────────────────────
   Ikävaihe tulee lib/tm_ikavaihe.js:stä (≤12 Leikkijä · ≤15 Rakentaja · muu Showcase), EI briiffin taulukon nimistä: P12 ja T12 ovat Leikkijöitä.
   Viikkokohtaiset taulukot ovat indeksoitu w = 0 (kuluva), 1 … 4 (edelliset viikot).
     j  jakso käynnissä (pelaajia)     e  jakso päättynyt, katselmus kesken (pelaajia)    v  viikkokatsaukseen vastanneet (perustasta)
     h  harjoite merkitty 7 pv (pelaajia)   f  perheen kuittaus 7 pv (Leikkijä)           a/l  katselmus ajallaan / myöhässä (sulkeutui viikolla)
     jakso  joukkueen oma jakso voimassa viikolla                                          */
const V5 = (x) => [x, x, x, x, x];
const TIIMIT = [
  { id: 'p10_demo', nimi: 'P10 Demo', ika: 'P10', sp: 'M', tyyppi: 'kilpa', profiili: 'oto', n: 8, uusi: true,
    j: [7, 7, 8, 8, 8], e: V5(0), v: V5(0), h: [3, 4, 3, 2, 3], f: [5, 4, 5, 3, 4], a: [2, 2, 1, 2, 2], l: V5(0), jakso: V5(true), teema: 'Pelaaminen', kesto: 8, alku: 28 },
  { id: 'p11_demo', nimi: 'P11 Demo', ika: 'P11', sp: 'M', tyyppi: 'harraste', profiili: 'oto', n: 8, uusi: true,
    j: [7, 7, 8, 8, 7], e: V5(0), v: V5(0), h: [2, 2, 3, 2, 2], f: [3, 3, 2, 3, 2], a: [1, 1, 0, 1, 1], l: V5(0), jakso: V5(true), teema: 'Ensikosketus', kesto: 6, alku: 14 },
  { id: 'p12_demo', nimi: 'P12 Demo', ika: 'P12', sp: 'M', tyyppi: 'kilpa', profiili: 'ammatti', n: 10, uusi: true,
    j: [9, 9, 10, 10, 10], e: V5(0), v: V5(0), h: [4, 4, 5, 4, 3], f: [6, 6, 5, 6, 5], a: [3, 2, 3, 3, 2], l: V5(0), jakso: V5(true), teema: 'Haltuunotto', kesto: 6, alku: 14 },
  { id: 'p13_demo', nimi: 'P13 Demo', ika: 'P13', sp: 'M', tyyppi: 'kilpa', profiili: 'ammatti', n: 12, uusi: true,
    j: [7, 7, 12, 12, 12], e: [5, 5, 0, 0, 0], v: [6, 5, 9, 8, 9], h: [7, 7, 8, 6, 7], f: V5(0), a: [0, 0, 3, 3, 2], l: V5(0), jakso: V5(true), teema: 'Ensimmäinen kosketus', kesto: 6, alku: 35 },
  { id: 'p14_demo', nimi: 'P14 Demo', ika: 'P14', sp: 'M', tyyppi: 'kilpa', profiili: 'ammatti', n: 18, uusi: false,
    j: V5(18), e: V5(0), v: [7, 9, 12, 15, 15], h: [11, 12, 11, 12, 10], f: V5(0), a: [4, 4, 3, 4, 4], l: V5(0), jakso: V5(true), teema: 'Kuljettaminen', kesto: 4, alku: 14 },
  { id: 'p15_demo', nimi: 'P15 Demo', ika: 'P15', sp: 'M', tyyppi: 'kilpa', profiili: 'oto', n: 10, uusi: true,
    j: [0, 0, 0, 10, 10], e: V5(0), v: [0, 0, 0, 7, 7], h: [6, 6, 5, 6, 6], f: V5(0), a: [0, 0, 0, 2, 2], l: V5(0), jakso: [false, false, false, true, true], teema: 'Pelaaminen', kesto: 8, alku: 28 },
  { id: 'p16_demo', nimi: 'P16 Demo', ika: 'P16', sp: 'M', tyyppi: 'harraste', profiili: 'oto', n: 10, uusi: true,
    j: [9, 9, 10, 10, 10], e: V5(0), v: [5, 5, 6, 5, 5], h: [3, 3, 4, 3, 4], f: V5(0), a: [2, 2, 1, 2, 2], l: V5(0), jakso: V5(true), teema: 'Syöttö', kesto: 8, alku: 21 },
  { id: 't12_demo', nimi: 'T12 Demo', ika: 'T12', sp: 'N', tyyppi: 'kilpa', profiili: 'oto', n: 4, uusi: false,
    j: [3, 3, 4, 4, 3], e: V5(0), v: V5(0), h: [1, 1, 2, 1, 1], f: [2, 2, 2, 1, 2], a: [1, 0, 1, 0, 1], l: V5(0), jakso: V5(true), teema: 'Peliasento', kesto: 4, alku: 14 },
  { id: 't14_demo', nimi: 'T14 Demo', ika: 'T14', sp: 'N', tyyppi: 'kilpa', profiili: 'ammatti', n: 16, uusi: false,
    j: [14, 15, 16, 16, 16], e: V5(0), v: [12, 11, 12, 12, 11], h: [9, 8, 9, 10, 8], f: V5(0), a: [2, 3, 3, 4, 3], l: [4, 3, 2, 1, 2], jakso: V5(true), teema: 'Murtautuminen', kesto: 8, alku: 35 },
];
/* Yksi pelaaja kahdessa joukkueessa (§7.18): P14:n pelaaja pelaa myös P16:ssa. Hänen aktiivisuutensa määräytyy kotijoukkueen (P14) säännöistä. */
const KAKSI_JOUKKUETTA = { pelaaja: 'demo_p14_05', koti: 'p14_demo', lisaksi: 'p16_demo' };
const SUOSTUMUS_PROS = [72, 69, 66, 62, 58];   // annettu %, viikoittain nouseva (w = 0 uusin) → seura jää alle 90 % → käyttöönottonauha

const FNV = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const rank = (id, suola) => FNV(id + '|' + suola) % 100;
const lisaaPv = (pvm, n) => { const d = new Date(pvm + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const isoPvm = (pvm, hh) => pvm + 'T' + (hh || '08:00') + ':00.000Z';
const ts = (iso) => ({ __ts: iso });
const SERVER_TS = { __serverTimestamp: true };

/* ── Pelaajat ── */
function rakennaPelaajat() {
  const lista = [];
  TIIMIT.forEach((t) => {
    const pref = t.id.split('_')[0];
    for (let k = 0; k < t.n; k++) lista.push({ id: 'demo_' + pref + '_' + String(k + 1).padStart(2, '0'), koti: t.id, k, uusi: t.uusi, joukkueet: [t.id] });
  });
  const kaksi = lista.find((p) => p.id === KAKSI_JOUKKUETTA.pelaaja);
  if (!kaksi || kaksi.koti !== KAKSI_JOUKKUETTA.koti) throw new Error('demo_pulssi: kahden joukkueen pelaajaa ei löydy');
  kaksi.joukkueet = [KAKSI_JOUKKUETTA.koti, KAKSI_JOUKKUETTA.lisaksi];
  return lista;
}
const PELAAJAT = rakennaPelaajat();
const tiimi = (id) => TIIMIT.find((t) => t.id === id);
const ikaOn = (t) => parseInt(t.ika.slice(1), 10);
const leikkija = (t) => ikaOn(t) <= 12;

/* ── Viikot ── */
function viikko(nytMs, w) {
  const R0 = H.viikonRajat(nytMs);
  const r = w === 0 ? R0 : H.viikonRajat(R0.alkuMs - w * 7 * DAY + 12 * 3600000);
  const nyt = w === 0 ? nytMs : r.su21Ms, arvioMs = Math.min(nyt, r.su21Ms);
  return { w, r, nytMs: nyt, arvioMs, T: K.pvmHelsinki(arvioMs), vuosi: H.helsinginVuosi(arvioMs), maanantai0: R0.maanantaiIso };
}

/* Pelaajan tila viikolla w (kaikki lähteet): liput + päivämäärät. */
function pelaajaViikolla(p, wk) {
  const t = tiimi(p.koti), w = wk.w, n = t.n, k = p.k, T = wk.T;
  const aktiivinen = k < t.j[w], paattynyt = k >= n - t.e[w], jaksolla = aktiivinen || paattynyt;
  const perusta = aktiivinen && !leikkija(t);
  // viikkokatsaus: vastanneet = perustan ensimmäiset v (aktiivisten järjestys = indeksi)
  const vastasi = perusta && k < t.v[w];
  const harj = k >= n - t.h[w];
  const perhe = leikkija(t) && k < t.f[w];
  const rivi = k < t.a[w] + t.l[w] ? (k < t.a[w] ? 'ajallaan' : 'myohassa') : null;
  return {
    t, aktiivinen, paattynyt, jaksolla, perusta, vastasi, harj, perhe, rivi, k,
    harjPvm: lisaaPv(T, -(k % 4)), perhePvm: lisaaPv(T, -(4 + (k % 3))), vkPvm: wk.r.sunnuntaiIso,
    suostumus: rank(p.id, 'suostumus') < SUOSTUMUS_PROS[w],
    kirjautui: rank(p.id, 'kirj') < 60 ? lisaaPv(T, -(rank(p.id, 'kirjpv') % 25)) : null,
    huoltaja: rank(p.id, 'huolt') < 30 ? lisaaPv(T, -(rank(p.id, 'huoltpv') % 25)) : null,
  };
}

function jaksofokusPelaaja(s, wk) {
  const M0 = wk.maanantai0;
  if (s.paattynyt) return { konsepti_avain: 'nopeus', konsepti_nimi: 'Nopeus', domeeni: 'fyysinen', alkoi: isoPvm(lisaaPv(M0, -32)), kesto_vk: 4, lahde: 'valmentaja' };   // päättyi M−4 → katselmusikkuna auki
  if (s.aktiivinen) return { konsepti_avain: 'nopeus', konsepti_nimi: 'Nopeus', domeeni: 'fyysinen', alkoi: isoPvm(lisaaPv(M0, -28)), kesto_vk: 8, lahde: 'valmentaja' };
  return null;
}
function katselmusRivit(s, wk) {
  if (!s.rivi) return [];
  const ikkuna = wk.r.alkuMs + 30 * 60000, paattyi = ikkuna - 14 * DAY;   // ikkuna sulkeutuu TÄLLÄ viikolla (alkuMs, loppuMs]
  const suljettu = s.rivi === 'ajallaan' ? paattyi + 7 * DAY : ikkuna + 3600000;
  return [{ sulkutapa: 'suljettu', konsepti_avain: 'nopeus', paattyi: new Date(paattyi).toISOString(), suljettu: new Date(suljettu).toISOString() }];
}
function joukkueJakso(t, wk) {
  return t.jakso[wk.w] ? { osa_alueet: { tekninen_taktinen: { nimi: t.teema } }, alku: lisaaPv(wk.maanantai0, -t.alku), kesto_vk: t.kesto } : null;
}

/* Pelaajan syöte kooste-laskentaan (sama muoto kuin functions/seuran_kooste.js laskeSeura + keraaOma tuottaa). */
function koosteSyote(p, wk) {
  const s = pelaajaViikolla(p, wk), T = wk.T, t = s.t;
  const vkPvm = s.vastasi && s.vkPvm <= T ? s.vkPvm : null;   // viikkokatsaus on sunnuntaina; ennen su 21 se ei vielä ole arviointihetkeen mennessä (kuten keraaOma)
  const harjoite = s.harj ? [s.harjPvm] : [], perhe = s.perhe ? [s.perhePvm] : [];
  return {
    id: p.id, joukkue: t.nimi, joukkueet: p.joukkueet.slice(), syntymaVuosi: KAUSI - ikaOn(t),
    jaksofokus: jaksofokusPelaaja(s, wk), jaksofokus_historia: katselmusRivit(s, wk), ydinvahvuus: null, ydinvahvuus_valinta: null, idp_sitoumus_pvm: null,
    suostumus: s.suostumus, viimeisinKirjautuminen: s.kirjautui, huoltajaViimeisinKaynti: s.huoltaja,
    oma: harjoite.concat(perhe, vkPvm ? [vkPvm] : []), toiminto: perhe.concat(vkPvm ? [vkPvm] : []), perhe: perhe, harjoite: harjoite,
    _vastasi: s.vastasi,
  };
}

/* Viikon kooste samoilla puhtailla funktioilla kuin palvelin (ilman Firestorea). */
function koosteViikolta(nytMs, w) {
  const wk = viikko(nytMs, w);
  const joukkueet = TIIMIT.map((t) => ({ id: t.id, nimi: t.nimi, ikaryhma: t.ika, jaksofokus: joukkueJakso(t, wk), tyyppi: t.tyyppi, valmentajaprofiili: t.profiili }));
  const pelaajat = PELAAJAT.map((p) => koosteSyote(p, wk));
  const analyysi = K.tmKoosteAnalysoi({ joukkueet, pelaajat, aika: { alkuMs: wk.r.alkuMs, loppuMs: wk.r.loppuMs, arvioMs: wk.arvioMs, nytMs: wk.nytMs, vuosi: wk.vuosi } });
  const vastanneet = analyysi.ehdokkaat.filter((pid) => pelaajat.find((x) => x.id === pid)._vastasi);
  const doc = K.tmKoosteTulos(analyysi, { vastanneet, katselmusLoytyi: [] }, { vk: wk.r.tunniste });
  return { wk, doc };
}

/* ── Kirjoitettavat dokumentit ── */
function rakenna(opts) {
  opts = opts || {};
  const nytMs = opts.nytMs != null ? opts.nytMs : Date.now();
  const wk0 = viikko(nytMs, 0), T = wk0.T;
  const docs = [];   // { polku, data, merge }
  const lisaa = (polku, data, merge) => docs.push({ polku: SEURA_POLKU + '/' + polku, data: Object.assign({ demo: true }, data), merge: !!merge });

  // 1. Kenttä-lippu (D67)
  lisaa('liput/julkiset', { kentta: true }, true);
  // 2. Joukkueet (olemassa olevat: merge → nimi/ikäryhmä säilyvät; uudet: täysi dokumentti)
  TIIMIT.forEach((t) => {
    const jj = joukkueJakso(t, wk0);
    lisaa('joukkueet/' + t.id, Object.assign({ tyyppi: t.tyyppi, valmentajaprofiili: t.profiili, jaksofokus: jj || POISTA },
      t.uusi ? { nimi: t.nimi, ikaryhma: t.ika, vuosi: String(KAUSI - ikaOn(t)), jarjestys: ikaOn(t), luotu: SERVER_TS } : {}), true);
  });
  // 3. Pelaajat (silmukkadata kuluvalle viikolle)
  PELAAJAT.forEach((p) => {
    const s = pelaajaViikolla(p, wk0), t = s.t, P = 'pelaajat/' + p.id;
    const nimet = p.joukkueet.map((id) => tiimi(id).nimi);
    const jf = jaksofokusPelaaja(s, wk0), rivit = katselmusRivit(s, wk0);
    const suostumusTila = s.suostumus ? 'annettu' : (rank(p.id, 'kutsu') < 55 ? 'odottaa' : 'pilotti');
    const doc = {
      joukkue: t.nimi, joukkueNimi: t.nimi, joukkueet: p.joukkueet.slice(), joukkueetNimet: nimet, seuraId: 'demo-fc', pelaajaId: p.id,
      syntymaVuosi: KAUSI - ikaOn(t), sukupuoli: t.sp, suostumusTila, tila: 'aktiivinen',
      jaksofokus: jf || POISTA, jaksofokus_historia: rivit.length ? rivit : POISTA,
      viimeisinKirjautuminen: s.kirjautui || POISTA, huoltajaViimeisinKaynti: s.huoltaja || POISTA,
    };
    if (p.uusi) Object.assign(doc, { etunimi: 'Demo', sukunimi: t.ika + '-' + String(p.k + 1).padStart(2, '0'), nimi: 'Demo ' + t.ika + '-' + String(p.k + 1).padStart(2, '0'), lahde: 'demo', luotu: SERVER_TS });
    lisaa(P, doc, true);
    // harjoitekirjaus (Pelaaja_v7 _tmKirjaa -muoto) → n_harjoite_7
    if (s.harj) lisaa(P + '/kirjaukset/' + s.harjPvm, {
      tyyppi: 'T', tehty: true, tehty_T: true, lahde: 'pelaaja', kirjaustapa: 'heti', aika: 'ilta', pvm: s.harjPvm, kesto_min: 30 + (p.k % 4) * 10, rpe: 4 + (p.k % 3),
      fiilinki: 3 + (p.k % 3), xp: 10, luotu: ts(s.harjPvm + 'T17:00:00.000Z'), paivitetty: SERVER_TS }, false);
    // huoltajan jakso_kuittaus (U12) → n_perhe_kuittaus_7 + n_toiminto_7; EI tehty-kenttää → ei harjoite
    if (s.perhe) lisaa(P + '/kirjaukset/' + s.perhePvm, { jakso_kuittaus: { lahde: 'vanhempi', kuitattu: true, pvm: s.perhePvm }, paivitetty: SERVER_TS }, false);
    // viikkokatsaus (Pelaaja_v7 tmVkTallennusolio): id = viikon sunnuntai
    if (s.vastasi) lisaa(P + '/viikkokatsaukset/' + s.vkPvm, {
      vk: 3, jakso_alkoi: lisaaPv(wk0.maanantai0, -28), vastaukset: [{ osa: 'jakso', teksti: 'Miten jakso on sujunut?', arvo: p.k % 3 === 2 ? 'joskus' : 'usein' }], luotu: SERVER_TS }, false);
  });
  // 4. Edelliset viikot koostedokumentteina (trendi). --kayttoonotto: vain kaksi viikkoa → kuluva viikko = käyttöönoton 3. viikko (ei värejä)
  const viikkoja = opts.kayttoonotto ? 2 : 4, historia = [];
  for (let w = 1; w <= 4; w++) {
    const { wk, doc } = koosteViikolta(nytMs, w);
    historia.push({ w, vk: wk.r.tunniste, kirjoitetaan: w <= viikkoja, doc });
    if (w > viikkoja) continue;
    const laskettu = ts(new Date(wk.r.su21Ms).toISOString());
    lisaa('kooste/' + wk.r.tunniste, Object.assign({}, doc, { laskettu }), false);
    K.tmKoosteJoukkueDokumentit(doc).forEach((j) => lisaa('kooste_joukkue/' + j.id, Object.assign({}, j.data, { laskettu }), false));
  }
  /* Käyttöönoton alku (D69): seuran ENSIMMÄINEN kooste. Normaalitilassa kirjoitetaan yksi harva "ensimmäinen kooste" 14 viikkoa taaksepäin (kopio W-4:n
     luvuista, vain `kooste/`; trendi lukee vain 4 viimeistä viikkoa) → käyttöönotto on ohi ja käytön tavoite on täysi (50 %/30 %, portaat 25 → 40 → 50). */
  if (!opts.kayttoonotto) {
    const w14 = viikko(nytMs, 14), vanha = historia.find((h) => h.w === 4).doc;
    lisaa('kooste/' + w14.r.tunniste, Object.assign({}, vanha, { vk: w14.r.tunniste, laskettu: ts(new Date(w14.r.su21Ms).toISOString()) }), false);
  }
  const vanhin = historia.filter((h) => h.kirjoitetaan).slice(-1)[0];
  return { nytMs, T, kuluva: wk0, historia, docs, poistaVanhemmatKuin: opts.kayttoonotto ? vanhin.vk : null, kayttoonotto: !!opts.kayttoonotto };
}

/* TURVAVARTIJA: jokainen kirjoitus seurat/demo-fc/** -polkuun ja demo: true. Heittää ennen mitään kirjoitusta (setup_demo_kehitys.js kutsuu ennen ensimmäistä batchia). */
function tarkistaPolut(docs) {
  (docs || []).forEach((x) => {
    if (typeof x.polku !== 'string' || !x.polku.startsWith(SEURA_POLKU + '/')) throw new Error('TURVA: polku ' + x.polku + ' ei ole ' + SEURA_POLKU + ' -alla');
    if (x.polku.indexOf('..') >= 0) throw new Error('TURVA: virheellinen polku ' + x.polku);
    if (!x.data || x.data.demo !== true) throw new Error('TURVA: demo:true puuttuu polussa ' + x.polku);
  });
  return true;
}

module.exports = { tarkistaPolut, rakenna, koosteViikolta, viikko, TIIMIT, PELAAJAT, KAKSI_JOUKKUETTA, POISTA, SEURA_POLKU, KAUSI, SUOSTUMUS_PROS };
