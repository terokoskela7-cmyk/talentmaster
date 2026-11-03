'use strict';
/**
 * Laskutus L1b (.briefit/CODE_BRIEF_LASKUTUS_L1.md §2.3 + §3): kuukausisnapshot laskutus/{YYYY-MM}/seurat/{sid}.
 * Ajastettu laskutusKuukausi (index.js): kuun 1. päivä klo 6.00 Europe/Helsinki → EDELLINEN kuukausi.
 * Laskenta = jaettu tm_laskutus.js (sama kuin Adminin "Tilanne nyt"); tämä tiedosto vain lukee, valitsee seurat ja kirjoittaa.
 *
 * · Kuukausi ja päivät Suomen ajassa (tmLaskutusKk / tmLaskutusPaiva), ei UTC:ssä: 1.12. klo 1.30 Suomessa on UTC:ssä vielä 30.11.
 * · Laskentahetki = kuukauden viimeisen päivän tilanne; tallennetaan ajohetken tila (ajo heti kuun vaihteen jälkeen).
 *   Ajo muuna päivänä kuin seuraavan kuun 1. päivänä → myohassa: true (tila on ajohetken, ei kuun viimeisen päivän).
 * · Seurat: sopimusseura (asetukset laskutettava) tai seura, jolla on vähintään yksi aktiivinen joukkue.
 * · create(), ei ylikirjoitusta: uusi ajo samalle kuulle → ohitetaan hallitusti + audit. Yhden seuran virhe ei kaada muita (loki + audit).
 * Rules v3.72: laskutus/{kk}/seurat/{sid} — client ei kirjoita, luku vain SA. Tämä kirjoittaa Admin SDK:lla.
 */
const L = require('./tm_laskutus');

const LAHDE = 'laskutusKuukausi';
const VERSIO = 1;

function _kaksi(n) { return (n < 10 ? '0' : '') + n; }
function _kkIndeksistä(i) { return Math.floor(i / 12) + '-' + _kaksi((i % 12) + 1); }

/** Edellinen kalenterikuukausi Suomen ajassa hetkestä nytMs → 'YYYY-MM'. */
function edellinenKk(nytMs) { return _kkIndeksistä(L.tmLaskutusKkIndeksi(L.tmLaskutusKk(new Date(nytMs))) - 1); }
/** Kuukauden viimeinen päivä 'YYYY-MM-DD' (laskentahetki). */
function kuunViimeinenPaiva(kk) { const i = L.tmLaskutusKkIndeksi(kk); if (i === null) return null; const v = Math.floor(i / 12), k = i % 12; return kk + '-' + _kaksi(new Date(Date.UTC(v, k + 1, 0)).getUTCDate()); }
/** Seuraavan kuukauden 1. päivä 'YYYY-MM-DD' = ajallaan ajon päivä. */
function ajopaiva(kk) { const i = L.tmLaskutusKkIndeksi(kk); return i === null ? null : _kkIndeksistä(i + 1) + '-01'; }

function _onJoOlemassa(e) { return !!(e && (e.code === 6 || e.code === 'already-exists' || /ALREADY_EXISTS|already exists/i.test(String(e.message)))); }
const _lista = (snap) => snap.docs.map((d) => Object.assign({ id: d.id }, d.data()));

async function _audit(deps, rivi) {
  try { await deps.db.collection('audit').add(Object.assign({ lahde: LAHDE, aikaleima: deps.FieldValue.serverTimestamp() }, rivi)); }
  catch (e) { (deps.loki || console).error('[laskutusKuukausi] audit epäonnistui: ' + (e && e.message || e)); }
}

/**
 * Yhden seuran snapshot. → { sid, tila: 'luotu'|'on_jo'|'ei_laskutettava', yhteensa_snt? }. Heittää lukuvirheestä / virheellisistä asetuksista.
 * oletusAsetukset = laskutus_asetukset/oletus -dokumentin data tai null (luetaan kerran ajoa kohden).
 */
