/* ════════════════════════════════════════════════════════════════════════
   sahkoposti_payload.js — SendGrid /v3/mail/send -payload (lahetaSahkoposti, functions/index.js)

   SEURANTA ON POIS — ÄLÄ KYTKE TAKAISIN (2.10.2026, P0):
   Klikkiseuranta kierrättää jokaisen linkin ct.sendgrid.net-uudelleenohjauksen kautta. Linkeissä kulkee
   huoltajan sähköposti, pelaajan nimi, kutsuId ja Firebasen salasanatoken (oobCode) → ne päätyisivät
   SendGridin klikkilokiin EU:n ulkopuolelle (CLAUDE.md §39: alaikäisten data EU:ssa). Avaus-, tilaus- ja
   GA-seuranta lisäävät seurantapikselin/-parametrit samaan viestiin → nekin pois.
   Vartija: tests/sendgrid_seuranta_pois.test.js failaa, jos seuranta kytketään päälle.
════════════════════════════════════════════════════════════════════════ */
'use strict';

const SEURANTA_POIS = Object.freeze({
  click_tracking:        Object.freeze({ enable: false, enable_text: false }),
  open_tracking:         Object.freeze({ enable: false }),
  subscription_tracking: Object.freeze({ enable: false }),
  ganalytics:            Object.freeze({ enable: false }),
});

function rakennaSendGridPayload({ to, fromEmail, fromName, subject, html }) {
  return {
    personalizations: [{ to: [{ email: to }] }],
    from: { email: fromEmail, name: fromName || 'TalentMaster™' },
    subject,
    content: [{ type: 'text/html', value: html }],
    tracking_settings: SEURANTA_POIS,
  };
}

module.exports = { rakennaSendGridPayload, SEURANTA_POIS };
