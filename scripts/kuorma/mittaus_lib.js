'use strict';
/* mittaus_lib.js — projekti 06 PR 3: mittausputken PURE-apurit (ei verkkoa, ei Firestorea). Käyttö: mittaa_sivut.js, mittaa_funktiot.js, mittaa_dokkoot.js, mittaus_raportti.js.
 *   · RAJAT — P11-hyväksymisrajat (VAIHE0.md, PM-päätös) YHDESSÄ paikassa, jotta raportti ei tulkitse jälkikäteen.
 *   · tilasto, laskeInteraktiivinen (TTI-approksimaatio), firestoreDokKoko (Firestore-tallennuskoko), kustannus,
 *   · lueTunnukset/piilota (salasanat eivät koskaan tulosteeseen), kanavaUrlSallittu (vain staging-hosting), parsiFunktioLoki. */

/** P11 (VAIHE0.md, taulukko "PM:n päätökset"). Tulkinta (kiinteä, ei jälkikäteen): sivumittarit arvioidaan KYLMÄN avauksen MEDIAANILLA (p95 raportoidaan, ⚠ jos p95 ylittää); funktio = suurin kolmesta ajosta;
 *  Slow 4G -raja koskee puhelinemulaatiota 500 pelaajan seuralla; työpöytäraja koskee kaapeliprofiilia. */
const RAJAT = Object.freeze({
  interaktiivinen_tyopoyta_s: 2,
  interaktiivinen_slow4g_s: 5,          // P7 (12.11.2026): puhelin < 5 s → Pelaaja, Vanhempi, Testaus, Kehitystyöpöytä
  interaktiivinen_slow4g_raskas_s: 10,  // P7: VP, Master, Seura = työpöytäsovelluksia → työpöytä < 2 s (yllä) ja puhelin < 10 s
  raskaat_sivut: Object.freeze(['vp', 'master', 'seura']),
  lukuja_per_avaus: 2000,               // P4 (12.11.2026): henkilökunta (VP, Master, Seura, Kehitystyöpöytä, Testaus)
  lukuja_per_avaus_pelaaja: 200,        // P4: pelaaja ja huoltaja
  pelaajasivut: Object.freeze(['pelaaja', 'vanhempi']),
  funktio_s: 270,                       // 50 % 540 s:n rajasta, 40 seuralla
  pelaajadokumentti_kt: 250,            // 25 % 1 MiB:stä kolmen kauden jälkeen
  kustannus_eur_pelaaja_vuosi: 1,       // nykyhinnoittelu 1 €/pelaaja/kk → infra korkeintaan ~8 %
  funktio_aikaraja_s: 540,
});

/** Sivukohtaiset rajat (P4 + P7). profiili: 'tyopoyta' | 'puhelin'. */
const rajaAika = (sivu, profiili) => (profiili === 'tyopoyta' ? RAJAT.interaktiivinen_tyopoyta_s : (RAJAT.raskaat_sivut.indexOf(sivu) >= 0 ? RAJAT.interaktiivinen_slow4g_raskas_s : RAJAT.interaktiivinen_slow4g_s));
const rajaLuvut = (sivu) => (RAJAT.pelaajasivut.indexOf(sivu) >= 0 ? RAJAT.lukuja_per_avaus_pelaaja : RAJAT.lukuja_per_avaus);

const mediaani = (a) => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const prosenttipiste = (a, p) => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.max(0, Math.ceil(p * s.length) - 1))]; };
/** → { n, mediaani, p95, min, max } (null-arvot ohitetaan). */
function tilasto(arvot) {
  const a = (arvot || []).filter((x) => typeof x === 'number' && isFinite(x));
  if (!a.length) return { n: 0, mediaani: null, p95: null, min: null, max: null };
  return { n: a.length, mediaani: mediaani(a), p95: prosenttipiste(a, 0.95), min: Math.min.apply(null, a), max: Math.max.apply(null, a) };
}

