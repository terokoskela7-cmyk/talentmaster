// Kaavion KOHDISTUS palvelinpuolella — PEILI lib/tm_kaavio_policy.js:n kaavioKohdistuu():stä.
//
// MIKSI KOPIO: `functions/`-hakemisto on ainoa mikä pakataan deployissa (`../lib` ei tule mukaan),
// eikä yhden puhtaan funktion takia kannata rakentaa predeploy-kopiointia. Duplikaatti on
// tietoinen ja kapea — PIDÄ SYNKASSA lib/tm_kaavio_policy.js:n kanssa; pariteetin lukitsee
// tests/kaavio_era_d2_kuittaus.test.js (vertaa molempien totuustaulun).
//
// ⚠ MITÄ TÄMÄ EI OLE: tämä ei ole autentikointi. PIN-pelaaja on Anonymous Auth → CF saa
// pelaajaId:n CLIENTILTÄ (asserted, ks. index.js kuittaaKaavioYmmarretty). Kohdistustarkistus
// kaventaa väärinkäyttöpintaa (vain kaaviot jotka oikeasti kohdistuvat annettuun pelaajaan),
// mutta se ei todista KUKA kutsuja on. Kuittaus on pehmeä sitoutumissignaali, ei todiste.
//
// Puhdas: ei firebase-riippuvuuksia → unit-testattava.

function kaavioKohdistuuServer(doc, pelaaja) {
  if (!doc || !doc.review) return false;
  const r = doc.review, p = pelaaja || {};
  if (r.nakyvyys === 'seura') return !doc.seuraId || doc.seuraId === p.seuraId;
  if (r.nakyvyys === 'joukkue') return !!r.joukkueId && (p.joukkueet || []).indexOf(r.joukkueId) >= 0;
  if (r.nakyvyys === 'pelaaja') return (r.pelaajaIds || []).indexOf(p.pelaajaId) >= 0;
  return false;
}

module.exports = { kaavioKohdistuuServer };
