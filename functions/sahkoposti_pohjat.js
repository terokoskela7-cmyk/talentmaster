'use strict';
// Sähköpostipohjat (siirretty index.js:stä testattavuuden vuoksi; viestitekstit ennallaan).
// KAIKKI interpoloidut arvot kulkevat esc():n kautta (HTML-escape, myös href-attribuutit).
const { esc } = require('./sahkoposti_turva');

function pohjaHeader(seuraNimi) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <div style="background:#111110;padding:24px;border-radius:12px;margin-bottom:24px;">
        <h1 style="color:#28B090;margin:0;font-size:22px;">TalentMaster™</h1>
        <p style="color:#aaa;margin:4px 0 0;font-size:13px;">${esc(seuraNimi)}</p>
      </div>`;
}
function pohjaFooter(seuraNimi) {
  return `
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
      <p style="font-size:11px;color:#bbb;text-align:center;">
        TalentMaster™ — Jalkapallon talenttiarviointijärjestelmä<br>
        ${esc(seuraNimi)}
      </p>
    </div>`;
}
function pohjaRekisteriKutsu({ seuraNimi, pelaajaNimi, joukkueNimi, linkki }) {
  return pohjaHeader(seuraNimi) + `
    <p style="font-size:16px;color:#333;">Hei,</p>
    <p style="font-size:15px;color:#333;line-height:1.6;">
      <strong>${esc(seuraNimi)}</strong> kutsuu teidät rekisteröimään
      <strong>${esc(pelaajaNimi)}</strong> TalentMaster-järjestelmään
      ${joukkueNimi ? `joukkueeseen <strong>${esc(joukkueNimi)}</strong>` : ''}.
    </p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${esc(linkki)}"
        style="background:#28B090;color:#000;padding:14px 32px;
        border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;
        display:inline-block;">
        Rekisteröidy ja anna suostumus →
      </a>
    </div>
    <p style="font-size:12px;color:#999;text-align:center;">
      Linkki on henkilökohtainen — älkää jakako eteenpäin.
    </p>` + pohjaFooter(seuraNimi);
}
// Lempeä muistutus (nudge) — EI painostava (alaikäiset/GDPR). Reuse pohjaRekisteriKutsu-rakenne.
function pohjaMuistutus({ seuraNimi, pelaajaNimi, linkki }) {
  return pohjaHeader(seuraNimi) + `
    <p style="font-size:16px;color:#333;">Hei,</p>
    <p style="font-size:15px;color:#333;line-height:1.6;">
      <strong>${esc(seuraNimi)}</strong> odottaa vielä rekisteröitymistänne
      ${pelaajaNimi ? `(<strong>${esc(pelaajaNimi)}</strong>)` : ''} TalentMasteriin.
      Lähetämme linkin uudelleen siltä varalta, että aiempi viesti jäi huomaamatta.
    </p>
    <p style="font-size:15px;color:#333;line-height:1.6;">
      Ei kiirettä — voitte rekisteröityä silloin kun teille sopii.
    </p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${esc(linkki)}"
        style="background:#28B090;color:#000;padding:14px 32px;
        border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;
        display:inline-block;">
        Rekisteröidy ja anna suostumus →
      </a>
    </div>
    <p style="font-size:12px;color:#999;text-align:center;">
      Linkki on henkilökohtainen — älkää jakako eteenpäin.
    </p>` + pohjaFooter(seuraNimi);
}
function pohjaPelaajaSivu({
  seuraNimi, pelaajaNimi, joukkueNimi,
  salasanaLinkki, salasanaKutsu, vanhempiLinkki, pelaajaLinkki, hEmail, palloId, pin
}) {
  /* PR 4: tunnukset (PalloID + PIN) samaan viestiin, jotta huoltaja voi jakaa ne lapselle heti
     (sama malli kuin suostumussähköpostissa #687). Linkillä avattuna pelaaja syöttää pelkän PIN:n. */
  const tunnusOsio = pin ? `
    <div style="margin:20px 0;padding:16px;border:1px solid #28B090;border-radius:10px;text-align:center;">
      <div style="font-size:13px;color:#555;margin-bottom:8px;">Pelaajan tunnukset</div>
      ${palloId ? `<div style="font-size:14px;color:#333;margin-bottom:4px;">PalloID <strong style="letter-spacing:2px;">${esc(palloId)}</strong></div>` : ''}
      <div style="font-size:14px;color:#333;">PIN <strong style="font-size:22px;letter-spacing:5px;color:#28B090;">${esc(pin)}</strong></div>
      <div style="font-size:13px;color:#555;margin-top:10px;line-height:1.5;">Anna ne pelaajalle. Pelaajan omasta linkistä avattuna riittää pelkkä PIN.</div>
    </div>` : `
    <p style="font-size:13px;color:#555;line-height:1.5;margin:4px 0 16px;text-align:center;">
      ⚽ Avaa linkki ja kirjaudu lapsen PalloID:llä ja PIN-koodilla. PIN näkyy Vanhemman sivulla kirjautumisen jälkeen.
    </p>`;
  const salasanaOsio = salasanaLinkki ? `
    <div style="background:#f0fdf8;border:2px solid #28B090;border-radius:12px;
                padding:20px;margin:24px 0;">
      <p style="margin:0 0 8px;font-size:15px;font-weight:bold;color:#1a1a1a;">
        ① Aseta ensin salasanasi
      </p>
      <p style="margin:0 0 16px;font-size:14px;color:#444;line-height:1.5;">
        Klikkaa linkkiä ja luo oma salasana. ${salasanaKutsu ? '<strong>Linkki on voimassa 7 päivää</strong> — voit avata sen vaikka vasta illalla.' : '<strong>Linkki vanhenee 1 tunnissa.</strong>'}
      </p>
      <div style="text-align:center;">
        <a href="${esc(salasanaLinkki)}"
          style="background:#28B090;color:#000;padding:14px 32px;
          border-radius:8px;text-decoration:none;font-weight:bold;
          font-size:16px;display:inline-block;">
          Aseta salasana →
        </a>
      </div>
      <p style="margin:12px 0 0;font-size:13px;color:#555;line-height:1.5;">
        Jos linkki ehti vanhentua, ei hätää — käytä Vanhemman sivun "Unohtuiko salasana?" -toimintoa.
      </p>
    </div>
    <p style="font-size:14px;color:#555;font-weight:bold;margin:24px 0 8px;">
      ② Kun salasana on asetettu, pääset sivuille:
    </p>` : `
    <p style="font-size:14px;color:#555;margin:16px 0;">
      Kirjautukaa sivuille osoitteella <strong>${esc(hEmail)}</strong>.
    </p>`;
  return pohjaHeader(seuraNimi) + `
    <p style="font-size:16px;color:#333;">Hei,</p>
    <p style="font-size:15px;color:#333;line-height:1.6;">
      <strong>${esc(pelaajaNimi)}</strong> on nyt rekisteröity TalentMaster-järjestelmään
      ${joukkueNimi ? `joukkueeseen <strong>${esc(joukkueNimi)}</strong>` : ''}.
    </p>
    ${salasanaOsio}
    <div style="text-align:center;margin:24px 0;display:flex;
                flex-direction:column;gap:12px;align-items:center;">
      <a href="${esc(vanhempiLinkki)}"
        style="background:#28B090;color:#000;padding:16px 36px;
        border-radius:8px;text-decoration:none;font-weight:bold;
        font-size:16px;display:inline-block;width:280px;">
        👨‍👩‍👦 Vanhemman sivu →
      </a>
      <a href="${esc(pelaajaLinkki)}"
        style="background:#1A2235;color:#28B090;padding:14px 36px;
        border:1px solid #28B090;border-radius:8px;text-decoration:none;
        font-weight:bold;font-size:15px;display:inline-block;width:280px;">
        ⚽ Pelaajan oma sivu →
      </a>
    </div>
    ${tunnusOsio}
    <p style="font-size:13px;color:#555;line-height:1.6;margin:20px 0 0;">
      💡 Lisää sivut puhelimen kotinäytölle (selaimen valikosta "Lisää aloitusnäytölle"), niin ne ovat aina tallessa.
      Osoitteen voi aina palauttaa mieleen: <strong>talentmasterid.com</strong>
    </p>` + pohjaFooter(seuraNimi);
}
function pohjaSalasanaAsetus({ etunimi, rooli, resetLinkki }) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <h2 style="color:#28B090;">Tervetuloa TalentMasteriin!</h2>
      <p>Hei ${esc(etunimi)},</p>
      <p>Sinut on lisätty järjestelmään roolilla <strong>${esc(rooli)}</strong>.</p>
      <p>Aseta oma salasanasi klikkaamalla alla olevaa linkkiä:</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${esc(resetLinkki)}"
          style="background:#28B090;color:#000;padding:12px 28px;
          border-radius:8px;text-decoration:none;font-weight:bold;">
          Aseta salasana →
        </a>
      </div>
      <p style="color:#999;font-size:12px;">Linkki on voimassa 1 tunnin.</p>
    </div>`;
}
// Suostumus-flow: huoltajan salasanalinkki perhepintaan (§16/§7.22 — ei tasoja/lukuja/vertailua).
function pohjaSuostumusLinkki({ lapsiNimi, resetLinkki, pin, kutsu }) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <h2 style="color:#28B090;">Tervetuloa TalentMasteriin!</h2>
      <p>Hei,</p>
      <p>Kiitos suostumuksesta${lapsiNimi ? ` — ${esc(lapsiNimi)} on nyt mukana TalentMasterissa.` : '.'}</p>
      <p>Aseta TalentMaster-salasanasi alla olevasta linkist&auml;:</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${esc(resetLinkki)}"
          style="background:#28B090;color:#000;padding:12px 28px;
          border-radius:8px;text-decoration:none;font-weight:bold;">
          Aseta salasana &rarr;
        </a>
      </div>
      <p style="font-size:14px;color:#333;line-height:1.6;">
        Salasanan asetettuasi p&auml;&auml;set vanhemman n&auml;kym&auml;&auml;n &mdash; kirjaudu t&auml;ll&auml; s&auml;hk&ouml;postiosoitteella ja uudella salasanalla.
      </p>${pin ? `
      <div style="margin:20px 0;padding:14px;border:1px solid #28B090;border-radius:8px;text-align:center;">
        <div style="font-size:13px;color:#555;">Pelaajan PIN-koodi</div>
        <div style="font-size:30px;letter-spacing:6px;font-weight:bold;color:#28B090;">${esc(pin)}</div>
        <div style="font-size:13px;color:#333;">Anna t&auml;m&auml; pelaajalle &mdash; h&auml;n kirjautuu omaan n&auml;kym&auml;&auml;ns&auml; PalloID:ll&auml; ja PIN-koodilla.</div>
      </div>` : ''}
      <p style="color:#555;font-size:13px;line-height:1.5;">${kutsu ? '<strong>Linkki on voimassa 7 p&auml;iv&auml;&auml;</strong> &mdash; voit avata sen vaikka vasta illalla. Jos se on vanhentunut, sivu tarjoaa uuden linkin.' : '<strong>Linkki on voimassa 1 tunnin.</strong> Jos se ehtii vanheta, valitse vanhemman sivun kirjautumisessa &rdquo;Unohdin salasanan&rdquo;.'}</p>
      <p style="color:#999;font-size:12px;">Jos painike ei toimi, kopioi t&auml;m&auml; osoite selaimeen:<br>${esc(resetLinkki)}</p>
    </div>`;
}
// Huoltajakutsu (#919:n jatko): uusi 7 pv:n kutsulinkki huoltajalle ("Lähetä uusi linkki" / uudelleenlähetys). KAIKKI arvot esc():n kautta (§39).
function pohjaHuoltajakutsu({ kutsuLinkki }) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <h2 style="color:#28B090;">Aseta TalentMaster-salasanasi</h2>
      <p>Hei,</p>
      <p style="line-height:1.6;">Pyysit uuden linkin. Painikkeesta asetat salasanasi ja p&auml;&auml;set katsomaan lapsen kalenteria ja aikatauluja.</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${esc(kutsuLinkki)}"
          style="background:#28B090;color:#000;padding:12px 28px;
          border-radius:8px;text-decoration:none;font-weight:bold;">
          Aseta salasana &rarr;
        </a>
      </div>
      <p style="color:#555;font-size:13px;line-height:1.5;"><strong>Linkki on voimassa 7 p&auml;iv&auml;&auml;</strong> &mdash; voit avata sen vaikka vasta illalla. Jos linkki ei toimi, sivu tarjoaa uuden.</p>
      <p style="color:#999;font-size:12px;">Jos painike ei toimi, kopioi t&auml;m&auml; osoite selaimeen:<br>${esc(kutsuLinkki)}</p>
    </div>`;
}
function pohjaSoloLupa({ child_etunimi, linkki }) {
  return '<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;color:#1a1a1a">'
    + '<h2 style="color:#0a0f1e">TalentMaster Player™</h2>'
    + '<p><b>' + esc(child_etunimi || 'Lapsesi') + '</b> haluaa aloittaa TalentMaster Playerin käytön ja pyytää sinulta lupaa.</p>'
    + '<p>Olet lapsesi laillinen huoltaja. Lapsen harjoitusdatan käsittely vaatii suostumuksesi (GDPR Art. 8). '
    + 'Avaa alla oleva linkki, niin näet lapsen tiedot ja voit antaa luvan.</p>'
    + '<p style="text-align:center;margin:28px 0"><a href="' + linkki + '" style="background:#00d4aa;color:#fff;padding:13px 26px;border-radius:10px;text-decoration:none;font-weight:bold">Tarkista ja anna lupa →</a></p>'
    + '<p style="font-size:12px;color:#666">Jos et tunnista tätä pyyntöä, voit jättää viestin huomiotta — mitään ei tallenneta ilman lupaasi.</p>'
    + '</div>';
}

module.exports = { pohjaHeader, pohjaFooter, pohjaRekisteriKutsu, pohjaMuistutus, pohjaPelaajaSivu, pohjaSalasanaAsetus, pohjaSuostumusLinkki, pohjaHuoltajakutsu, pohjaSoloLupa };
