#!/usr/bin/env node
/* diag_palaute_notif.js — KUIVA, VAIN LUKU. Syntyikö notifPalauteJaettu-notif jaetusta palautteesta?
 *
 * Ajo (ADC): node scripts/diag_palaute_notif.js --seura=kpv --etunimi=Miko --sukunimi=Tornikoski \
 *              --alku=2026-10-02T11:00:00Z --loppu=2026-10-02T12:00:00Z
 *
 * 1) Etsii vastaanottajan kayttajat-doc:n nimellä → tulostaa vain uid:n 4 ensimmäistä merkkiä.
 * 2) Listaa vastaanottajan palaute-notifit aikaikkunassa (luotu).
 * 3) Käy seuran harjoitusarvioinnit läpi ja listaa aikaikkunan palaute_jaettu-dokumentit:
 *    onko arvioinnin valmentajaUid == vastaanottaja, oliko antaja sama (ohitussääntö), syntyikö notif (aid-linkki).
 * Tulostaa EI nimiä/sähköposteja/tekstejä — vain uid-etuliitteet (4 merkkiä), aid:t, aikaleimat, boolet.
 */
const path = require('path');
const admin = require(path.join(__dirname, '..', 'functions', 'node_modules', 'firebase-admin'));
const argv = process.argv.slice(2);
const arg = (n, d) => { const o = argv.find((a) => a.indexOf('--' + n + '=') === 0); return o ? o.split('=').slice(1).join('=') : d; };
const SEURA = arg('seura', 'kpv'), ETU = arg('etunimi', 'Miko'), SUKU = arg('sukunimi', 'Tornikoski');
const ALKU = Date.parse(arg('alku', '2026-10-02T11:00:00Z')), LOPPU = Date.parse(arg('loppu', '2026-10-02T12:00:00Z'));
const u4 = (u) => (u ? String(u).slice(0, 4) : '—');
const ms = (t) => (t && t.toDate ? t.toDate().getTime() : Date.parse(t));
const ikkunassa = (t) => { const m = ms(t); return m >= ALKU && m <= LOPPU; };

(async () => {
  admin.initializeApp({ projectId: 'talentmaster-pilot' });
  const db = admin.firestore();
  const kayt = db.collection('seurat').doc(SEURA).collection('kayttajat');
  const ks = await kayt.where('etunimi', '==', ETU).get();
  const miko = ks.docs.filter((d) => String(d.data().sukunimi || '').toLowerCase() === SUKU.toLowerCase());
  console.log('vastaanottaja-osumia:', miko.length, miko.map((d) => u4(d.id)));
  if (!miko.length) return;
  const uid = miko[0].id;
  const ns = await kayt.doc(uid).collection('notifikaatiot').where('tyyppi', '==', 'palaute').get();
  const ikk = ns.docs.filter((d) => ikkunassa(d.data().luotu));
  console.log('palaute-notifit yhteensä:', ns.size, '| aikaikkunassa:', ikk.length);
  ikk.forEach((d) => console.log('  notif', d.id.slice(0, 6), 'luotu', new Date(ms(d.data().luotu)).toISOString(), 'aid', d.data().linkki && d.data().linkki.aid));
  const notifAid = new Set(ns.docs.map((d) => d.data().linkki && d.data().linkki.aid));
  const arvs = await db.collection('seurat').doc(SEURA).collection('harjoitusarvioinnit').limit(500).get();
  let loytyi = 0;
  for (const a of arvs.docs) {
    const ps = await a.ref.collection('palaute_jaettu').get();
    for (const p of ps.docs) {
      const pd = p.data();
      if (!ikkunassa(pd.pvm)) continue;
      loytyi++;
      const v = a.data().valmentajaUid;
      console.log('palaute_jaettu aid', a.id.slice(0, 6), 'pvm', pd.pvm, '| arvioinnin valmentajaUid', u4(v), v === uid ? '(= vastaanottaja)' : '(EI vastaanottaja)',
        '| antaja', u4(pd.tekija_uid), pd.tekija_uid === v ? '(OMA → ohitus, ei notifia oikein)' : '', '| ääni', !!pd.audio_url, '| notif aidilla', notifAid.has(a.id));
    }
  }
  console.log('aikaikkunan palaute_jaettu-dokumentteja:', loytyi);
  console.log('Loki: gcloud logging read \'resource.type="cloud_function" resource.labels.function_name="notifPalauteJaettu" timestamp>="' + new Date(ALKU).toISOString() + '"\' --project=talentmaster-pilot --limit=20 --format="value(timestamp,severity,textPayload)"');
})().catch((e) => { console.error('VIRHE:', e.message); process.exit(1); });
