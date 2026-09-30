/**
 * Kutsutarkistus (30.9.2026, #689 jälkitarkastus) — VAIN LUKU.
 *
 * Tulostaa KPV:n pelaajat joilla on annettu huoltajan sähköposti, illan audit-rivit
 * (rekisterikutsu_lahetetty, suostumus_estetty_pelaaja_ristiriita, suostumus_annettu) sekä
 * näiden pelaajien kutsudokumentit. Ei nimiä eikä sähköposteja tulosteessa: vain id:n 4 ensimmäistä
 * merkkiä, ajat, vuodet ja tilakentät.
 *
 * Ajo: cd functions && node ../scripts/kutsutarkistus_tero.js [sahkoposti] [seuraId] [alku ISO] [loppu ISO]
 * Oletus: TeroKoskela7@gmail.com · kpv · 2026-09-30T18:00Z..20:00Z (= klo 21–23 Suomen aikaa).
 */
'use strict';
const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'talentmaster-pilot' });
const db = admin.firestore();

const EMAIL = String(process.argv[2] || 'terokoskela7@gmail.com').trim().toLowerCase();
const SEURA = process.argv[3] || 'kpv';
const ALKU = new Date(process.argv[4] || '2026-09-30T18:00:00Z');
const LOPPU = new Date(process.argv[5] || '2026-09-30T20:00:00Z');
const TOIMINNOT = ['rekisterikutsu_lahetetty', 'suostumus_estetty_pelaaja_ristiriita', 'suostumus_annettu'];

const id4 = (s) => (s ? String(s).slice(0, 4) : '-');
const ms = (v) => (v && typeof v.toMillis === 'function' ? v.toMillis() : (v ? Date.parse(v) || null : null));
const aika = (v) => { const m = ms(v); return m ? new Date(m).toISOString().replace('T', ' ').slice(0, 19) + 'Z' : '-'; };
const vuosi = (p) => {
  if (p.syntymaVuosi != null && p.syntymaVuosi !== '') return String(p.syntymaVuosi);
  const m = ms(p.syntymaaika);
  return m ? String(new Date(m).getUTCFullYear()) : '-';
};

(async () => {
  const pelRef = db.collection('seurat').doc(SEURA).collection('pelaajat');
  const snap = await pelRef.where('huoltajaEmail', '==', EMAIL).get();
  const idt = new Set();
  console.log('== PELAAJAT (' + SEURA + ', tämä huoltajaEmail): ' + snap.size + ' kpl');
  snap.docs
    .sort((a, b) => (ms(a.get('tuotu')) || ms(a.get('luotu')) || 0) - (ms(b.get('tuotu')) || ms(b.get('luotu')) || 0))
    .forEach((d) => {
      const p = d.data() || {};
      idt.add(d.id);
      console.log([
        'id=' + id4(d.id),
        'luotu=' + aika(p.luotu || p.tuotu),
        'syntV=' + vuosi(p),
        'suostumus_objekti=' + (p.suostumus ? 'on' : 'ei'),
        'suostumus_aika=' + aika(p.suostumusAnnettu || (p.suostumus && p.suostumus.annettu)),
        'suostumusTila=' + (p.suostumusTila || '-'),
        'tila=' + (p.tila || '-'),
        'lahde=' + (p.lahde || '-'),
      ].join(' · '));
    });

  console.log('\n== AUDIT ' + ALKU.toISOString() + ' .. ' + LOPPU.toISOString() + ' (kaikki KPV:n rivit näille toiminnoille)');
  const a = await db.collection('audit')
    .where('aikaleima', '>=', admin.firestore.Timestamp.fromDate(ALKU))
    .where('aikaleima', '<=', admin.firestore.Timestamp.fromDate(LOPPU))
    .get();
  const rivit = a.docs.map((d) => d.data() || {})
    .filter((x) => TOIMINNOT.includes(x.toiminto) && (x.seuraId === SEURA || !x.seuraId))
    .sort((x, y) => ms(x.aikaleima) - ms(y.aikaleima));
  if (!rivit.length) console.log('(ei rivejä)');
  rivit.forEach((x) => {
    console.log([
      aika(x.aikaleima),
      x.toiminto,
      'pelaajaId=' + id4(x.pelaajaId),
      'omaPelaaja=' + (x.pelaajaId ? (idt.has(x.pelaajaId) ? 'kylla' : 'ei') : '-'),
      'sahkoposti_sama=' + (x.hEmail ? String(x.hEmail).toLowerCase() === EMAIL : '-'),
      x.syyt ? 'syyt=' + x.syyt.join('+') : '',
      x.lomake_poikkeama ? 'poikkeama=' + [].concat(x.lomake_poikkeama).join('+') : '',
      x.lomakeEtunimi_tasmasi != null ? 'etunimi_tasmasi=' + x.lomakeEtunimi_tasmasi : '',
    ].filter(Boolean).join(' · '));
  });

  console.log('\n== KUTSUDOKUMENTIT (seurat/' + SEURA + '/kutsut): pelaajaId tässä joukossa TAI sama sähköposti');
  const ku = await db.collection('seurat').doc(SEURA).collection('kutsut').get();
  const kuRivit = ku.docs
    .map((d) => ({ id: d.id, x: d.data() || {} }))
    .filter((k) => idt.has(k.x.pelaajaId) || String(k.x.hEmail || '').toLowerCase() === EMAIL)
    .sort((p, q) => ms(p.x.luotu) - ms(q.x.luotu));
  if (!kuRivit.length) console.log('(ei kutsuja)');
  kuRivit.forEach((k) => {
    const linkinPid = (() => { try { return new URL(String(k.x.linkki)).searchParams.get('pelaajaId'); } catch (e) { return null; } })();
    console.log([
      'kutsu=' + id4(k.id),
      'luotu=' + aika(k.x.luotu),
      'tyyppi=' + (k.x.tyyppi || '-'),
      'tila=' + (k.x.tila || '-'),
      'pelaajaId=' + id4(k.x.pelaajaId),
      'linkissa_pelaajaId=' + id4(linkinPid),
      'linkki_vs_kentta=' + (linkinPid === (k.x.pelaajaId || null) ? 'sama' : 'ERI'),
    ].join(' · '));
  });
})().catch((e) => { console.error('VIRHE:', e.message); process.exit(1); });
