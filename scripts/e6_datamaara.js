/* e6_datamaara.js — E6-tuplapelaajan "paljonko dataa" -laskenta, JAETTU diag_e6_vertailu.js:n ja arkistoi_tuplapelaaja.js:n kesken (vain luku, vain lukumääriä).
 * Ennen jakoa skriptit laskivat eri asioita: vertailu luki kiinteän alikokoelmalistan (pelaajat/{pid}/…), arkistointi listCollections():lla KAIKKI alikokoelmat
 * (mukaan lukien terveys/), eikä kumpikaan katsonut testitapahtumat/TID/tulokset/PID -polkua, johon Testaus/Testituonti kirjoittavat testitulokset.
 * Nyt: (1) pelaajan KAIKKI alikokoelmat paitsi terveys/ (GDPR Art. 9: ei lueta), (2) seurat/SID/testitapahtumat/TID/tulokset/PID -dokumentit. Lukuja vain; select() ei hae kenttiä. */
'use strict';
const POIS = ['terveys'];
const TULOKSET = 'testitapahtumat/*/tulokset';

async function tapahtumaIdt(db, sid, valimuisti) {
  if (valimuisti && valimuisti[sid]) return valimuisti[sid];
  const ids = (await db.collection('seurat').doc(sid).collection('testitapahtumat').select().get()).docs.map((x) => x.id);
  if (valimuisti) valimuisti[sid] = ids;
  return ids;
}
// → { alik:{ [kokoelma]: n, 'testitapahtumat/*/tulokset': n }, yht } (yht = alikokoelmat + tapahtumatulokset). valimuisti = valinnainen {} (tapahtumaid:t per seura).
async function datamaara(db, sid, pid, valimuisti) {
  const seura = db.collection('seurat').doc(sid), ref = seura.collection('pelaajat').doc(pid), alik = {};
  for (const k of await ref.listCollections()) { if (POIS.indexOf(k.id) >= 0) continue; alik[k.id] = (await k.select().get()).size; }
  let tul = 0;
  for (const tid of await tapahtumaIdt(db, sid, valimuisti)) { if ((await seura.collection('testitapahtumat').doc(tid).collection('tulokset').doc(pid).get()).exists) tul++; }
  alik[TULOKSET] = tul;
  return { alik, yht: Object.keys(alik).reduce((a, k) => a + alik[k], 0) };
}
module.exports = { datamaara, TULOKSET, POIS };
