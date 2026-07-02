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
  if (tt.lin30m != null || tt.lin10m != null || tt.cmj != null || tt.mas != null || tt.sm_juoksu != null || tt.sm_pallo != null) out.push('fyysinen_hh');
  if (tt.syotto != null || tt.pujottelu != null) out.push('tekniikka_hh');
  return out;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { tmPaivaIso: tmPaivaIso, tmSolustaPvm: tmSolustaPvm, tmOnHHtesti: tmOnHHtesti, tmValitseHhPvm: tmValitseHhPvm, tmTestipaivaPatteristot: tmTestipaivaPatteristot };
}
