#!/usr/bin/env node
/* diag_perutut_ilmoitukset.js — VAIN LUKU. Yhden pelaajan "Peruttu"-ilmoitukset: mistä dokumentti on peräisin (kiinteä id vs vanha satunnainen id),
 * mikä polku ratkaisee näkyvyyden (tapahtuma_alkaa / linkitetty tapahtuma / luotu+7 vrk) ja näkyykö rivi nyt (PR #1097:n säännöllä).
 * Selvittää myös tuplat: kaksi riviä samalla nimellä → samaan vai eri tapahtumaan (linkki) ja onko toinen vanha (ei kiinteää id:tä).
 *
 * Ei kirjoita mitään (vain .get()). Tulostaa id:t, tapahtumien nimet ja ajat — ei pelaajan henkilötietoja.
 *
 * Ajo (Tero, gcloud ADC):
 *   node scripts/diag_perutut_ilmoitukset.js --seura=<seuraId> --nimi=Topias        # listaa ehdokkaat (docId + joukkue)
 *   node scripts/diag_perutut_ilmoitukset.js --seura=<seuraId> --pelaaja=<docId>    # raportti
 */
if (require.main !== module) throw new Error('scripts/diag_perutut_ilmoitukset.js käsittelee tuotantodataa — aja suoraan (ei require/import)');
const admin = require('firebase-admin');
const K = require('../lib/tm_kalenteri_ilmoitus.js');

const arg = (n) => { const o = process.argv.slice(2).find((a) => a.indexOf('--' + n + '=') === 0); return o ? o.split('=').slice(1).join('=') : null; };
const SEURA = arg('seura'), PELAAJA = arg('pelaaja'), NIMI = arg('nimi');
if (!SEURA || (!PELAAJA && !NIMI)) { console.error('Käyttö: --seura=<id> (--pelaaja=<docId> | --nimi=<osa nimestä>)'); process.exit(1); }

const fmt = (d) => d ? d.toLocaleString('fi-FI', { timeZone: 'Europe/Helsinki' }) : '—';
const aika = (v) => { if (v == null) return null; if (typeof v.toDate === 'function') return v.toDate(); return null; };

async function main() {
  admin.initializeApp({ credential: admin.credential.applicationDefault() });
  const db = admin.firestore(), seura = db.collection('seurat').doc(SEURA);
  if (!PELAAJA) {
    const s = await seura.collection('pelaajat').get(), n = NIMI.toLowerCase(); let k = 0;
    s.forEach((d) => { const x = d.data(); if ([x.etunimi, x.sukunimi, x.nimi].filter(Boolean).join(' ').toLowerCase().indexOf(n) >= 0) { k++; console.log(d.id + '  joukkue=' + (x.joukkue || (x.joukkueet || []).join(',') || '?')); } });
    console.log(k + ' ehdokasta. Aja uudelleen --pelaaja=<docId>.'); return;
  }
  const nyt = new Date();
  const snap = await seura.collection('pelaajat').doc(PELAAJA).collection('notifikaatiot').orderBy('luotu', 'desc').limit(20).get();   // sama haku kuin sovelluksissa
  const rivit = []; snap.forEach((d) => rivit.push(Object.assign({ id: d.id }, d.data())));
  console.log('Haettu ' + rivit.length + ' ilmoitusta (limit 20, kuten sovellus). Nyt: ' + fmt(nyt) + '\n');
  const evCache = {}, nimet = {};
  for (const n of rivit.filter((r) => r.tyyppi === 'peruttu')) {
    const evId = K.tmIlmoitusEvId(n);
    if (evId && !(evId in evCache)) { const e = await seura.collection('kalenteri').doc(evId).get(); evCache[evId] = e.exists ? e.data() : null; }
    const e = evId ? evCache[evId] : null;
    const evMuoto = e ? Object.assign({ id: evId }, e) : null;
    const polku = n.tapahtuma_alkaa ? 'tapahtuma_alkaa' : (evMuoto && K.tmIlmoitusPeruttuAlku(n, [evMuoto]) ? 'linkitetty tapahtuma' : 'luotu+7vrk');
    const alku = K.tmIlmoitusPeruttuAlku(n, evMuoto ? [evMuoto] : []);
    const nakyy = K.tmIlmoitusNakyvissa(Object.assign({}, n, { luotu: aika(n.luotu), tapahtuma_alkaa: aika(n.tapahtuma_alkaa) }), evMuoto ? [{ id: evId, alkaa: aika(e.alkaa), paattyy: aika(e.paattyy), koko_paiva: e.koko_paiva, pvm: e.pvm }] : [], nyt);
    const kiintea = evId && n.id === 'peruttu_' + evId;
    (nimet[n.teksti] = nimet[n.teksti] || []).push({ id: n.id, evId });
    console.log(n.teksti + '\n  doc-id: ' + n.id + (kiintea ? '  (kiinteä id)' : '  (VANHA/satunnainen id)') + '\n  linkki: ' + (n.linkki || '—') + '  → tapahtuma ' + (e ? ('löytyy: "' + (e.nimi || '?') + '", alkaa ' + fmt(aika(e.alkaa)) + ', tila=' + (e.tila || '—') + (e.poistettu ? ', poistettu' : '')) : 'EI löydy kalenterista')
      + '\n  luotu: ' + fmt(aika(n.luotu)) + '  tapahtuma_alkaa: ' + fmt(aika(n.tapahtuma_alkaa)) + '  luettu: ' + !!n.luettu
      + '\n  polku: ' + polku + (alku ? '  (alkuhetki ' + fmt(alku) + ')' : '') + '\n  → ' + (nakyy ? 'NÄKYY edelleen' : 'katoaa (PR #1097)') + '\n');
  }
  console.log('— Tuplatarkistus (sama teksti useammin) —');
  let tuplia = 0;
  for (const [teksti, l] of Object.entries(nimet)) if (l.length > 1) { tuplia++; console.log(teksti + ': ' + l.length + ' riviä, ' + (new Set(l.map((x) => x.evId)).size === 1 ? 'SAMA tapahtuma (tupla)' : 'ERI tapahtumat (' + l.map((x) => x.evId).join(' / ') + ')')); }
  if (!tuplia) console.log('ei saman tekstin toistoja');
}
main().then(() => process.exit(0), (e) => { console.error(e && e.message || e); process.exit(1); });
