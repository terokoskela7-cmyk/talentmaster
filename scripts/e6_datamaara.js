/* e6_datamaara.js — E6-tuplapelaajan "paljonko dataa" -laskenta, JAETTU diag_e6_vertailu.js:n ja arkistoi_tuplapelaaja.js:n kesken (vain luku, vain lukumääriä).
 * Ennen jakoa skriptit laskivat eri asioita: vertailu luki kiinteän alikokoelmalistan (pelaajat/{pid}/…), arkistointi listCollections():lla KAIKKI alikokoelmat
 * (mukaan lukien terveys/), eikä kumpikaan katsonut testitapahtumat/TID/tulokset/PID -polkua, johon Testaus/Testituonti kirjoittavat testitulokset.
 * Nyt: (1) pelaajan KAIKKI alikokoelmat paitsi terveys/ (GDPR Art. 9: ei lueta), (2) seurat/SID/testitapahtumat/TID/tulokset/PID -dokumentit. Lukuja vain; select() ei hae kenttiä. */
'use strict';
const path = require('path');
const V = require(path.join(__dirname, '..', 'lib', 'tm_valvonta.js'));
const POIS = ['terveys'];
// Palvelimen johtamat/generoimat pelaaja-alikokoelmat (EI pelaajan eikä henkilökunnan kirjaamaa dataa): kooste = functions/harjoituskertyma.js (trigger),
// notifikaatiot = functions/index.js (ilmoitukset). Ei lasketa dataksi (yht), mutta raportoidaan merkinnällä (johdettu).
const JOHDETUT = ['kooste', 'notifikaatiot'];
const TULOKSET = 'testitapahtumat/*/tulokset';

async function tapahtumaIdt(db, sid, valimuisti) {
  if (valimuisti && valimuisti[sid]) return valimuisti[sid];
  const ids = (await db.collection('seurat').doc(sid).collection('testitapahtumat').select().get()).docs.map((x) => x.id);
  if (valimuisti) valimuisti[sid] = ids;
  return ids;
}
// → { alik:{ [kokoelma]: n, 'testitapahtumat/*/tulokset': n }, johdettu:{ kooste: n, … } (EI mukana yht:ssä), yht } (yht = alikokoelmat + tapahtumatulokset). valimuisti = valinnainen {} (tapahtumaid:t per seura).
async function datamaara(db, sid, pid, valimuisti) {
  const seura = db.collection('seurat').doc(sid), ref = seura.collection('pelaajat').doc(pid), alik = {};
  const johdettu = {};
  for (const k of await ref.listCollections()) {
    if (POIS.indexOf(k.id) >= 0) continue;
    const n = (await k.select().get()).size;
    if (JOHDETUT.indexOf(k.id) >= 0) johdettu[k.id] = n; else alik[k.id] = n;
  }
  let tul = 0;
  for (const tid of await tapahtumaIdt(db, sid, valimuisti)) { if ((await seura.collection('testitapahtumat').doc(tid).collection('tulokset').doc(pid).get()).exists) tul++; }
  alik[TULOKSET] = tul;
  return { alik, johdettu, yht: Object.keys(alik).reduce((a, k) => a + alik[k], 0) };
}

/** terveys/-alikokoelman dokumenttimäärä (vain count(), ei sisältöä). >0 → arkistointi ei kirjoita. */
async function terveysLkm(db, sid, pid) {
  const r = await db.collection('seurat').doc(sid).collection('pelaajat').doc(pid).collection('terveys').count().get();
  return Number(r.data().count) || 0;
}
const KENTAT = ['tunniste', 'palloId', 'palloID'];
const tunnisteArvo = (d) => { for (const k of KENTAT) if (d && d[k] != null && d[k] !== '') return String(d[k]); return null; };
const nimiAvain = (d) => V.nimiAvain((d && d.nimi) || (((d && d.etunimi) || '') + ' ' + ((d && d.sukunimi) || '')));
/** JAETTU E6-ryhmittely: sama seura + sama normalisoitu nimi + sama tunniste, vain AKTIIVISET dokumentit, ≥ 2 eri pid:ää.
 *  pelaajat = [{ sid, pid, d }] → [{ sid, tunniste, jasenet:[{ sid, pid, d, tunniste, nimi }] }] (järjestys deterministinen). */
function ryhmittele(pelaajat) {
  const kartta = {};
  (pelaajat || []).forEach((p) => {
    const d = p.d || {}, t = tunnisteArvo(d), n = nimiAvain(d);
    if (t == null || !n || !V.onAktiivinen(d)) return;
    const k = JSON.stringify([p.sid, t, n]); const g = (kartta[k] = kartta[k] || { sid: p.sid, tunniste: t, jasenet: [] });
    if (!g.jasenet.some((x) => x.pid === String(p.pid))) g.jasenet.push({ sid: p.sid, pid: String(p.pid), d, tunniste: t, nimi: n });
  });
  return Object.keys(kartta).sort().map((k) => kartta[k]).filter((g) => g.jasenet.length >= 2);
}
module.exports = { datamaara, terveysLkm, ryhmittele, tunnisteArvo, nimiAvain, TULOKSET, POIS, JOHDETUT };
