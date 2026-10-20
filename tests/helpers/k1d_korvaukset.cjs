/* K1d (20.10.2026): sanastomuutos korvasi suomenkieliset avaintekstit (fi-avaimiset kartat vpT/masterT). Vanhojen erien testit hakevat riviä vanhalla fi-avaimella;
   uusi(fi) palauttaa nykyisen avaimen, kartta(obj) tekee Proxyn joka löytää rivin sekä vanhalla että uudella avaimella. Lähde: tests/fixtures/k1d_fi_korvaukset.json. */
const fs = require('fs'), path = require('path');
const LISTA = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'k1d_fi_korvaukset.json'), 'utf8'));
const KARTTA = new Map(LISTA.map((x) => [x.vanha, x.uusi]));
const uusi = (fi) => (KARTTA.has(fi) ? KARTTA.get(fi) : fi);
const kartta = (obj) => new Proxy(obj, { get: (t, k) => (typeof k === 'string' && !(k in t) && KARTTA.has(k) ? t[KARTTA.get(k)] : t[k]), has: (t, k) => k in t || (typeof k === 'string' && KARTTA.has(k) && KARTTA.get(k) in t) });
module.exports = { LISTA, KARTTA, uusi, kartta };
/* Tuotannon globaali tmPaivaIso (paikallinen päivä, §7.26) vm-sandboxeihin: jakson yhteenveto kirjoittaa review_viimeisin_pvm:n sulkupäivällä (Master/VP-adapteri antaa opts.pvm). Nimi = tuotannon nimi (ei peitä ReferenceErroria). */
module.exports.tmPaivaIso = (d) => { const x = d || new Date(); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
/* Lib-avaimet joiden fi-teksti muuttui K1d:ssä (tests/fixtures/k1d_lib_muutokset.json). erassaFi(avain, nykyinen) = fi sellaisena kuin se oli vanhassa (jo palautetussa) Gemini-erässä. */
const LIBMUUTOKSET = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'k1d_lib_muutokset.json'), 'utf8'));
module.exports.LIBMUUTOKSET = LIBMUUTOKSET;
module.exports.erassaFi = (avain, nykyinen) => (LIBMUUTOKSET[avain] && LIBMUUTOKSET[avain].uusi === nykyinen ? LIBMUUTOKSET[avain].vanha : nykyinen);
/* Erän 80 lib-avaimet joilla EI vielä ole sv:tä (uudet K1d-avaimet, rivillä ei sv_nyt:ää): odottavat Geminiä — vanhojen erien "jokaiselle avaimelle on sv" -portit sallivat nämä. */
const ERA80 = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'docs', 'i18n', 'sv_kaannoserae_80_gemini.json'), 'utf8')).osiot;
module.exports.era80Odottaa = (avain) => Object.keys(ERA80).some((o) => /^lib\./.test(o) && ERA80[o].rivit[avain] && !ERA80[o].rivit[avain].sv_nyt && !ERA80[o].rivit[avain].sv);
module.exports.era80FiOdottaa = () => { const r = []; for (const o of Object.keys(ERA80)) if (/^lib\./.test(o)) for (const x of Object.values(ERA80[o].rivit)) if (!x.sv_nyt && !x.sv && x.fi) r.push(x.fi); return r; };   // fi-tekstit joiden sv odottaa erää 80 (klippi_sv_selain: LIB_FI_ODOTTAA)
