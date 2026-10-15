'use strict';
/**
 * vientipohja_kieli.js — harjoituspankin vienti-/kuittauspohjan KIELITAULU (fi | sv). Yksi totuus pohjalle (scripts/luo_harjoitepankki_pohja.js) ja kuittaustuonnille
 * (scripts/tuo_harjoitepankki_kuittaus.js): sama taulu kirjoittaa pohjan ja tunnistaa sen takaisin, joten sv-pohja luetaan samoin kuin fi-pohja.
 *
 * SISÄISET AVAIMET EIVÄT KÄÄNNY (muuten kuittaustuonti rikkoutuu): sarakkeen koneluettava nimi (`id`, `video_url`), kuittaus-ARVOT (OK · Muutettu · Poista) ja tuonnin sisäiset avaimet.
 * KÄÄNTYVÄT: muiden sarakkeiden otsikot, välilehtien nimet, OHJE-välilehden teksti, listojen näkyvät arvot (Mitä harjoitellaan, Lähde).
 *   · Mitä harjoitellaan -arvot: 14 konseptinimeä tulevat jo käännetystä sanastosta (lib/tm_lib_i18n.js sn_y_*); "ei TalentMaster-konseptia" ja muu tämän taulun sv tulee Gemini-erästä 53.
 *   · sv-tekstit: scripts/vientipohja_sv.json (tuonti: scripts/i18n_vie_sv_vientipohja.cjs ← Geminin palautus, osio "vientipohja"). Code EI kirjoita ruotsia (CLAUDE.md §0).
 * Paikanvaraajat: {seura} (seuran nimi), {muu} (listan arvo "muu / en tiedä" omalla kielellään), {n} (rivimäärä).
 */
const fs = require('fs');
const path = require('path');
const H = require('../lib/tm_harjoitepankki.js');

const SV_TIEDOSTO = path.join(__dirname, 'vientipohja_sv.json');
const KUITTAUKSET = ['OK', 'Muutettu', 'Poista'];   // arvot pysyvät kaikilla kielillä (tuonti lukee ne suoraan)

/** [tuonnin sisäinen avain, tekstin id, fi, koneluettava?] — järjestys = sarakejärjestys */
const SARAKKEET = [
  ['id', 'ots_id', 'id', true], ['nimi', 'ots_nimi', 'nimi'], ['pankki', 'ots_pankki', 'pankki'], ['teema', 'ots_teema', 'teema ({seura})'], ['tyyppi', 'ots_tyyppi', 'tyyppi'], ['ika', 'ots_ika', 'ikä'],
  ['tavoite', 'ots_tavoite', 'tavoite'], ['mita', 'ots_mita', 'Mitä harjoitellaan'], ['toissijainen', 'ots_toissijainen', 'Toissijainen'], ['lahde', 'ots_lahde', 'Lähde'],
  ['video', 'ots_video', 'video_url', true], ['kuittaus', 'ots_kuittaus', 'kuittaus'], ['kommentti', 'ots_kommentti', 'kommentti'],
];
/** Lähde-lista: [tyyppi (H.tmHarjoiteLahdeTyyppi), tekstin id, fi] */
const LAHTEET = [['oma', 'lah_oma', 'oma ({seura})'], ['soccertutor', 'lah_soccertutor', 'SoccerTutor'], ['spl', 'lah_spl', 'SPL-korttipohja'], ['muu', 'lah_muu', 'muu / en tiedä']];
const VALILEHDET = { ohje: ['val_ohje', 'OHJE'], harjoitteet: ['val_harjoitteet', 'Harjoitteet'], listat: ['val_listat', 'listat'] };
/** OHJE-välilehden rivit: '' = tyhjä rivi, muuten [id, fi-malli]. Konseptilista (• …) liitetään loppuun. */
const OHJE = [
  ['ohje_otsikko', '{seura} · harjoituspankin tarkistus TalentMasteriin'], '', ['ohje_mita_h', 'Mitä tämä on'],
  ['ohje_mita_t', 'Tässä ovat {seura}:n harjoituspankin harjoitteet. Kahteen sarakkeeseen kysytään teiltä tieto, jota ei ole alkuperäisessä aineistossa.'], '', ['ohje_tarkistat_h', 'Mitä tarkistat'],
  ['ohje_1a', '1. MITÄ HARJOITELLAAN: mitä taitoa harjoite ensisijaisesti kehittää. Vaihda tarvittaessa pudotusvalikosta.'],
  ['ohje_1b', '   Tämän perusteella valmentaja näkee sovelluksessa oikean harjoitteen, kun pelaajan jakso harjoittelee samaa asiaa.'],
  ['ohje_2', '2. TOISSIJAINEN: vapaaehtoinen, jos harjoite tukee selvästi myös toista asiaa.'],
  ['ohje_3', '3. LÄHDE: onko harjoite {seura}:n oma, SoccerTutor-kortti vai Palloliiton (SPL) korttipohja. Tämä on tärkeä: SoccerTutor-korttien tekstiä emme voi näyttää sovelluksessa, vain nimen ja kuvan. Tyhjä = "{muu}" (näytetään kuten oma harjoite).'],
  ['ohje_4', '4. VIDEO_URL: jos harjoitteesta on video (YouTube, Vimeo, Drive), liitä linkki. Linkin pitää aueta ilman kirjautumista ja alkaa https://. Muita linkkejä ei tuoda.'],
  ['ohje_5', '5. KUITTAUS: OK · Muutettu · Poista. Vain OK ja Muutettu -rivit tuodaan; tyhjä kuittaus = ei vielä tarkistettu, jolloin rivi ei näy toimintakortissa. KOMMENTTI-sarakkeeseen voi kirjoittaa kysymyksen.'],
  '', ['ohje_ala', 'Älä poista, lajittele tai siirrä rivejä. Älä muuta sarakkeiden otsikoita.'], ['ohje_aika', 'Arvioitu aika: 30–45 min.'], '', ['ohje_vaihtoehdot_h', 'Mitä harjoitellaan -vaihtoehdot'],
];
const OHJE_N = ['ohje_mita_t_n', 'Tässä ovat {seura}:n harjoituspankin harjoitteet ({n}). Kahteen sarakkeeseen kysytään teiltä tieto, jota ei ole alkuperäisessä aineistossa.'];   // vain kun rivimäärä annetaan (CLI ei anna)

