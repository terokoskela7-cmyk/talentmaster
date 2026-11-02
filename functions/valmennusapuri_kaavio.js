'use strict';
/**
 * VALMENNUSAPURIN KAAVIO (K2, CODE_BRIEF_K2_APURI_KAAVIO 2.11.2026) — puhdas, ei I/O:ta.
 *
 * Apuri kirjoittaa konseptipelin kaavion vastauksen loppuun yhteen lohkoon <kaavio>{…§3-spec…}</kaavio>.
 * Tämä moduuli
 *   1) poistaa lohkon AINA vastaustekstistä (raaka JSON ei koskaan näy valmentajalle, ei myöskään lipun ollessa pois),
 *   2) lipun ollessa päällä: jäsentää, normalisoi avaimen (Y-H5 → y_h5, vain kaanonin yksilökonseptit),
 *      ajaa koodisuodattimen selite- ja tilannetekstiin ja validoi SAMALLA validaattorilla kuin taktiikkataulun
 *      editori (tm_kaavio_validate.js, jaettu kopio functions/jaettu_lib.json:n kautta),
 *   3) palauttaa specin vain, jos virheitä on 0. Muuten teksti ilman kaaviota (ei virhettä käyttäjälle).
 * Sama funktio ajetaan laatutestin ajurissa (aja_testit.mjs --kaavio) → testattu kokoonpano = tuotanto.
 */
const { validoiKaavio, KAAVIO_ROOLIT } = require('./tm_kaavio_validate.js');
const { kaavioKpiKoodit } = require('./tm_kaavio_konsepti.js');
const { TM_TT_YOUTH } = require('./tm_teknistaktiset.js');

const LOHKO = /<kaavio>([\s\S]*?)<\/kaavio>/gi;
const AUKI = /<kaavio>[\s\S]*$/i;                       // katkennut lohko (max_tokens) → loppuosa pois
const PELIMUOTO = /^\d+v\d+(?:\+\d+)?$/;                 // "2v2" tai "2v2+1" (jokerit, ks. validaattorin capOf)
const MAX_VIRHEET = 10;
const MAX_MERKIT = 12000;                               // yksi kaavio on noin 1–3 k merkkiä
const MAX_NORMALISOITU = 10;
const taita = (t) => String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '');   // ääkköset pois: syöttäjä → syottaja
const ROOLI_TAITETTU = {};
KAAVIO_ROOLIT.forEach(function (r) { ROOLI_TAITETTU[taita(r)] = r; });
const KONSEPTIT = {};
TM_TT_YOUTH.forEach(function (k) { KONSEPTIT[k.avain] = k; });

/** Poistaa kaikki <kaavio>-lohkot (myös katkenneen) tekstistä. Palauttaa siistityn tekstin ja lohkojen sisällöt. */
function poistaLohkot(teksti) {
  const lohkot = [];
  let t = String(teksti || '').replace(LOHKO, function (_, sisalto) { lohkot.push(sisalto); return ''; });
  let katkennut = false;
  if (AUKI.test(t)) { katkennut = true; t = t.replace(AUKI, ''); }
  t = t.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  return { teksti: t, lohkot: lohkot, katkennut: katkennut };
}

/** Konseptikoodi kaanonavaimeksi: "Y-H5" / "y_h5" → "y_h5". Muu kuin kaanonin yksilökonsepti (Y-H0…Y-P4) → null. */
function normalisoiAvain(a) {
  if (typeof a !== 'string') return null;
  const m = /^\s*y[-_]([hp])(\d{1,2})\s*$/i.exec(a);
  if (!m) return null;
  const avain = 'y_' + m[1].toLowerCase() + Number(m[2]);
  return KONSEPTIT[avain] ? avain : null;
}

/**
 * K2b: mallin pienet lipsahdukset korjataan ENNEN validointia (spec muuttuu paikallaan).
 *   rooli: pienet kirjaimet + trim; jos ääkköset taitettuna vastaa sallittua roolia → kanoninen (syottaja → syöttäjä).
 *          Muu tuntematon rooli jää ennalleen → validaattori hylkää kuten ennenkin.
 *   jokeri: "true" / 1 → true. Muu ei-boolean → kenttä pois (ei hylkäystä).
 * Palauttaa korjatut kohdat lokia varten, esim. ['rooli:A2', 'jokeri:J'] (max 10).
 */
