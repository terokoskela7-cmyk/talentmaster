// tm_pvm.js — Excel-päivämääräsolun normalisointi (#61). Jaettu, testattava (EI Firebase-riippuvuutta).
//
// Excel-date-solu palautuu SheetJS:ltä NUMERONA (sarjanumero esim. 45930), Date-oliona tai tekstinä — ei aina tekstinä.
// String(45930) → new Date("45930") = vuosi 45930 → "45930-01-01" -bugi. tmSolustaPvm/tmPaivaIso normalisoi.
// tmPaivaIso: timezone-safe ISO-päivä (CLAUDE.md §11 oppi #2) — EI toISOString().slice(0,10) (UTC siirtää EET klo 22+).

function tmPaivaIso(d) {
  if (!d) return null;
  // Excel-sarjanumero (date-solu ilman cellDates). Epookki 1899-12-30 (SheetJS day 0); 25569 = 1970-01-01.
  if (typeof d === 'number' && isFinite(d) && d > 59 && d < 100000) {
    if (typeof XLSX !== 'undefined' && XLSX.SSF && XLSX.SSF.parse_date_code) {
      var o = XLSX.SSF.parse_date_code(d);
      if (o && o.y) return o.y + '-' + String(o.m).padStart(2, '0') + '-' + String(o.d).padStart(2, '0');
    }
    var dt = new Date(Math.round((d - 25569) * 86400000));
    if (!isNaN(dt.getTime())) return dt.getUTCFullYear() + '-' + String(dt.getUTCMonth() + 1).padStart(2, '0') + '-' + String(dt.getUTCDate()).padStart(2, '0');
  }
  // pelkkä 4–6-numeroinen merkkijono joka näyttää Excel-sarjanumerolta → käsittele numerona (ei vuotena)
  if (typeof d === 'string' && /^\d{4,6}$/.test(d.trim()) && Number(d) > 20000 && Number(d) < 100000) return tmPaivaIso(Number(d));
  if (typeof d === 'string') {
    var ymd = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (ymd) return ymd[1] + '-' + ymd[2] + '-' + ymd[3];
    var fi = d.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    if (fi) return fi[3] + '-' + String(fi[2]).padStart(2, '0') + '-' + String(fi[1]).padStart(2, '0');
    var parsed = new Date(d);
    if (!isNaN(parsed.getTime())) d = parsed;
    else return null;
  }
  if (!(d instanceof Date) || isNaN(d.getTime())) return null;
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

// Solu-arvo → ISO-pvm jos numero/Date (sarjanumero/Date-olio); teksti palautetaan trimmattuna (esim. "Kevät 2026").
function tmSolustaPvm(v) {
  if (v == null || v === '') return '';
  if (typeof v === 'number' || v instanceof Date) return tmPaivaIso(v) || '';
  return String(v).trim();
}

// Onko testitulos-doc H-H-testi (vaikuttaa hh_viimeisin:iin): fyysinen (lin/cmj/mas/sm) TAI H-H-tekniikka
// (syöttö/pujottelu). EI tekniikkakilpailu (TKI on oma patteristo). d = { protokolla, testit }.
function tmOnHHtesti(d) {
  var pr = String((d && d.protokolla) || '').toLowerCase();
  if (pr === 'tekniikkakilpailu') return false;
  if (pr.indexOf('hh') === 0) return true;
  var tt = (d && d.testit) || {};
  return tt.lin30m != null || tt.lin10m != null || tt.cmj != null || tt.mas != null
      || tt.sm_juoksu != null || tt.sm_pallo != null || tt.syotto != null || tt.pujottelu != null;
}

// hh_pvm A-semantiikka: VIIMEISIN (max) vaikuttanut H-H-testipäivä. testDocs: [{protokolla, testit, pvm(ISO)}].
// nykyPvm: nykyinen hh_pvm (ISO|null). Palauttaa uuden pvm:n TAI null (ei muutosta) jos nykyPvm on jo >= max
// (EI KOSKAAN backdate — merge-pelaajaa (fys 5.6. + tekn 9.6.) ei taaksepäin-datays 5.6.:een).
function tmValitseHhPvm(testDocs, nykyPvm) {
  var pvmt = (testDocs || []).filter(function (x) { return x && x.pvm && tmOnHHtesti(x); })
    .map(function (x) { return String(x.pvm); })
    .sort(function (a, b) { return b.localeCompare(a); });   // uusin ensin
  if (!pvmt.length) return null;
  var maxPvm = pvmt[0];
  if (nykyPvm != null && String(nykyPvm) >= maxPvm) return null;   // jo OK / ei backdate
  return maxPvm;
}

// Mihin testipaivat-patteristo(i)hin testitulos-doc kuuluu (§26 per-patteristo-pvm): fyysinen_hh / tekniikka_hh / tki.
// d = { protokolla, testit }. tekniikkakilpailu → ['tki'] (EI tekniikka_hh, vaikka syotto/pujottelu). H-H-doc voi
// kuulua molempiin (hh_laaja: fyysinen + syöttö/pujottelu). PHV käsitellään erikseen (biologinen_ika, ei testit).
function tmTestipaivaPatteristot(d) {
  var out = [];
  var pr = String((d && d.protokolla) || '').toLowerCase();
  var tt = (d && d.testit) || {};
  if (pr === 'tekniikkakilpailu') { out.push('tki'); return out; }
  var has = function () { for (var i = 0; i < arguments.length; i++) { if (tt[arguments[i]] != null) return true; } return false; };
  // KENTTÄPOHJAINEN (normalisoidut nimet + test-ID-variantit `_hh`/`lin_`/`hyppy_`) — testitulokset-doc käyttää
  // test-ID:tä (esim. syotto_hh/pujottelu_hh), hh_viimeisin normalisoituja (syotto/pujottelu). Tue molempia.
  if (has('lin30m', 'lin_30m', 'lin10m', 'lin_10m', 'lin5m', 'lin_5m', 'cmj', 'hyppy_cj', 'sj', 'hyppy_sj', 'mas', 'sm_juoksu', 'sm_pallo')) out.push('fyysinen_hh');
  if (has('syotto', 'syotto_hh', 'pujottelu', 'pujottelu_hh')) out.push('tekniikka_hh');
  return out;
}

// ── Datan tuoreus (VP: "Päivitä mittaus" -kehys) ──────────────────────────────
// Nuorten testisykli 2–3×/v → >6 kk = väliin jäänyt kierros → mittaus vanha. EI muuta arviointia (taso = tilannekuva
// testihetkestä, §26 normiIka) — puhtaasti esityskerros. refIso valinnainen (testeille deterministinen; oletus nyt).
var TUOREUS_KK = 6;
function _tmParsePvm(v) {
  if (v == null || v === '') return null;
  var s = (typeof v === 'string') ? v : (tmPaivaIso(v) || '');
  var m = String(s).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3]);
}
// Kokonaisia kuukausia mittauksesta referenssihetkeen (näyttöä varten). null jos pvm puuttuu/virheellinen.
function tmKuukausiaMittauksesta(pvmIso, refIso) {
  var d = _tmParsePvm(pvmIso); if (!d) return null;
  var ref = (refIso != null) ? _tmParsePvm(refIso) : new Date();
  if (!ref) ref = new Date();
  // Kalenterikuukausien ero (kk-tarkkuus; nuorten testisyklille riittävä, vrt. spec "3.10.2025 → ~9 kk").
  var kk = (ref.getFullYear() - d.getFullYear()) * 12 + (ref.getMonth() - d.getMonth());
  return kk < 0 ? 0 : kk;
}
// Onko mittaus vanha (> TUOREUS_KK kk). null/puuttuva pvm → false (ei merkkiä, ei "vanha").
function tmOnVanhaMittaus(pvmIso, refIso) {
  var kk = tmKuukausiaMittauksesta(pvmIso, refIso);
  return kk != null && kk > TUOREUS_KK;
}
// ISO-pvm → suomalainen pp.kk.vvvv (Osa 5: EI ISO/kk-pp näytöllä). '' jos ei parsittavissa.
function tmPvmFi(pvmIso) {
  var d = _tmParsePvm(pvmIso); if (!d) return '';
  return d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    tmPaivaIso: tmPaivaIso, tmSolustaPvm: tmSolustaPvm, tmOnHHtesti: tmOnHHtesti, tmValitseHhPvm: tmValitseHhPvm,
    tmTestipaivaPatteristot: tmTestipaivaPatteristot,
    TUOREUS_KK: TUOREUS_KK, tmKuukausiaMittauksesta: tmKuukausiaMittauksesta, tmOnVanhaMittaus: tmOnVanhaMittaus, tmPvmFi: tmPvmFi,
  };
}
