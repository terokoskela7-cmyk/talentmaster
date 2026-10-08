'use strict';
/**
 * Huoltajan sähköpostin vahvistus (B4-jatko; docs: tämä tiedosto). Taustaa: haePelaajanKalenteri / kirjaaHuoltajaKaynti / Rules v3.55 vaativat email_verified == true.
 * Huoltajatili syntyy haeOrLuoHuoltajaAuth:ssa (emailVerified:false, väliaikainen salasana) ja osoite vahvistuu VASTA kun huoltaja avaa salasanan asetuslinkin (Firebase merkitsee
 * osoitteen vahvistetuksi, kun salasana asetetaan linkillä) — linkki vanhenee 1 tunnissa, joten käyttämättä jäänyt/vanhentunut linkki jättää tilin vahvistamatta ja ilman salasanaa.
 *
 *  1) lahetaVahvistuslinkkiItselle({})  — kirjautunut huoltaja, jonka osoite on vahvistamatta, pyytää uuden linkin (Vanhempi_v2 "Lähetä linkki uudelleen"). Oikeus: tokenin email on jonkin
 *     pelaajan huoltajaEmail (ei muiden osoitteisiin; linkki menee AINA tokenin osoitteeseen). Cooldown 5 min / tili (Firestore huoltajavahvistus/{uid}; vain Admin SDK).
 *     Linkki: salasana-asetus jos tili ei ole koskaan kirjautunut (asettaminen vahvistaa), muuten pelkkä vahvistuslinkki.
 *  2) lahetaHuoltajienVahvistuslinkit({ kuiva })  — VAIN super-admin. KUIVA-AJO on oletus (kuiva !== false): palauttaa vain lukumäärät (seuroittain + linkkityypit), ei lähetä mitään.
 *     Lähetys vain kun kuiva === false (Tero ajaa). Kohteet: vahvistamattomat huoltajatilit (osoite on pelaajan huoltajaEmail, ei henkilökunnan claimeja, ei estetty, ei paikkamerkkiosoite).
 *     Ei nimiä/osoitteita/uid:itä vastauksessa eikä lokissa; auditiin vain lukumäärät.
 */
const { tunnisteTyyppi } = require('./authz_paatos');

const COOLDOWN_MS = 5 * 60 * 1000;
const MAKS_LAHETYS = 300;

/* Puhdas valinta (testattu): users = Auth-käyttäjät (admin-muoto), huoltajaSeurat = Map(email pienillä → Set(seuraId)), ohita(email) → true jos paikkamerkki.
   Palauttaa [{ uid, email, tyyppi: 'salasana'|'vahvistus', seurat:[…] }] — 'salasana' = ei koskaan kirjautunut (asettaminen vahvistaa samalla), 'vahvistus' = on kirjautunut. */
function valitseKohteet(users, huoltajaSeurat, ohita) {
  const ulos = [];
  for (const u of users || []) {
    if (!u || !u.email || u.emailVerified === true || u.disabled === true) continue;
    const e = String(u.email).toLowerCase().trim();
    if (!huoltajaSeurat.has(e)) continue;
    const claims = u.customClaims || {};
    if (claims.rooli || claims.seuraId || claims.pelaajaId) continue;   // henkilökunta / pelaajatoken-tili
    if (ohita && ohita(e)) continue;
    const kirjautunut = !!(u.metadata && u.metadata.lastSignInTime);
    ulos.push({ uid: u.uid, email: e, tyyppi: kirjautunut ? 'vahvistus' : 'salasana', seurat: [...huoltajaSeurat.get(e)] });
  }
  return ulos;
}
function yhteenveto(kohteet) {
  const seuroittain = {}; let salasana = 0, vahvistus = 0;
  for (const k of kohteet) { if (k.tyyppi === 'salasana') salasana++; else vahvistus++; for (const s of k.seurat) seuroittain[s] = (seuroittain[s] || 0) + 1; }
  return { yhteensa: kohteet.length, salasanalinkki: salasana, vahvistuslinkki: vahvistus, seuroittain };
}

async function huoltajaSeurat(db) {
  const snap = await db.collectionGroup('pelaajat').get();
  const m = new Map();
  snap.forEach((d) => {
    const sr = d.ref.parent && d.ref.parent.parent; if (!sr || !sr.parent || sr.parent.id !== 'seurat') return;
    const e = (d.data() || {}).huoltajaEmail; if (typeof e !== 'string' || !e.trim()) return;
    const k = e.toLowerCase().trim(); if (!m.has(k)) m.set(k, new Set()); m.get(k).add(sr.id);
  });
  return m;
}
async function kaikkiKayttajat(auth) {
  const ulos = []; let sivu;
  do { const r = await auth.listUsers(1000, sivu); r.users.forEach((u) => ulos.push(u)); sivu = r.pageToken; } while (sivu);
  return ulos;
}
async function luoLinkki(auth, tyyppi, email, url) {
  return tyyppi === 'salasana' ? auth.generatePasswordResetLink(email, { url, handleCodeInApp: false }) : auth.generateEmailVerificationLink(email, { url, handleCodeInApp: false });
}
const OTSIKKO = { salasana: 'Aseta TalentMaster-salasanasi', vahvistus: 'Vahvista sähköpostiosoitteesi TalentMasterissa' };

