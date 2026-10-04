#!/usr/bin/env node
/* diag_adar_kortti.js — KUIVA, VAIN LUKU. Miksi Masterin kortti näyttää "ei havaintoja" ADAR-tallennuksen jälkeen?
 *
 * Ajo (ADC): node scripts/diag_adar_kortti.js --seura=kpv --etunimi=Toppari --sukunimi=Testi
 *
 * 1) Pelaajan joukkue/joukkueet, adar_*-pikakenttien läsnäolo (vain avaimet + adar_havaintoja/adar_pvm).
 * 2) havainnot-alikokoelma: lukumäärä + per havainto (id-etuliite, luotu, tekija_uid 4 merkkiä, tyyppi, nakyvyys,
 *    pelaaja_id täsmää?).
 * 3) Seuran valmentajat: uid-etuliite, rooli, kayttajat.joukkueet[] → leikkaako pelaajan joukkueet[] (Rules-predikaatti).
 * 4) Seuran pelaajat joilta puuttuu joukkueet[] (lukumäärä per joukkue-merkkijono) — datavirhe-arvio.
 * Tulostaa EI sähköposteja, tekstejä eikä pisteitä.
 */
const path = require('path');
const admin = require(path.join(__dirname, '..', 'functions', 'node_modules', 'firebase-admin'));
const argv = process.argv.slice(2);
const arg = (n, d) => { const o = argv.find((a) => a.indexOf('--' + n + '=') === 0); return o ? o.split('=').slice(1).join('=') : d; };
const SEURA = arg('seura', 'kpv'), ETU = arg('etunimi', 'Toppari'), SUKU = arg('sukunimi', 'Testi');
const u4 = (u) => (u ? String(u).slice(0, 4) : '—');
const ms = (t) => (t && t.toDate ? t.toDate().getTime() : (t ? Date.parse(t) : NaN));
const iso = (t) => { const m = ms(t); return isNaN(m) ? String(t) : new Date(m).toISOString(); };

(async () => {
  admin.initializeApp({ projectId: 'talentmaster-pilot' });
  const db = admin.firestore();
  const pel = db.collection('seurat').doc(SEURA).collection('pelaajat');
  const ps = await pel.where('etunimi', '==', ETU).get();
  const osumat = ps.docs.filter((d) => String(d.data().sukunimi || '').toLowerCase() === SUKU.toLowerCase());
  console.log('pelaaja-osumia:', osumat.length);
  for (const d of osumat) {
    const p = d.data();
    console.log('\n— pelaaja', u4(d.id), '| joukkue:', JSON.stringify(p.joukkue), '| joukkueet:', JSON.stringify(p.joukkueet), '| syntymaVuosi:', p.syntymaVuosi);
    const adarAvaimet = Object.keys(p).filter((k) => k.indexOf('adar_') === 0 || k === 'havainto_porras' || k === 'havainto_porras_ehdotus');
    console.log('  adar-avaimet:', adarAvaimet.join(',') || '(EI YHTÄÄN)', '| adar_havaintoja:', p.adar_havaintoja, '| adar_pvm:', p.adar_pvm && iso(p.adar_pvm));
    const hs = await d.ref.collection('havainnot').get();
    console.log('  havainnot-alikokoelma:', hs.size);
    hs.docs.forEach((h) => {
      const x = h.data();
      console.log('   ·', h.id.slice(0, 6), 'luotu', iso(x.luotu), '| tekija', u4(x.tekija_uid), '| rooli', x.tekija_rooli, '| tyyppi', x.tyyppi,
        '| nakyvyys', x.nakyvyys, '| pelaaja_id täsmää:', x.pelaaja_id === d.id, '| pisteet-avaimet:', Object.keys(x.pisteet || {}).join(','));
    });
    const ks = await db.collection('seurat').doc(SEURA).collection('kayttajat').get();
    const pj = Array.isArray(p.joukkueet) ? p.joukkueet : [];
    console.log('  valmentajat (kayttajat.joukkueet ∩ pelaajan joukkueet[]):');
    ks.docs.forEach((k) => {
      const x = k.data();
      if (['valmentaja', 'talenttivalmentaja', 'vp', 'urheilutoimenjohtaja'].indexOf(x.rooli) < 0) return;
      const kj = Array.isArray(x.joukkueet) ? x.joukkueet : null;
      const leikkaa = !!(kj && kj.some((j) => pj.indexOf(j) >= 0));
      console.log('   ·', u4(k.id), x.rooli, '| aktiivinen:', x.aktiivinen, '| joukkueet:', JSON.stringify(kj), '| leikkaa:', leikkaa);
    });
  }
  const kaikki = await pel.get();
  const ilman = {};
  kaikki.docs.forEach((d) => { const p = d.data(); if (!Array.isArray(p.joukkueet) || !p.joukkueet.length) { const k = p.joukkue || '(ei joukkuetta)'; ilman[k] = (ilman[k] || 0) + 1; } });
  console.log('\nPelaajia ilman joukkueet[] (per joukkue-merkkijono), yht', kaikki.size, 'pelaajaa:', JSON.stringify(ilman));
})().catch((e) => { console.error('VIRHE', e.message); process.exit(1); });
