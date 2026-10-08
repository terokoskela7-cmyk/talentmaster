#!/usr/bin/env node
/**
 * Aikaleimavertailu: hyväksytyt kutsut ilman suostumus_annettu-audit-riviä (READ-ONLY, 2.10.2026).
 * Jatkoa skriptille kutsut_suostumukset_tarkistus.js (SJK: 6 tällaista kutsua). EI kirjoita mitään.
 * Tulosteessa vain id:n 4 ensimmäistä merkkiä, ajat (UTC, sekunnin tarkkuus), tilat ja audit-toimintojen nimet.
 *
 * Kaksi reittiä, jotka jättävät eri jäljen:
 *   PALVELIN (vahvistaSuostumus): pelaaja on olemassa ennen kutsun hyväksyntää; pelaajaan suostumusAnnettu=TS ja
 *     kutsuun hyvaksyttyPvm=TS samassa ajossa → ero sekunteja. Jos audit-rivi puuttuu, se on jäänyt kirjoittamatta.
 *   SELAIN (suostumuslomakkeen vanha reitti ilman pelaajaId:tä): lomake LUO pelaajan (suostumusTila 'annettu',
 *     ei suostumusAnnettu-kenttää) ja päivittää kutsun → pelaajan createTime ≈ kutsun hyvaksyttyPvm.
 *
 * AJO (gcloud ADC):  node scripts/kutsut_aikaleimavertailu.js [seuraId=sjk]
 */
const admin = require('firebase-admin');
const _alusta = () => { if (!admin.apps.length) admin.initializeApp({ projectId: 'talentmaster-pilot' }); };   // vasta ajettaessa (require ei avaa tuotantoyhteyttä)

const RAJA_S = 120;
const id4 = (id) => String(id || '').slice(0, 4) || '—';
const ms = (t) => (t && typeof t.toMillis === 'function' ? t.toMillis() : (t && t._seconds ? t._seconds * 1000 : null));
const aika = (m) => (m == null ? '—' : new Date(m).toISOString().slice(0, 19).replace('T', ' '));
const ero = (a, b) => (a == null || b == null ? null : Math.round((a - b) / 1000));

/* Puhdas tulkinta (testattavissa). */
function tulkinta({ hyvaksyttyMs, suostumusAnnettuMs, pelaajaLuotuMs, pelaajaOlemassa }) {
  if (!pelaajaOlemassa) return 'pelaajaa ei ole (poistettu?)';
  const dA = ero(hyvaksyttyMs, suostumusAnnettuMs), dL = ero(hyvaksyttyMs, pelaajaLuotuMs);
  if (dA != null && Math.abs(dA) <= RAJA_S) return 'PALVELIN (vahvistaSuostumus) — audit-rivi puuttuu';
  if (suostumusAnnettuMs == null && dL != null && Math.abs(dL) <= RAJA_S) return 'SELAIN (lomake loi pelaajan)';
  if (dA != null) return 'suostumus eri aikaan kuin kutsun hyväksyntä (Δ ' + dA + ' s)';
  return 'epäselvä';
}

async function main() {
  _alusta();
  const seuraId = process.argv[2] || 'sjk';
  const db = admin.firestore();
  const seura = db.collection('seurat').doc(seuraId);
  const [kutsut, annettu] = await Promise.all([
    seura.collection('kutsut').where('tila', '==', 'hyvaksytty').get(),
    db.collection('audit').where('toiminto', '==', 'suostumus_annettu').get(),
  ]);
  const auditPelaajat = new Set(annettu.docs.map((d) => (d.data() || {}).pelaajaId).filter(Boolean));
  const kohteet = kutsut.docs.filter((d) => !auditPelaajat.has((d.data() || {}).pelaajaId));
  console.log('seura', seuraId, '· hyväksyttyjä kutsuja', kutsut.size, '· ilman suostumus_annettu-auditia', kohteet.length, '\n');

  const yhteenveto = {};
  for (const d of kohteet) {
    const k = d.data() || {};
    const ps = k.pelaajaId ? await seura.collection('pelaajat').doc(String(k.pelaajaId)).get() : { exists: false };
    const p = ps.exists ? (ps.data() || {}) : {};
    const auditRivit = k.pelaajaId
      ? (await db.collection('audit').where('pelaajaId', '==', String(k.pelaajaId)).get()).docs.map((a) => a.data() || {})
      : [];
    const r = {
      hyvaksyttyMs: ms(k.hyvaksyttyPvm) || ms(d.updateTime),
      suostumusAnnettuMs: ms(p.suostumusAnnettu),
      pelaajaLuotuMs: ps.exists ? ms(ps.createTime) : null,
      pelaajaOlemassa: !!ps.exists,
    };
    const t = tulkinta(r);
    yhteenveto[t] = (yhteenveto[t] || 0) + 1;
    console.log('kutsu ' + id4(d.id) + ' · pelaaja ' + id4(k.pelaajaId) + ' · tyyppi ' + (k.tyyppi || '—'));
    console.log('  kutsu luotu        ', aika(ms(d.createTime)));
    console.log('  kutsu hyväksytty   ', aika(r.hyvaksyttyMs), k.hyvaksyttyPvm ? '' : '(hyvaksyttyPvm puuttuu → updateTime)');
    console.log('  pelaaja luotu      ', aika(r.pelaajaLuotuMs), '· Δ hyväksyntään', ero(r.hyvaksyttyMs, r.pelaajaLuotuMs), 's');
    console.log('  suostumusAnnettu   ', aika(r.suostumusAnnettuMs), '· Δ hyväksyntään', ero(r.hyvaksyttyMs, r.suostumusAnnettuMs), 's');
    console.log('  pelaaja: suostumusTila', p.suostumusTila || '—', '· lahde', p.lahde || '—', '· suostumukset[]', Array.isArray(p.suostumukset) ? p.suostumukset.length : 0,
      '· suostumus.annettu', p.suostumus && p.suostumus.annettu ? 'on' : 'ei');
    console.log('  audit-rivit pelaajalle:', auditRivit.length
      ? auditRivit.map((a) => (a.toiminto || a.tyyppi) + ' ' + aika(ms(a.aikaleima))).sort().join(' | ') : 'ei yhtään');
    console.log('  → ' + t + '\n');
  }
  console.log('YHTEENVETO', JSON.stringify(yhteenveto));
}

if (require.main === module || process.env.TM_AJA) main().then(() => process.exit(0)).catch((e) => { console.error('Virhe:', e.message); process.exit(1); });
module.exports = { tulkinta, RAJA_S };
