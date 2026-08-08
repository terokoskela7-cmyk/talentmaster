/* ══════════════════════════════════════════════════════════════════════════════════════════════════
   tm_tki_core.js — TKI-ytimen kanoninen extrakti (P2.1: VP-TKI pariteetti)

   ⚠ PIDÄ SYNKASSA: docs/testit_indeksit.js — TK_KOKONAISRAJAT (~301) + tkLaskeMerkki (~500) /
   tkLaskeTKI (~517) / tkPituuspotkuBonus (~544) / laskeKokonaistulos (~551). BYTE-USKOLLINEN kopio —
   ÄLÄ paranna kaavoja tässä (konsolidointi = Vaihe 3: testit_indeksit.js lataa tämän → yksi lähde).

   IIFE → EI bare-global-vuotoa → VP:n oma inline-`const TK_KOKONAISRAJAT` (analyysinäkymä) säilyy ilman
   törmäystä. Altistaa TKI-ytimen window.TM_TESTIT-nimiavaruuteen, jonka tm_pikakentat.js:n _resolve lukee
   (f('laskeKokonaistulos', TM_TESTIT) jne.) → tm_pikakentat.js:ään EI tule muutosta.

   Transitiivinen sulkeuma: laskeKokonaistulos → tkPituuspotkuBonus; tkLaskeTKI/tkLaskeMerkki → TK_KOKONAISRAJAT;
   tkPituuspotkuBonus = puhdas kaava. EI tarvita HH_NORMIT / TK_LAJIVIITTEET / TK_LAJITASOT / TK_LAJIT_META.
   ══════════════════════════════════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  // ── BYTE-KOPIO docs/testit_indeksit.js:stä (älä muokkaa; synkkaa kanoniin) ──────────────────────────
  const TK_KOKONAISRAJAT = {
    P: {
      8:  { kulta: 95,  hopea: 105, pronssi: 120 },
      9:  { kulta: 85,  hopea: 100, pronssi: 115 },
      10: { kulta: 100, hopea: 120, pronssi: 140 },
      11: { kulta: 90,  hopea: 110, pronssi: 130 },
      12: { kulta: 80,  hopea: 90,  pronssi: 105 },
      13: { kulta: 75,  hopea: 85,  pronssi: 100 },
    },
    T: {
      8:  { kulta: 110, hopea: 125, pronssi: 140 },
      9:  { kulta: 105, hopea: 120, pronssi: 135 },
      10: { kulta: 110, hopea: 135, pronssi: 155 },
      11: { kulta: 105, hopea: 125, pronssi: 145 },
      12: { kulta: 95,  hopea: 115, pronssi: 135 },
      13: { kulta: 90,  hopea: 110, pronssi: 135 },   // T13 pronssi 130→135 (alueelliset PDF:t §8.8)
    },
  };

  // Merkki KOKONAISTULOKSESTA (sekuntia, pienempi parempi) — ei enää lajikohtainen.
  function tkLaskeMerkki(kokonaistulos, ika, sp, rajatOverride) {
    const rajat = rajatOverride || (TK_KOKONAISRAJAT[sp] || TK_KOKONAISRAJAT['P'])[Math.round(ika)];
    if (!rajat || kokonaistulos == null) return null;
    if (kokonaistulos < rajat.kulta)   return 'kulta';
    if (kokonaistulos < rajat.hopea)   return 'hopea';
    if (kokonaistulos < rajat.pronssi) return 'pronssi';
    return null;
  }

  // TKI 0–100 nelivyöhykkeellä KOKONAISTULOKSESTA (sekuntia, pienempi parempi).
  function tkLaskeTKI(kokonaistulos, ika, sp, rajatOverride) {
    var sukuRajat = rajatOverride || (TK_KOKONAISRAJAT[sp] || TK_KOKONAISRAJAT['P']);
    // rajatOverride voi olla suoraan {kulta,hopea,pronssi} tai sukupuolittainen {P:{8:{...}}}
    var rajat = (rajatOverride && rajatOverride.kulta != null)
      ? rajatOverride
      : (sukuRajat[Math.round(ika)] || null);
    if (!rajat || kokonaistulos == null || kokonaistulos <= 0) return null;
    let tki;
    if (kokonaistulos <= rajat.kulta) {
      // Vyöhyke 4: interpoloi 80→99 kultarajalta kohti ideaalia.
      // Math.min estää ideaalin kasvamisen suuremmaksi kuin kokonaistulos
      const ideaali = Math.min(rajat.kulta * 0.5, kokonaistulos * 0.5);
      tki = 80 + 20 * ((rajat.kulta - kokonaistulos) / (rajat.kulta - ideaali));
      tki = Math.max(80, Math.min(99, tki));
    } else if (kokonaistulos <= rajat.hopea) {
      tki = 60 + 20 * ((rajat.hopea - kokonaistulos) / (rajat.hopea - rajat.kulta));
    } else if (kokonaistulos <= rajat.pronssi) {
      tki = 40 + 20 * ((rajat.pronssi - kokonaistulos) / (rajat.pronssi - rajat.hopea));
    } else {
      const maksimi = rajat.pronssi * 1.5;
      tki = 40 * ((maksimi - kokonaistulos) / (maksimi - rajat.pronssi));
      tki = Math.max(0, tki);
    }
    return Math.round(tki);
  }

  // Pituuspotku-aikabonus: paras potku metreinä / 5, max 20 s.
  function tkPituuspotkuBonus(metrit) {
    if (!metrit || isNaN(metrit) || metrit <= 0) return 0;
    return Math.min(20, metrit / 5);
  }

  // Kokonaistulos sekunteina (pienempi parempi): 4 aikalajia (kuljetus_laukaus.tulos sisältää
  // tarkkuusvähennykset + ennenaikaisrangaistukset), miinus pituuspotku-aikabonus (vain ikä >= 12).
  function laskeKokonaistulos(testit, ika, sp) {
    if (!testit) return null;
    const aikaArvo = (id) => {
      const v = testit[id];
      if (v == null) return null;
      if (typeof v === 'object') return (v.tulos != null ? v.tulos : v.paras);
      return v;
    };
    const lajit = ['ponnauttelu', 'syotto', 'pujottelu', 'kuljetus_laukaus'];
    let summa = 0, n = 0;
    lajit.forEach(id => { const a = aikaArvo(id); if (a != null && !isNaN(a)) { summa += a; n++; } });
    if (n === 0) return null;
    if (ika >= 12) {
      const pp = testit.pituuspotku;
      const metrit = (pp && typeof pp === 'object') ? (pp.metrit != null ? pp.metrit : pp.paras) : pp;
      summa -= tkPituuspotkuBonus(metrit);
    }
    return Math.round(summa * 100) / 100;
  }
  // ── /BYTE-KOPIO ─────────────────────────────────────────────────────────────────────────────────────

  var API = {
    TK_KOKONAISRAJAT: TK_KOKONAISRAJAT,
    laskeKokonaistulos: laskeKokonaistulos, tkLaskeTKI: tkLaskeTKI,
    tkLaskeMerkki: tkLaskeMerkki, tkPituuspotkuBonus: tkPituuspotkuBonus
  };
  // Täydennä TM_TESTIT-nimiavaruus — ÄLÄ ylikirjoita jo olemassa olevaa (esim. Master testit_indeksit.js).
  if (global) {
    global.TM_TESTIT = global.TM_TESTIT || {};
    ['laskeKokonaistulos', 'tkLaskeTKI', 'tkLaskeMerkki', 'tkPituuspotkuBonus'].forEach(function (k) {
      if (typeof global.TM_TESTIT[k] !== 'function') global.TM_TESTIT[k] = API[k];
    });
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
