// docs/kehitysvaihe_tavoitetasot.js
// Kehitysvaihe-tavoitetasot (PHV-offset-kaistat) — Palloliitto/MyE.Way virallinen (Kevät 2025).
// Lähde: kehitysvaihe.xlsx (pojat + tytöt) + materiaali "Kehitysvaihekohtainen harjoittelu ja
//   ominaisuustestien tulkinta". Generoitu suoraan lähteestä (ei käsintranskriptiota).
// Testit: lineaarinopeus 5/10/20/30 m + kevennyshyppy (CMJ, cm) + 1200 m MAS (m/s).
// ⚠ MAS: taulukko on m/s. TalentMaster tallentaa MAS km/h → jaa 3.6 ENNEN vertailua (syötä m/s).
// ⚠ Nopeus/aikatestit: pienempi = parempi. CMJ/MAS: suurempi = parempi.
// ⚠ ARVIO (2 solua, pojat P>+1): lähteessä (Eerikkilä/MyE.Way) data-syöttövirhe → korvattu
//   MONOTONISELLA ARVIOLLA (suhteellinen interpolointi naapurikaistoista). Ks. ARVIOT-rekisteri.
//   Bugi ilmoitettu Eerikkilään 2026-07 → VAIHDA viralliseen arvoon kun vahvistettu (yksi rivi/solu).
//     - lin20m P>+1 taso3: lähteessä 3.08 (=taso4, saavuttamaton) → ARVIO 3.12
//     - lin30m P>+1 taso3: lähteessä 4.52 (>taso2 4.46, käänteinen) → ARVIO 4.33
// Verifioitu s.18 pariteettiankkureilla: Pelaaja A 10m 1.81 offset -0.5 → 4; Pelaaja B 10m 1.78 offset +1.7 → 2.
// PHV-kaistat (materiaali s.16): o<-2 | -2..-1 | -1..0 | 0..+1 | >+1  (o = maturity_offset, Mirwald §25).
// ÄLÄ muuta muita lukuja ilman virallista lähdettä (sama kuri kuin -9.3236 / -20.3 / TK-viitteet).
(function (g) {
  var KAISTAT = [
    { id: 0, min: -Infinity, max: -2, label: '< -2',  vaihe: 'PRE-PHV'  },
    { id: 1, min: -2, max: -1, label: '-2\u2026-1', vaihe: 'MID-PHV' },
    { id: 2, min: -1, max: 0,  label: '-1\u20260',  vaihe: 'MID-PHV' },
    { id: 3, min: 0,  max: 1,  label: '0\u2026+1',  vaihe: 'MID-PHV' },
    { id: 4, min: 1,  max: Infinity, label: '> +1',  vaihe: 'POST-PHV' }
  ];
  function phvKaista(o) {
    if (o == null || isNaN(o)) return null;
    for (var i = 0; i < KAISTAT.length; i++) { if (o < KAISTAT[i].max) return KAISTAT[i].id; }
    return 4;
  }
  // ARVIO-solut (lähdevirhe → monotoninen interpolointi). Vaihdettava viralliseen kun Eerikkilä vahvistaa.
  var ARVIOT = [
    { sp:"P", testi:"lin20m", kaista:4, taso:3, arvo:3.12, syy:"taso4=taso3=3.08 lähteessä (taso3 saavuttamaton)" },
    { sp:"P", testi:"lin30m", kaista:4, taso:3, arvo:4.33, syy:"taso3=4.52 > taso2=4.46 lähteessä (käänteinen)" }
  ];
  var TAULUKOT = {
    P: {
    lin5m:{suunta:"pienempi",kaistat:[{"5":1.07,"4":1.11,"3":1.14,"2":1.18},{"5":1.05,"4":1.08,"3":1.1,"2":1.14},{"5":1.0,"4":1.04,"3":1.07,"2":1.11},{"5":0.96,"4":1.0,"3":1.03,"2":1.07},{"5":0.94,"4":0.98,"3":1.01,"2":1.05}]}},
    lin10m:{suunta:"pienempi",kaistat:[{"5":1.89,"4":1.95,"3":2.01,"2":2.07},{"5":1.83,"4":1.89,"3":1.94,"2":2.0},{"5":1.78,"4":1.84,"3":1.89,"2":1.95},{"5":1.71,"4":1.77,"3":1.82,"2":1.88},{"5":1.68,"4":1.73,"3":1.77,"2":1.82}]}},
    lin20m:{suunta:"pienempi",kaistat:[{"5":3.39,"4":3.5,"3":3.59,"2":3.7},{"5":3.26,"4":3.35,"3":3.43,"2":3.53},{"5":3.14,"4":3.24,"3":3.33,"2":3.43},{"5":3.01,"4":3.11,"3":3.2,"2":3.3},{"5":2.92,"4":3.08,"3":3.12,"2":3.17}]}},
    lin30m:{suunta:"pienempi",kaistat:[{"5":4.82,"4":4.97,"3":5.12,"2":5.29},{"5":4.61,"4":4.74,"3":4.87,"2":5.02},{"5":4.44,"4":4.59,"3":4.72,"2":4.88},{"5":4.24,"4":4.39,"3":4.52,"2":4.68},{"5":4.12,"4":4.23,"3":4.33,"2":4.46}]}},
    cmj:{suunta:"suurempi",kaistat:[{"5":27.4,"4":25.2,"3":23.3,"2":20.9},{"5":30.2,"4":27.8,"3":25.7,"2":23.2},{"5":32.2,"4":29.6,"3":27.2,"2":24.4},{"5":35.1,"4":32.3,"3":29.9,"2":26.9},{"5":38.9,"4":35.9,"3":33.2,"2":30.0}]}},
    mas:{suunta:"suurempi",kaistat:[{"5":4.17,"4":4.05,"3":3.94,"2":3.81},{"5":4.25,"4":4.13,"3":4.02,"2":3.9},{"5":4.33,"4":4.21,"3":4.11,"2":3.98},{"5":4.53,"4":4.41,"3":4.3,"2":4.18},{"5":4.61,"4":4.49,"3":4.39,"2":4.26}]}}
    },
    T: {
    lin5m:{suunta:"pienempi",kaistat:[{"5":1.13,"4":1.16,"3":1.18,"2":1.22},{"5":1.11,"4":1.14,"3":1.16,"2":1.2},{"5":1.09,"4":1.12,"3":1.14,"2":1.18},{"5":1.06,"4":1.09,"3":1.11,"2":1.15},{"5":1.03,"4":1.06,"3":1.08,"2":1.12}]}},
    lin10m:{suunta:"pienempi",kaistat:[{"5":2.02,"4":2.07,"3":2.11,"2":2.16},{"5":1.98,"4":2.03,"3":2.07,"2":2.12},{"5":1.92,"4":1.98,"3":2.03,"2":2.09},{"5":1.86,"4":1.92,"3":1.97,"2":2.03},{"5":1.83,"4":1.88,"3":1.92,"2":1.97}]}},
    lin20m:{suunta:"pienempi",kaistat:[{"5":3.63,"4":3.72,"3":3.8,"2":3.9},{"5":3.51,"4":3.61,"3":3.7,"2":3.8},{"5":3.43,"4":3.54,"3":3.63,"2":3.74},{"5":3.31,"4":3.42,"3":3.51,"2":3.62},{"5":3.22,"4":3.32,"3":3.41,"2":3.51}]}},
    lin30m:{suunta:"pienempi",kaistat:[{"5":5.21,"4":5.34,"3":5.47,"2":5.62},{"5":5.03,"4":5.18,"3":5.32,"2":5.48},{"5":4.85,"4":5.02,"3":5.18,"2":5.37},{"5":4.71,"4":4.86,"3":5.01,"2":5.18},{"5":4.59,"4":4.72,"3":4.85,"2":5.0}]}},
    cmj:{suunta:"suurempi",kaistat:[{"5":26.6,"4":23.9,"3":21.5,"2":18.6},{"5":26.3,"4":23.9,"3":21.7,"2":19.1},{"5":27.2,"4":24.8,"3":22.7,"2":20.1},{"5":28.6,"4":26.4,"3":24.4,"2":22.0},{"5":29.6,"4":27.4,"3":25.4,"2":23.0}]}},
    mas:{suunta:"suurempi",kaistat:[{"5":3.69,"4":3.58,"3":3.47,"2":3.34},{"5":3.78,"4":3.66,"3":3.55,"2":3.43},{"5":3.89,"4":3.77,"3":3.66,"2":3.54},{"5":3.97,"4":3.85,"3":3.75,"2":3.62},{"5":4.05,"4":3.94,"3":3.83,"2":3.7}]}}
    }
  };
  function _sp(sp){ if(!sp) return null; sp=String(sp).toUpperCase(); if(sp==='M'||sp==='P')return 'P'; if(sp==='N'||sp==='T')return 'T'; return null; }
  // arvo: testin natiiviyksikkö; MAS syötä m/s (km/h -> /3.6 ennen kutsua). offset = maturity_offset (Mirwald).
  function kehitysvaiheTaso(arvo, testi, offset, sp) {
    if (arvo == null || isNaN(arvo)) return null;
    var s = _sp(sp); if (!s) return null;
    var band = phvKaista(offset); if (band == null) return null;
    var t = TAULUKOT[s] && TAULUKOT[s][testi]; if (!t) return null;
    var cell = t.kaistat[band]; if (!cell) return null;
    for (var i = 0; i < 4; i++) {
      var L = [5,4,3,2][i]; var thr = cell[L];
      if (thr == null) return null;
      if (t.suunta === 'pienempi') { if (arvo <= thr) return L; }
      else { if (arvo >= thr) return L; }
    }
    return 1;
  }
  // Onko (sp,testi,band) ARVIO-solun peittämä (UI voi merkitä "* arvio")?
  function onArvio(testi, band, sp) {
    var s=_sp(sp); if(!s) return false;
    for (var i=0;i<ARVIOT.length;i++){ var a=ARVIOT[i]; if(a.sp===s && a.testi===testi && a.kaista===band) return true; }
    return false;
  }
  g.TM_KEHITYSVAIHE = { KAISTAT: KAISTAT, ARVIOT: ARVIOT, phvKaista: phvKaista, TAULUKOT: TAULUKOT, kehitysvaiheTaso: kehitysvaiheTaso, onArvio: onArvio };
  if (typeof module !== 'undefined' && module.exports) module.exports = g.TM_KEHITYSVAIHE;
})(typeof window !== 'undefined' ? window : globalThis);
