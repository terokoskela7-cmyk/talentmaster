'use strict';
/**
 * vahvistaSuostumus — siirretty functions/index.js:stä SELLAISENAAN (rivikattojen purku F2, 7.11.2026).
 * Vienti, region, runWith ja secrets pysyvät index.js:ssä (exports.vahvistaSuostumus = functions.region(...)...https.onCall(suostumusVahvistus.vahvistaSuostumus));
 * vedos functions/test/fixtures/viennit.json todentaa, ettei julkaistava pinta muutu.
 * Moduulit ladataan täällä requirella (sama välimuistissa oleva instanssi kuin index.js:ssä). index.js:n omat arvot ja apufunktiot
 * (db, TM_BASE_URL, lahetaSahkoposti, haeOrLuoHuoltajaAuth, huoltajaSalasanaLinkki) annetaan kytke()-kutsulla latauksessa;
 * siksi siirretty koodi on tiedoston ylätasolla samassa sisennyksessä kuin index.js:ssä (siirtotarkistus vertaa rivit sellaisinaan).
 */
const functions = require('firebase-functions/v1');
const admin     = require('firebase-admin');
const pelaajapin = require('./pelaajapin');
const suostumusTarkistus = require('./suostumus_tarkistus');
const { suostumusAnnettu } = require('./suostumus');
const suostumusPeruminen = require('./suostumus_peruminen');
const tmSisainen = require('./tm_sisainen');
const sisainenLuku = require('./sisainen_luku');
const { pohjaSuostumusLinkki } = require('./sahkoposti_pohjat');
const laskutusEsto = require('./laskutus_esto');
let db, TM_BASE_URL, lahetaSahkoposti, haeOrLuoHuoltajaAuth, huoltajaSalasanaLinkki;
/** index.js kutsuu kerran latauksessa, ennen kuin käsittelijä ajetaan. */
function kytke(d) { ({ db, TM_BASE_URL, lahetaSahkoposti, haeOrLuoHuoltajaAuth, huoltajaSalasanaLinkki } = d); }
exports.kytke = kytke;

