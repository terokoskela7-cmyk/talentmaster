/* ════════════════════════════════════════════════════════════════════════
   suostumus_tarkistus.js — vahvistaSuostumus: kohdistuuko lomake tunnisteen osoittamaan pelaajaan?
   (sisarusbugi 30.9.2026)

   Vika: Seura-sivu kohdisti toisen lapsen kutsun huoltajan ensimmäiselle lapselle (sähköpostihaku),
   ja vahvistaSuostumus kirjoitti toisen lapsen syntymäajan, sukupuolen ja suostumuksen ensimmäiselle.
   Sähköposti täsmäsi (sama huoltaja), joten sähköpostitarkistus ei riittänyt.

   Säännöt (Teron linjaus 30.9.2026 — salliva, koska tuontidatassa on virheitä):
     · ETUNIMI täsmää, jos lomakkeen etunimi (normalisoitu, väliviiva = välilyönti) vastaa mitä tahansa
       osaa tallennetusta etunimestä tai sukunimestä (nimet osin väärin päin tuonnissa), on sama kuin koko
       tallennettu etunimi, tai toinen alkaa toisella (Onni ↔ Onni-Matti).
     · SYNTYMÄAIKA: verrataan VAIN vuotta (päivämäärissä voi olla aikavyöhykevirhe).
     · RISTIRIITA vain, jos MOLEMMAT eroavat (etunimi ei täsmää JA vuosi eroaa) → hylätään.
       Vain toinen eroaa → hyväksytään, poikkeama kirjataan audit-riville (lomake_poikkeama, warn).
     · Tyhjä tallennettu kenttä → ei vertailua sen osalta.
     · Suostumus ei KOSKAAN ylikirjoita olemassa olevaa syntymäaikaa tai sukupuolta eri arvolla —
       se saa vain täyttää tyhjän (tayttoKentat).
     · Tärkein suoja sisaruksille (myös kaksosille) on Seura-sivulla: jokainen lapsi saa oman pelaajan
       ja oman kutsulinkin. Tämä tarkistus on toinen puolustuslinja.
════════════════════════════════════════════════════════════════════════ */
'use strict';

function normNimi(s) {
  return String(s == null ? '' : s).normalize('NFC').toLowerCase().replace(/[-‐‑–]/g, ' ').replace(/\s+/g, ' ').trim();
}
/* Etunimen täsmäys (salliva). → true | false | null (ei vertailtavaa). */
function etunimiTasmaa(pelaaja, lomakeEtunimi) {
  const lom = normNimi(lomakeEtunimi);
  const etu = normNimi(pelaaja && pelaaja.etunimi), suku = normNimi(pelaaja && pelaaja.sukunimi);
  if (!lom || (!etu && !suku)) return null;
  const osat = (etu + ' ' + suku).split(' ').filter(Boolean);
  if (lom === etu || osat.indexOf(lom) >= 0) return true;
  if (lom.split(' ').some((o) => osat.indexOf(o) >= 0)) return true;   // "Onni Matti" ↔ osa "matti"
  const alkaa = (a, b) => a.length >= 2 && b.length >= 2 && (a.startsWith(b) || b.startsWith(a));
  return alkaa(lom, etu);   // Onni ↔ Onni-Matti
}
function tallennettuVuosi(p) {
  if (p && p.syntymaVuosi != null && p.syntymaVuosi !== '') { const v = parseInt(p.syntymaVuosi, 10); if (!isNaN(v)) return v; }
  const pv = tallennettuPaiva(p && p.syntymaaika);
  return pv ? parseInt(pv.slice(0, 4), 10) : null;
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
   → { ristiriita, syyt:[], poikkeama:[], etunimiTasmasi: true|false|null, tayttoKentat:{ syntymaPaiva?, syntymaVuosi?, sukupuoli? } }
   syyt = hylkäyksen syyt (vain kun molemmat eroavat); poikkeama = hyväksytyn pyynnön yksittäinen ero. */
function tarkistaSuostumusKohde(pelaaja, lomake) {
  const p = pelaaja || {}, l = lomake || {};
  const etunimiTasmasi = etunimiTasmaa(p, l.etunimi);
  const lp = lomakePaiva(l.syntyma);
  const tallV = tallennettuVuosi(p);
  const vuosiEroaa = !!(lp && tallV && lp.vuosi !== tallV);
  const etunimiEroaa = etunimiTasmasi === false;

  const ristiriita = etunimiEroaa && vuosiEroaa;
  const syyt = ristiriita ? ['etunimi', 'vuosi'] : [];
  const poikkeama = ristiriita ? [] : [].concat(etunimiEroaa ? ['etunimi'] : [], vuosiEroaa ? ['vuosi'] : []);

  const tayttoKentat = {};
  if (!ristiriita) {
    if (lp && !tallennettuPaiva(p.syntymaaika) && !tallV) { tayttoKentat.syntymaPaiva = lp.date; tayttoKentat.syntymaVuosi = lp.vuosi; }
    const sp = normSp(l.sukupuoli);
    if (sp && !normSp(p.sukupuoli)) tayttoKentat.sukupuoli = sp;
  }
  return { ristiriita, syyt, poikkeama, etunimiTasmasi, tayttoKentat };
}

module.exports = { tarkistaSuostumusKohde, etunimiTasmaa, normNimi, lomakePaiva };
