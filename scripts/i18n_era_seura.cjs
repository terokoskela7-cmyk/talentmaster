/* B12 (PM 7.11.2026): käännöserän osio "seura" — Seurahallinnan suomenkieliset tekstit sv-läpiajon tuloksesta (tools/i18n/sv_lapiajo.mjs).
   Kutsutaan scripts/i18n_luo_gemini_era.cjs --osio=seura --lapiajo=<tulos.json> --tiedosto=docs/i18n/sv_kaannoserae_N_gemini.json.
   Yksi rivi per uniikki teksti (sama avain kuin sv-läpiajon baselinessa: välilyönnit tiivistetty, pienet kirjaimet) + konteksti PM:lle.
   Code EI kirjoita ruotsia (CLAUDE.md §0): sv jää tyhjäksi; viite_sv on OLEMASSA OLEVA käännös samasta suomenkielisestä tekstistä toisessa kartassa. */
'use strict';
const path = require('path');

const SOVELLUKSET = ['fx_seura', 'fx_seura_lage'];
const NAKYMAT = { yhteenveto: 'Yhteenveto', kehitystilanne: 'Kehitystilanne', pelaajat: 'Pelaajat', joukkueet: 'Joukkueet', talentit: 'Talentit', henkilosto: 'Henkilöstö' };
const TYYPPI = { title: 'title-vihje (näkyy hiiren alla)', aria: 'aria-label (ruudunlukija)', placeholder: 'kentän esimerkkiteksti (placeholder)', alt: 'kuvan alt-teksti', value: 'napin teksti' };
const norm = (s) => String(s).replace(/\s+/g, ' ').trim();
const avain = (s) => norm(s).toLowerCase();

function nakymanNimi(n) {
  const [sov, as] = n.split('/');
  return (NAKYMAT[as] || as) + (sov === 'fx_seura_lage' ? ' (Läge-data)' : '');
}

/* Olemassa olevat sv-rivit (fi-avain → sv) kartoista, joista Seura tai muut sovellukset lukevat; tm_lang pisteytetyllä polulla. */
function viiteKartat(juuri) {
  const req = (f, k) => { try { return (require(path.join(juuri, f))[k] || {}).sv || {}; } catch (e) { return {}; } };
  const kartat = [['TM_HENKILOSTO_I18N', req('lib/tm_henkilosto_i18n.js', 'TM_HENKILOSTO_I18N')], ['TM_I18N_COMMON', req('lib/tm_i18n_common.js', 'TM_I18N_COMMON')],
    ['TM_VP_I18N', req('lib/tm_vp_i18n.js', 'TM_VP_I18N')], ['TM_MASTER_I18N', req('lib/tm_master_i18n.js', 'TM_MASTER_I18N')], ['TM_LIB_I18N', req('lib/tm_lib_i18n.js', 'TM_LIB_I18N')]];
  const rivit = [];
  for (const [nimi, m] of kartat) for (const [fi, sv] of Object.entries(m)) if (typeof sv === 'string' && sv) rivit.push({ fi, sv, lahde: nimi });
  try {
    const L = require(path.join(juuri, 'lib/tm_lang.js')).TM_LANG;
    const kay = (fiO, svO, p) => { for (const k of Object.keys(fiO || {})) { const v = fiO[k]; if (typeof v === 'string') { if (svO && typeof svO[k] === 'string' && svO[k]) rivit.push({ fi: v, sv: svO[k], lahde: 'tm_lang:' + p + k }); } else if (v && typeof v === 'object') kay(v, svO && svO[k], p + k + '.'); } };
    kay(L.fi, L.sv, '');
  } catch (e) { /* ei tm_langia */ }
  return rivit;
}

/* Lähde PM:lle = TODELLINEN tiedosto ja rivi (ei kuoren yhdistettyä numerointia). Ensin Seuran omista tiedostoista literaali
   (teksti merkkijonon tai elementin sisällä, ei kommenttirivi, ei Excel-sarakehaku); muuten sv-läpiajon arvio muunnettuna todelliseen tiedostoon. */
