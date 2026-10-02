'use strict';
/**
 * Palautteen ilmoitus (notifPalauteJaettu) — teksti + rakenteiset kentät. PUHDAS: ei Firebase-riippuvuuksia.
 * Teksti kertoo KUKA antoi, MITÄ (ääni vs. teksti) ja MILLOIN (harjoituksen päivä) + joukkue. EI pelaajien nimiä.
 * Rakenteiset kentät (tekija_etunimi, onAani, joukkue, pvm) talletetaan notifiin, jotta käännös (sv) ei vaadi
 * tekstin jäsentämistä.
 */

const ROOLI_NIMI = {
  vp: 'Valmennuspäällikkö',
  urheilutoimenjohtaja: 'Urheilutoimenjohtaja',
  seurasihteeri: 'Seurasihteeri',
  valmentaja: 'Valmentaja',
  talenttivalmentaja: 'Talenttivalmentaja',
  fysiikkavalmentaja: 'Fysiikkavalmentaja',
  fysioterapeutti: 'Fysioterapeutti',
  testivastaava: 'Testivastaava',
  super_admin: 'TalentMasterin ylläpito',
  superadmin: 'TalentMasterin ylläpito',
};

function rooliSelkokielella(rooli) {
  return ROOLI_NIMI[String(rooli || '').toLowerCase()] || '';
}

// 'YYYY-MM-DD' / ISO-aika / Date / Firestore Timestamp → 'P.K.' (esim. '2.10.'); virheellinen → ''.
function pvmPK(pvm) {
  let d = null;
  if (pvm && typeof pvm.toDate === 'function') d = pvm.toDate();
  else if (pvm instanceof Date) d = pvm;
  else if (typeof pvm === 'string') {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(pvm.trim());
    if (m) return Number(m[3]) + '.' + Number(m[2]) + '.';   // ei aikavyöhykesiirtymää: päivä sellaisenaan
    d = new Date(pvm);
  }
  if (!d || isNaN(d.getTime())) return '';
  return d.getUTCDate() + '.' + (d.getUTCMonth() + 1) + '.';
}

/**
 * @param {{tekijaEtunimi?:string, tekijaRooli?:string, onAani?:boolean, pvm?:any, joukkue?:string}} o
 * @returns {{teksti:string, tekija_etunimi:string|null, onAani:boolean, joukkue:string|null, pvm:string|null}}
 */
function muodostaPalauteNotif(o) {
  o = o || {};
  const etunimi = String(o.tekijaEtunimi || '').trim().split(/\s+/)[0] || '';
  const kuka = etunimi || rooliSelkokielella(o.tekijaRooli) || 'Joku';
  const onAani = o.onAani === true;
  const joukkue = String(o.joukkue || '').trim();
  const pk = pvmPK(o.pvm);
  let teksti = kuka + ' antoi ' + (onAani ? 'äänipalautetta' : 'palautetta') + ' harjoituksestasi';
  if (pk) teksti += ' ' + pk;
  if (joukkue) teksti += ' (' + joukkue + ')';
  if (!pk || joukkue) teksti += '.';   // päivän loppupiste toimii virkkeen pisteenä, kun joukkuetta ei ole
  return {
    teksti,
    tekija_etunimi: etunimi || null,
    onAani,
    joukkue: joukkue || null,
    pvm: typeof o.pvm === 'string' ? o.pvm : (pk ? String(pvmISO(o.pvm)) : null),
  };
}

function pvmISO(pvm) {
  try {
    const d = (pvm && typeof pvm.toDate === 'function') ? pvm.toDate() : new Date(pvm);
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  } catch (e) { return null; }
}

module.exports = { muodostaPalauteNotif, rooliSelkokielella, pvmPK };