async function laskeSeura(deps, sid, kk, oletusAsetukset, nytMs) {
  const S = deps.db.collection('seurat').doc(sid);
  const [asSnap, jSnap] = await Promise.all([deps.db.collection('laskutus_asetukset').doc(sid).get(), S.collection('joukkueet').get()]);
  const as = L.tmLaskutusAsetukset(oletusAsetukset, asSnap.exists ? asSnap.data() : null);
  if (!as.ok) throw new Error('laskutusasetukset virheelliset: ' + as.virhe);
  const joukkueet = _lista(jSnap);
  const aktiivisia = joukkueet.filter((j) => j.laskutustila === 'aktiivinen' && j.demo !== true).length;
  if (!as.asetukset.laskutettava && !aktiivisia) return { sid, tila: 'ei_laskutettava' };

  const [pSnap, kSnap] = await Promise.all([S.collection('pelaajat').get(), S.collection('kayttajat').get()]);
  const tulos = L.tmLaskutusLaske({ kk, seuraId: sid, asetukset: as.asetukset, joukkueet, pelaajat: _lista(pSnap), kayttajat: _lista(kSnap) });
  const ajettuPvm = L.tmLaskutusPaiva(new Date(nytMs));
  const doc = Object.assign(tulos, {
    laskentahetki: kuunViimeinenPaiva(kk),          // laskun peruste: kuukauden viimeisen päivän tilanne
    tila_hetkelta: 'ajohetki',                       // luvut = ajohetken data (ei historiallista palautusta)
    ajettu_pvm: ajettuPvm, ajettu: deps.FieldValue.serverTimestamp(),
    myohassa: ajettuPvm !== ajopaiva(kk),
    lahde: LAHDE, versio: VERSIO,
  });
  try { await deps.db.collection('laskutus').doc(kk).collection('seurat').doc(sid).create(doc); }
  catch (e) {
    if (!_onJoOlemassa(e)) throw e;
    await _audit(deps, { toiminto: 'laskutus_snapshot_on_jo', severity: 'warn', kk, seuraId: sid });
    return { sid, tila: 'on_jo' };
  }
  return { sid, tila: 'luotu', yhteensa_snt: doc.yhteensa_snt, myohassa: doc.myohassa };
}

/** Kaikki seurat yhdelle kuukaudelle. opts: { kk (oletus edellinen kuukausi), nytMs }. → { kk, luotu:[], on_jo:[], ohitettu:[], virheet:[] } */
async function laskeKaikki(deps, opts) {
  const o = opts || {}, loki = deps.loki || console;
  const nytMs = o.nytMs != null ? o.nytMs : (deps.nyt ? deps.nyt() : Date.now());
  const kk = o.kk || edellinenKk(nytMs);
  if (L.tmLaskutusKkIndeksi(kk) === null) throw new Error("laskutusKuukausi: kk ei ole muotoa 'YYYY-MM': " + kk);
  const r = { kk, luotu: [], on_jo: [], ohitettu: [], virheet: [] };
  const [seurat, oletus] = await Promise.all([deps.db.collection('seurat').get(), deps.db.collection('laskutus_asetukset').doc('oletus').get()]);
  const oletusData = oletus.exists ? oletus.data() : null;
  for (const s of seurat.docs) {
    try {
      const t = await laskeSeura(deps, s.id, kk, oletusData, nytMs);
      if (t.tila === 'luotu') r.luotu.push(t); else if (t.tila === 'on_jo') r.on_jo.push(s.id); else r.ohitettu.push(s.id);
    } catch (e) {
      r.virheet.push({ sid: s.id, viesti: String(e && e.message || e) });
      loki.error('[laskutusKuukausi] ' + kk + ' seura ' + s.id + ': ' + (e && e.stack || e));
      await _audit(deps, { toiminto: 'laskutus_snapshot_virhe', severity: 'alert', kk, seuraId: s.id, viesti: String(e && e.message || e).slice(0, 300) });
    }
  }
  const yht = r.luotu.reduce((x, t) => x + (t.yhteensa_snt || 0), 0);
  loki.log('[laskutusKuukausi] ' + kk + ': ' + r.luotu.length + ' luotu, ' + r.on_jo.length + ' oli jo, ' + r.ohitettu.length + ' ei laskutettava, ' + r.virheet.length + ' virhettä, yhteensä ' + yht + ' snt');
  await _audit(deps, { toiminto: 'laskutus_kuukausi_ajo', severity: r.virheet.length ? 'alert' : 'info', kk, luotu: r.luotu.length, on_jo: r.on_jo.length, virheita: r.virheet.length,
    yhteensa_snt: yht, myohassa: r.luotu.some((t) => t.myohassa) });
  return r;
}

/** pubsub.schedule('0 6 1 * *').timeZone('Europe/Helsinki') → edellinen kuukausi. */
function ajastettuKasittelija(deps) {
  return async () => { await laskeKaikki(deps, {}); return null; };
}

module.exports = { edellinenKk, kuunViimeinenPaiva, ajopaiva, laskeSeura, laskeKaikki, ajastettuKasittelija, LAHDE };
