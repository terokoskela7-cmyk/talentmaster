'use strict';
/**
 * Projekti 07 / PR 4: valvonnan virhesähköposti (P4/P6). Erillinen moduuli: ei Firestore-kirjoituksia, ei vastaanottajaa lokiin.
 *  · vastaanottaja: Secret Manager VALVONTA_VASTAANOTTAJA (runWith({secrets}) → process.env); yksi osoite (v1). Puuttuva/virheellinen → ei lähetetä, loki kertoo vain syyn.
 *  · sisältö: R.tmVSahkoposti (lib/tm_valvonta_raportti.js, PR 1): päivittäin vain uudet/kasvaneet virheet tai käsittelemättä jääneet seurat; viikoittain yhteenveto (virheet + varoitukset).
 *    Vain seura-id, tarkistuskoodi, kokoelma ja lukumäärät; tmVOnkoPii tarkistaa viestin ennen lähetystä.
 *  · lähetys: SendGrid (sama payload-rakentaja kuin muu sähköposti → seuranta pois, §39) ja sama ympäristöesto (ei oikeaa postia muussa kuin tuotantoprojektissa).
 *    Eri kuin index.js:n lahetaSahkoposti: EI lokita vastaanottajaa eikä SendGridin vastauksen runkoa (voi toistaa osoitteen); lokiin vain tilakoodi.
 *  · epäonnistunut lähetys EI kaada valvonta-ajoa eikä estä audit-riviä (kirjaus tehdään ennen lähetystä).
 */
const R = require('./tm_valvonta_raportti.js');
const { rakennaSendGridPayload } = require('./sahkoposti_payload');
const sahkopostiEsto = require('./sahkoposti_esto');

const OSOITE_RE = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[A-Za-z]{2,}$/;
const LAHETTAJA = 'noreply@talentmasterid.com';   // sama oletus kuin lahetaSahkoposti (ei salainen; CI-deploy ei lue .env:iä)

/** env → vastaanottaja tai null (tyhjä, useita osoitteita tai virheellinen muoto → null). */
function vastaanottaja(env) {
  const v = String((env || {}).VALVONTA_VASTAANOTTAJA || '').trim();
  return OSOITE_RE.test(v) ? v : null;
}
const otsikko = (s) => String(s || '').replace(/[\r\n\u2028\u2029]+/g, ' ').trim().slice(0, 120);

/** SendGrid-lähetin (injektoitava https/env testeille). → async ({ subject, html }) => { ok, estetty?, tila? }. Heittää vain tilakoodin sisältävän virheen. */
function luoLahetin(opts) {
  const o = opts || {}, env = o.env || process.env, https = o.https || require('https'), loki = o.loki || console;
  return async function laheta(viesti) {
    const esto = sahkopostiEsto.sahkopostiEsto(env);
    if (esto.estetty) { loki.log('valvonta posti: lähetys ESTETTY (ei tuotantoprojekti) projekti=' + (esto.projekti || 'tuntematon')); return { ok: true, estetty: true }; }
    const to = vastaanottaja(env), apiKey = env.SENDGRID_API_KEY;
    if (!to) throw Object.assign(new Error('vastaanottaja'), { koodi: 'vastaanottaja_puuttuu' });
    if (!apiKey) throw Object.assign(new Error('avain'), { koodi: 'sendgrid_avain_puuttuu' });
    const payload = JSON.stringify(rakennaSendGridPayload({ to, fromEmail: LAHETTAJA, fromName: 'TalentMaster™ valvonta', subject: otsikko(viesti.subject), html: viesti.html }));
    return new Promise((resolve, reject) => {
      const req = https.request({ hostname: 'api.sendgrid.com', path: '/v3/mail/send', method: 'POST',
        headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } }, (res) => {
        res.on('data', () => {}); res.on('end', () => (res.statusCode === 202 ? resolve({ ok: true, tila: 202 }) : reject(Object.assign(new Error('sendgrid'), { koodi: 'sendgrid_' + res.statusCode }))));
      });
      req.on('error', () => reject(Object.assign(new Error('verkko'), { koodi: 'sendgrid_verkko' })));
      req.write(payload); req.end();
    });
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