/** TTI-approksimaatio (Lighthouse-tyyli, lyhyt ikkuna): aikaisin hetki t ≥ fcp, josta eteenpäin ikkunan (ms) ajan ei ole yhtään "kiireistä" jaksoa
 *  (pitkä tehtävä > 50 ms tai avoin Firestore-luku). varit = [[alku, loppu], …] (ms navigaation alusta); havaintoLoppu = viimeisin havaintohetki. → t tai null (ei rauhoittunut). */
function laskeInteraktiivinen(o) {
  const fcp0 = o && o.fcp, ikkuna = (o && o.ikkuna) || 2000, loppu = o && o.havaintoLoppu;
  if (typeof fcp0 !== 'number' || typeof loppu !== 'number') return null;
  /* alaraja (A/B 22.11. kuorma-b): hitaalla verkolla FCP (kuori) tulee ennen kirjautumista; kun CPU odottaa verkkoa, "rauhoittunut" laukeaa jo FCP:n hetkellä (TTI 0,4–0,5 s, 121 lukua).
     alaraja = hetki, jolloin sivu oli kirjautunut/auth valmis → TTI ei voi olla sitä aiempi. */
  const fcp = typeof (o && o.alaraja) === 'number' ? Math.max(fcp0, o.alaraja) : fcp0;
  const varit = ((o && o.varit) || []).filter((v) => v && v[1] > fcp).map((v) => [Math.max(v[0], fcp), v[1]]).sort((a, b) => a[0] - b[0]);
  let t = fcp;
  for (const [a, b] of varit) { if (a - t >= ikkuna) break; if (b > t) t = b; }   // seuraava kiireinen jakso alkaa vasta ikkunan jälkeen → t kelpaa
  return loppu - t >= ikkuna ? t : null;
}

/* ---- Firestore-tallennuskoko (https://firebase.google.com/docs/firestore/storage-size): nimi = Σ(polkusegmentti utf8 + 1) + 16; dokumentti = nimi + Σ kentät + 32; kenttä = nimi utf8 + 1 + arvo.
 *      merkkijono utf8+1 · luku 8 · totuusarvo 1 · null 1 · aikaleima 8 · geopiste 16 · viittaus = dokumentin nimi · taulukko Σ arvot · map Σ (avain utf8 + 1 + arvo) · bytes pituus. */
const _u8 = (s) => Buffer.byteLength(String(s), 'utf8');
function nimiKoko(polku) { return String(polku).split('/').reduce((a, s) => a + _u8(s) + 1, 0) + 16; }
function arvoKoko(v) {
  if (v === null || v === undefined) return 1;
  if (typeof v === 'string') return _u8(v) + 1;
  if (typeof v === 'number') return 8;
  if (typeof v === 'boolean') return 1;
  if (v instanceof Date) return 8;
  if (Buffer.isBuffer(v) || v instanceof Uint8Array) return v.length;
  if (Array.isArray(v)) return v.reduce((a, x) => a + arvoKoko(x), 0);
  if (typeof v === 'object') {
    if (typeof v.toDate === 'function' || ('_seconds' in v && '_nanoseconds' in v) || ('seconds' in v && 'nanoseconds' in v)) return 8;
    if ('latitude' in v && 'longitude' in v && Object.keys(v).length === 2) return 16;
    if (typeof v.path === 'string' && typeof v.id === 'string') return nimiKoko(v.path);
    return Object.keys(v).reduce((a, k) => a + _u8(k) + 1 + arvoKoko(v[k]), 0);
  }
  return 8;
}
/** Dokumentin koko tavuina (laskentakaava; todellinen koko ei ole API:ssa). */
function firestoreDokKoko(polku, data) {
  const d = data || {}; let s = nimiKoko(polku) + 32;
  for (const k of Object.keys(d)) if (d[k] !== undefined) s += _u8(k) + 1 + arvoKoko(d[k]);
  return s;
}

/** Kuukausi- ja vuosikustannus per pelaaja. syote: { lukujaAvaus (mediaani), pelaajia, kayttajia, avauksiaPvKayttaja, paivia, funktiot: [{ kutsuja, gbS }], hinnat, kurssi }.
 *  P7-profiili: 10 käyttäjää/seura × 2 avausta/pv × 20 pv. Hinnat oletuksia (Firestore eur3: $0,06/100 000 luku) → tulos ARVIO. */
