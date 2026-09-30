/* ════════════════════════════════════════════════════════════════════════
   tm_audit_nimet.js — audit-toimintojen selkokieliset nimet (Admin → Audit-loki)
   Vartijatesti (tests/admin_auditloki.test.js) vaatii nimen JOKAISELLE toiminto-arvolle, jonka
   functions/ tai scripts/ kirjoittaa audit-kokoelmaan. Tuntematon toiminto näytetään teknisellä nimellä.
   Selain: window.TM_AUDIT_NIMET · Node: module.exports.
════════════════════════════════════════════════════════════════════════ */
(function (juuri) {
  'use strict';
  var NIMET = {
    suostumus_annettu:                   'Suostumus annettu',
    suostumuslinkki_lahetetty:           'Tunnukset lähetetty huoltajalle',
    suostumuslinkki_epaonnistui:         '⚠ Tunnusten lähetys epäonnistui',
    suostumus_estetty_email_ristiriita:  '⚠ Suostumus estetty: väärä sähköposti',
    rekisterikutsu_lahetetty:            'Rekisterikutsu lähetetty',
    huoltajakutsu_lahetetty:            'Huoltajakutsu lähetetty',
    muistutus_lahetetty:                 'Muistutus lähetetty',
    kayttaja_luotu:                      'Käyttäjä luotu',
    kayttaja_deaktivoitu:                'Käyttäjä deaktivoitu',
    pelaaja_kirjautuminen:               'Pelaaja kirjautui',
    pelaaja_kirjautuminen_lukittu:       '🟠 Pelaajan kirjautuminen lukittu',
    pelaaja_kirjautuminen_moniselitteinen: '🟠 Moniselitteinen PalloID',
    solo_kirjautuminen:                  'Solo-lapsi kirjautui',
    solo_kirjautuminen_lukittu:          '🟠 Solo-lapsen kirjautuminen lukittu',
    solo_kirjautuminen_moniselitteinen:  '🟠 Moniselitteinen Solo-koodi',
    solo_lupa_hyvaksytty:                'Solo-lupa hyväksytty',
    solo_lupapyynto_email:               'Solo-lupapyyntö lähetetty',
    solo_lupapyynto_playercode_backfill: 'Backfill (#679)',
    testipvm_korjattu:                   'Testipäivä korjattu',
    pin_asetettu:                        'PIN asetettu (pelaaja)',
    pinit_luotu:                         'PIN-koodit luotu (massa)',
    lupapyynto_tulos_siirto:             'Solo-lupapyyntöjen tulosten siirto (PR 4)',
    gdpr_rtbf:                           'GDPR: pelaajan tiedot poistettu',
    gdpr_rtbf_noop:                      'GDPR: poisto (jo poistettu)',
    gdpr_export:                         'GDPR: tiedot viety',
  };
  function nimi(toiminto) { return (toiminto && NIMET[toiminto]) || String(toiminto || '—'); }
  /* Epäonnistuneet lähetykset -pikanappi: kaikki *_epaonnistui-toiminnot. */
  function epaonnistuneet() { return Object.keys(NIMET).filter(function (k) { return /_epaonnistui$/.test(k); }); }
  var api = { NIMET: NIMET, nimi: nimi, epaonnistuneet: epaonnistuneet };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (juuri) juuri.TM_AUDIT_NIMET = api;
})(typeof window !== 'undefined' ? window : null);