function normalisoiPelaajat(spec) {
  const korjattu = [];
  (Array.isArray(spec.pelaajat) ? spec.pelaajat : []).forEach(function (p) {
    if (!p || typeof p !== 'object') return;
    if (typeof p.rooli === 'string') {
      const pieni = p.rooli.trim().toLowerCase();
      const kanoninen = KAAVIO_ROOLIT.indexOf(pieni) >= 0 ? pieni : ROOLI_TAITETTU[taita(pieni)];
      if (kanoninen && kanoninen !== p.rooli) { p.rooli = kanoninen; korjattu.push('rooli:' + p.id); }
    }
    if (p.jokeri != null && typeof p.jokeri !== 'boolean') {
      const tosi = p.jokeri === 1 || (typeof p.jokeri === 'string' && p.jokeri.trim().toLowerCase() === 'true');
      if (tosi) p.jokeri = true; else delete p.jokeri;
      korjattu.push('jokeri:' + p.id);
    }
  });
  return korjattu.slice(0, MAX_NORMALISOITU);
}

function _suodataKielikartta(kartta, suodata) {
  if (!kartta || typeof kartta !== 'object' || Array.isArray(kartta)) return kartta;
  const ulos = {};
  Object.keys(kartta).forEach(function (l) { ulos[l] = typeof kartta[l] === 'string' ? suodata(kartta[l]).trim() : kartta[l]; });
  return ulos;
}

/**
 * @param {string} teksti   mallin vastaus
 * @param {object} [o]      { paalla: bool (lippu + rooli), suodata: (s) => s (koodisuodatin; oletus ei suodatusta) }
 * @returns {{ teksti, kaavio, tila: 'ok'|'hylatty'|null, virheet: string[], merkit: number|null, normalisoitu: string[] }}
 */
function kasitteleKaavio(teksti, o) {
  o = o || {};
  const p = poistaLohkot(teksti);
  const tulos = { teksti: p.teksti, kaavio: null, tila: null, virheet: [], merkit: null, normalisoitu: [] };
  if (!o.paalla) return tulos;                           // lippu pois / HP-rooli: ei poimintaa, lohko silti pois
  if (!p.lohkot.length && !p.katkennut) return tulos;    // vastauksessa ei kaaviota
  tulos.merkit = p.lohkot.reduce(function (s, x) { return s + x.length; }, 0);
  const hylkaa = function (virheet) { tulos.tila = 'hylatty'; tulos.virheet = virheet.slice(0, MAX_VIRHEET); return tulos; };
  if (p.katkennut) return hylkaa(['lohko katkesi (ei </kaavio>-loppua)']);
  if (p.lohkot.length > 1) return hylkaa(['useampi kaaviolohko (' + p.lohkot.length + ')']);
  if (tulos.merkit > MAX_MERKIT) return hylkaa(['kaavio liian pitkä (' + tulos.merkit + ' merkkiä)']);
  let spec;
  try { spec = JSON.parse(p.lohkot[0].trim().replace(/^```(?:json)?\s*|\s*```$/g, '')); } catch (e) { return hylkaa(['rikkinäinen JSON']); }
  if (!spec || typeof spec !== 'object' || Array.isArray(spec)) return hylkaa(['kaavio ei ole objekti']);
  const avain = normalisoiAvain(spec.avain);
  if (!avain) return hylkaa(['tuntematon avain: ' + String(spec.avain).slice(0, 40)]);
  spec.avain = avain;
  if (typeof spec.pelimuoto !== 'string' || !PELIMUOTO.test(spec.pelimuoto)) {
    return hylkaa(['pelimuoto ei kelpaa: ' + String(spec.pelimuoto).slice(0, 20)]);
  }
  tulos.normalisoitu = normalisoiPelaajat(spec);
  // Koodisuodatin selitteisiin ja tilanteeseen ENNEN validointia: tyhjäksi suodattunut selite kaatuu validaattorissa.
  const suodata = typeof o.suodata === 'function' ? o.suodata : function (s) { return s; };
  if (Array.isArray(spec.selitteet)) spec.selitteet = spec.selitteet.map(function (s) { return s && typeof s === 'object' ? Object.assign({}, s, { t: _suodataKielikartta(s.t, suodata) }) : s; });
  if (spec.tilanne) spec.tilanne = _suodataKielikartta(spec.tilanne, suodata);
  const v = validoiKaavio(spec, { kpiKoodit: kaavioKpiKoodit(KONSEPTIT[avain]) });
  if (v.E.length) return hylkaa(v.E);
  tulos.tila = 'ok';
  tulos.kaavio = spec;
  return tulos;
}

module.exports = { kasitteleKaavio, poistaLohkot, normalisoiAvain, normalisoiPelaajat, MAX_VIRHEET };
