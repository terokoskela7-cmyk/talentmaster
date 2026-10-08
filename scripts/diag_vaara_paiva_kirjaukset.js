#!/usr/bin/env node
/* diag_vaara_paiva_kirjaukset.js — KUIVA, VAIN LUKU. Montako kirjaukset/{pvm}-dokumenttia on (todennäköisesti) UTC-päivällä?
 * Vanhempi_v2 käytti doc-ID:nä UTC-päivää (toISOString().slice(0,10)); Pelaaja_v7/Solo/VP paikallista. Kirjauksella on luotu (serverTimestamp):
 *   luotu → Helsingin päivä vs UTC-päivä. "Väärä" = doc-ID == UTC-päivä JA ≠ Helsingin päivä (kirjaus tehty klo 00–03 → meni edelliselle päivälle).
 * Ajo (ADC): node scripts/diag_vaara_paiva_kirjaukset.js [--seura=kpv]
 * Tulostaa vain lukumäärät (lähteittäin), ei nimiä/id:itä. Ei kirjoita mitään.
 */
if (require.main !== module) throw new Error('scripts/diag_vaara_paiva_kirjaukset.js käsittelee tuotantodataa — aja suoraan: node scripts/diag_vaara_paiva_kirjaukset.js (ei require/import)');   // vahinkoajon esto (S1)
const path = require('path');
const admin = require(path.join(__dirname, '..', 'functions', 'node_modules', 'firebase-admin'));
const arg = (n) => { const o = process.argv.slice(2).find((a) => a.indexOf('--' + n + '=') === 0); return o ? o.split('=').slice(1).join('=') : null; };
const fmt = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Helsinki', year: 'numeric', month: '2-digit', day: '2-digit' });
(async () => {
  admin.initializeApp({ projectId: 'talentmaster-pilot' });
  const db = admin.firestore();
  const seurat = arg('seura') ? [await db.collection('seurat').doc(arg('seura')).get()] : (await db.collection('seurat').get()).docs;
  const yht = { dokumentteja: 0, ilmanLuotu: 0, taysmaa: 0, vaaraUtcPaiva: 0, muuEro: 0 };
  const lahteittain = {};
  for (const s of seurat) {
    const ps = await s.ref.collection('pelaajat').get();
    for (const p of ps.docs) {
      const ks = await p.ref.collection('kirjaukset').get();
      ks.forEach((k) => {
        yht.dokumentteja++;
        const d = k.data(); const t = d.luotu && d.luotu.toDate ? d.luotu.toDate() : null;
        const lahde = d.lahde || 'pelaaja/muu';
        const L = (lahteittain[lahde] = lahteittain[lahde] || { yht: 0, vaara: 0 }); L.yht++;
        if (!t) { yht.ilmanLuotu++; return; }
        const hki = fmt.format(t), utc = t.toISOString().slice(0, 10);
        if (k.id === hki) yht.taysmaa++;
        else if (k.id === utc) { yht.vaaraUtcPaiva++; L.vaara++; }
        else yht.muuEro++;   // esim. luotu ≠ kirjauspäivä (jälkikirjaus) — ei UTC-ilmiö
      });
    }
  }
  console.log('seuroja:', seurat.length); console.log(yht); console.log('lähteittäin:', lahteittain);
})().catch((e) => { console.error('VIRHE:', e.message); process.exit(1); });
