/* ════════════════════════════════════════════════════════════════════════
   suostumus_tarkistus.js — vahvistaSuostumus: kohdistuuko lomake tunnisteen osoittamaan pelaajaan?
   (sisarusbugi 30.9.2026)

   Vika: Seura-sivu kohdisti toisen lapsen kutsun huoltajan ensimmäiselle lapselle (sähköpostihaku),
   ja vahvistaSuostumus kirjoitti toisen lapsen syntymäajan, sukupuolen ja suostumuksen ensimmäiselle.
   Sähköposti täsmäsi (sama huoltaja), joten sähköpostitarkistus ei riittänyt.

   Säännöt:
     · Lomakkeen ETUNIMI ≠ tallennettu etunimi (normalisoitu) → ristiriita.
     · Lomakkeen SYNTYMÄAIKA ≠ tallennettu syntymäaika (päivä UTC) → ristiriita. Jos tallennettuna on
       vain syntymaVuosi, verrataan vuotta.
     · Tyhjä tallennettu kenttä → ei tarkistusta sen osalta (uusi pelaaja saa arvon lomakkeelta).
     · Suostumus ei KOSKAAN ylikirjoita olemassa olevaa syntymäaikaa tai sukupuolta eri arvolla —
       se saa vain täyttää tyhjän (tayttoKentat).
════════════════════════════════════════════════════════════════════════ */
'use strict';

function normNimi(s) {
  return String(s == null ? '' : s).normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
}
function normSp(v) {
  const s = String(v == null ? '' : v).trim().toUpperCase();
  return (s === 'P' || s === 'M') ? 'M' : (s === 'T' || s === 'N') ? 'N' : null;
}
/* YYYY-MM-DD (validi, 1990–2025 kuten ennen) → { iso, vuosi } | null */
function lomakePaiva(syntyma) {
  if (!syntyma || !/^\d{4}-\d{2}-\d{2}$/.test(String(syntyma))) return null;
  const [yy, mm, dd] = String(syntyma).split('-').map((x) => parseInt(x, 10));
  if (yy < 1990 || yy > 2025) return null;
  const d = new Date(Date.UTC(yy, mm - 1, dd));
  if (isNaN(d.getTime()) || d.getUTCMonth() !== mm - 1) return null;
  return { iso: d.toISOString().slice(0, 10), vuosi: yy, date: d };
}
function tallennettuPaiva(v) {
  if (!v) return null;
  const d = typeof v.toDate === 'function' ? v.toDate() : new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

/* pelaaja = pelaajadokumentin data, lomake = { etunimi, syntyma, sukupuoli }
   → { ristiriita, syyt:[], etunimiTasmasi: true|false|null, tayttoKentat:{ syntymaPaiva?, syntymaVuosi?, sukupuoli? } } */
function tarkistaSuostumusKohde(pelaaja, lomake) {
  const p = pelaaja || {}, l = lomake || {};
  const syyt = [];

  const tallEtu = normNimi(p.etunimi), lomEtu = normNimi(l.etunimi);
  const etunimiTasmasi = (tallEtu && lomEtu) ? tallEtu === lomEtu : null;
  if (etunimiTasmasi === false) syyt.push('etunimi');

  const lp = lomakePaiva(l.syntyma);
  const tallPv = tallennettuPaiva(p.syntymaaika);
  const tallVuosi = p.syntymaVuosi != null && p.syntymaVuosi !== '' ? parseInt(p.syntymaVuosi, 10) : null;
  if (lp && tallPv && lp.iso !== tallPv) syyt.push('syntymaaika');
  else if (lp && !tallPv && tallVuosi && lp.vuosi !== tallVuosi) syyt.push('syntymaaika');

  const tayttoKentat = {};
  if (!syyt.length) {
    if (lp && !tallPv) { tayttoKentat.syntymaPaiva = lp.date; if (!tallVuosi) tayttoKentat.syntymaVuosi = lp.vuosi; }
    const sp = normSp(l.sukupuoli);
    if (sp && !normSp(p.sukupuoli)) tayttoKentat.sukupuoli = sp;
  }
  return { ristiriita: syyt.length > 0, syyt, etunimiTasmasi, tayttoKentat };
}

module.exports = { tarkistaSuostumusKohde, normNimi, lomakePaiva };
