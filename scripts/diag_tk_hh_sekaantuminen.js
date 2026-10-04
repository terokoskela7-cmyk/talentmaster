#!/usr/bin/env node
/* diag_tk_hh_sekaantuminen.js — KUIVA, VAIN LUKU (PR G, 4.10.2026). Ennen PR G:tä vanha Excel-tuonti ja Testituonti saattoivat
 * viedä H-H-pujottelun/-syötön (FINAL2024, ~10–15 s) tekniikkakisan (TK, ~22–45 s) kenttiin. Tämä listaa pelaajat, joiden
 * TK-kentissä on TODENNÄKÖISESTI H-H-arvo — korjaus (recalc / VP-rebuild) tehdään vasta Teron hyväksynnän jälkeen.
 *
 * Ajo (gcloud ADC, EI palvelutilin avainta):
 *   node scripts/diag_tk_hh_sekaantuminen.js                 (kaikki seurat)
 *   node scripts/diag_tk_hh_sekaantuminen.js --seura=kpv
 *
 * VAIN .get() — ei set/update/delete/batch/add. Tulosteessa EI nimiä: vain seura + doc-ID + kenttä + arvot + peruste.
 *
 * Tunnistus (puhdas funktio tmTkHhEpaily, testattu tests/tk_protokolla_viitelahde.test.js):
 *   A "sama arvo"   — tk_lajit_viimeisin.<laji>_s === hh_viimeisin.<laji> (sama luku molemmissa → yksi syöte kahteen kenttään)
 *   B "mittakaava"  — <laji>_s / TK-viitteen hyvä (alueellinen, ikä tk_lajit_pvm:n vuodesta) < 0.6 (H-H-mittakaava TK-kentässä)
 *   C "historia"    — tki_historia[].<laji>(_s) mittakaava < 0.6
 * Lajit: pujottelu, syotto (vain nämä kaksi ovat sekä H-H- että TK-testejä).
 */
const path = require('path');

const LAJIT = ['pujottelu', 'syotto'];
const RAJA = 0.6;

// PUHDAS: pelaajadoc + viitefunktio → [{ kentta, arvo, viite, peruste }]
function tmTkHhEpaily(d, viiteFn, nytVuosi) {
  const out = [];
  if (!d || typeof d !== 'object') return out;
  const sp = (String(d.sukupuoli || '').toUpperCase() === 'N') ? 'T' : 'P';
  const ikaVuonna = (pvm) => {
    const v = parseInt(String(pvm || '').slice(0, 4), 10);
    const y = isNaN(v) ? nytVuosi : v;
    return d.syntymaVuosi ? (y - Number(d.syntymaVuosi)) : null;
  };
  const tk = d.tk_lajit_viimeisin || {}, hh = d.hh_viimeisin || {};
  LAJIT.forEach((laji) => {
    const a = tk[laji + '_s'];
    if (a == null || isNaN(Number(a))) return;
    const ika = ikaVuonna(d.tk_lajit_pvm);
    const v = (ika != null) ? viiteFn(laji, ika, sp) : null;
    if (hh[laji] != null && Number(hh[laji]) === Number(a)) out.push({ kentta: 'tk_lajit_viimeisin.' + laji + '_s', arvo: Number(a), viite: v ? v.hyva : null, peruste: 'A sama arvo kuin hh_viimeisin.' + laji });
    else if (v && v.hyva > 0 && Number(a) / v.hyva < RAJA) out.push({ kentta: 'tk_lajit_viimeisin.' + laji + '_s', arvo: Number(a), viite: v.hyva, peruste: 'B mittakaava ' + (Number(a) / v.hyva).toFixed(2) + ' < ' + RAJA });
  });
  (Array.isArray(d.tki_historia) ? d.tki_historia : []).forEach((h) => {
    if (!h) return;
    LAJIT.forEach((laji) => {
      const a = h[laji + '_s'] != null ? h[laji + '_s'] : h[laji];
      if (a == null || isNaN(Number(a))) return;
      const ika = ikaVuonna(h.pvm);
      const v = (ika != null) ? viiteFn(laji, ika, sp) : null;
      if (v && v.hyva > 0 && Number(a) / v.hyva < RAJA) out.push({ kentta: 'tki_historia[' + (h.pvm || '?') + '].' + laji, arvo: Number(a), viite: v.hyva, peruste: 'C historia mittakaava ' + (Number(a) / v.hyva).toFixed(2) });
    });
  });
  return out;
}

async function main() {
  const argv = process.argv.slice(2);
  const arg = (n, d) => { const o = argv.find((x) => x.indexOf('--' + n + '=') === 0); return o ? o.split('=').slice(1).join('=') : d; };
  const SEURA = arg('seura', null);
  const T = require(path.join(__dirname, '..', 'docs', 'testit_indeksit.js'));
  const viiteFn = (laji, ika, sp) => T.tkLajiViite(laji, ika, sp, 'alueellinen');
  const admin = require(path.join(__dirname, '..', 'functions', 'node_modules', 'firebase-admin'));
  admin.initializeApp({ projectId: 'talentmaster-pilot' });
  const db = admin.firestore();
  const seurat = SEURA ? [SEURA] : (await db.collection('seurat').get()).docs.map((s) => s.id);
  const nyt = new Date().getFullYear();
  const yht = {};
  for (const sid of seurat) {
    const snap = await db.collection('seurat').doc(sid).collection('pelaajat').get();
    let n = 0;
    snap.forEach((doc) => {
      const e = tmTkHhEpaily(doc.data(), viiteFn, nyt);
      if (!e.length) return;
      n++;
      e.forEach((x) => console.log([sid, doc.id, x.kentta, x.arvo, 'TK-hyvä ' + (x.viite != null ? x.viite : '—'), x.peruste].join(' | ')));
    });
    yht[sid] = { pelaajia: snap.size, epailtyja: n };
  }
  console.log('\nYHTEENVETO per seura (pelaajia / epäiltyjä):');
  Object.keys(yht).forEach((s) => console.log('  ' + s + ': ' + yht[s].pelaajia + ' / ' + yht[s].epailtyja));
  console.log('\nVAIN LUKU — mitään ei kirjoitettu. Korjaus (recalc / VP-rebuild) vasta Teron hyväksynnän jälkeen.');
}

if (require.main === module) main().catch((e) => { console.error('VIRHE', e.message); process.exit(1); });
module.exports = { tmTkHhEpaily };
