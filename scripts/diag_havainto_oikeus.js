#!/usr/bin/env node
/* diag_havainto_oikeus.js — KUIVA, VAIN LUKU.
 *
 * Miksi: ADAR-pikakortin tallennus voi epäonnistua, vaikka pelaaja näkyy poimimessa. Syy on
 * yleensä se, että KLIENTTI päättelee roolin eri lähteestä kuin RULES lukee sen:
 *   · Rules lukee roolin TOKENIN claimista (request.auth.token.rooli)
 *   · Master päätteli sen Firestore-dokumentista (kayttajat/{uid}.rooli), joka meni claimin edelle
 * Jos dokumentissa lukee 'vp' mutta claimissa 'valmentaja', poimin näyttää koko seuran, mutta
 * Rules hylkää kirjoituksen joukkuerajauksen takia.
 *
 * Toinen mahdollinen syy: käyttäjän `joukkueet`-lista tai pelaajan `joukkueet` on tyhjä tai
 * sisältää eri id:t (joukkuejäsenyyden siivous ajamatta), jolloin leikkaus on tyhjä.
 *
 * Skripti EI kirjoita mitään eikä sillä ole --kirjoita-lippua.
 *
 * Ajo:
 *   node scripts/diag_havainto_oikeus.js --seura=sibbovargarna --email=joakim@... --pelaaja=<docId>
 *   (pelaajan voi antaa myös nimellä: --pelaaja-nimi="Aamos Koskenmäki")
 *
 * Vaatii GOOGLE_APPLICATION_CREDENTIALS-ympäristömuuttujan (Admin SDK).
 */
if (require.main !== module) throw new Error('scripts/diag_havainto_oikeus.js käsittelee tuotantodataa — aja suoraan: node scripts/diag_havainto_oikeus.js (ei require/import)');   // vahinkoajon esto (S1)

const admin = require('firebase-admin');

const argv = process.argv.slice(2);
const arg = (nimi) => {
  const o = argv.find((a) => a.indexOf('--' + nimi + '=') === 0);
  return o ? o.split('=').slice(1).join('=') : null;
};
const SEURA = arg('seura');
const EMAIL = arg('email');
const PELAAJA = arg('pelaaja');
const PELAAJA_NIMI = arg('pelaaja-nimi');

/* SAMA LOGIIKKA KUIN SÄÄNNÖSSÄ (firestore.rules onOmanJoukkueenValmentaja):
   oman seuran valmentaja JA (johtorooli TAI talenttivalmentaja TAI joukkueet leikkaavat).
   Tämä on tietoinen kaksinnus: skripti ei voi ajaa Rulesia, joten se kertoo mihin haaraan
   päätös kaatuu. Jos sääntö muuttuu, päivitä tämä samalla. */
/* Listat PEILAAVAT sääntöjä 1:1 (tm_admin/firestore.rules). HUOM erot, jotka on helppo saada
   väärin: seurasihteeri on johtorooli MUTTA EI valmentajarooli → se ei läpäise
   onOmanSeuranValmentaja-ehtoa lainkaan. fysioterapeutti ja testivastaava eivät ole
   valmentajaroolissa (poistettu 2026-06-05). */
const RULES_JOHTOROOLIT = ['vp', 'urheilutoimenjohtaja', 'seurasihteeri'];
const RULES_VALMENTAJAROOLIT = ['valmentaja', 'talenttivalmentaja', 'fysiikkavalmentaja',
  'vp', 'urheilutoimenjohtaja'];

function onOmanJoukkueenValmentaja(rooli, seuraIdClaim, seura, kayttajanJoukkueet, pelaajanJoukkueet) {
  const omaSeura = seuraIdClaim === seura;
  if (!omaSeura) return { tulos: false, haara: 'claim.seuraId ei ole tämä seura' };
  /* onOmanSeuranValmentaja = onOmaSeura && onValmentajaRooli — johtorooli EI riitä yksin. */
  if (RULES_VALMENTAJAROOLIT.indexOf(rooli) < 0) {
    return { tulos: false, haara: 'rooli ei ole valmentajarooli (onValmentajaRooli = false)' };
  }
  if (RULES_JOHTOROOLIT.indexOf(rooli) >= 0) return { tulos: true, haara: 'johtorooli ohittaa joukkuerajauksen' };
  if (rooli === 'talenttivalmentaja') return { tulos: true, haara: 'talenttivalmentaja ohittaa joukkuerajauksen' };
  const leikkaus = (pelaajanJoukkueet || []).filter((j) => (kayttajanJoukkueet || []).indexOf(j) >= 0);
  return {
    tulos: leikkaus.length > 0,
    haara: leikkaus.length ? 'joukkueet leikkaavat' : 'joukkueet EIVÄT leikkaa',
    leikkaus,
  };
}

const rivi = (k, v) => console.log('  ' + String(k).padEnd(26) + (v === undefined || v === null ? '—' : v));

