'use strict';
/* ════════════════════════════════════════════════════════════════════════
   B9 · Suostumuksen peruminen (GDPR art. 7(3)) — callable peruSuostumus({ seuraId, pelaajaId }). PM 3.11.2026 (.briefit/SUOSTUMUS_PERUMINEN_B9_VAIHE0.md).
   Oikeus (päätös 1): varmennettu huoltaja (huoltaja_tunnistus.js: email_verified + huoltajaEmail) TAI johto/SA (tarkistaOikeus). Valmentaja ei.
   Laajuus (2): koko suostumus. Todiste (3): suostumus.annettu SÄILYY; lisätään suostumus.peruttu { aika, rooli, uid } ja tila 'peruttu'
   (lib/tm_suostumus.js: peruttu voittaa). Uudelleensuostuminen: vahvistaSuostumus korvaa suostumus-olion → kirjaaHistoria() audit-riville.
   Vaikutukset:
     · selväkielinen PIN (pin, pin_asetettu) pois; tiiviste _pelaajaPin JÄÄ → kirjautuminen hylätään syyllä suostumus_peruttu eikä "väärä PIN" (päätös 7);
       uusi suostumus luo uuden PIN:n (vanhaa selväkielistä ei ole), jolloin vanha tiiviste korvautuu.
     · pelaajan istunnot mitätöidään (revokeRefreshTokens 'pel_' + sid + '_' + pid).
     · avoimet kutsut (seurat/{sid}/kutsut) → 'korvattu', huoltajakutsut (salasanalinkit) vanhennetaan.
     · audit 'suostumus_peruttu' (ei nimiä) + kuittaus huoltajalle seuran kielellä (fi/sv; päätös 6). Seuralle ei sähköpostia.
   Data ei poistu (päätös 4: olemassa oleva data näkyy henkilökunnalle, pelaaja merkitään "Peruttu"). Poisto = erillinen pyyntö (poistaPelaajaGDPR).
   Idempotentti: jo peruttu → { ok, jo: true } ilman uusia kirjoituksia.
════════════════════════════════════════════════════════════════════════ */
const { huoltajaSyy } = require('./huoltaja_tunnistus');
const { suostumusAnnettu, suostumusPeruttu } = require('./suostumus');
const { esc } = require('./sahkoposti_turva');
const K = require('./pelaajakirjautuminen');

