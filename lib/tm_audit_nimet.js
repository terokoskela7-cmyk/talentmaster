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
    suostumus_estetty_pelaaja_ristiriita: '⚠ Suostumus estetty: lomake koskee eri pelaajaa',
    suostumus_estetty_kutsu_kaytetty:    '⚠ Suostumus estetty: kutsu on jo käytetty tai korvattu',
    suostumus_estetty_kutsu_ristiriita:  '⚠ Suostumus estetty: kutsu koskee eri pelaajaa',
    suostumus_estetty_jo_annettu:        'Suostumus estetty: annettu jo (vanha linkki)',
    rekisterikutsu_lahetetty:            'Rekisterikutsu lähetetty',
    huoltajakutsu_lahetetty:            'Huoltajakutsu lähetetty',
    muistutus_lahetetty:                 'Muistutus lähetetty',
    kayttaja_luotu:                      'Käyttäjä luotu',
    kayttaja_deaktivoitu:                'Käyttäjä deaktivoitu',
    kayttaja_aktivoitu:                  'Käyttäjä aktivoitu',
    kayttaja_poistettu:                  '⚠ Käyttäjä poistettu pysyvästi',
    rooli_vaihdettu:                     'Käyttäjän rooli vaihdettu',
    pelaaja_kirjautuminen_estetty_suostumus: 'Pelaajan kirjautuminen estetty: suostumus puuttuu',
    suostumuskortit_luotu:               'QR-suostumuskortit luotu',
    kayttaja_rooli_estetty:              '🟠 Kielletty rooli estetty (luoKayttaja)',
    kayttaja_toisen_seuran_estetty:      '🟠 Toisen seuran käyttäjän lisäys estetty (luoKayttaja)',
    sa_oikeus_poistettu:                 '⚠ Super-admin-oikeus poistettu',
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
    pin_asetettu:                        'PIN asetettu',
    pinit_luotu:                         'PIN-koodit luotu (massa)',
    lupapyynto_tulos_siirto:             'Solo-lupapyyntöjen tulosten siirto (PR 4)',
    gdpr_rtbf:                           'GDPR: pelaajan tiedot poistettu',
    gdpr_rtbf_noop:                      'GDPR: poisto (jo poistettu)',
    gdpr_export:                         'GDPR: tiedot viety',
    huoltaja_email_vaihdettu:            'Huoltajan sähköposti vaihdettu',
  };
  /* Rivikohtaiset merkinnät: kenttä audit-rivillä, ei oma toiminto (esim. suostumus_annettu + lomake_poikkeama, warn). */
  var MERKINNAT = {
    lomake_poikkeama: '⚠ Suostumuslomakkeessa poikkeama',
  };
  function nimi(toiminto) { return (toiminto && NIMET[toiminto]) || String(toiminto || '—'); }
  /* Rivin nimi: toiminnon nimi, tai merkintä kun rivillä on poikkeama (esim. "⚠ Suostumuslomakkeessa poikkeama (etunimi)"). */
  function rivinNimi(r) {
    r = r || {};
    if (Array.isArray(r.lomake_poikkeama) && r.lomake_poikkeama.length) {
      return MERKINNAT.lomake_poikkeama + ' (' + r.lomake_poikkeama.join(', ') + ')';
    }
    if (r.toiminto === 'rooli_vaihdettu' && (r.vanha_rooli || r.uusi_rooli)) {
      return nimi(r.toiminto) + ' (' + (r.vanha_rooli || '—') + ' → ' + (r.uusi_rooli || '—') + ')';
    }
    return nimi(r.toiminto);
  }
  /* Epäonnistuneet lähetykset -pikanappi: kaikki *_epaonnistui-toiminnot. */
  function epaonnistuneet() { return Object.keys(NIMET).filter(function (k) { return /_epaonnistui$/.test(k); }); }
  var api = { NIMET: NIMET, MERKINNAT: MERKINNAT, nimi: nimi, rivinNimi: rivinNimi, epaonnistuneet: epaonnistuneet };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (juuri) juuri.TM_AUDIT_NIMET = api;
})(typeof window !== 'undefined' ? window : null);