function kustannus(o) {
  const h = Object.assign({ luku: 0.06 / 1e5, kutsu: 0.40 / 1e6, gbS: 0.0000025 }, o.hinnat), kurssi = o.kurssi || 0.92;
  const avauksia = o.kayttajia * (o.avauksiaPvKayttaja || 2) * (o.paivia || 20), luvut = avauksia * o.lukujaAvaus;
  const fn = (o.funktiot || []).reduce((a, f) => a + f.kutsuja * h.kutsu + f.gbS * h.gbS, 0);
  const usdKk = luvut * h.luku + fn, eurKk = usdKk * kurssi;
  return { avauksiaKk: avauksia, luvutKk: luvut, usdKk, eurKk, eurPelaajaVuosi: o.pelaajia ? eurKk * 12 / o.pelaajia : null, kurssi };
}

/* ---- tunnukset: rivi "email<TAB>salasana<TAB>…", # = kommentti. Salasanat vain muistissa; piilota() poistaa ne mistä tahansa merkkijonosta ennen tulostusta. */
function lueTunnukset(teksti) {
  const m = new Map();
  String(teksti || '').split(/\r?\n/).forEach((r) => { if (!r.trim() || r.trim()[0] === '#') return; const p = r.split('\t'); if (p.length >= 2 && /@kuorma\.test$/.test(p[0].trim()) && p[1]) m.set(p[0].trim(), p[1].trim()); });
  return m;
}
/** PR 3b: pelaajan PalloID tunnustiedostosta (rivi pelaaja.sNN@kuorma.test, 5. sarake). PalloID ei ole salaisuus; PIN on rivin 2. sarake (haeTunnus(map,'pelaaja',n).salasana → piilota()). → merkkijono tai null. */
function haePalloId(teksti, seuraNro) {
  const avain = 'pelaaja.s' + String(seuraNro).padStart(2, '0') + '@kuorma.test';
  const rivi = String(teksti || '').split(/\r?\n/).find((r) => r.split('\t')[0].trim() === avain);
  const v = rivi && rivi.split('\t')[4];
  return v && /^[0-9A-Z]{1,32}$/.test(v.trim()) ? v.trim() : null;
}
/** Tunnus roolille ja seuranumerolle ("vp", 1 → vp.s01@kuorma.test). → { email, salasana } tai null. */
function haeTunnus(map, rooli, seuraNro) { const e = rooli + '.s' + String(seuraNro).padStart(2, '0') + '@kuorma.test'; return map.has(e) ? { email: e, salasana: map.get(e) } : null; }
function piilota(teksti, map) { let s = String(teksti == null ? '' : teksti); for (const p of (map instanceof Map ? map.values() : map || [])) if (p) s = s.split(p).join('***'); return s; }

/** Vain stagingin Hosting (live tai kanava): https://talentmaster-staging[--kanava-tunniste].web.app. Tuotanto ja kaikki muu hylätään. */
function kanavaUrlSallittu(url) { return typeof url === 'string' && /^https:\/\/talentmaster-staging(--[a-z0-9-]+)?\.web\.app\/?$/.test(url); }

/** Cloud Logging -rivit (JSON-objektit tai tekstit) → [{ ms, tila, aika }]. Gen1: "Function execution took 1234 ms, finished with status: 'ok'" (myös "... finished with status code: 200"). */
function parsiFunktioLoki(rivit) {
  const ulos = [];
  (rivit || []).forEach((r) => {
    const t = typeof r === 'string' ? r : (r && (r.textPayload || (r.jsonPayload && r.jsonPayload.message))) || '', m = /Function execution took (\d+) ms(?:, finished with status(?: code)?: '?([^'\s,]+)'?)?/.exec(t);
    if (m) ulos.push({ ms: +m[1], tila: m[2] || null, aika: (r && r.timestamp) || null });
  });
  return ulos;
}