// ─────────────────────────────────────────────────────────────────────────────
// vahvistaSuostumus — huoltajan suostumuksen palvelinvarmennettu vahvistus
//
// MIKSI CF: suostumustilan ('annettu') merkitseminen on turvakriittinen — sitä
// ei saa voida tehdä suoralla selainkirjoituksella. Tämä funktio varmistaa
// Admin SDK:lla että kutsuja todella on pelaajaan liitetty huoltaja (hEmail ===
// tallennettu huoltajaEmail) ennen kuin suostumus merkitään. Kirjoittaa palvelinpuolella
// KAIKKI kutsuflow'n kirjoitukset (suostumusTila + aux-kentät tila/antaja/bio-pituudet +
// kutsut→'hyvaksytty'), koska sivu on autentikoimaton eikä saa kirjoittaa Firestoreen suoraan.
// Lisäksi luo/hakee huoltajan Auth-tilin ja LÄHETTÄÄ salasanan asetuslinkin + pelaajan PIN:in
// huoltajan sähköpostiin (url PAKOLLINEN, muuten 500, ks. §13). PR 3b: linkkiä/PIN:iä EI palauteta.
// Käytössä: TalentMaster_Rekisterointi_Suostumus.html (kutsuflow).
// ─────────────────────────────────────────────────────────────────────────────
exports.vahvistaSuostumus = (async (data, context) => {
    // antaja/bioPituudet/kutsuId + syntyma/sukupuoli/suostumukset/suostumusMap/antajaRooli/aikaleima:
    // ei-arkaluonteiset kentät jotka lomake kirjoitti ennen suoraan client-puolelta — siirretty tänne,
    // koska Rekisterointi_Suostumus.html on autentikoimaton ja Rules estää sen suorat update-kirjoitukset.
    const { seuraId, pelaajaId, hEmail, suostumusTeksti, antaja, bioPituudet, kutsuId,
            syntyma, sukupuoli, suostumukset, suostumusMap, antajaRooli, aikaleima, etunimi } = data || {};
    if (!seuraId || !pelaajaId || !hEmail) {
      throw new functions.https.HttpsError('invalid-argument',
        'seuraId, pelaajaId ja hEmail ovat pakollisia.');
    }
    /* Suostumuksen antajan nimi pakollinen (1.10.2026): lomakkeen huoltajakortti ei näkynyt koskaan, joten
       alaikäisten suostumuksista puuttui antaja. Kanoninen kenttä = suostumus.antaja (EI enää suostumuksenAntaja;
       lukijat käyttävät sitä vain vanhan datan varalla). */
    const antajaNimi = String(antaja == null ? '' : antaja).replace(/\s+/g, ' ').trim();
    if (!antajaNimi) {
      throw new functions.https.HttpsError('invalid-argument', 'antaja_puuttuu', { syy: 'antaja_puuttuu' });
    }
    /* P1 (1.10.2026): julkiselta lomakkeelta tuleva vapaa teksti näytetään henkilökunnan sivuilla → ei HTML:ää,
       enintään 100 merkkiä. Hylätään (ei siivota hiljaa), jotta lomake voi pyytää korjausta. */
    if (antajaNimi.length > 100 || /[<>]/.test(antajaNimi)) {
      throw new functions.https.HttpsError('invalid-argument', 'antaja_virheellinen', { syy: 'antaja_virheellinen' });
    }
    // Syvyyssuojaus (Sibbo-korjaus): mikä tahansa odottamaton poikkeus → spesifi, lokitettu
    // viesti, ei paljasta "internal":ia vanhemmalle. HttpsError-koodit menevät läpi sellaisenaan.
    try {
    const hEmailNorm = String(hEmail).trim().toLowerCase();

    // 2. Varmenna huoltajan sähköposti Admin SDK:lla pelaajadokumentista
    const pelRef = db.collection('seurat').doc(seuraId)
      .collection('pelaajat').doc(pelaajaId);
    let snap;
    try {
      snap = await pelRef.get();
    } catch (e) {
      throw new functions.https.HttpsError('unavailable',
        'Pelaajan tietojen luku epäonnistui, yritä hetken kuluttua uudelleen.');
    }
    if (!snap.exists) {
      throw new functions.https.HttpsError('not-found', 'Pelaajaa ei löytynyt.');
    }
    const tallennettuEmail = String(snap.get('huoltajaEmail') || '').trim().toLowerCase();
    if (!tallennettuEmail || tallennettuEmail !== hEmailNorm) {
      // Onboarding-integriteetti B1 — väärä-lapsi-yritys (email-ristiriita) → HÄLYTYS. Best-effort ENNEN throwia.
      db.collection('audit').add({
        toiminto: 'suostumus_estetty_email_ristiriita', severity: 'alert',
        pelaajaId, seuraId, yritettyEmail: hEmailNorm,
        aikaleima: admin.firestore.FieldValue.serverTimestamp(),
      }).catch(() => {});
      // syy-koodi lomakkeelle (QR-kortti, 1.10.2026): selkeä ohje, EI tallennettua osoitetta.
      throw new functions.https.HttpsError('permission-denied',
        'Huoltajan sähköposti ei täsmää pelaajan tietoihin.', { syy: 'email_ristiriita' });
    }

    /* 2b. Sisarusbugi (30.9.2026): sähköposti täsmää myös SISARUKSELLE (sama huoltaja). Lomakkeen etunimi ja
       syntymävuosi verrataan tunnisteen osoittamaan pelaajaan ENNEN kirjoituksia (salliva täsmäys,
       functions/suostumus_tarkistus.js). Hylätään vain, jos MOLEMMAT eroavat → ei kirjoituksia, audit (warn,
       ei nimiä), failed-precondition 'pelaaja_ristiriita'. Yksittäinen poikkeama → hyväksytään + lomake_poikkeama. */
    const kohde = suostumusTarkistus.tarkistaSuostumusKohde(snap.data() || {}, { etunimi, syntyma, sukupuoli });
    if (kohde.ristiriita) {
      await db.collection('audit').add({
        toiminto: 'suostumus_estetty_pelaaja_ristiriita', severity: 'warn',
        pelaajaId, seuraId, syyt: kohde.syyt,
        aikaleima: admin.firestore.FieldValue.serverTimestamp(),
      }).catch(() => {});
      throw new functions.https.HttpsError('failed-precondition', 'pelaaja_ristiriita', { syy: 'pelaaja_ristiriita' });
    }

    /* 2c. Avoimet kutsut (1.10.2026): käytetty tai korvattu kutsu EI saa ylikirjoittaa annettua suostumusta.
       - kutsuId annettu ja kutsu löytyy: kutsun on oltava avoin (odottaa/lahetetty/luotu) ja samalle pelaajalle.
       - ei (löytyvää) kutsua = vanha tunnisteeton linkki: hylätään, jos suostumus on jo annettu.
       Uusi kutsu ("Lähetä uudelleen") on avoin → uusi suostumus sallitaan sen kautta. Ei kirjoituksia ennen tätä. */
    const AVOIMET_KUTSUTILAT = ['odottaa', 'lahetetty', 'luotu'];
    const joAnnettu = suostumusAnnettu(snap.data());
    let kutsuRef = null;
    let kutsuTyyppi = null;   // 'qr_kortti' → suostumus.lahde + audit (PR B)
    if (kutsuId) {
      const kr = db.collection('seurat').doc(seuraId).collection('kutsut').doc(String(kutsuId));
      const ks = await kr.get();
      if (ks.exists) {
        kutsuRef = kr;
        const kd = ks.data() || {};
        kutsuTyyppi = kd.tyyppi || null;
        if (kd.pelaajaId && kd.pelaajaId !== pelaajaId) {
          await db.collection('audit').add({ toiminto: 'suostumus_estetty_kutsu_ristiriita', severity: 'warn', pelaajaId, seuraId,
            kutsuId: String(kutsuId), aikaleima: admin.firestore.FieldValue.serverTimestamp() }).catch(() => {});
          throw new functions.https.HttpsError('failed-precondition', 'kutsu_ristiriita', { syy: 'kutsu_ristiriita' });
        }
        if (!AVOIMET_KUTSUTILAT.includes(kd.tila || 'odottaa')) {
          await db.collection('audit').add({ toiminto: 'suostumus_estetty_kutsu_kaytetty', severity: 'warn', pelaajaId, seuraId,
            kutsuId: String(kutsuId), kutsun_tila: String(kd.tila || ''), aikaleima: admin.firestore.FieldValue.serverTimestamp() }).catch(() => {});
          throw new functions.https.HttpsError('failed-precondition', 'kutsu_kaytetty', { syy: 'kutsu_kaytetty' });
        }
      }
    }
    if (!kutsuRef && joAnnettu) {
      await db.collection('audit').add({ toiminto: 'suostumus_estetty_jo_annettu', severity: 'info', pelaajaId, seuraId,
        kutsuId_annettu: !!kutsuId, aikaleima: admin.firestore.FieldValue.serverTimestamp() }).catch(() => {});
      throw new functions.https.HttpsError('failed-precondition', 'suostumus_jo_annettu', { syy: 'suostumus_jo_annettu' });
    }

    // 3. Merkitse suostumus annetuksi + kirjoita ei-arkaluonteiset aux-kentät palvelinpuolella.
    const TS = admin.firestore.FieldValue.serverTimestamp();
    // P1: lomakkeen muut merkkijonot/rakenteet siivotaan (julkinen lomake → näkyy henkilökunnan sivuilla).
    const SUOSTUMUS_AVAIMET = ['rekisteri', 'tietosuoja', 'testaaminen', 'biologinen_ika', 'valmentajajako', 'anon_data'];
    const puhdasTeksti = (v, max) => (v == null || v === '') ? null : String(v).replace(/[<>]/g, '').slice(0, max);
    const pituusNumero = (v) => { const n = typeof v === 'number' ? v : parseFloat(v); return (isFinite(n) && n >= 100 && n <= 250) ? n : null; };
    const puhdasSuostumusMap = (suostumusMap && typeof suostumusMap === 'object' && !Array.isArray(suostumusMap))
      ? SUOSTUMUS_AVAIMET.reduce((o, k) => { if (k in suostumusMap) o[k] = suostumusMap[k] === true; return o; }, {})
      : null;
    const paivitys = {
      suostumusTila:    'annettu',
      suostumusAnnettu: TS,
      tila:             'aktiivinen',
      muokattu:         TS,
    };
    /* Tyhjä = "ei muutosta" (1.10.2026): valinnainen kenttä kirjoitetaan VAIN kun lomakkeella on arvo —
       tyhjä lomakekenttä ei nollaa tallennettua arvoa (sama periaate kuin syntymäajan täytössä). */
    const teksti = puhdasTeksti(suostumusTeksti, 500);
    if (teksti != null) paivitys.suostumusTeksti = teksti;
    if (bioPituudet && typeof bioPituudet === 'object') {
      const isa = pituusNumero(bioPituudet.isa_pituus_cm), aiti = pituusNumero(bioPituudet.aiti_pituus_cm);
      if (isa != null) paivitys.isa_pituus_cm = isa;
      if (aiti != null) paivitys.aiti_pituus_cm = aiti;
      if (isa != null || aiti != null) {
        const pvm = puhdasTeksti(bioPituudet.vanhempi_pituus_pvm, 40);
        if (pvm != null) paivitys.vanhempi_pituus_pvm = pvm;
      }
      // puuttuu-lippu lopputilasta (tallennettu + uusi), ei pelkästä lomakkeesta
      /* PR 1e-2 (S4) dual-read: tallennettu pituus luetaan sisainen/tiedot:ista (sisainen voittaa) kun s4-lippu on päällä; lippu pois → ei lisälukua, pelkkä pelaajadokumentti kuten ennen. */
      const tallennettu = (isa != null && aiti != null) ? {} : (await sisainenLuku.yhdistaYksi(db, seuraId, pelaajaId, snap.data() || {}) || {});
      const isaLopuksi = isa != null ? isa : (tallennettu.isa_pituus_cm != null ? tallennettu.isa_pituus_cm : null);
      const aitiLopuksi = aiti != null ? aiti : (tallennettu.aiti_pituus_cm != null ? tallennettu.aiti_pituus_cm : null);
      paivitys.vanhempi_pituus_puuttuu = (isaLopuksi == null || aitiLopuksi == null);
    }

    // huoltajaEmail — vahvistus että varmennettu osoite tallentuu pelaajaprofiiliin
    paivitys.huoltajaEmail = hEmailNorm;

    /* syntymäaika + sukupuoli (sisarusbugi 30.9.2026): suostumus saa VAIN TÄYTTÄÄ tyhjän kentän — ei koskaan
       ylikirjoittaa olemassa olevaa eri arvolla (muutos tehdään Seura-sivulla henkilökunnan toimesta).
       Date.UTC() (§7 #11), vain validi 1990–2025; sukupuoli P/T → M/N (§7 #12). */
    const tt = kohde.tayttoKentat;
    if (tt.syntymaPaiva) paivitys.syntymaaika = admin.firestore.Timestamp.fromDate(tt.syntymaPaiva);
    if (tt.syntymaVuosi) paivitys.syntymaVuosi = tt.syntymaVuosi;
    if (tt.sukupuoli) paivitys.sukupuoli = tt.sukupuoli;

    // suostumukset — array kaikista hyväksytyistä suostumuksista + täysi suostumus-objekti
    // (sama rakenne kuin uusi-rekisteröinti-haaran .set(), §14: raakadata talteen).
    if (Array.isArray(suostumukset)) paivitys.suostumukset = suostumukset.filter((x) => SUOSTUMUS_AVAIMET.includes(x));
    paivitys.suostumus = {   // B9: korvaa koko olion → suostumus.peruttu poistuu; edelliset annettu/peruttu audit-riville (kirjaaHistoria alla)
      ...(kutsuTyyppi === 'qr_kortti' ? { lahde: 'qr_kortti' } : {}),
      annettu:     TS,
      antaja:      antajaNimi,
      antajaRooli: antajaRooli === 'itse' ? 'itse' : (antajaRooli ? 'huoltaja' : null),
      versio:      '2026-v1',
      hyvaksytyt:  puhdasSuostumusMap,
      aikaleima:   puhdasTeksti(aikaleima, 40),
    };

    // PIN: käytä olemassa olevaa validia (idempotentti; sama logiikka kuin Seura.html luoPelaajaPIN). UUDEN PIN:in generointi (Firestore-kyselyt)
    // siirretty kriittisen update-kirjoituksen JÄLKEEN best-effortiksi (Sibbo-korjaus) — ei-kriittinen
    // PIN-haku ei saa enää kaataa pelaajan aktivointia.
    // PR 4: olemassa oleva 4- tai 6-numeroinen PIN kelpaa sellaisenaan (ei kirjoiteta uudelleen).
    let pin = (snap.get('pin') && /^(\d{4}|\d{6})$/.test(String(snap.get('pin')))) ? String(snap.get('pin')) : null;

    try {
      /* PR 1e-2 (S4): vanhempien pituudet (kypsyys_sisainen) kirjoitetaan myös sisainen/tiedot:iin, kun RYHMAT.s4.kirjoitus on päällä (oletus POIS → täsmälleen kuten ennen).
         YKSI batch: pelaajan update + sisainen set mergeFields (tmS4Lisaa poimii paivitys-oliosta vain S4-kentät: isa_pituus_cm, aiti_pituus_cm, vanhempi_pituus_pvm, vanhempi_pituus_puuttuu).
         Admin SDK ohittaa Rulesin → ei permission-denied-varapolkua; virhe → sama 'internal' kuin ennen (suostumus ei tallennu puoliksi). */
      const kirjBatch = db.batch();
      kirjBatch.update(pelRef, tmSisainen.tmSisainenRiisu(paivitys));   // PR 2d (K8): vanhempien pituudet VAIN sisainen/tiedot:iin
      tmSisainen.tmS4Lisaa(kirjBatch, db, seuraId, pelaajaId, paivitys, {});
      await kirjBatch.commit(); await suostumusPeruminen.kirjaaHistoria(db, admin.firestore.FieldValue, seuraId, pelaajaId, snap.data());
    } catch (e) {
      throw new functions.https.HttpsError('internal',
        `Suostumuksen tallennus epäonnistui: ${e.message}`);
    }

    // PIN-generointi best-effort — pelaaja on jo aktivoitu yllä, tämä ei saa kaataa mitään (Sibbo-korjaus).
    // PR 4: 6-numeroinen PIN samalla apufunktiolla kuin asetaPelaajanPin (hajautus + selväkielinen samassa
    // erässä, lukitukset nollataan). Yksilöllisyyttä seuran sisällä ei enää tarvita (kirjautumisessa aina
    // PalloID tai linkki mukana).
    /* L1c: sopimusseuran passiivinen joukkue → suostumus on jo tallennettu, mutta uutta PIN:iä ei luoda (olemassa oleva säilyy).
       Huoltajan viesti ja Vanhempi-linkki lähtevät normaalisti; pelaajalinkkiä tämä funktio ei lähetä. Tarkistuksen virhe → ei PIN:iä (varovainen). */
    /* 8–9 v -esto (PM päätös 8): alle 10 tai vuosi puuttuu (lomake täyttää yleensä) → ei uutta PIN:iä eikä PIN:iä viestiin; Vanhempi-linkki lähtee. */
    const ikaTila = pelaajapin.ikaTilaNyt(Object.assign({}, snap.data(), paivitys)), ikaEstetty = ikaTila !== 'ok';
    if (ikaEstetty) { pin = null; await pelaajapin.kirjaaIkaEsto(db, admin.firestore.FieldValue, 'suostumus_pin_estetty_ika', { syy: ikaTila, seuraId, pelaajaId }); }
    let laskutusEstetty = ikaEstetty;   // sama "ei uutta PIN:iä" -haara; laskutusta ei tarkisteta turhaan
    if (!pin && !ikaEstetty) {
      try { laskutusEstetty = await laskutusEsto.luoEsto(db).pelaajaEstetty(seuraId, snap.data() || {}); }
      catch (e) { laskutusEstetty = true; console.warn('[vahvistaSuostumus] laskutusesto-tarkistus epäonnistui → ei PIN:iä:', e.message); }
      if (laskutusEstetty) await laskutusEsto.kirjaaEsto(db, admin.firestore.FieldValue, { funktio: 'vahvistaSuostumus', seuraId, pelaajaId, ohitettu: ['pin'] });
    }
    if (!pin && !laskutusEstetty) {
      try {
        const uusi = pelaajapin.generoiPin();
        const b = db.batch();
        pelaajapin.lisaaPinKirjoitukset(db, b, { seuraId, pelaajaId, data: snap.data() || {}, pin: uusi, lahde: 'vahvistaSuostumus', TS });
        await b.commit();
        pin = uusi;
      } catch (e) {
        pin = null;
        console.warn('[vahvistaSuostumus] PIN-generointi epäonnistui (ei-kriittinen):', e.message);
      }
    }

    // 3b. Merkitse kutsu hyväksytyksi ja saman pelaajan MUUT avoimet kutsut korvatuiksi (best-effort —
    //     kutsujen tila ei saa kaataa jo tallennettua suostumusta). Korvattu kutsu ei enää kelpaa (2c).
    if (kutsuRef) {
      try {
        await kutsuRef.update({ tila: 'hyvaksytty', hyvaksyttyPvm: TS, pelaajaId, muokattu: TS });
      } catch (e) {
        console.warn('[vahvistaSuostumus] kutsut-update epäonnistui:', e.message);
      }
    }
    try {
      const muut = await db.collection('seurat').doc(seuraId).collection('kutsut').where('pelaajaId', '==', pelaajaId).get();
      const b = db.batch();
      let n = 0;
      muut.docs.forEach((d) => {
        if (kutsuRef && d.id === kutsuRef.id) return;
        if (!AVOIMET_KUTSUTILAT.includes((d.data() || {}).tila || 'odottaa')) return;
        b.update(d.ref, { tila: 'korvattu', korvattu: TS, korvattu_kutsulla: kutsuRef ? kutsuRef.id : null, muokattu: TS });
        n++;
      });
      if (n) await b.commit();
    } catch (e) {
      console.warn('[vahvistaSuostumus] muiden kutsujen korvaus epäonnistui:', e.message);
    }

    // Onboarding-integriteetti B1 — suostumus annettu (best-effort). Autentikoimaton sivu → uid usein null,
    // siksi kirjataan hEmail jäljitettävyyttä varten (antajan nimeä EI audit-riville, vain antajaNimi_annettu).
    db.collection('audit').add({
      // Sisarusbugi: yksittäinen poikkeama (etunimi TAI vuosi) hyväksytään, mutta kirjataan warn-tasolla,
      // jotta seura voi tarkistaa tiedot jälkikäteen (esim. kaksoset samalla kutsulinkillä).
      toiminto: 'suostumus_annettu', severity: kohde.poikkeama.length ? 'warn' : 'info',
      pelaajaId, seuraId, hEmail: hEmailNorm, antajaNimi_annettu: !!antajaNimi,   // ei nimeä audit-riville
      lomakeEtunimi_tasmasi: kohde.etunimiTasmasi,   // true/false/null (ei nimeä)
      lomake_poikkeama: kohde.poikkeama,             // [] | ['etunimi'] | ['vuosi']
      tekija_uid: (context.auth && context.auth.uid) || null,
      aikaleima: admin.firestore.FieldValue.serverTimestamp(),
      ...(kutsuTyyppi === 'qr_kortti' ? { lahde: 'qr_kortti' } : {}),   // QR-suostumuskortti (PR B)
    }).catch(() => {});

    // 4. + 5. Luo/hae huoltajan Auth-tili ja generoi salasanan asetuslinkki.
    // Suostumus on jo tallennettu — linkin generoinnin epäonnistuminen ei saa
    // hukata sitä (graceful: emailLahetetty:false → sivu ohjaa pyytämään seuralta uuden linkin).
    try {
      const etunimi  = snap.get('etunimi')  || '';
      const sukunimi = snap.get('sukunimi') || '';
      await haeOrLuoHuoltajaAuth(hEmailNorm, etunimi, sukunimi);
      const baseUrl = TM_BASE_URL;
      const continueUrl = `${baseUrl}/TalentMaster_Vanhempi_v2.html` +
        `?pelaajaId=${encodeURIComponent(pelaajaId)}&seuraId=${encodeURIComponent(seuraId)}`;
      const { linkki: passwordResetLink, kutsu: kutsuLinkki } = await huoltajaSalasanaLinkki(seuraId, pelaajaId, hEmailNorm, continueUrl);   // 7 pv:n kutsu (varalla suora 1 h:n linkki)
      // 6. Lähetä salasanalinkki sähköpostiin (best-effort §13). EI kaadeta suostumusta jos lähetys
      //    epäonnistuu — suostumus on jo tallennettu yllä; seura lähettää linkin uudelleen (Seura.html).
      let emailLahetetty = false, emailVirhe = null;
      try {
        const lapsiNimi = String(snap.get('etunimi') || '').trim();
        await lahetaSahkoposti({
          to: hEmailNorm,
          subject: 'Aseta TalentMaster-salasanasi',
          fromName: 'TalentMaster',
          html: pohjaSuostumusLinkki({ lapsiNimi, resetLinkki: passwordResetLink, pin, kutsu: kutsuLinkki, vanhempiLinkki: `${baseUrl}/TalentMaster_Vanhempi_v2.html` }),
        });
        emailLahetetty = true;
        db.collection('audit').add({
          toiminto: 'suostumuslinkki_lahetetty', severity: 'info',
          pelaajaId, seuraId, hEmail: hEmailNorm,
          aikaleima: admin.firestore.FieldValue.serverTimestamp(),
        }).catch(() => {});
      } catch (mailErr) {
        emailVirhe = String((mailErr && mailErr.message) || mailErr || 'tuntematon');
        console.warn('[vahvistaSuostumus] Salasanalinkki-email epäonnistui:', emailVirhe);
        db.collection('audit').add({
          toiminto: 'suostumuslinkki_epaonnistui', severity: 'warn',
          pelaajaId, seuraId, hEmail: hEmailNorm, virhe: emailVirhe.slice(0, 200),
          aikaleima: admin.firestore.FieldValue.serverTimestamp(),
        }).catch(() => {});
      }
      /* Vaihe 0 / PR 3b: salasanalinkkiä ja PIN:iä EI palauteta kutsujalle. Funktio toimii ilman
         kirjautumista, ja seuraId + pelaajaId + huoltajaEmail olivat anonyymisti luettavissa v3.28:aan
         asti → vastauksesta sai huoltajan tilin ja lapsen PIN:in. Nyt ne menevät VAIN tallennettuun
         huoltajaEmailiin (tarkistettu yllä). Epäonnistunut lähetys → seura lähettää uudelleen. */
      return { ok: true, emailLahetetty, emailVirhe, linkkiPv: kutsuLinkki ? 7 : 0 };   // linkkiPv: 7 = oma kutsulinkki, 0 = varalinkki (1 h)
    } catch (e) {
      console.warn('[vahvistaSuostumus] Reset-linkki epäonnistui:', e.message);
      return { ok: true, emailLahetetty: false, linkkiVirhe: e.message };
    }
    } catch (_wrapErr) {
      if (_wrapErr instanceof functions.https.HttpsError) throw _wrapErr;
      console.error('[vahvistaSuostumus] odottamaton virhe:', _wrapErr);
      throw new functions.https.HttpsError('internal',
        'Palvelinvirhe: ' + ((_wrapErr && _wrapErr.message) || _wrapErr));
    }
  });
