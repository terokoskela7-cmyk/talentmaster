/* Käännöserän osio "vp_kentta" (PM 9.11.2026): VP:n uusi näkymä (liput.kentta = true; Sibbo tuotannossa) — suomenkieliset tekstit sv-tilassa.
   Kutsutaan scripts/i18n_luo_gemini_era.cjs --osio=vp_kentta --lapiajo=<tulos.json> --tiedosto=docs/i18n/sv_kaannoserae_N_gemini.json.
   Mittaus: node tools/i18n/sv_lapiajo.mjs --sovellus=fx_vp_kentta --ulos=<tulos.json>  (fixtuuri "kentta": Läge-data + palvelimen ehdotustekstit + henkilökuntaviestit; sv_fixtuuri.mjs dokitKentta).
   Yksi rivi per uniikki teksti (sama avain kuin sv-läpiajon baselinessa). Code EI kirjoita ruotsia (CLAUDE.md §0): sv jää tyhjäksi; viite_sv = OLEMASSA OLEVA käännös samasta tekstistä toisessa kartassa.
   Rajaus (EI erään): (a) fixture-henkilöiden nimet (ei pelaajien/henkilöiden nimiä erässä); (b) konseptinimet ja curriculum-proosa, jotka tulevat datasta ja joiden sv on jo
   docs/i18n/curriculum_kaannettava.sv.MASTER.json:ssa (render-kytkentä = Vaihe B, oma erä); (c) palvelimen ehdotustekstit lasketaan DOM:ista erikseen: alla STAATTISET_EHDOTUKSET
   (jokainen palvelimen/VP:n koostama häntä, jolla vpTToimenpide EI anna käännöstä → rivi), koska DOM-mittaus näkee vain osan muodoista. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { viiteKartat } = require('./i18n_era_seura.cjs');

const SOVELLUKSET = ['fx_vp_kentta'];
const norm = (s) => String(s).replace(/\s+/g, ' ').trim();
const avain = (s) => norm(s).toLowerCase();
const TYYPPI = { title: 'title-vihje (näkyy hiiren alla)', aria: 'aria-label (ruudunlukija)', placeholder: 'kentän esimerkkiteksti (placeholder)', alt: 'kuvan alt-teksti', value: 'napin teksti' };

const NAKYMAT = {
  koti: 'Koti', viestit: 'Viestit', kalenteri: 'Kalenteri', tilanne: 'Tilanne (kausi)', joukkueet: 'Joukkueet ja ryhmät', valmentajat: 'Valmentajat', testit: 'Testit', asetukset: 'Asetukset',
  'joukkueet/ryhmat': 'Joukkueet ja ryhmät › Ryhmät', tilanne_kaikki: 'Tilanne (kaikki ryhmät auki)', tilanne_esityslista: 'Tilanne › Esityslista (jaksopalaveri)',
  'tilanne/reviewit': 'Tilanne › Seuranta', 'tilanne/jaksofokus': 'Tilanne › Jaksofokus', 'tilanne/raportointi': 'Tilanne › Raportointi', 'tilanne/joukkue': 'Tilanne › joukkueen syvennys', 'tilanne/valmentajat': 'Tilanne › Valmentajat',
  'kt/tanaan': 'Kehitystyöpöytä › Tänään', 'kt/polku': 'Kehitystyöpöytä › Polku', 'kt/profiili': 'Kehitystyöpöytä › Profiili', 'kt/naytto': 'Kehitystyöpöytä › Näyttö', 'kt/utan_atagande': 'Kehitystyöpöytä › Polku (ei sitoumusta)', 'kt/pelaajaraportti': 'Pelaajaraportti',
  'avaaAdarKenttatyokalu()': 'Työkalut › Pelihavainto', 'avaaBioBanding()': 'Työkalut › Bio-banding', 'avaaKaaviopankki()': 'Työkalut › Taktiikkataulu', "_vpOhjKirjastoModal('','')": 'Työkalut › Ohjelmakirjasto', "_vpAloitaJaksoAvaa('qp3')": 'Aloita jakso -ikkuna',
};
const nakymanNimi = (n) => { const a = n.split('/').slice(1).join('/'); return NAKYMAT[a] || a; };

// (a) fixture-henkilöt (tools/i18n/sv_fixtuuri.mjs): teksti, jossa on vain näitä nimiä, on dataa
const NIMET = new Set(['alex', 'berg', 'kim', 'lund', 'robin', 'ek', 'noa', 'dahl', 'sam', 'holm', 'jo', 'strand', 'ola', 'eli', 'iris', 'leo', 'mio', 'ada', 'lind', 'sund', 'strom', 'qg']);
const vainNimia = (t) => { const s = (t.match(/[a-zåäö]+/gi) || []).map((x) => x.toLowerCase()); return s.length > 0 && s.every((x) => NIMET.has(x)); };

// (b) konseptinimet + curriculum-proosa (data; sv jo MASTER.json:ssa)
function curriculum(juuri) {
  const nimet = new Set(), proosa = [];
  try {
    const fi = JSON.parse(fs.readFileSync(path.join(juuri, 'docs/i18n/curriculum_kaannettava.sv.json'), 'utf8'));
    for (const [k, v] of Object.entries(fi)) { if (typeof v !== 'string') continue; if (/\.nimi$/.test(k)) nimet.add(avain(v)); else if (v.length >= 20) proosa.push(avain(v)); }
  } catch (e) { /* ei curriculumia */ }
  try { const KP = require(path.join(juuri, 'lib/tm_kehityspolku.js')); for (const v of Object.values(KP.YOUTH_NIMI || {})) if (typeof v === 'string') nimet.add(avain(v)); } catch (e) { /* ei */ }
  return { nimet, proosa };
}
function onDataa(fi, C) {
  const k = avain(fi);
  if (vainNimia(fi)) return 'henkilön nimi (fixture)';
  if (C.nimet.has(k)) return 'konseptin nimi (curriculum)';
  for (const n of C.nimet) if (n.length >= 6 && k.endsWith(' · ' + n)) return 'konseptin nimi (curriculum)';
  if (C.proosa.some((p) => k === p || (k.length >= 25 && (p.includes(k) || k.includes(p))))) return 'curriculum-proosa';
  return null;
}