/** Mittausvartija (A/B 22.11., #1315): kesken olevien LATAUSTEN määrä (dokumentti, skripti, tyylitiedosto). Fetch/WebSocket jätetään pois — Firestore Listen-kanava pysyy auki koko avauksen. pyynnot = Map<id, { valmis, tyyppi }>. */
function odottavatLataukset(pyynnot) {
  let n = 0; pyynnot.forEach((p) => { if (p && !p.valmis && (p.tyyppi === 'Script' || p.tyyppi === 'Document' || p.tyyppi === 'Stylesheet')) n++; });
  return n;
}
const MITTAUS_EI_VALMIS = 'mittaus ei valmis';
const MITTAUS_TTI_ENNEN_AUTHIA = 'mittaus virheellinen';

/** Kirjautumisen alaraja (ms navigaation alusta) yhdestä mittaustilasta. A/B 22.11. puhelin: Firebase palauttaa currentUserin IndexedDB:stä heti (~0,3 s), vaikka auth-haku (securetoken) alkaa vasta ~8 s:ssa
 *  → `kirjautunut` yksin ei kerro istunnon valmistumista. Alaraja = vasta sivun oman odotusluokan poistumisen merkki (auth_odottaa_pois); odotusluokka vielä näkyvissä → null (ei vielä). */
function kirjautumisAlaraja(tila) {
  if (!tila || tila.kirjautunut !== true) return null;
  const mk = tila.merkit || {};
  if (typeof mk.auth_odottaa_pois === 'number') return Math.min(tila.nyt, mk.auth_odottaa_pois);
  return mk._nahtyOdotus ? null : tila.nyt;
}
/** Vartija: kirjautumista odottaneen avauksen TTI ei saa alittaa auth-haun alkua, ja kirjautunut=true. → virheteksti tai null (ei hiljaista FCP-arvoa). */
function tarkistaTtiAuthiin(o) {
  if (!o || o.odotaKirjautunut !== true) return null;
  if (o.kirjautunut !== true) return MITTAUS_TTI_ENNEN_AUTHIA + ': kirjautunut != true — TTI ei kuvaa avausta';
  if (typeof o.tti === 'number' && typeof o.authAlku === 'number' && o.tti < o.authAlku) return MITTAUS_TTI_ENNEN_AUTHIA + ': interaktiivinen ' + o.tti + ' ms < auth-haun alku ' + o.authAlku + ' ms — TTI laskettu ennen kirjautumista';
  return null;
}

/** A/B-vartija: A:n ja B:n dokumentin purettu koko samalla profiililla. Jos suhde > 2 tai < 0,5, kanavat eivät ole samaa deploy-muotoa (esim. toisessa pääskripti inline, toisessa irrotettuna) → vertailu on sekoittunut.
 *  koot = { a, b } (tavua) → null | varoitusteksti. */
function dokumenttiKokoVaroitus(koot) {
  const a = koot && koot.a, b = koot && koot.b; if (!(a > 0) || !(b > 0)) return null;
  const r = a / b; if (r <= 2 && r >= 0.5) return null;
  return 'Dokumentin koko eroaa ' + (r > 1 ? r.toFixed(1) + '× (A suurempi)' : (1 / r).toFixed(1) + '× (B suurempi)') + ' (A ' + Math.round(a / 1024) + ' kt, B ' + Math.round(b / 1024) + ' kt purettuna) — kanavat eivät ole samaa deploy-muotoa; A/B-vertailu on sekoittunut. Deployaa molemmat saman deploy-muunnoksen (versiotiiviste) läpi.';
}

module.exports = { odottavatLataukset, MITTAUS_EI_VALMIS, MITTAUS_TTI_ENNEN_AUTHIA, kirjautumisAlaraja, tarkistaTtiAuthiin, dokumenttiKokoVaroitus, RAJAT, rajaAika, rajaLuvut, tilasto, mediaani, prosenttipiste, laskeInteraktiivinen, firestoreDokKoko, nimiKoko, arvoKoko, kustannus, lueTunnukset, haeTunnus, haePalloId, piilota, kanavaUrlSallittu, parsiFunktioLoki };