const AVOIMET_KUTSUTILAT = ['odottaa', 'lahetetty', 'luotu'];   // sama kuin vahvistaSuostumus
/* Kuittausviesti (päätös 6). sv: sv-erä 94 (PM kirjoitti 4.11.2026, vienti scripts/i18n_vie_sv_era94.cjs). Tyhjä sv-rivi → koko viesti suomeksi (ei puolikasta käännöstä). */
const TEKSTIT = {
  fi: {
    otsikko: 'Suostumus peruttu – {lapsi}',
    tervehdys: 'Hei,',
    vahvistus: 'Suostumus pelaajan {lapsi} tietojen käsittelyyn TalentMasterissa ({seura}) on peruttu. Peruminen on voimassa heti: pelaaja ei voi enää kirjautua sovellukseen, eikä uutta tietoa kerry.',
    aiempi: 'Ennen perumista tallennetut tiedot säilyvät seuralla. Peruminen ei vaikuta aiemman käsittelyn lainmukaisuuteen.',
    uudelleen: 'Jos haluat antaa suostumuksen uudelleen, pyydä seuralta uusi kutsu.',
    poisto: 'Jos haluat, että lapsen tiedot poistetaan, pyydä tietojen poistoa seuralta.',
    alaviite: 'Tämä on automaattinen kuittaus. Et tunnista perumista? Ota yhteyttä seuraan.',
  },
  sv: {   // sv-erä 94 (PM 4.11.2026; docs/i18n/sv_kaannoserae_94_palautus.json; vienti scripts/i18n_vie_sv_era94.cjs)
    otsikko: 'Samtycke återkallat – {lapsi}',
    tervehdys: 'Hej,',
    vahvistus: 'Samtycket till behandling av uppgifter om spelaren {lapsi} i TalentMaster ({seura}) har återkallats. Återkallelsen gäller omedelbart: spelaren kan inte längre logga in i appen och inga nya uppgifter samlas in.',
    aiempi: 'Uppgifter som sparats före återkallelsen finns kvar hos föreningen. Återkallelsen påverkar inte lagligheten av den tidigare behandlingen.',
    uudelleen: 'Om du vill ge samtycke på nytt, be föreningen om en ny inbjudan.',
    poisto: 'Om du vill att barnets uppgifter raderas, be föreningen om radering.',
    alaviite: 'Detta är en automatisk bekräftelse. Känner du inte igen återkallelsen? Kontakta föreningen.',
  },
};
function _t(s, v) { return String(s).replace(/\{(\w+)\}/g, (m, k) => (v[k] != null ? v[k] : m)); }
function pohjaSuostumusPeruttu({ kieli, seuraNimi, lapsiNimi }) {
  const sv = TEKSTIT.sv, svValmis = Object.keys(TEKSTIT.fi).every((k) => typeof sv[k] === 'string' && sv[k].trim() !== '');
  const T = kieli === 'sv' && svValmis ? sv : TEKSTIT.fi, v = { lapsi: esc(lapsiNimi || ''), seura: esc(seuraNimi || '') };
  const p = (x) => '<p style="font-size:14px;color:#333;line-height:1.6">' + _t(x, v) + '</p>';
  const html = '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">'
    + '<div style="background:#111110;padding:24px;border-radius:12px;margin-bottom:24px;"><h1 style="color:#28B090;margin:0;font-size:22px;">TalentMaster™</h1>'
    + '<p style="color:#aaa;margin:4px 0 0;font-size:13px;">' + v.seura + '</p></div>'
    + p(T.tervehdys) + p(T.vahvistus) + p(T.aiempi) + p(T.uudelleen) + p(T.poisto)
    + '<p style="font-size:12px;color:#666">' + _t(T.alaviite, v) + '</p></div>';
  return { subject: _t(T.otsikko, { lapsi: String(lapsiNimi || '').replace(/[\r\n]/g, ' ') }), html, kieli: T === sv ? 'sv' : 'fi' };
}

