# Tehtävä: Luettavuuskorjaus — Master_v16 detail-paneelit + VP_v25 joukkuekortit

> Ongelma: pelaajan tulokset näkyvät liian pienellä. Master_v16:n detail-paneelin
> taulukko on 12 px / otsikkorivit 10 px, VP_v25 joukkuekortin labelit ja kontekstit
> 9 px. Käyttäjäpalaute kenttätestistä (TKI-detail, Sibbo P10): sisältö oikein,
> typografia ja hierarkia haastavia. Tämä on PUHDAS CSS/markup-tehtävä — ÄLÄ muuta
> laskentaa, datakenttiä tai paneelien sisältölogiikkaa.

## Osatehtävä A — Master_v16 detail-paneelit (.detail-*-luokat, rivi ~431–444)

Koskee kaikkia kolmea paneelia (TKI/H-H/TSI), jotka jakavat samat luokat.

1. **Typografia-asteikko ylös:**
   - `.detail-taulukko` 12px → **14px**; riveille pystypadding 8px ja erotinviiva
     `border-bottom:1px solid rgba(255,255,255,.05)` (viimeinen rivi ilman)
   - `.detail-otsikkorivi` 10px → **11px**
   - `.detail-yhteenveto` 12px → **13px**
   - `.detail-suositus` 13px → **14px**
   - Lajin ARVO (esim. "Pujottelu **31.9s**") → `font-weight:600; font-size:15px`
     — arvo on rivin tärkein luku, nyt se hukkuu viitetekstiin
2. **KPI-luku headeriin Cormorantilla (§5):** paneelin pääluku (TKI 32 / H-H-taso /
   TSI-sekunnit) → `font-family:'Cormorant Garamond'; font-weight:600; font-size:32px`
   — sama KPI-kieli kuin muualla sovelluksessa. Otsikko "Tekniikkaprofiili — Nimi, ikä"
   säilyy 18px DM Sans.
3. **Hierarkia gap-tiedolle:** oikean reunan "hyvä ≤26.2s · +5.7s" → gap-osa
   (`+5.7s`) **13px ja värillinen** (amber jos gap > 0, teal jos viitetasolla),
   viiteosa ("hyvä ≤26.2s") saa jäädä 12px `var(--ink3)`. Kehityskohde-rivi (←)
   korostus: `background:rgba(224,160,64,.07)`.
4. **Sekuntibudjetti-rivi** (⏱ Pronssiin puuttuu…) → 14px, lukuarvot 600-painolla.
5. **Modal-mitat:** sisältöpadding min 20px; max-width 600px desktopilla.
6. **Mobiili (max-width:768px):** taulukkorivit saavat rivittyä kahdelle riville
   (laji+arvo ylärivi, viite+gap alarivi `var(--ink3)`); fonttikoot EIVÄT saa
   pudota alle 13px. MUISTA: vain YKSI @media(max-width:768px) per tiedosto (§6)
   — lisää olemassa olevaan lohkoon, ÄLÄ luo uutta.

## Osatehtävä B — VP_v25 joukkuekortit (.jk-*-luokat, rivi ~1316–1332)

1. `.jk-dim-label` (D1/D2) 9px → **11px**
2. `.jk-dim-arvo` 13px → **16px** (kortin tärkein luku)
3. `.jk-dim-ctx` (Eerikkilä/TKI) 9px → **10px**
4. `.jk-suunta` 12px → **13px**
5. `.jk-badge` (2. mittaus puuttuu) 9px → **10px**
6. `.jk-pel` 11px → **12px**
7. Kortin sisäpadding +2–4px jos tarpeen ettei kortti tunnu ahtaalta; palkin
   (`.jk-palkki-wrap`) korkeutta saa nostaa 1–2px vastaavasti.
8. Mobiililohko (rivi ~1438–1440): tarkista että uudet koot eivät riko sitä;
   `.jk-dim-ctx` piilotus mobiilissa säilyy.
9. Pelaajalistan delta-badget (`_tkiDeltaBadgeVP`, `_hhSoluVP`, `_tekninenSoluVP`,
   inline `font-size:11px`) → **12px**.

## Rajoitukset — ÄLÄ RIKO

- §5 design-tokenit: vain `var(--teal)` / `var(--amber)` / `var(--red)` / `var(--ink*)`;
  KPI-numerot Cormorant Garamond 300/400/600, body DM Sans. EI Playfair, EI #3EC9A7.
- §6: yksi `@media(max-width:768px)` per tiedosto — muokkaa olemassa olevia lohkoja.
- §7.1: string concatenation jos kosket JS-renderöintiin (mieluiten vain CSS).
- ÄLÄ muuta `_buildTKIDetail`/`_buildHHDetail`/`_buildTSIDetail`-logiikkaa — vain
  esitystapaa. Jos markup-muutos on pakollinen (esim. arvon span-kääre), pidä
  datakentät ja ehdot ennallaan.
- VP_v25: omat luokkanimet `jk-*` — älä tuo v22:n luokkia.

## Verifiointi

1. Inline-scriptin syntaksi (vm.Script) molemmista tiedostoista — 0 virhettä
2. Visuaalinen tarkistus selaimessa (Chrome MCP jos käytössä):
   - Master: Sibbo P10 -pelaajan TKI-detail — arvot 15px, gap värillä, KPI Cormorant
   - Master mobiilileveys 390px: rivitys toimii, ei alle 13px tekstiä
   - VP: joukkuekortit — D1/D2-arvot 16px, suuntarivi luettava
3. `npm test` vihreä (ei saa muuttua — CSS-tehtävä)
4. Commit: "UI: detail-paneelien + joukkuekorttien luettavuus (typografia-asteikko)"
   + push + `npm run version:bump`
