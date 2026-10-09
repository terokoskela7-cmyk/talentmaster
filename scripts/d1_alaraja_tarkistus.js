#!/usr/bin/env node
/* d1_alaraja_tarkistus.js — KUIVA, VAIN LUKU. Onko D1 = 1,0 (esim. KPV P15) asteikon ALARAJA vai aidosti mitattu arvo? (audit 24 §6 kohta 6)
 *
 * Tausta: lib/tm_eerikkila_normit.js eerikkilaTaso() palauttaa 1 KAIKELLE arvolle, joka on heikointa normirajaa huonompi (viimeinen `return 1`),
 * ja 0 kun arvoa ei ole. 1,0 on siis aina MITATUSTA luvusta laskettu alaraja, ei "ei dataa" -oletus. Epäilyttävä on vain, jos raaka-arvo on
 * mahdoton (0, negatiivinen, kymmenkertainen, väärä yksikkö: ms/s, m/s vs km/h) — sen tämä skripti erottaa.
 *
 * Ajo (gcloud ADC, EI palvelutilin avainta; Tero ajaa):
 *   node scripts/d1_alaraja_tarkistus.js                        (oletus: seura kpv, joukkueet joiden nimi sisältää "P15")
 *   node scripts/d1_alaraja_tarkistus.js --seura=kpv --joukkue=P15
 *
 * VAIN .get() — ei set/update/delete/batch/add. Tulosteessa EI nimiä, ID:itä eikä sähköposteja: vain lukumääriä, tasojakaumia ja raaka-arvojen min/mediaani/max.
 * Alaikäisten data: vain luku, aggregaatit (CLAUDE.md §0).
 */
if (require.main !== module) throw new Error('scripts/d1_alaraja_tarkistus.js käsittelee tuotantodataa — aja suoraan (ei require/import)');
const path = require('path');
const admin = require(path.join(__dirname, '..', 'functions', 'node_modules', 'firebase-admin'));
const N = require(path.join(__dirname, '..', 'lib', 'tm_eerikkila_normit.js'));
const argv = process.argv.slice(2);
const arg = (n, d) => { const o = argv.find((a) => a.indexOf('--' + n + '=') === 0); return o ? o.split('=').slice(1).join('=') : d; };
const SEURA = arg('seura', 'kpv');
const JOUKKUE = arg('joukkue', 'P15');

const TESTIT = ['lin5m', 'lin10m', 'lin30m', 'cmj', 'mas', 'kasirata', 'sm_juoksu'];
const med = (a) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };

(async () => {
  admin.initializeApp({ projectId: 'talentmaster-pilot' });
  const db = admin.firestore();
  const snap = await db.collection('seurat').doc(SEURA).collection('pelaajat').get();
  const nytVuosi = new Date().getFullYear();
  const P = snap.docs.map((d) => d.data()).filter((p) => {
    const nimet = [p.joukkue].concat(Array.isArray(p.joukkueetNimet) ? p.joukkueetNimet : []).concat(Array.isArray(p.joukkueet) ? p.joukkueet : []);
    return nimet.some((n) => String(n || '').toUpperCase().indexOf(JOUKKUE.toUpperCase()) >= 0);
  });
  console.log('=== D1-alarajatarkistus · seurat/' + SEURA + ' · joukkue ~ "' + JOUKKUE + '" · pelaajia ' + P.length + ' ===');
  if (!P.length) return;

  const hhTaso = P.map((p) => p.hh_taso).filter((x) => x != null);
  const jak = {}; hhTaso.forEach((x) => { jak[x] = (jak[x] || 0) + 1; });
  console.log('hh_taso asetettu:', hhTaso.length + '/' + P.length, '· jakauma (arvo:lkm):', JSON.stringify(jak));

  console.log('\nTesti      | arvo puuttuu | arvo ≤ 0 | mitattu >0 | taso1 (alaraja) | taso1 / mitattu | raaka min · mediaani · max');
  TESTIT.forEach((t) => {
    const m = N.HH_TESTI_MAP[t]; if (!m) return;
    let puuttuu = 0, eiPositiivinen = 0, mitattu = 0, taso1 = 0; const arvot = [];
    P.forEach((p) => {
      const a = p.hh_viimeisin && p.hh_viimeisin[t];
      if (a == null || a === '') { puuttuu++; return; }
      const x = Number(a);
      if (!isFinite(x) || x <= 0) { eiPositiivinen++; return; }
      mitattu++; arvot.push(x);
      const ika = p.syntymaVuosi ? nytVuosi - p.syntymaVuosi : null, sp = (p.sukupuoli === 'N' || p.sukupuoli === 'T') ? 'N' : 'M';
      if (ika == null) return;
      const taso = N.eerikkilaTaso(m.kmh ? x / 3.6 : x, m.eerikkila, ika, sp);
      if (taso === 1) taso1++;
    });
    console.log(t.padEnd(10), '|', String(puuttuu).padStart(12), '|', String(eiPositiivinen).padStart(8), '|', String(mitattu).padStart(10), '|', String(taso1).padStart(15), '|',
      (mitattu ? Math.round(taso1 / mitattu * 100) + ' %' : '—').padStart(15), '|', arvot.length ? [Math.min.apply(null, arvot), med(arvot), Math.max.apply(null, arvot)].join(' · ') : '—');
  });

  const phvMitattu = P.filter((p) => p.biologinenIka_viimeisin && typeof p.biologinenIka_viimeisin === 'object').length;
  console.log('\nPHV mitattu (biologinenIka_viimeisin):', phvMitattu + '/' + P.length);
  console.log('\nTULKINTA: taso1 > 0 ja raaka-arvot järkeviä (mediaani lähellä muiden ikäluokan arvoja) → 1,0 on aito mitattu ALARAJA (arvo heikointa normirajaa huonompi).');
  console.log('          "arvo ≤ 0" > 0 tai mediaani mahdoton (esim. juoksuaika kymmenkertainen, MAS m/s eikä km/h) → kirjaus-/yksikkövirhe: korjaa lähde, ei johtopäätöstä.');
})().catch((e) => { console.error('Virhe:', e.message); process.exit(1); });
