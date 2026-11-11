'use strict';
/* trigger_arvio.js — projekti 06 PR 2b: ARVIO Cloud Functions -triggerien kutsuista ja kustannuksesta, kun aineisto kirjoitetaan stagingiin (jos Functions on deployattu).
 * Pure: syöte = laskeSeuroittain():n tulos. EI mittaus — hinnat ja kesto ovat OLETUKSIA (vakiot alla), tarkista hinnastosta ennen päätöstä. Triggerit hyväksytty stagingissa (Tero).
 * Triggerit (functions/index.js, harjoituskertyma.js, kalenteri_viikko.js), jotka laukeavat generaattorin CREATE-kirjoituksista:
 *   · kertymaKirjausOnWrite   — pelaajat/{pid}/kirjaukset/{pvm}        → paivitaViikko: lukee pelaajan + joukkueet + seuran viikon tapahtumat + tapahtumakohtaiset läsnäolot + viikon kirjaukset, kirjoittaa 1 koostedokumentin
 *   · kertymaLasnaolijaOnWrite  — kalenteri/{eid}/lasnaolijat/{pid}      → sama paivitaViikko (+1 luku tapahtumasta)
 *   · notifKalenteriViikko    — kalenteri/{eid} onCreate               → vain kutsut lasketaan (luvut/ilmoitukset eivät arvioitu; ilmoituskanavat estetty stagingissa)
 * onUpdate-triggerit (pelaajat valintaViesti, kalenterin muutos) laukeavat vasta, kun jo olemassa oleva dokumentti ylikirjoitetaan (UUSINTA-ajo samalle aineistolle) → ei laskettu tässä. */
const HINNAT = {
  kutsu: 0.40 / 1e6,                       // Functions gen1: $/kutsu (ilmaiskiintiö 2 M/kk jätetty huomiotta → yläkanttiin)
  laskentaPerKutsu: 0.4 * (0.25 * 0.0000025 + 0.4 * 0.0000100),   // oletus 400 ms · 256 MB (0,25 GB, 0,4 GHz): GB-s $0,0000025 + GHz-s $0,0000100
  luku: 0.06 / 1e5, kirjoitus: 0.18 / 1e5, // Firestore eur3 multi-region: $/luku, $/kirjoitus
};
/* KALIBROITU mittauksella (tests/kuorma_trigger_mittaus.test.js ajaa oikeat käsittelijät muistinvaraista Firestorea vasten; vartija ±15 %):
   paivitaViikko lukee ikkunan ma−1 … su+2 → generoidussa aineistossa (harjoitukset vain ma–pe) 6 arkipäivää / 5 = 1,2 viikkoa tapahtumia; viikon kirjauksia ~100/44 ≈ 2,5. */
const IKKUNA_VIIKKOA = 1.2, KIRJAUKSIA_VIIKOSSA = 2.5, KAUDEN_VIIKOT = 44;

/** → { rivit:[{nimi,kutsuja}], kutsuja, lukuja, kirjoituksia, kulu:{kutsut,laskenta,luvut,kirjoitukset,yht} }. */
function arvioiTriggerit(laskenta) {
  let kirj = 0, las = 0, kal = 0, lukuja = 0;
  for (const s of laskenta.seurat) {
    const tapIkkunassa = s.kalenteri * IKKUNA_VIIKKOA / KAUDEN_VIIKOT;   // seuran tapahtumia 10 pv:n ikkunassa (kalenteri jakautuu tasaisesti 44 viikolle)
    const perKutsu = 2 + s.joukkueet + 2 * tapIkkunassa + KIRJAUKSIA_VIIKOSSA;   // pelaaja + joukkueet + tapahtumat + tapahtumakohtainen läsnäolo-get + viikon kirjaukset (yläkanttiin)
    kirj += s.kirjaukset; las += s.lasnaolijat; kal += s.kalenteri;
    lukuja += (s.kirjaukset + s.lasnaolijat) * perKutsu + s.lasnaolijat;   // + läsnäolijakutsun tapahtumaluku
  }
  const kutsuja = kirj + las + kal, kirjoituksia = kirj + las;   // kertymät: 1 kooste-set per kertymäkutsu
  const kulu = { kutsut: kutsuja * HINNAT.kutsu, laskenta: (kirj + las + kal) * HINNAT.laskentaPerKutsu, luvut: lukuja * HINNAT.luku, kirjoitukset: kirjoituksia * HINNAT.kirjoitus };
  kulu.yht = kulu.kutsut + kulu.laskenta + kulu.luvut + kulu.kirjoitukset;
  return { rivit: [{ nimi: 'kertymaKirjausOnWrite', kutsuja: kirj }, { nimi: 'kertymaLasnaolijaOnWrite', kutsuja: las }, { nimi: 'notifKalenteriViikko', kutsuja: kal }], kutsuja, lukuja: Math.round(lukuja), kirjoituksia, kulu };
}

const _n = (x) => Math.round(x).toLocaleString('fi-FI').replace(/ /g, ' ');
const _usd = (x) => '$' + (x < 10 ? x.toFixed(2) : Math.round(x).toString());
/** Tulosterivit (vain lukumäärät ja summat). */
function muotoile(a) {
  const r = ['Trigger-arvio (jos Functions on deployattu stagingiin; ARVIO, hinnat+kesto oletuksia):'];
  a.rivit.forEach((x) => r.push('  ' + x.nimi.padEnd(26) + _n(x.kutsuja).padStart(11) + ' kutsua'));
  r.push('  ' + 'Firestore-lukuja'.padEnd(26) + _n(a.lukuja).padStart(11) + ' · kirjoituksia ' + _n(a.kirjoituksia));
  r.push('  ' + 'KULU ~' + _usd(a.kulu.yht) + ' (kutsut ' + _usd(a.kulu.kutsut) + ' + laskenta ' + _usd(a.kulu.laskenta) + ' + luvut ' + _usd(a.kulu.luvut) + ' + kirjoitukset ' + _usd(a.kulu.kirjoitukset) + '), lisäksi datan oma kirjoituskulu');
  r.push('  Ilman triggereitä kulu on 0: poista ne ensin (scripts/kuorma/poista_triggerit.js), kirjoita, aja kertymien backfill (taydenna_kertymat.js), deployaa triggerit — ks. STAGING_ASENNUS F.');
  return r;
}
module.exports = { arvioiTriggerit, muotoile, HINNAT };