function luoItselle(deps) {
  const { db, auth, HttpsError, lahetaSahkoposti, pohja, vanhempiUrl } = deps;
  const nytF = deps.nyt || (() => Date.now());
  return async function lahetaVahvistuslinkkiItselle(data, context) {
    if (!context || !context.auth) throw new HttpsError('unauthenticated', 'Kirjautuminen vaaditaan.');
    const tk = context.auth.token || {};
    if (tunnisteTyyppi(context.auth) !== 'kayttaja' || typeof tk.email !== 'string' || !tk.email) throw new HttpsError('permission-denied', 'Ei oikeutta.');
    const email = tk.email.toLowerCase().trim(), uid = context.auth.uid;
    const user = await auth.getUser(uid);
    if (user.emailVerified === true) return { tila: 'jo_vahvistettu' };   // tokenin email_verified voi olla vanha — Auth on totuus
    const sn = await db.collectionGroup('pelaajat').where('huoltajaEmail', '==', email).limit(1).get();
    if (!sn || sn.empty) throw new HttpsError('permission-denied', 'Ei huoltajan oikeutta.');
    const cd = db.collection('huoltajavahvistus').doc(uid), nyt = nytF();
    const cds = await cd.get();
    const viimeksi = cds && cds.exists ? Number((cds.data() || {}).viimeisin) || 0 : 0;
    if (nyt - viimeksi < COOLDOWN_MS) return { tila: 'odota', sekuntia: Math.ceil((COOLDOWN_MS - (nyt - viimeksi)) / 1000) };
    const tyyppi = (user.metadata && user.metadata.lastSignInTime) ? 'vahvistus' : 'salasana';
    const linkki = await luoLinkki(auth, tyyppi, email, vanhempiUrl);
    await lahetaSahkoposti({ to: email, subject: OTSIKKO[tyyppi], fromName: 'TalentMaster', html: pohja({ tyyppi, linkki, vanhempiLinkki: vanhempiUrl }) });
    await cd.set({ viimeisin: nyt });
    return { tila: 'lahetetty' };
  };
}

function luoMassa(deps) {
  const { db, auth, HttpsError, lahetaSahkoposti, pohja, vanhempiUrl, onSuperAdminUid, onPaikkamerkki } = deps;
  const audit = deps.audit || (async () => {});
  return async function lahetaHuoltajienVahvistuslinkit(data, context) {
    if (!context || !context.auth) throw new HttpsError('unauthenticated', 'Kirjautuminen vaaditaan.');
    if (!(await onSuperAdminUid(context.auth.uid))) throw new HttpsError('permission-denied', 'Vain super-admin.');
    const kuiva = !(data && data.kuiva === false);   // KUIVA-AJO on oletus
    const kohteet = valitseKohteet(await kaikkiKayttajat(auth), await huoltajaSeurat(db), onPaikkamerkki);
    const y = yhteenveto(kohteet);
    if (kuiva) return Object.assign({ kuiva: true }, y);
    if (kohteet.length > MAKS_LAHETYS) throw new HttpsError('failed-precondition', 'Liian monta kohdetta (' + kohteet.length + ' > ' + MAKS_LAHETYS + ').');
    let lahetetty = 0, epaonnistui = 0;
    for (const k of kohteet) {
      try {
        const linkki = await luoLinkki(auth, k.tyyppi, k.email, vanhempiUrl);
        await lahetaSahkoposti({ to: k.email, subject: OTSIKKO[k.tyyppi], fromName: 'TalentMaster', html: pohja({ tyyppi: k.tyyppi, linkki, vanhempiLinkki: vanhempiUrl }) });
        lahetetty++;
      } catch (e) { epaonnistui++; console.warn('[huoltajan vahvistus] lähetys epäonnistui:', e && e.code ? e.code : 'virhe'); }   // ei osoitetta lokiin
    }
    await audit({ toiminto: 'huoltajien_vahvistuslinkit_lahetetty', severity: 'info', kohteita: kohteet.length, lahetetty, epaonnistui, salasanalinkki: y.salasanalinkki, vahvistuslinkki: y.vahvistuslinkki });
    return { kuiva: false, kohteita: kohteet.length, lahetetty, epaonnistui, salasanalinkki: y.salasanalinkki, vahvistuslinkki: y.vahvistuslinkki, seuroittain: y.seuroittain };
  };
}

module.exports = { valitseKohteet, yhteenveto, luoItselle, luoMassa, COOLDOWN_MS, MAKS_LAHETYS };
