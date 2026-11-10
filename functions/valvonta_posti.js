'use strict';
/**
 * Projekti 07 / PR 4: valvonnan virhesähköposti (P4/P6). Erillinen moduuli: ei Firestore-kirjoituksia, ei vastaanottajaa lokiin.
 *  · vastaanottaja: Secret Manager VALVONTA_VASTAANOTTAJA (runWith({secrets}) → process.env); yksi osoite (v1). Puuttuva/virheellinen → ei lähetetä, loki kertoo vain syyn.
 *  · sisältö: R.tmVSahkoposti (lib/tm_valvonta_raportti.js, PR 1): päivittäin vain uudet/kasvaneet virheet tai käsittelemättä jääneet seurat; viikoittain yhteenveto (virheet + varoitukset).
 *    Vain seura-id, tarkistuskoodi, kokoelma ja lukumäärät; tmVOnkoPii tarkistaa viestin ennen lähetystä.
 *  · lähetys: index.js:n lahetaSahkoposti (injektoitu; seuranta pois §39, ympäristöesto: ei oikeaa postia muussa kuin tuotantoprojektissa) `hiljainen`-tilassa:
 *    EI lokita vastaanottajaa eikä SendGridin vastauksen runkoa (voi toistaa osoitteen); lokiin vain tilakoodi.
 *  · epäonnistunut lähetys EI kaada valvonta-ajoa eikä estä audit-riviä (kirjaus tehdään ennen lähetystä).
 */
const R = require('./tm_valvonta_raportti.js');

const OSOITE_RE = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[A-Za-z]{2,}$/;

/** env → vastaanottaja tai null (tyhjä, useita osoitteita tai virheellinen muoto → null). */
function vastaanottaja(env) {
  const v = String((env || {}).VALVONTA_VASTAANOTTAJA || '').trim();
  return OSOITE_RE.test(v) ? v : null;
}
const otsikko = (s) => String(s || '').replace(/[\r\n\u2028\u2029]+/g, ' ').trim().slice(0, 120);

/** Lähetin: opts = { laheta (index.js:n lahetaSahkoposti: ainoa SendGrid-kutsukohta, ympäristöesto sisällä), env? }. → async ({ subject, html }) => { ok, estetty? }.
 *  Vastaanottaja luetaan env:stä tässä; `hiljainen: true` → lahetaSahkoposti ei lokita osoitetta eikä SendGridin vastauksen runkoa. Virhe heitetään vain koodilla (ei osoitetta). */
function luoLahetin(opts) {
  const o = opts || {}, env = o.env || process.env;
  return async function laheta(viesti) {
    const to = vastaanottaja(env);
    if (!to) throw Object.assign(new Error('vastaanottaja'), { koodi: 'vastaanottaja_puuttuu' });
    try { return await o.laheta({ to, subject: otsikko(viesti.subject), html: viesti.html, fromName: 'TalentMaster™ valvonta', hiljainen: true }); }
    catch (e) { throw Object.assign(new Error('lahetys'), { koodi: (e && e.koodi) || R.tmVTurvallinenVirhe(e).koodi }); }
  };
}

/** Raportti → (tarvittaessa) sähköposti. deps = { laheta, loki }. Palauttaa { lahetetty, syy }. Ei heitä: virhe → loki (vain koodi) + syy. */
async function kasittele(deps, raportti, tyyppi) {
  const loki = deps.loki || console;
  const viesti = R.tmVSahkoposti(raportti, { kaikki: tyyppi === 'viikko' });
  if (!viesti) return { lahetetty: false, syy: 'ei_aihetta' };
  const pii = R.tmVOnkoPii(viesti, []);
  if (!pii.ok) { loki.error('valvonta posti: PII-vartija hylkäsi viestin'); return { lahetetty: false, syy: 'pii' }; }
  try {
    const r = await deps.laheta(viesti);
    loki.log('valvonta posti ' + tyyppi + (r && r.estetty ? ' estetty' : ' lähetetty'));
    return { lahetetty: !(r && r.estetty), syy: r && r.estetty ? 'estetty' : 'ok' };
  } catch (e) {
    const koodi = (e && e.koodi) || R.tmVTurvallinenVirhe(e).koodi;
    loki.error('valvonta posti epäonnistui koodi=' + String(koodi).replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 40));
    return { lahetetty: false, syy: 'virhe' };
  }
}
module.exports = { vastaanottaja, luoLahetin, kasittele, OSOITE_RE };
