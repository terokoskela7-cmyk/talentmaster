#!/usr/bin/env node
/**
 * Kutsut + ylätason suostumukset -tarkistus (READ-ONLY, 2.10.2026) — pohja Rules-kovennukselle.
 * EI kirjoita mitään. Tulostaa vain lukumäärät, seuraId:t, tilat, kenttien NIMET, päivämäärät ja id:n 4 ensimmäistä
 * merkkiä — EI nimiä, sähköposteja, PIN-koodeja eikä PalloID:tä.
 *
 * Miksi: Rules v3.32 sallii
 *   (A) seurat/{sid}/kutsut/{id} updaten ILMAN kirjautumista, kun resource.data.tila == 'odottaa'
 *   (B) ylätason suostumukset/{id}: create: if true, update ilman kirjautumista kun suostumusTila == 'odottaa'
 * Ennen sulkemista: onko näitä polkuja käytetty?
 *
 * (A) kutsut, joita on päivitetty luomisen jälkeen (Firestoren updateTime > createTime):
 *     tila- ja tyyppijakauma + kenttäyhdistelmät. 'hyvaksytty'-kutsut ristiintarkistetaan audit-lokiin:
 *     vahvistaSuostumus (palvelin) kirjaa suostumus_annettu-rivin samalle pelaajaId:lle → jos riviä ei ole,
 *     kutsu on hyväksytty muualta (vanha selainpolku) → listataan id4:llä. Audit-loki alkaa 16.6.2026 (B1),
 *     joten sitä vanhemmat näkyvät "ennen audit-lokia".
 * (B) ylätason suostumukset: kenttäyhdistelmät + onko vastaavaa pelaajaa (seuraId + pelaajaId/pelaajaDocId).
 *
 * AJO (gcloud ADC, Teron tili):  node scripts/kutsut_suostumukset_tarkistus.js
 */
const admin = require('firebase-admin');
const _alusta = () => { if (!admin.apps.length) admin.initializeApp({ projectId: 'talentmaster-pilot' }); };   // vasta ajettaessa (require ei avaa tuotantoyhteyttä)

const id4 = (id) => String(id || '').slice(0, 4);
const pvm = (t) => (t && t.toDate ? t.toDate().toISOString().slice(0, 10) : '—');
const AUDIT_ALKU = Date.parse('2026-06-16T00:00:00Z');
const MAKS_RIVEJA = 50;
const lisaa = (o, k) => { o[k] = (o[k] || 0) + 1; };

/* Puhtaat apufunktiot (testattavissa ilman Firestorea). */
function paivitettyLuonninJalkeen(d) {
  const c = d.createTime && d.createTime.toMillis(), u = d.updateTime && d.updateTime.toMillis();
  return !!(c && u && u - c > 2000);
}
function kenttaAvain(data) { return Object.keys(data || {}).sort().join(','); }

