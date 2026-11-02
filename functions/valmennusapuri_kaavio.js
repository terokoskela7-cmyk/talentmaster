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
const { validoiKaavio } = require('./tm_kaavio_validate.js');
const { kaavioKpiKoodit } = require('./tm_kaavio_konsepti.js');
const { TM_TT_YOUTH } = require('./tm_teknistaktiset.js');

const LOHKO = /<kaavio>([\s\S]*?)<\/kaavio>/gi;
const AUKI = /<kaavio>[\s\S]*$/i;                       // katkennut lohko (max_tokens) → loppuosa pois
const PELIMUOTO = /^\d+v\d+(?:\+\d+)?$/;                 // "2v2" tai "2v2+1" (jokerit, ks. validaattorin capOf)
const MAX_VIRHEET = 10;
const MAX_MERKIT = 12000;                               // yksi kaavio on noin 1–3 k merkkiä
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

function _suodataKielikartta(kartta, suodata) {
  if (!kartta || typeof kartta !== 'object' || Array.isArray(kartta)) return kartta;
  const ulos = {};
  Object.keys(kartta).forEach(function (l) { ulos[l] = typeof kartta[l] === 'string' ? suodata(kartta[l]).trim() : kartta[l]; });
  return ulos;
}

/**
 * @param {string} teksti   mallin vastaus
 * @param {object} [o]      { paalla: bool (lippu + rooli), suodata: (s) => s (koodisuodatin; oletus ei suodatusta) }
 * @returns {{ teksti, kaavio, tila: 'ok'|'hylatty'|null, virheet: string[], merkit: number|null }}
 */
function kasitteleKaavio(teksti, o) {
  o = o || {};
  const p = poistaLohkot(teksti);
  const tulos = { teksti: p.teksti, kaavio: null, tila: null, virheet: [], merkit: null };
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

module.exports = { kasitteleKaavio, poistaLohkot, normalisoiAvain, MAX_VIRHEET };