function luoKasittelija(deps) {
  const { db, auth, tarkistaOikeus, HttpsError, FieldValue, lahetaSahkoposti } = deps;
  const audit = deps.audit || (async () => {});
  return async function peruSuostumus(data, context) {
    if (!context || !context.auth) throw new HttpsError('unauthenticated', 'Kirjaudu ensin.');
    const tk = context.auth.token || {};
    if (tk.firebase && tk.firebase.sign_in_provider === 'anonymous') throw new HttpsError('permission-denied', 'Ei oikeutta.');
    const seuraId = K.normalisoiDocId(data && data.seuraId), pelaajaId = K.normalisoiDocId(data && data.pelaajaId);
    if (!seuraId || !pelaajaId) throw new HttpsError('invalid-argument', 'seuraId ja pelaajaId ovat pakollisia.');
    const seuraRef = db.collection('seurat').doc(seuraId), pelRef = seuraRef.collection('pelaajat').doc(pelaajaId);
    const snap = await pelRef.get();
    if (!snap.exists) throw new HttpsError('not-found', 'Pelaajaa ei löytynyt.');
    const pd = snap.data() || {};
    let rooli = null;
    const ok = await tarkistaOikeus(context.auth.uid, seuraId, tk);
    if (ok && ok.sallittu) rooli = ok.rooli === 'superadmin' ? 'super_admin' : 'johto';
    else if (!huoltajaSyy(tk, pd)) rooli = 'huoltaja';
    if (!rooli) {
      await audit('suostumus_peruminen_estetty', { seuraId, pelaajaId, tekija_uid: context.auth.uid, syy: huoltajaSyy(tk, pd) || 'ei_oikeutta', severity: 'warn' });
      throw new HttpsError('permission-denied', 'Ei oikeutta perua tämän pelaajan suostumusta.', { syy: huoltajaSyy(tk, pd) || 'ei_oikeutta' });
    }
    if (suostumusPeruttu(pd)) return { ok: true, jo: true };
    if (!suostumusAnnettu(pd)) throw new HttpsError('failed-precondition', 'Suostumusta ei ole annettu – perumista ei tarvita.', { syy: 'ei_annettu' });

    const TS = FieldValue.serverTimestamp();
    const batch = db.batch();
    batch.update(pelRef, { suostumusTila: 'peruttu', 'suostumus.peruttu': { aika: TS, rooli, uid: context.auth.uid }, pin: FieldValue.delete(), pin_asetettu: FieldValue.delete(), muokattu: TS });
    const kutsut = await seuraRef.collection('kutsut').where('pelaajaId', '==', pelaajaId).get();
    let kutsujaSuljettu = 0;
    kutsut.docs.forEach((d) => { if (AVOIMET_KUTSUTILAT.includes((d.data() || {}).tila || 'odottaa')) { batch.update(d.ref, { tila: 'korvattu', suljettuSyy: 'suostumus_peruttu', muokattu: TS }); kutsujaSuljettu++; } });
    const hk = await db.collection('huoltajakutsut').where('pelaajaId', '==', pelaajaId).get();
    hk.docs.forEach((d) => { if ((d.data() || {}).seuraId === seuraId) batch.update(d.ref, { vanhenee: 0, mitatoity: 'suostumus_peruttu' }); });
    await batch.commit();
    let istunto = false;
    try { await auth.revokeRefreshTokens(K.pelaajaUid(seuraId, pelaajaId)); istunto = true; } catch (e) { if (!e || e.code !== 'auth/user-not-found') console.warn('[peruSuostumus] istunnon mitätöinti:', e && e.message); }
    await audit('suostumus_peruttu', { seuraId, pelaajaId, rooli, tekija_uid: context.auth.uid, kutsuja_suljettu: kutsujaSuljettu, istunto_mitatoity: istunto, severity: 'info' });

    let emailLahetetty = false;
    const to = typeof pd.huoltajaEmail === 'string' ? pd.huoltajaEmail.trim() : '';
    if (to && lahetaSahkoposti) {
      try {
        const s = await seuraRef.get(), sd = (s && s.exists && s.data()) || {};
        const viesti = pohjaSuostumusPeruttu({ kieli: sd.kieli, seuraNimi: sd.nimi || '', lapsiNimi: pd.etunimi || '' });
        await lahetaSahkoposti({ to, subject: viesti.subject, html: viesti.html, fromName: String(sd.nimi || 'TalentMaster').replace(/[\r\n]/g, ' ') });
        emailLahetetty = true;
      } catch (e) { console.warn('[peruSuostumus] kuittausviesti:', e && e.message); }
    }
    return { ok: true, jo: false, emailLahetetty };
  };
}

/* vahvistaSuostumus kutsuu ennen suostumus-olion korvaamista: edelliset annettu/peruttu audit-riville (päätös 3; ei kasvavaa taulukkoa dokumenttiin). */
function kirjaaHistoria(db, FieldValue, seuraId, pelaajaId, pd) {
  const s = (pd && pd.suostumus) || {};
  if (!suostumusPeruttu(pd)) return Promise.resolve(false);
  return db.collection('audit').add({ toiminto: 'suostumus_historia', severity: 'info', seuraId, pelaajaId, edellinen_annettu: s.annettu || null, edellinen_peruttu: s.peruttu || null,
    edellinen_versio: s.versio || null, aikaleima: FieldValue.serverTimestamp() }).then(() => true).catch(() => false);
}

module.exports = { luoKasittelija, kirjaaHistoria, pohjaSuostumusPeruttu, TEKSTIT, AVOIMET_KUTSUTILAT };