/** Kaikki käännettävät tekstit: id → fi (koneluettavat sarakenimet ja kuittaus-arvot eivät kuulu tänne). */
function kaannettavat() {
  const t = {};
  SARAKKEET.forEach(([, id, fi, kone]) => { if (!kone) t[id] = fi; });
  LAHTEET.forEach(([, id, fi]) => { t[id] = fi; });
  Object.keys(VALILEHDET).forEach((k) => { t[VALILEHDET[k][0]] = VALILEHDET[k][1]; });
  OHJE.forEach((r) => { if (r) t[r[0]] = r[1]; }); t[OHJE_N[0]] = OHJE_N[1];
  t.ei_konseptia = H.EI_KONSEPTIA;
  return t;
}

function lataaSv() { try { const j = JSON.parse(fs.readFileSync(SV_TIEDOSTO, 'utf8')); return j && j.tekstit && typeof j.tekstit === 'object' ? j.tekstit : {}; } catch (e) { return {}; } }
function svKonseptit() {
  const sv = require('../lib/tm_lib_i18n.js').TM_LIB_I18N.sv, o = {};
  H.KONSEPTIT.forEach(([avain, fi]) => { if (typeof sv['sn_' + avain] === 'string' && sv['sn_' + avain].trim()) o[fi] = sv['sn_' + avain]; });
  return o;
}

/**
 * Kielitaulu: { kieli, t(id), konsepti(fiNimi), puuttuu: [id…] }. opts.sanasto = { tekstit: {id: sv}, konseptit: {fiNimi: sv} } ylittää tiedoston (testit; ei Coden ruotsia).
 * fi: lähde sellaisenaan. Muu kieli: puuttuva teksti → puuttuu-listaan ja väliaikaisesti fi (kutsuja päättää keskeytetäänkö).
 */
