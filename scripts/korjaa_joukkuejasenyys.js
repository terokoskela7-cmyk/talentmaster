#!/usr/bin/env node
/**
 * §18 — kertaluontoinen data-siivous: nimi ja joukkueet[] synkkaan.
 *
 * Korjaukset A (Admin-tuonti) ja B (Seura-rekisteröinti) estävät epäsuhdan syntymisen
 * JATKOSSA. Tämä skripti korjaa jo syntyneet kolme rikkinäistä muotoa:
 *   (a) nimi = uusi joukkue, joukkueet[] = vanha id   (uudelleentuonti päivitti vain nimen)
 *   (b) joukkueet[] = [NIMI]                          (rekisteröinti kirjoitti nimen id:n paikalle)
 *   (c) joukkueet[] puuttuu kokonaan                  (tuonti ei kirjoittanut sitä)
 *
 * PERIAATTEET
 *  - Kohdistuu VAIN pelaajiin, joiden `joukkue`-nimi vastaa oikeaa team-docia. Orpoja EI
 *    arvata: nimi voi olla kirjoitusvirhe tai joukkue voi puuttua kokonaan, ja väärä
 *    jäsenyys on pahempi kuin puuttuva. Orvot listataan erikseen päätöstä varten.
 *  - Rakenne tehdään samalla jaetulla funktiolla kuin tuonnissa ja rekisteröinnissä
 *    (lib/tm_joukkue.js → tmJoukkueJasenyys), joten siivous ei voi tuottaa eri muotoa.
 *  - DRY-RUN OLETUS. `--kirjoita` tallentaa. Idempotentti: jo ehjät ohitetaan.
 *
 * Käyttö:
 *   node scripts/korjaa_joukkuejasenyys.js --seura=sibbovargarna
 *   node scripts/korjaa_joukkuejasenyys.js --seura=sibbovargarna --kirjoita
 *   node scripts/korjaa_joukkuejasenyys.js --kaikki
 */
'use strict';

const admin = require('firebase-admin');
const { tmJoukkueJasenyys } = require('../lib/tm_joukkue.js');

const argv = process.argv.slice(2);
const lippu = (n) => argv.some((a) => a === '--' + n);
const arvo = (n) => {
  const o = argv.find((a) => a.indexOf('--' + n + '=') === 0);
  return o ? o.split('=').slice(1).join('=') : null;
};

const KIRJOITA = lippu('kirjoita');
const KAIKKI = lippu('kaikki');
const SEURA = arvo('seura');

let db = null;
function alusta() {
  if (!SEURA && !KAIKKI) {
    console.error('Anna --seura=<id> tai --kaikki. Oletus on dry-run; --kirjoita tallentaa.');
    process.exit(1);
  }
  if (!admin.apps.length) admin.initializeApp();
  db = admin.firestore();
}

/** Mikä on rikki? Palauttaa null, jos pelaaja on jo ehjä. Puhdas funktio → testattavissa. */
function diagnoosi(pelaaja, jasenyys) {
  const nyt = Array.isArray(pelaaja.joukkueet) ? pelaaja.joukkueet : null;
  if (!jasenyys || jasenyys.orpo || !jasenyys.id) return null;   // orpoa ei korjata arvaamalla
  if (!nyt || !nyt.length) return 'puuttuu';                      // (c)
  if (nyt.length === 1 && nyt[0] === jasenyys.id) return null;    // jo ehjä
  if (nyt.some((x) => x === jasenyys.joukkue)) return 'nimi_idn_paikalla';   // (b)
  return 'vanha_id';                                              // (a)
}

async function seuranJoukkueet(sid) {
  const s = await db.collection('seurat').doc(sid).collection('joukkueet').get();
  return s.docs.map((d) => ({ id: d.id, nimi: (d.data() || {}).nimi || d.id }));
}

async function aja() {
  const seurat = SEURA ? [SEURA] : (await db.collection('seurat').get()).docs.map((d) => d.id);
  let korjattu = 0, ehjia = 0, orpoja = 0;
  const orpoNimet = {};
  for (const sid of seurat) {
    const lista = await seuranJoukkueet(sid);
    const pelaajat = await db.collection('seurat').doc(sid).collection('pelaajat').get();
    for (const pd of pelaajat.docs) {
      const p = pd.data() || {};
      const nimi = p.joukkue || p.joukkueNimi || '';
      if (!nimi) continue;
      const j = tmJoukkueJasenyys(nimi, lista);
      if (j.orpo) {
        orpoja += 1;
        orpoNimet[j.joukkue] = (orpoNimet[j.joukkue] || 0) + 1;
        console.log('  [orpo] %s/%s "%s" — ei vastaa yhtään joukkuetta (päätös: luo joukkue tai korjaa nimi)',
          sid, pd.id, j.joukkue);
        continue;
      }
      const vika = diagnoosi(p, j);
      if (!vika) { ehjia += 1; continue; }
      korjattu += 1;
      if (KIRJOITA) {
        await pd.ref.update({
          joukkue: j.joukkue, joukkueNimi: j.joukkueNimi,
          joukkueet: j.joukkueet, joukkueetNimet: j.joukkueetNimet,
          muokattu: admin.firestore.FieldValue.serverTimestamp(),
        });
      } else {
        console.log('  [dry] %s/%s (%s) "%s": %j → %j', sid, pd.id, vika, j.joukkue,
          p.joukkueet || null, j.joukkueet);
      }
    }
  }
  console.log('%s: %d korjattu · %d jo ehjää · %d orpoa',
    KIRJOITA ? 'KIRJOITETTU' : 'DRY-RUN', korjattu, ehjia, orpoja);
  const nimet = Object.keys(orpoNimet);
  if (nimet.length) {
    console.log('  orvot nimittäin: %s', nimet.map((n) => n + ' (' + orpoNimet[n] + ')').join(', '));
    console.log('  → nämä vaativat päätöksen: luo joukkue tai korjaa nimi. Ei automaattista arvausta.');
  }
}

if (require.main === module) {
  alusta();
  aja().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { diagnoosi };