const fs = require('fs');
const onKommentti = (r) => /^\s*(\/\/|\/\*|\*|<!--)/.test(r);
function omatTiedostot(juuri) {
  let osat = []; try { osat = fs.readdirSync(path.join(juuri, 'seura')).filter((f) => f.endsWith('.js')).sort().map((f) => 'seura/' + f); } catch (e) { /* ei osia */ }
  return ['TalentMaster_Seura.html', ...osat, 'lib/tm_kehitystilanne.js'];
}
function rivit(juuri, f) { try { return fs.readFileSync(path.join(juuri, f), 'utf8').split('\n'); } catch (e) { return []; } }
// hakuversio: kommenttilohkot (/* … */, <!-- … -->) tyhjiksi, rivinumerot säilyvät
function hakuRivit(juuri, f) { try { const tyhjaksi = (m) => m.replace(/[^\n]/g, ' '); return fs.readFileSync(path.join(juuri, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, tyhjaksi).replace(/<!--[\s\S]*?-->/g, tyhjaksi).split('\n'); } catch (e) { return []; } }
/* Kaikki literaaliosumat; paras = rivi, jossa on sama elementti (<label, <button, <th …), sitten rivi, jossa on pelkkä teksti (staattinen markup), sitten ensimmäinen. */
const TAGIT = new Set(['label', 'button', 'th', 'td', 'option', 'a', 'h1', 'h2', 'h3', 'select', 'input']);   // div/span ovat liian yleisiä erottelemaan
function etsiLiteraali(juuri, neula, tagi, sanat) {
  if (!neula || neula.length < 3) return null;
  const ennen = new Set(['>', "'", '"', '`', '(', ' ']), osumat = [];
  for (const f of omatTiedostot(juuri)) {
    const rr = rivit(juuri, f), hh = hakuRivit(juuri, f);
    for (let i = 0; i < hh.length && osumat.length < 40; i++) {
      const r = norm(hh[i]); if (onKommentti(hh[i]) || /etsiSarake\(/.test(r)) continue;
      const j = r.indexOf(neula); if (j < 0 || (j > 0 && !ennen.has(r[j - 1]))) continue;
      osumat.push({ lahde: f + ':' + (i + 1), lahde_rivi: norm(rr[i]).slice(0, 240), r });
    }
  }
  // luvullinen teksti: rivi, jolla on eniten tekstin muita sanoja ("— {n} pelaajaa" voittaa pelkän " pelaajaa")
  if (sanat && sanat.length && osumat.length) { const p = (o) => sanat.filter((s) => o.r.includes(s)).length; const m = Math.max(...osumat.map(p)); const o = osumat.find((x) => p(x) === m); return { lahde: o.lahde, lahde_rivi: o.lahde_rivi }; }
  const paras = (TAGIT.has(tagi) && osumat.find((o) => o.r.includes('<' + tagi))) || osumat.find((o) => o.r === neula) || osumat[0];
  return paras ? { lahde: paras.lahde, lahde_rivi: paras.lahde_rivi } : null;
}
function arvioTodelliseksi(juuri, lahde, lueKuori) {
  const m = /^(\S+?):(\d+)/.exec(lahde || ''); if (!m) return null;
  let r; try { r = lueKuori(m[1], juuri).split('\n')[Number(m[2]) - 1]; } catch (e) { return null; }
  if (r == null || onKommentti(r)) return null;
  for (const f of omatTiedostot(juuri)) { const i = rivit(juuri, f).indexOf(r); if (i >= 0) return { lahde: f + ':' + (i + 1), lahde_rivi: norm(r).slice(0, 240), arvio: true }; }
  return null;   // arvio muualta kuin Seuran omista tiedostoista on usein sattumaosuma → ei näytetä
}
function lahdeRivi(juuri, r, lueKuori) {
  const fi = norm(r.teksti), osa = (/\(osa: ([^)]+)\)/.exec((r.lahde || [])[0] || '') || [])[1];
  const tagi = (/(?:^|> )([a-z0-9]+)[#.\w-]*$/.exec(String(r.polku || '')) || [])[1];
  const palat = /\d/.test(fi) ? fi.split(/\s*\d[\d.,/ %:]*\s*/).map((s) => s.trim()).filter((s) => s.length >= 5).sort((a, b) => b.length - a.length) : [fi];
  const sanat = /\d/.test(fi) ? fi.split(/\s+/).filter((s) => s && !/\d/.test(s)) : null;
  for (const neula of [...palat, osa]) { const o = etsiLiteraali(juuri, neula, tagi, sanat); if (o) return o; }
  return (r.lahde || []).map((l) => arvioTodelliseksi(juuri, l, lueKuori)).find(Boolean) || null;
}

/** tulos = sv_lapiajo.mjs:n JSON. Palauttaa { rivit: { [fi]: rivi }, maara }. Rivin kentät: fi, sv '', nakyma[], tyyppi, elementti, lahde, lahde_rivi, huom[], viite_sv? */
function seuraRivit(tulos, opts) {
  const juuri = (opts && opts.juuri) || path.join(__dirname, '..');
  const lueKuori = (opts && opts.lueKuori) || require(path.join(juuri, 'scripts/kuoren_lahde.js')).lueKuori;
  const vanhat = (opts && opts.vanhat) || {};
  const viitteet = viiteKartat(juuri);
  const kerays = new Map();
  for (const [n, v] of Object.entries((tulos && tulos.nakymat) || {})) {
    if (!SOVELLUKSET.includes(n.split('/')[0])) continue;
    for (const r of (v && v.fi) || []) {
      const k = avain(r.teksti); if (!k) continue;
      const o = kerays.get(k) || { r, nakymat: [] };
      const nn = nakymanNimi(n); if (!o.nakymat.includes(nn)) o.nakymat.push(nn);
      kerays.set(k, o);
    }
  }
  const rivit = {};
  for (const { r, nakymat } of kerays.values()) {
    const fi = norm(r.teksti), lahde = (r.lahde || [])[0] || null, huom = [], L = lahdeRivi(juuri, r, lueKuori);
    if (TYYPPI[r.tyyppi]) huom.push('Näkyy: ' + TYYPPI[r.tyyppi] + '.');
    if (/\d/.test(fi)) huom.push('Luvut, päivämäärät ja joukkueiden nimet ovat mittauksen esimerkkidataa; koodi muodostaa ne. Käännä rakenne, luvut ja nimet pysyvät paikoillaan.');
    const osa = /\(osa: ([^)]+)\)/.exec(lahde || ''); if (osa) huom.push('Teksti koostuu paloista: lähteessä on pala "' + osa[1] + '", muu osa tulee muuttujasta.');
    if (r.luokka !== 'ui') huom.push('Ei löydy lähdekoodista sellaisenaan: todennäköisesti dataa (esim. henkilön nimi) tai koottu teksti. Jos ei käännettävä, merkitse sv = fi ja huom "ei käännetä".');
    else if (!L) huom.push('Ei literaalina Seuran lähteessä: koodi muotoilee tekstin (esim. isot kirjaimet tai datasta tuleva arvo). Code etsii kohdan viennissä.');
    else if (L.arvio) huom.push('Lähderivi on mittauksen arvio (tekstiä ei löytynyt Seuran tiedostoista literaalina).');
    const viite = viitteet.find((x) => x.fi === fi) || viitteet.find((x) => avain(x.fi) === avain(fi));
    const rivi = { fi, nakyma: nakymat, tyyppi: r.tyyppi, elementti: String(r.polku || '').split(' > ').slice(-2).join(' > '), lahde: L ? L.lahde : null, lahde_rivi: L ? L.lahde_rivi : null };
    if (viite) { rivi.viite_sv = { sv: viite.sv, lahde: viite.lahde + (viite.fi !== fi ? ' (avain "' + viite.fi + '")' : '') }; huom.push('Sama teksti on jo käännetty toisessa kartassa (viite_sv). Käytä samaa, ellei Seuran asiayhteys vaadi toista.'); }
    if (huom.length) rivi.huom = huom;
    rivi.sv = (vanhat[fi] && typeof vanhat[fi].sv === 'string') ? vanhat[fi].sv : '';
    rivit[fi] = rivi;
  }
  return { rivit, maara: Object.keys(rivit).length };
}

const KONTEKSTI = 'HENKILÖKUNTA — Seurahallinta (TalentMaster_Seura.html; VP, seurasihteeri, urheilutoimenjohtaja): päänäkymät Yhteenveto, Kehitystilanne, Pelaajat, Joukkueet, Talentit ja Henkilöstö sekä niistä aukeavat ikkunat. '
  + 'Avain = suomenkielinen teksti sellaisena kuin se näkyy ruudulla (sv-läpiajo fixture-seuralla). nakyma = missä näkymässä teksti näkyy, elementti = HTML-elementti, lahde + lahde_rivi = koodirivi, josta teksti tulee. '
  + 'viite_sv = sama teksti on jo käännetty toisessa kartassa. Termit: Seura = Förening, Kehitystilanne = Utvecklingsläge (nav). Sävy: asiallinen hallintokieli. Emojit ja välimerkit säilytetään.';

module.exports = { seuraRivit, viiteKartat, SOVELLUKSET, KONTEKSTI, avain };
