/* K1d: notifReviewEraantyy:n ydin PURENA (testattavissa ilman Firebasea). SAMA laskentafunktio kuin sovelluksessa: tmRytmiPelaajalle (lib/tm_rytmi.js; kopio functions/tm_rytmi.js, jaettu_lib.json) →
   sama review_viimeisin_pvm, sama ikäkaista (42 / 84 pv), jakson yhteenveto nollaa, EI pushia jos jakso päättyy viimeistään eräpäivänä (status 'ajantasalla').
   Push-kynnys: eräpäivään ≤ 7 pv tai myöhässä (ennallaan); sovellus näyttää kortin ≤ 14 pv. Teksti = lib-avainten ts_rytmi_otsikko[_myohassa] suomi; selain kääntää rakenteisesta kentästä `rytmi` (sv erä 80). */
'use strict';
const { tmRytmiPelaajalle } = require('./tm_rytmi.js');
const PUSH_PV = 7;
function _pvmFi(iso, nytMs) { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '')); if (!m) return ''; return (+m[3]) + '.' + (+m[2]) + '.' + (+m[1] === new Date(nytMs).getFullYear() ? '' : m[1]); }   // sama muoto kuin lib/tm_tanaan_signaali.js
/* pelaajat: [{ id, data }] → [{ id, nimi, joukkue, eraantyy_pvm, myohassa_pv, teksti }] */
function rytmiNotifit(pelaajat, nytMs) {
  const ulos = [];
  (pelaajat || []).forEach((pl) => {
    const p = pl.data || {}, r = tmRytmiPelaajalle(p, nytMs);
    if (r.status === 'ei_reviewia' || r.status === 'ajantasalla') return;   // ajantasalla = myös "jakso hoitaa" (päättyy ennen eräpäivää)
    if (r.ylimaaraPv < -PUSH_PV) return;
    const nimi = ((p.etunimi || '') + ' ' + (p.sukunimi || '')).trim() || pl.id, joukkue = p.joukkue || '', myoh = r.ylimaaraPv > 0 ? r.ylimaaraPv : 0;
    const otsikko = myoh > 0 ? 'Jakson yhteenveto tai kehityskeskustelu myöhässä ' + myoh + ' pv' : 'Jakson yhteenveto tai kehityskeskustelu viimeistään ' + _pvmFi(r.eraantyyPvm, nytMs);
    ulos.push({ id: pl.id, nimi, joukkue, eraantyy_pvm: r.eraantyyPvm, myohassa_pv: myoh, teksti: otsikko + ': ' + nimi + (joukkue ? ' (' + joukkue + ')' : '') + '.' });
  });
  return ulos;
}
module.exports = { rytmiNotifit, PUSH_PV };