// (c) palvelimen / VP:n koostamat ehdotustekstit (tallennettu fi Firestoreen; käännös vasta näyttöhetkellä vpTToimenpide:llä, lib/tm_vp_i18n.js TP_TOIMENPIDE_HANNAT).
// Lähde: functions/tm_toimenpide_signaalit.js (yksittäinen joukkue) ja TalentMaster_VP_v25.html dedupToimenpiteet (usea joukkue). Muoto aina '{joukkue} — {häntä}'.
const STAATTISET_EHDOTUKSET = [
  { haenta: '{n} pelaajaa', fi: 'fyysiset testit kehityskohteena: {n} pelaajaa. Aloita yksilöllinen harjoitusohjelma.', naytetty: 'QG P12 — fyysiset testit kehityskohteena: 4 pelaajaa. Aloita yksilöllinen harjoitusohjelma.', signaali: 'hh_taso_alhainen', lahde: 'functions/tm_toimenpide_signaalit.js', muoto: 'yksi joukkue' },
  { fi: 'fyysiset testit kehityskohteena. Aloita yksilöllinen ohjelma.', naytetty: 'P12, T13 — fyysiset testit kehityskohteena. Aloita yksilöllinen ohjelma.', signaali: 'hh_taso_alhainen', lahde: 'TalentMaster_VP_v25.html (dedupToimenpiteet)', muoto: 'usea joukkue (yhdistetty kortti)' },
  { fi: 'tekniikka kehityskohteena: {n} pelaajaa alle ikätason. Fokusoi tekniikkaharjoittelu.', naytetty: 'QG P11 — tekniikka kehityskohteena: 4 pelaajaa alle ikätason. Fokusoi tekniikkaharjoittelu.', signaali: 'tki_alhainen', lahde: 'functions/tm_toimenpide_signaalit.js', muoto: 'yksi joukkue' },
  { fi: 'tekniikka kehityskohteena: {n} pelaajaa, pallo hidastaa suunnanmuutoksissa. Fokusoi tekniikkaharjoittelu.', naytetty: 'QG P11 — tekniikka kehityskohteena: 4 pelaajaa, pallo hidastaa suunnanmuutoksissa. Fokusoi tekniikkaharjoittelu.', signaali: 'tki_alhainen', lahde: 'functions/tm_toimenpide_signaalit.js', muoto: 'yksi joukkue' },
  { fi: 'tekniikka kehityskohteena. Fokusoi tekniikkaharjoittelu.', naytetty: 'P12, T13 — tekniikka kehityskohteena. Fokusoi tekniikkaharjoittelu.', signaali: 'tki_alhainen', lahde: 'TalentMaster_VP_v25.html (dedupToimenpiteet)', muoto: 'usea joukkue (yhdistetty kortti)' },
];
/** Rivit, joille vpTToimenpide(sv) palauttaa häntänsä muuttumattomana (= ei käännöstä). Sama tarkistus kuin ajossa; ei riipu DOM-mittauksesta. */
function kaantamattomatEhdotukset(juuri) {
  const sb = { console: { log() {}, warn() {}, error() {} }, module: { exports: {} } }; sb.window = sb; vm.createContext(sb);
  for (const f of ['lib/tm_lang.js', 'lib/tm_i18n_common.js', 'lib/tm_vp_i18n.js']) vm.runInContext(fs.readFileSync(path.join(juuri, f), 'utf8'), sb);
  vm.runInContext("function tmNykyinenKieli() { return 'sv'; }", sb);
  const kaanna = vm.runInContext('vpTToimenpide', sb);
  return STAATTISET_EHDOTUKSET.filter((e) => { const t = e.naytetty, h = t.slice(t.indexOf(' — ') + 3); return kaanna(t) === t.slice(0, t.indexOf(' — ')) + ' — ' + h; });
}
const ehdotusHanta = (fi) => { const i = fi.indexOf(' — '); return i < 0 ? null : norm(fi.slice(i + 3)).replace(/\d+/g, '{n}'); };