async function main() {
  _alusta();
  const db = admin.firestore();

  // ── (A) kutsut ────────────────────────────────────────────────────────────
  const [kutsut, auditSnap] = await Promise.all([
    db.collectionGroup('kutsut').get(),
    db.collection('audit').where('toiminto', '==', 'suostumus_annettu').get(),
  ]);
  const annettuAuditissa = new Set(auditSnap.docs.map((d) => (d.data() || {}).pelaajaId).filter(Boolean));

  let yht = 0, paivitetty = 0;
  const tilat = {}, tyypit = {}, kentat = {}, seurat = {};
  const epailyttavat = [];
  for (const d of kutsut.docs) {
    const s = d.ref.parent.parent;
    if (!s || !s.parent || s.parent.id !== 'seurat') continue;   // vain seurat/{sid}/kutsut
    yht++;
    if (!paivitettyLuonninJalkeen(d)) continue;
    paivitetty++;
    const k = d.data() || {};
    const tila = k.tila || '(puuttuu)';
    lisaa(tilat, tila); lisaa(tyypit, k.tyyppi || '(ei tyyppiä)'); lisaa(kentat, kenttaAvain(k)); lisaa(seurat, s.id);
    if (tila === 'hyvaksytty' && !annettuAuditissa.has(k.pelaajaId)) {
      epailyttavat.push({ id4: id4(d.id), seura: s.id, pelaaja4: id4(k.pelaajaId), luotu: pvm(d.createTime), paivitetty: pvm(d.updateTime),
        ennenAuditia: d.updateTime.toMillis() < AUDIT_ALKU });
    }
  }

  console.log('(A) seurat/*/kutsut');
  console.log('  kutsuja yhteensä:', yht, '· päivitetty luomisen jälkeen:', paivitetty);
  console.log('  tila (päivitetyt):', JSON.stringify(tilat));
  console.log('  tyyppi (päivitetyt):', JSON.stringify(tyypit));
  console.log('  seura (päivitetyt):', JSON.stringify(seurat));
  console.log('  kenttäyhdistelmät (päivitetyt, vain nimet):');
  Object.entries(kentat).sort((a, b) => b[1] - a[1]).forEach(([k, n]) => console.log('   ', String(n).padStart(4), k));
  console.log("  'hyvaksytty' ilman suostumus_annettu-auditia:", epailyttavat.length,
    '(ennen audit-lokia 16.6.:', epailyttavat.filter((x) => x.ennenAuditia).length + ', sen jälkeen:', epailyttavat.filter((x) => !x.ennenAuditia).length + ')');
  epailyttavat.filter((x) => !x.ennenAuditia).slice(0, MAKS_RIVEJA)
    .forEach((x) => console.log('    kutsu', x.id4, '· seura', x.seura, '· pelaaja', x.pelaaja4, '· luotu', x.luotu, '· päivitetty', x.paivitetty));

  // ── (B) ylätason suostumukset ─────────────────────────────────────────────
  const sSnap = await db.collection('suostumukset').get();
  const sKentat = {}, sTilat = {};
  let ilmanViitetta = 0, pelaajaPuuttuu = 0, pelaajaLoytyy = 0;
  const puuttuvat = [];
  for (const d of sSnap.docs) {
    const x = d.data() || {};
    lisaa(sKentat, kenttaAvain(x)); lisaa(sTilat, x.suostumusTila || x.tila || '(puuttuu)');
    const sid = x.seuraId || x.seura_id, pid = x.pelaajaId || x.pelaajaDocId || x.pelaaja_id;
    if (!sid || !pid) { ilmanViitetta++; puuttuvat.push({ id4: id4(d.id), syy: 'ei seuraId/pelaajaId', luotu: pvm(d.createTime) }); continue; }
    const ps = await db.collection('seurat').doc(String(sid)).collection('pelaajat').doc(String(pid)).get();
    if (ps.exists) pelaajaLoytyy++;
    else { pelaajaPuuttuu++; puuttuvat.push({ id4: id4(d.id), syy: 'pelaajaa ei ole', seura: sid, luotu: pvm(d.createTime) }); }
  }
  console.log('\n(B) ylätason suostumukset/');
  console.log('  dokumentteja:', sSnap.size, '· pelaaja löytyy:', pelaajaLoytyy, '· pelaajaa ei ole:', pelaajaPuuttuu, '· ei viitettä:', ilmanViitetta);
  console.log('  tila:', JSON.stringify(sTilat));
  console.log('  kenttäyhdistelmät (vain nimet):');
  Object.entries(sKentat).sort((a, b) => b[1] - a[1]).forEach(([k, n]) => console.log('   ', String(n).padStart(4), k));
  puuttuvat.slice(0, MAKS_RIVEJA).forEach((x) => console.log('    suostumus', x.id4, '·', x.syy, x.seura ? '· seura ' + x.seura : '', '· luotu', x.luotu));
  if (sSnap.size) {
    const ajat = sSnap.docs.map((d) => d.createTime.toMillis()).sort();
    console.log('  luotu välillä', new Date(ajat[0]).toISOString().slice(0, 10), '…', new Date(ajat[ajat.length - 1]).toISOString().slice(0, 10));
  }
}

if (require.main === module || process.env.TM_AJA) main().then(() => process.exit(0)).catch((e) => { console.error('Virhe:', e.message); process.exit(1); });
module.exports = { paivitettyLuonninJalkeen, kenttaAvain, id4 };
