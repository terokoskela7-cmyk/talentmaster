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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { tmPaivaIso: tmPaivaIso, tmSolustaPvm: tmSolustaPvm };
}