async function main() {
  if (!SEURA || !EMAIL) {
    console.error('Käyttö: --seura=<id> --email=<käyttäjän email> [--pelaaja=<docId> | --pelaaja-nimi="Etu Suku"]');
    process.exit(2);
  }
  if (!admin.apps.length) admin.initializeApp({ credential: admin.applicationDefault() });
  const db = admin.firestore();
  const auth = admin.auth();

  console.log('KUIVA-AJO — ei kirjoituksia.\n');

  // ── 1 · Auth + claimit (tämän Rules lukee) ──────────────────────────────
  let user;
  try { user = await auth.getUserByEmail(EMAIL); } catch (e) {
    console.error('Käyttäjää ei löydy Authista: ' + EMAIL);
    process.exit(1);
  }
  const claims = user.customClaims || {};
  console.log('CLAIMIT (Rules lukee NÄITÄ)');
  rivi('uid', user.uid);
  rivi('rooli', claims.rooli);
  rivi('seuraId', claims.seuraId);
  console.log('');

  // ── 2 · kayttajat-dokumentti (klientti luki tätä) ───────────────────────
  const kSnap = await db.collection('seurat').doc(SEURA).collection('kayttajat').doc(user.uid).get();
  const k = kSnap.exists ? (kSnap.data() || {}) : null;
  console.log('KAYTTAJAT-DOKUMENTTI seurat/' + SEURA + '/kayttajat/' + user.uid);
  if (!k) {
    rivi('(dokumenttia ei ole)', '');
  } else {
    rivi('rooli', k.rooli);
    rivi('joukkueet', JSON.stringify(k.joukkueet || []));
    rivi('joukkue (nimi)', k.joukkue || k.joukkueNimi);
  }
  console.log('');

  // ── 3 · Ristiriita claimin ja dokumentin välillä ────────────────────────
  const dokRooli = k ? k.rooli : null;
  const ristiriita = !!(dokRooli && claims.rooli && dokRooli !== claims.rooli);
  console.log('ROOLILÄHTEET');
  rivi('claim.rooli', claims.rooli);
  rivi('kayttajat.rooli', dokRooli);
  rivi('RISTIRIITA', ristiriita ? 'KYLLÄ — klientti ja Rules eivät näe samaa roolia' : 'ei');
  if (ristiriita) {
    console.log('  → Poimin saattoi näyttää enemmän pelaajia kuin Rules sallii.');
  }
  console.log('');

  // ── 4 · Pelaaja ─────────────────────────────────────────────────────────
  let pelaajaDoc = null;
  if (PELAAJA) {
    const s = await db.collection('seurat').doc(SEURA).collection('pelaajat').doc(PELAAJA).get();
    if (s.exists) pelaajaDoc = { id: s.id, ...s.data() };
  } else if (PELAAJA_NIMI) {
    const osat = PELAAJA_NIMI.trim().split(/\s+/);
    const etu = osat[0], suku = osat.slice(1).join(' ');
    const s = await db.collection('seurat').doc(SEURA).collection('pelaajat')
      .where('etunimi', '==', etu).where('sukunimi', '==', suku).limit(5).get();
    if (s.docs.length === 1) pelaajaDoc = { id: s.docs[0].id, ...s.docs[0].data() };
    else if (s.docs.length > 1) {
      console.log('Useita osumia nimellä — anna --pelaaja=<docId>:');
      s.docs.forEach((d) => console.log('  ' + d.id + '  ' + (d.data().joukkue || '')));
      process.exit(0);
    }
  }
  if (!pelaajaDoc) {
    console.log('PELAAJA: ei annettu tai ei löytynyt — lopetetaan tähän.');
    process.exit(0);
  }
  console.log('PELAAJA ' + pelaajaDoc.id);
  rivi('nimi', ((pelaajaDoc.etunimi || '') + ' ' + (pelaajaDoc.sukunimi || '')).trim());
  rivi('joukkue (nimi)', pelaajaDoc.joukkue);
  rivi('joukkueet (id:t)', JSON.stringify(pelaajaDoc.joukkueet || []));
  console.log('');

  // ── 5 · Päätös samalla logiikalla kuin sääntö ───────────────────────────
  const paatos = onOmanJoukkueenValmentaja(
    claims.rooli, claims.seuraId, SEURA, (k && k.joukkueet) || [], pelaajaDoc.joukkueet || [],
  );
  console.log('SÄÄNNÖN PÄÄTÖS (onOmanJoukkueenValmentaja, claimin roolilla)');
  rivi('leikkaus', JSON.stringify(paatos.leikkaus || []));
  rivi('haara', paatos.haara);
  rivi('TULOS', paatos.tulos ? 'SALLITTU' : 'ESTETTY');
  console.log('');

  // Sama päätös DOKUMENTIN roolilla — kertoo mitä klientti oletti
  if (ristiriita) {
    const p2 = onOmanJoukkueenValmentaja(
      dokRooli, claims.seuraId, SEURA, (k && k.joukkueet) || [], pelaajaDoc.joukkueet || [],
    );
    console.log('VERTAILU: sama päätös DOKUMENTIN roolilla (' + dokRooli + ')');
    rivi('TULOS', p2.tulos ? 'SALLITTU' : 'ESTETTY');
    if (p2.tulos && !paatos.tulos) {
      console.log('  → TÄMÄ ON OIREEN SELITYS: klientti salli, Rules esti.');
    }
    console.log('');
  }

  console.log('TULKINTA');
  if (!paatos.tulos && paatos.haara === 'joukkueet EIVÄT leikkaa') {
    if (!((k && k.joukkueet) || []).length) {
      console.log('  Käyttäjän kayttajat-dokumentissa ei ole joukkueet-listaa → leikkaus on aina tyhjä.');
      console.log('  Korjaus: lisää joukkue-id:t käyttäjälle (Seurahallinta → Henkilöstö).');
    } else if (!(pelaajaDoc.joukkueet || []).length) {
      console.log('  Pelaajalla ei ole joukkueet-listaa (vain nimi) → §18-siivous ajamatta.');
      console.log('  Korjaus: node scripts/korjaa_joukkuejasenyys.js --seura=' + SEURA);
    } else {
      console.log('  Molemmilla on joukkueet, mutta id:t eivät täsmää → tarkista §18-siivous.');
    }
  } else if (paatos.tulos) {
    console.log('  Sääntö sallisi tämän kirjoituksen. Jos tallennus silti epäonnistui, syy on muualla');
    console.log('  (esim. luotu-kentän muoto tai App Check) — katso selaimen konsoli.');
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