function kielitaulu(kieli, opts) {
  kieli = kieli || 'fi'; const fi = kaannettavat();
  if (kieli === 'fi') return { kieli, t: (id) => fi[id], konsepti: (n) => n, puuttuu: [] };
  if (kieli !== 'sv') throw new Error('Tuntematon kieli: ' + kieli + ' (fi | sv)');
  const s = opts && opts.sanasto ? opts.sanasto : { tekstit: lataaSv(), konseptit: svKonseptit() };
  const puuttuu = [];
  Object.keys(fi).forEach((id) => { if (!(typeof s.tekstit[id] === 'string' && s.tekstit[id].trim())) puuttuu.push(id); });
  H.KONSEPTIT.forEach(([, nimi]) => { if (!(s.konseptit && typeof s.konseptit[nimi] === 'string' && s.konseptit[nimi].trim())) puuttuu.push('konsepti:' + nimi); });
  return {
    kieli, puuttuu,
    t: (id) => (typeof s.tekstit[id] === 'string' && s.tekstit[id].trim() ? s.tekstit[id] : fi[id]),
    konsepti: (nimi) => (s.konseptit && typeof s.konseptit[nimi] === 'string' && s.konseptit[nimi].trim() ? s.konseptit[nimi] : nimi),
  };
}
const mallista = (m, v) => String(m).replace(/\{(\w+)\}/g, (x, k) => (v && v[k] != null ? v[k] : x));

/** Pohjan sisältö kielellä: otsikot, lähteet, välilehdet, OHJE-rivit, konseptilista — kaikki valmiina kirjoitettavaksi. */
function pohjaSisalto(kt, seura, n) {
  const v = { seura };
  const muu = mallista(kt.t('lah_muu'), v), v2 = { seura, muu, n };
  const otsikot = SARAKKEET.map(([, id, fi, kone]) => (kone ? fi : mallista(kt.t(id), v)));
  const lahteet = LAHTEET.map(([, id]) => mallista(kt.t(id), v));
  const konseptit = H.KONSEPTIT.map((k) => kt.konsepti(k[1])).concat([kt.t('ei_konseptia')]);
  const ohje = OHJE.map((r) => (r ? (r[0] === 'ohje_mita_t' && n ? mallista(kt.t(OHJE_N[0]), v2) : mallista(kt.t(r[0]), v2)) : '')).concat(konseptit.map((x) => '• ' + x));
  return { otsikot, lahteet, konseptit, ohje, valilehdet: { ohje: kt.t(VALILEHDET.ohje[0]), harjoitteet: kt.t(VALILEHDET.harjoitteet[0]), listat: kt.t(VALILEHDET.listat[0]) } };
}

/** Takaisinluku: sv (tai fi) otsikkoteksti → tuonnin sisäinen avain. norm = tuontiskriptin otsikko()-normalisointi. Palauttaa { normalisoitu → avain }. */
function otsikkoAliasit(kt, norm) {
  const o = {};
  SARAKKEET.forEach(([avain, id, fi, kone]) => { const teksti = kone ? fi : kt.t(id); o[norm(String(teksti).replace(/\s*\(\{seura\}\)/g, ''))] = avain; });
  return o;
}
/** Takaisinluku: arvo (sv tai fi) → fi-arvo, jotta tuonnin muu logiikka (H.tmHarjoiteKonsepti / H.tmHarjoiteLahdeTyyppi) toimii kuten fi-pohjalla. */
function arvoKartat(kt) {
  const n = (x) => String(x == null ? '' : x).trim().replace(/\s+/g, ' ').toLowerCase();
  const konsepti = {}; H.KONSEPTIT.forEach((k) => { konsepti[n(kt.konsepti(k[1]))] = k[1]; });
  konsepti[n(kt.t('ei_konseptia'))] = H.EI_KONSEPTIA;
  const lahde = {}; LAHTEET.forEach(([, id, fi]) => { const peruste = (x) => n(String(x).replace(/\s*\(\{seura\}\)\s*$/, '').replace(/\s*\([^)]*\)\s*$/, '')); lahde[peruste(kt.t(id))] = String(fi).replace(/\s*\(\{seura\}\)\s*$/, ''); });
  return { konsepti, lahde, n };
}
/** Välilehden nimi → rooli (ohje | harjoitteet | listat) fi- tai sv-nimellä. */
function valilehdenRooli(nimi, taulut) {
  for (const kt of taulut) for (const r of Object.keys(VALILEHDET)) if (String(nimi).trim().toLowerCase() === String(kt.t(VALILEHDET[r][0])).trim().toLowerCase()) return r;
  return null;
}

module.exports = { SARAKKEET, LAHTEET, VALILEHDET, OHJE, KUITTAUKSET, SV_TIEDOSTO, kaannettavat, kielitaulu, pohjaSisalto, otsikkoAliasit, arvoKartat, valilehdenRooli, mallista, svKonseptit, lataaSv };
