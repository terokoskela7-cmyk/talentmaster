/* ════════════════════════════════════════════════════════════════════════
   suostumuskortit.js — QR-suostumuskortti (PR B, 1.10.2026)

   Joukkueenjohtaja tulostaa joukkueelle kortit kerralla. Pelaaja, jolta suostumus puuttuu, saa
   suostumuskortin, jonka QR vie suostumuslomakkeeseen. Kutsu luodaan TÄÄLLÄ (selain ei kirjoita
   kutsut-kokoelmaan), ja QR-linkissä on VAIN kutsuId + seuraId + pelaajaId — ei nimiä, sähköpostia
   eikä PalloID:tä. Huoltaja kirjoittaa sähköpostinsa itse → vahvistaSuostumuksen sähköpostitarkistus
   (tallennettu === annettu) suojaa (esitäytetty sähköposti QR:ssä tekisi siitä tyhjän).

   Pelaajittain palautetaan:
     · 'pelaajakortti'   — suostumus annettu (kortti kuten ennen: PalloID, PIN, QR omaan linkkiin)
     · 'suostumuskortti' — suostumus puuttuu, huoltajaEmail on → kutsuId (avoin kutsu uudelleenkäytetään)
     · 'ei_emailia'      — suostumus puuttuu eikä huoltajaEmailia → ei korttia (tarkistus ei voisi onnistua)
   Uusintatulostus käyttää samaa avointa kutsua → juuri jaettu kortti ei mitätöidy.
   Oikeus: johto/SA koko seura, joukkueen valmentaja oma joukkue (sama kuin PIN-funktioissa).
════════════════════════════════════════════════════════════════════════ */
'use strict';
const P = require('./pelaajapin');
const K = require('./pelaajakirjautuminen');
const { suostumusAnnettu } = require('./suostumus');

const AVOIMET_KUTSUTILAT = ['odottaa', 'lahetetty', 'luotu'];   // sama kuin vahvistaSuostumus
const MAKS_PELAAJAT = 300;

function luoKasittelija(deps) {
  const { db, tarkistaOikeus, HttpsError, FieldValue } = deps;
  const audit = deps.audit || (async () => {});
  return async function luoSuostumusKortit(data, context) {
    if (!context || !context.auth) throw new HttpsError('unauthenticated', 'Kirjaudu ensin.');
    const seuraId = K.normalisoiDocId(data && data.seuraId);
    const idt = Array.isArray(data && data.pelaajaIds) ? data.pelaajaIds.map(K.normalisoiDocId).filter(Boolean) : [];
    if (!seuraId || !idt.length) throw new HttpsError('invalid-argument', 'seuraId ja pelaajaIds ovat pakollisia.');
    if (idt.length > MAKS_PELAAJAT) throw new HttpsError('invalid-argument', 'Enintään ' + MAKS_PELAAJAT + ' pelaajaa kerralla.');
    const oikeus = await P.pinOikeus(db, tarkistaOikeus, context, seuraId);
    if (!oikeus) throw new HttpsError('permission-denied', 'Ei oikeutta tämän seuran pelaajiin.');

    const seura = db.collection('seurat').doc(seuraId);
    const TS = FieldValue.serverTimestamp();
    const tulos = [];
    let luotu = 0, uudelleen = 0;
    for (const pid of Array.from(new Set(idt))) {
      const ps = await seura.collection('pelaajat').doc(pid).get();
      if (!ps.exists) { tulos.push({ pelaajaId: pid, tyyppi: 'ei_loydy' }); continue; }
      const pd = ps.data() || {};
      if (!P.saaPelaajalle(oikeus, pd)) { tulos.push({ pelaajaId: pid, tyyppi: 'ei_oikeutta' }); continue; }
      if (suostumusAnnettu(pd)) { tulos.push({ pelaajaId: pid, tyyppi: 'pelaajakortti' }); continue; }
      if (!String(pd.huoltajaEmail || '').trim()) { tulos.push({ pelaajaId: pid, tyyppi: 'ei_emailia' }); continue; }

      // Avoin kutsu uudelleen (ei composite-indeksiä: pelaajaId-ehto + tila suodatetaan tässä).
      const ks = await seura.collection('kutsut').where('pelaajaId', '==', pid).get();
      const avoin = ks.docs.find((d) => AVOIMET_KUTSUTILAT.indexOf((d.data() || {}).tila || 'odottaa') >= 0);
      let kutsuId;
      if (avoin) { kutsuId = avoin.id; uudelleen++; }
      else {
        const ref = await seura.collection('kutsut').add({
          tyyppi: 'qr_kortti', tila: 'luotu', pelaajaId: pid,
          luotu: TS, luoja_uid: context.auth.uid,
        });
        kutsuId = ref.id; luotu++;
        // Tila "Kutsu lähetetty" listoille (pilotti/puuttuva → odottaa). Annettua ei koskaan alenneta (yllä).
        if (pd.suostumusTila !== 'odottaa') await seura.collection('pelaajat').doc(pid).update({ suostumusTila: 'odottaa', muokattu: TS });
      }
      tulos.push({ pelaajaId: pid, tyyppi: 'suostumuskortti', kutsuId });
    }
    await audit('suostumuskortit_luotu', { seuraId, pelaajia: tulos.length, kutsuja_luotu: luotu, kutsuja_uudelleen: uudelleen,
      tekija_uid: context.auth.uid, severity: 'info' });
    return { ok: true, kortit: tulos, luotu, uudelleen };
  };
}

module.exports = { luoKasittelija, AVOIMET_KUTSUTILAT, MAKS_PELAAJAT };