// Lähde: ensimmäinen literaali VP:n kuoresta tai libeistä (ei kartta-/käännöstiedostoja)
function lahteet(juuri) {
  const lib = fs.readdirSync(path.join(juuri, 'lib')).filter((f) => f.endsWith('.js') && !/(_i18n|_sv|i18n_)/.test(f)).map((f) => 'lib/' + f);
  return ['TalentMaster_VP_v25.html', ...lib].map((f) => { let s = ''; try { s = fs.readFileSync(path.join(juuri, f), 'utf8'); } catch (e) { /* ei */ } return { f, rivit: s.split('\n') }; });
}
const onKommentti = (r) => /^\s*(\/\/|\/\*|\*|<!--)/.test(r);
function etsi(L, neulat) {
  for (const n of neulat) {
    if (!n || n.length < 4) continue;
    for (const x of L) for (let i = 0; i < x.rivit.length; i++) {
      const r = x.rivit[i]; if (onKommentti(r)) continue;
      const j = r.indexOf(n); if (j < 0 || (j > 0 && !["'", '"', '`', '>', ' ', '('].includes(r[j - 1]))) continue;
      return { lahde: x.f + ':' + (i + 1), lahde_rivi: norm(r).slice(0, 240) };
    }
  }
  return null;
}

/** tulos = sv_lapiajo.mjs:n JSON (--sovellus=fx_vp_kentta). Palauttaa { rivit, maara, rajattu, ehdotukset } */
function vpKenttaRivit(tulos, opts) {
  const juuri = (opts && opts.juuri) || path.join(__dirname, '..');
  const vanhat = (opts && opts.vanhat) || {};
  const viitteet = viiteKartat(juuri), C = curriculum(juuri), L = lahteet(juuri);
  const virheet = [], rajattu = { 'henkilön nimi (fixture)': 0, 'konseptin nimi (curriculum)': 0, 'curriculum-proosa': 0, 'ehdotusteksti (rivi alla)': 0 };
  const staattiset = kaantamattomatEhdotukset(juuri), staatHannat = new Set(STAATTISET_EHDOTUKSET.map((e) => ehdotusHanta(e.naytetty)));
  const kerays = new Map();
  let mittattu = 0;
  for (const [n, v] of Object.entries((tulos && tulos.nakymat) || {})) {
    if (!SOVELLUKSET.includes(n.split('/')[0])) continue;
    mittattu++;
    for (const r of (v && v.fi) || []) {
      const k = avain(r.teksti); if (!k) continue;
      const d = onDataa(r.teksti, C);
      if (d) { rajattu[d] = (rajattu[d] || 0) + 1; continue; }
      const h = ehdotusHanta(r.teksti); if (h && staatHannat.has(h)) { rajattu['ehdotusteksti (rivi alla)']++; continue; }
      const o = kerays.get(k) || { r, nakymat: [] };
      const nn = nakymanNimi(n); if (!o.nakymat.includes(nn)) o.nakymat.push(nn);
      kerays.set(k, o);
    }
  }
  if (!mittattu) virheet.push('mittauksessa ei ole fx_vp_kentta-näkymiä (aja: node tools/i18n/sv_lapiajo.mjs --sovellus=fx_vp_kentta --ulos=<tulos.json>)');
  const rivit = {};
  for (const { r, nakymat } of kerays.values()) {
    const fi = norm(r.teksti), huom = [];
    const osa = /\(osa: ([^)]+)\)/.exec((r.lahde || [])[0] || ''), palat = /\d/.test(fi) ? fi.split(/\s*\d[\d.,/ %:]*\s*/).map((s) => s.trim()).filter((s) => s.length >= 5).sort((a, b) => b.length - a.length) : [fi];
    const src = etsi(L, [...palat, osa && osa[1]]);
    if (TYYPPI[r.tyyppi]) huom.push('Näkyy: ' + TYYPPI[r.tyyppi] + '.');
    if (/\d/.test(fi)) huom.push('Luvut ja päivämäärät ovat mittauksen esimerkkidataa; koodi muodostaa ne. Käännä rakenne, luvut pysyvät paikoillaan.');
    if (osa) huom.push('Teksti koostuu paloista: lähteessä on pala "' + osa[1] + '", muu osa tulee muuttujasta tai toisesta käännöksestä.');
    if (r.luokka !== 'ui') huom.push('Ei löydy lähdekoodista sellaisenaan: todennäköisesti dataa tai koottu teksti. Jos ei käännettävä, merkitse sv = fi ja huom "ei käännetä".');
    else if (!src) huom.push('Ei literaalina VP:n kuoressa eikä libeissä: koodi muotoilee tekstin. Code etsii kohdan viennissä.');
    const viite = viitteet.find((x) => x.fi === fi) || viitteet.find((x) => avain(x.fi) === avain(fi));
    const rivi = { fi, nakyma: nakymat, tyyppi: r.tyyppi, elementti: String(r.polku || '').split(' > ').slice(-2).join(' > '), lahde: src ? src.lahde : null, lahde_rivi: src ? src.lahde_rivi : null };
    if (viite) { rivi.viite_sv = { sv: viite.sv, lahde: viite.lahde + (viite.fi !== fi ? ' (avain "' + viite.fi + '")' : '') }; huom.push('Sama teksti on jo käännetty toisessa kartassa (viite_sv). Teksti on todennäköisesti vain reitittämättä VP:ssä; käytä samaa käännöstä.'); }
    if (huom.length) rivi.huom = huom;
    rivi.sv = (vanhat[fi] && typeof vanhat[fi].sv === 'string') ? vanhat[fi].sv : '';
    rivit[fi] = rivi;
  }
  for (const e of staattiset) {
    rivit[e.fi] = Object.assign({ fi: e.fi, nakyma: ['Tilanne › Esityslista › Ehdotukset', 'Koti (pulssi, ehdotukset)'], tyyppi: 'teksti', elementti: 'ehdotuskortin teksti (häntä)', lahde: e.lahde, lahde_rivi: null,
      huom: ['Palvelimen/VP:n koostama toimenpide-ehdotus (' + e.signaali + ', ' + e.muoto + '). Teksti tallennetaan suomeksi Firestoreen ja käännetään vasta näyttöhetkellä: lib/tm_vp_i18n.js vpTToimenpide + TP_TOIMENPIDE_HANNAT [fi-häntä, sv-häntä]. Muoto "{joukkue} — {häntä}": joukkueen nimi pysyy, käännä vain häntä (rivin fi).',
        'Esimerkki näytössä: "' + e.naytetty + '". {n} = lukumäärä, säilytä paikkamerkki. Nykyinen TP_TOIMENPIDE_HANNAT ei sisällä tätä muotoa (vain vanhat "alle Eerikkilä-tason" / "alle pronssitason" -muodot), joten häntä jää suomeksi.',
        'Tarkista samalla, tuleeko vanhat hännät (alle Eerikkilä-tason, alle pronssitason) poistaa: signaalit on laajennettu (hh_taso_alhainen = koko fyysinen ketju, tki_alhainen = koko tekniikkaketju).'] },
      { sv: (vanhat[e.fi] && typeof vanhat[e.fi].sv === 'string') ? vanhat[e.fi].sv : '' });
  }
  return { rivit, maara: Object.keys(rivit).length, rajattu, virheet };
}

