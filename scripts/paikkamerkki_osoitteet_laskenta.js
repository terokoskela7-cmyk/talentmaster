#!/usr/bin/env node
/**
 * Paikkamerkkiosoitteiden laskenta (read-only, 1.10.2026) — aja ENNEN #700:n Functions-deployta.
 * Käy läpi seurat/{sid}/pelaajat (huoltajaEmail) ja seurat/{sid}/kayttajat (email) ja laskee seuroittain ja
 * domaineittain osumat PAIKKAMERKKI_DOMAINIT-listalle (sama lista kuin functions/paikkamerkki.js).
 * Jos oikeissa seuroissa on osumia, domainlista käydään läpi ennen mergeä (esto koskee myös niitä).
 *
 * Ei kirjoita mitään. Tulostaa vain seuraId:t, domainit ja lukumäärät — EI nimiä, sähköposteja eikä uid:itä.
 * AJO (gcloud ADC, Teron tili):  node scripts/paikkamerkki_osoitteet_laskenta.js
 */
const path = require('path');
const admin = require('firebase-admin');
const { PAIKKAMERKKI_DOMAINIT, sahkopostinDomain, onPaikkamerkkiOsoite } = require(path.join(__dirname, '..', 'functions', 'paikkamerkki.js'));
admin.initializeApp({ projectId: 'talentmaster-pilot' });

/** Osuva listan domain (osoitteen domain tai sen ylätaso, esim. mail.example.fi → example.fi). */
function listanDomain(email) {
  const d = sahkopostinDomain(email);
  return PAIKKAMERKKI_DOMAINIT.find((x) => d === x || d.endsWith('.' + x)) || null;
}

async function laske(kokoelma, kentta) {
  const tulos = {};   // seuraId → { domain → n }
  let kaikki = 0;
  const snap = await admin.firestore().collectionGroup(kokoelma).get();
  for (const d of snap.docs) {
    const seura = d.ref.parent.parent;
    if (!seura || !seura.parent || seura.parent.id !== 'seurat') continue;   // vain seurat/{sid}/<kokoelma>
    kaikki++;
    const email = (d.data() || {})[kentta];
    if (!onPaikkamerkkiOsoite(email)) continue;
    const dom = listanDomain(email);
    tulos[seura.id] = tulos[seura.id] || {};
    tulos[seura.id][dom] = (tulos[seura.id][dom] || 0) + 1;
  }
  return { tulos, kaikki };
}

function tulosta(otsikko, { tulos, kaikki }) {
  console.log('\n' + otsikko + ' (läpikäyty ' + kaikki + ')');
  const seurat = Object.keys(tulos).sort();
  if (!seurat.length) { console.log('  ei osumia'); return; }
  let yht = 0;
  for (const s of seurat) {
    const rivit = Object.entries(tulos[s]).sort((a, b) => b[1] - a[1]);
    const n = rivit.reduce((a, [, x]) => a + x, 0); yht += n;
    console.log('  ' + s.padEnd(22) + String(n).padStart(4) + '   ' + rivit.map(([d, x]) => d + ' ' + x).join(' · '));
  }
  console.log('  ' + 'YHTEENSÄ'.padEnd(22) + String(yht).padStart(4));
}

(async () => {
  console.log('Paikkamerkkidomainit: ' + PAIKKAMERKKI_DOMAINIT.join(', '));
  tulosta('pelaajat.huoltajaEmail', await laske('pelaajat', 'huoltajaEmail'));
  tulosta('kayttajat.email', await laske('kayttajat', 'email'));
  process.exit(0);
})().catch((e) => { console.error('Virhe:', e.message); process.exit(1); });