const KONTEKSTI = 'HENKILÖKUNTA — Vastuuvalmentaja/VP:n uusi näkymä (TalentMaster_VP_v25.html, Kenttä-lippu päällä; Sibbo tuotannossa 9.11.2026): navigaatio v3 (sivupalkki + mobiilin alapalkki), Koti ja seuran pulssi, Tilanne (kausinäkymä, Esityslista, joukkueen syvennys, Seuranta, Jaksofokus, Raportointi), Viestit, Kehitystyöpöytä (Tänään, Polku, Profiili, Näyttö), Pelaajaraportti, Aloita jakso -ikkuna ja Työkalut. '
  + 'Avain = suomenkielinen teksti sellaisena kuin se näkyy ruudulla sv-tilassa (sv-läpiajo, fixture-seura "QG FC"). nakyma = missä näkymässä teksti näkyy, elementti = HTML-elementti, lahde + lahde_rivi = koodirivi. viite_sv = sama teksti on jo käännetty toisessa kartassa (VP/Master/yhteiset): ne puuttuvat VP:n uudesta näkymästä vain reitityksestä. '
  + 'Termit: Kehitystyöpöytä = Utvecklingsbord, Tilanne = Läge, Jakso = Period, Jaksofokus = Periodfokus, Kehityskeskustelu = Utvecklingssamtal, Pelihavainto = Matchobservation; käytä samoja sv-termejä kuin aiemmissa erissä (81, 84, 88, 89, 98–100). '
  + 'Lyhenteet (PHV, PH, PRE/LAH, TKI, FLEI, H-H, D1–D5, §28) säilytetään. Mittaus- ja kuntotestien nimet (Pujottelu, Syöttö, Ponnauttelu, Kuljetus-laukaus, Kevennyshyppy, Ketteryys …) noudattavat lukittua glossaaria (lib/tm_i18n_common.js): Pujottelu = Slalom, Syöttö = Passning, Ponnauttelu = Jonglering, Kuljetus-laukaus = Föring och skott, Kehon valmius = Kroppslig beredskap. '
  + 'Emojit, nuolet ja välimerkit säilytetään. Sävy: asiallinen, valmentajan työkieli.';

module.exports = { vpKenttaRivit, SOVELLUKSET, KONTEKSTI, avain, STAATTISET_EHDOTUKSET };
